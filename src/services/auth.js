import { auth, db, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, createUserWithEmailAndPassword, signInWithEmailAndPassword, updatePassword, deleteUser, signOut, doc, setDoc, getDocFromServer, serverTimestamp, RecaptchaVerifier, signInWithPhoneNumber, EmailAuthProvider, reauthenticateWithCredential } from './firebase.js';

/**
 * Ensures a user document exists in Firestore. 
 * If it's a new user, creates the document.
 */
export const checkAndCreateUserDoc = async (user) => {
  if (!db) return { isNewUser: true }; // Fallback if Firebase not configured
  
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDocFromServer(userRef);
  
  if (!userSnap.exists()) {
    // New user, create initial document
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      fullName: user.displayName || '',
      companyName: '', // To be filled in profile setup
      createdAt: serverTimestamp(),
    });
    return { isNewUser: true, data: null };
  }
  
  return { isNewUser: false, data: userSnap.data() };
};

/**
 * Returns the company + employee linkage for an authenticated user.
 * Reads users/{uid}; workspace owners have companyUid === uid, teammates
 * have it set at provisioning time.
 */
export const getCompanyForUser = async (uid) => {
  if (!db || !uid) return null;
  const userRef = doc(db, 'users', uid);
  try {
    const snap = await getDocFromServer(userRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      companyUid: data.companyUid || null,
      employeeId: data.employeeId || null,
      role: data.role || null,
      fullName: data.fullName || data.name || null,
      department: data.department || null,
      avatar: data.avatar || null,
    };
  } catch (error) {
    console.error('Failed to read user doc:', error);
    return null;
  }
};

/**
 * Reads a company invite for an email address. Invites are written by the
 * workspace owner when they add a teammate by email; the invite is what lets
 * a brand-new Google user discover and auto-link to the company.
 */
export const getInviteByEmail = async (email) => {
  if (!db || !email) return null;
  const key = email.trim().toLowerCase();
  try {
    const snap = await getDoc(doc(db, 'invites', key));
    if (!snap.exists()) return null;
    const data = snap.data();
    if (data.status === 'revoked') return null;
    return { ...data, id: key };
  } catch (error) {
    console.error('Failed to read invite:', error);
    return null;
  }
};

/**
 * Links a Google-authenticated user to the company that invited their email.
 * Creates users/{uid} (so the dashboard knows their company) and registers
 * them in companies/{ownerUid}/members/{uid}.
 */
export const acceptInvite = async (user, invite) => {
  if (!db || !user) throw new Error('Firebase not configured');
  if (!invite?.companyUid) throw new Error('This invite is invalid or already used.');
  const email = (user.email || '').trim().toLowerCase();
  const uid = user.uid;

  await setDoc(doc(db, 'users', uid), {
    uid,
    email,
    fullName: invite.name || user.displayName || '',
    companyUid: invite.companyUid,
    employeeId: invite.employeeId || '',
    role: invite.role || 'Teammate',
    department: invite.department || '',
    joinedAt: serverTimestamp(),
  });

  await setDoc(doc(db, 'companies', invite.companyUid, 'members', uid), {
    employeeId: invite.employeeId || '',
    email,
    name: invite.name || user.displayName || '',
    role: invite.role || 'Teammate',
    registeredAt: serverTimestamp(),
  }, { merge: true });

  if (email) {
    await setDoc(doc(db, 'invites', email), {
      ...invite,
      status: 'linked',
      linkedUid: uid,
      linkedAt: serverTimestamp(),
    }, { merge: true });
  }
};

/**
 * Registers a teammate by email (Google-only sign-in). No Firebase Auth
 * password account is created — the teammate signs in with their own Google
 * account and is auto-linked when their email matches this invite.
 */
export const provisionEmployeeAccount = async ({ email, name, role, companyUid, employeeId, department, avatar }) => {
  if (!db) throw new Error('Firebase not configured');
  if (!email) throw new Error('Teammate email is required to send an invite.');
  if (!companyUid) throw new Error('Missing company ID — cannot invite teammate.');
  const key = email.trim().toLowerCase();

  await setDoc(doc(db, 'invites', key), {
    companyUid,
    employeeId: employeeId || '',
    name: name || '',
    role: role || 'Teammate',
    department: department || '',
    avatar: avatar || '',
    status: 'invited',
    createdAt: serverTimestamp(),
  });

  return { uid: null, invited: true };
};

/**
 * Marks a teammate's email invite as revoked so they can no longer auto-link.
 */
export const revokeInvite = async (email) => {
  if (!db || !email) return;
  const key = email.trim().toLowerCase();
  try {
    await setDoc(doc(db, 'invites', key), {
      status: 'revoked',
      revokedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error('Failed to revoke invite:', error);
  }
};

/**
 * Self-service password change for the currently signed-in user (teammate).
 * Re-authenticates with the current password first (which both validates it
 * and refreshes the session so updatePassword doesn't hit requires-recent-login).
 * Only the signed-in user's own password can be changed from the client.
 */
export const changeEmployeePassword = async (currentPassword, newPassword) => {
  if (!auth) throw new Error('Firebase not configured');
  const account = auth.currentUser;
  if (!account || !account.email) throw new Error('You must be signed in to change your password.');
  if (!currentPassword) throw new Error('Please enter your current password.');
  if (!newPassword || newPassword.length < 6) throw new Error('New password must be at least 6 characters.');

  const credential = EmailAuthProvider.credential(account.email, currentPassword);
  await reauthenticateWithCredential(account, credential);
  await updatePassword(auth.currentUser, newPassword);
};

/**
 * Attempts to delete a teammate's Firebase Auth account. Client SDK can only
 * delete the currently signed-in user; deleting arbitrary users requires a
 * Cloud Function. Returns true if deleted, false if it must be deferred.
 */
export const deleteEmployeeAccount = async (uid) => {
  if (!auth) return false;
  if (auth.currentUser?.uid !== uid) return false;
  try {
    await deleteUser(auth.currentUser);
    return true;
  } catch {
    return false;
  }
};

// Tries popup sign-in first (works on all browsers). Falls back to
// redirect-based sign-in only when the popup is blocked (e.g. strict popup
// blockers). Redirect is deprecated on Chrome, so it's only a last resort.
export const loginWithGoogle = async () => {
  if (!auth) throw new Error('Firebase not configured');
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return { user: result.user, mode: 'popup' };
  } catch (err) {
    if (err.code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, provider);
      return { user: null, mode: 'redirect' };
    }
    throw err;
  }
};

export const getGoogleRedirectResult = async () => {
  if (!auth) return null;
  const result = await getRedirectResult(auth);
  return result?.user || null;
};

export const loginWithEmail = async (email, password) => {
  if (!auth) throw new Error('Firebase not configured');
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
};

export const registerWithEmail = async (email, password) => {
  if (!auth) throw new Error('Firebase not configured');
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
};

export const logoutUser = async () => {
  if (auth) {
    await signOut(auth);
  }
};

// --- Phone Authentication ---

export const setupRecaptcha = (containerId) => {
  if (!auth) throw new Error('Firebase not configured');
  return new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: (response) => {
      // reCAPTCHA solved
    }
  });
};

export const requestPhoneOtp = async (phoneNumber, appVerifier) => {
  if (!auth) throw new Error('Firebase not configured');
  const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
  return confirmationResult;
};

export const verifyPhoneOtp = async (confirmationResult, otpCode) => {
  if (!confirmationResult) throw new Error('No OTP request found');
  const result = await confirmationResult.confirm(otpCode);
  return result.user;
};
