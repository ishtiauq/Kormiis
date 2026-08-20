import { auth, secondaryAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, createUserWithEmailAndPassword, signInWithEmailAndPassword, updatePassword, deleteUser, signOut, RecaptchaVerifier, signInWithPhoneNumber, EmailAuthProvider, reauthenticateWithCredential, setPersistence, browserLocalPersistence, browserSessionPersistence } from './firebaseCore.js';

// Firestore/Storage are loaded on demand (after sign-in) so the login screen
// never downloads the Firestore bundle. This module can be reached from the
// app entry, so it must not statically pull Firestore in.
let _fb = null;
async function getFirebase() {
  if (!_fb) _fb = await import('./firebase.js');
  return _fb;
}

/**
 * Parses an identifier (email or phone). If it looks like a phone number,
 * normalizes it (including BD 01... numbers) and maps it to a dummy email
 * to allow password-based login.
 */
export const parseIdentifier = (identifier) => {
  const trimmed = (identifier || '').trim();
  const digitsOnly = trimmed.replace(/[^\d]/g, '');
  
  // Detect phone: contains mostly digits, or starts with +, or has 10-15 digits
  const isPhone = (/^\+?[0-9\s-]+$/.test(trimmed) && digitsOnly.length >= 7) || (digitsOnly.length === 11 && digitsOnly.startsWith('01'));
  if (isPhone) {
    let cleanPhone = trimmed.replace(/[^\d+]/g, '');
    if (!cleanPhone.startsWith('+')) {
      if (cleanPhone.startsWith('01') && cleanPhone.length === 11) {
        cleanPhone = '+88' + cleanPhone;
      } else if (cleanPhone.startsWith('8801') && cleanPhone.length === 13) {
        cleanPhone = '+' + cleanPhone;
      } else {
        cleanPhone = '+' + cleanPhone;
      }
    }
    return `${cleanPhone}@kormiis.local`;
  }
  return trimmed.toLowerCase();
};

/**
 * Converts Firebase error codes into friendly user messages.
 */
export const formatAuthError = (err) => {
  if (!err) return 'An unexpected error occurred. Please try again.';
  const code = err.code || '';
  const msg = err.message || '';

  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Incorrect email/phone or password. Please verify and try again.';
  }
  if (code === 'auth/invalid-email') {
    return 'Please enter a valid work email or phone number.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Please wait a few seconds before trying again.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Sign-in cancelled. Please select your Google account to proceed.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network connection error. Please check your internet connection.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account with this email already exists. Try signing in.';
  }
  if (code === 'auth/weak-password') {
    return 'Password is too weak. Please use at least 6 characters.';
  }
  return msg.replace(/^Firebase:\s*/, '').replace(/\s*\([a-z/-]+\)\.?$/, '');
};

/**
 * Returns the company + employee linkage for an authenticated user.
 * Reads users/{uid}; workspace owners have companyUid === uid, teammates
 * have it set at provisioning time. Returns null when no user doc exists.
 */
export const getCompanyForUser = async (uid) => {
  if (!uid) return null;
  const { db, doc, getDocFromServer } = await getFirebase();
  if (!db) return null;
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
      companyName: data.companyName || null,
      department: data.department || null,
      avatar: data.avatar || null,
    };
  } catch (error) {
    console.error('Failed to read user doc:', error);
    return null;
  }
};

/**
 * Creates a Business Space (company profile) for a brand-new workspace owner.
 * Links the user to their own workspace (companyUid === uid), stores the
 * company profile at companies/{uid}, and seeds the settings snapshot that
 * the dashboard reads. This is the ONLY path that grants workspace-owner
 * (admin) status — an unknown Google user is never auto-promoted.
 */
export const createBusinessSpace = async (user, { name }) => {
  const { db, doc, setDoc, getDocFromServer, serverTimestamp } = await getFirebase();
  if (!db || !user) throw new Error('Firebase not configured');
  const companyName = (name || '').trim();
  if (!companyName) throw new Error('Business space name is required.');
  const uid = user.uid;
  const email = (user.email || '').trim().toLowerCase();

  const userRef = doc(db, 'users', uid);
  const userSnap = await getDocFromServer(userRef);
  if (userSnap.exists() && userSnap.data().companyUid && userSnap.data().companyUid !== uid) {
    throw new Error('This Google account already belongs to a Business Space.');
  }

  await setDoc(userRef, {
    uid,
    email,
    fullName: user.displayName || 'Space Admin',
    companyUid: uid,
    role: 'Admin',
    companyName,
    createdAt: serverTimestamp(),
  }, { merge: true });

  await setDoc(doc(db, 'companies', uid), {
    name: companyName,
    ownerUid: uid,
    createdAt: serverTimestamp(),
  }, { merge: true });

  // Seed the settings snapshot so the dashboard/company-profile loads instantly.
  await setDoc(doc(db, 'companies', uid, 'snapshots', 'settings'), {
    data: { company: { name: companyName, email: '', website: '', logo: '', logoX: 0, logoY: 0, logoZoom: 1 } },
    lastUpdated: new Date(),
  }, { merge: true });

  return { companyUid: uid, companyName };
};

/**
 * Reads a company invite for an email address. Invites are written by the
 * workspace owner when they add a teammate by email; the invite is what lets
 * a brand-new Google user discover and auto-link to the company.
 */
export const getInviteByEmail = async (email) => {
  const { db, doc, getDoc } = await getFirebase();
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
  const { db, doc, setDoc, serverTimestamp } = await getFirebase();
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
 * Registers a teammate by email or phone. Uses secondaryAuth to create the account 
 * without signing out the admin.
 */
export const provisionEmployeeAccount = async ({ email, password, name, role, companyUid, employeeId, department, avatar }) => {
  const { db, doc, setDoc, serverTimestamp } = await getFirebase();
  if (!db || !secondaryAuth) throw new Error('Firebase not configured');
  if (!email) throw new Error('Teammate identifier is required.');
  if (!companyUid) throw new Error('Missing company ID.');
  
  const parsedEmail = parseIdentifier(email);
  let uid = null;

  try {
    // 1. Create the user in Firebase Auth using the secondary instance
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, parsedEmail, password || 'KormiisTemp123!');
    uid = userCredential.user.uid;
    
    // Sign out from the secondary instance just in case
    await signOut(secondaryAuth);
  } catch (error) {
    // If the account already exists, we could handle it or throw
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('An account with this email/number already exists.');
    }
    throw error;
  }

  // 2. Create the user doc
  await setDoc(doc(db, 'users', uid), {
    uid,
    email: parsedEmail,
    fullName: name || '',
    companyUid,
    employeeId: employeeId || '',
    role: role || 'Teammate',
    department: department || '',
    avatar: avatar || '',
    joinedAt: serverTimestamp(),
  });

  // 3. Register in company's members subcollection
  await setDoc(doc(db, 'companies', companyUid, 'members', uid), {
    employeeId: employeeId || '',
    email: parsedEmail,
    name: name || '',
    role: role || 'Teammate',
    department: department || '',
    avatar: avatar || '',
    registeredAt: serverTimestamp(),
  }, { merge: true });

  return { uid, invited: false };
};

/**
 * Marks a teammate's email invite as revoked so they can no longer auto-link.
 */
export const revokeInvite = async (email) => {
  const { db, doc, setDoc, serverTimestamp } = await getFirebase();
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

/**
 * Completely deletes the current user account:
 * 1. Removes their Firestore record from users/{uid}
 * 2. Removes from companies/{companyUid}/members/{uid} if present
 * 3. Deletes the Firebase Auth account
 * 4. Cleans up session and signs out
 */
export const deleteCurrentUserAccount = async ({ uid, companyUid, employeeId } = {}) => {
  if (!auth) throw new Error('Firebase not configured');
  const user = auth.currentUser;
  const targetUid = uid || user?.uid;
  const { db, doc, deleteDoc } = await getFirebase();

  // 1. Clean up Firestore user doc
  if (db && targetUid) {
    try {
      await deleteDoc(doc(db, 'users', targetUid));
    } catch (e) {
      console.warn('Failed to delete users doc:', e);
    }
  }

  // 2. Clean up company member doc
  if (db && companyUid && targetUid) {
    try {
      await deleteDoc(doc(db, 'companies', companyUid, 'members', targetUid));
    } catch (e) {
      console.warn('Failed to delete company member doc:', e);
    }
  }

  // 3. Delete from Firebase Auth if currentUser matches
  if (user && user.uid === targetUid) {
    try {
      await deleteUser(user);
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        throw new Error('For security, please log out and log in again before deleting your account.');
      }
      console.warn('Could not delete Firebase Auth user:', err);
    }
  }

  // 4. Clear local auth state
  try {
    await signOut(auth);
  } catch {}
  
  localStorage.removeItem('kormiis_user');
  localStorage.removeItem('kormiis_last_identifier');
  return true;
};

/**
 * Transfers/promotes another teammate to Admin role in the company.
 */
export const transferAdminship = async (companyUid, targetTeammate) => {
  if (!companyUid || !targetTeammate) throw new Error('Invalid arguments for admin transfer');
  const targetUid = targetTeammate.uid || targetTeammate.id;
  const { db, doc, setDoc } = await getFirebase();

  if (db && targetUid) {
    try {
      await setDoc(doc(db, 'companies', companyUid, 'members', targetUid), {
        role: 'Admin',
        systemRole: 'Admin'
      }, { merge: true });
    } catch (e) {
      console.warn('Failed to update company member role:', e);
    }

    try {
      await setDoc(doc(db, 'users', targetUid), {
        role: 'Admin',
        companyUid
      }, { merge: true });
    } catch (e) {
      console.warn('Failed to update user doc role:', e);
    }
  }

  return true;
};

/**
 * Schedules workspace for permanent deletion in 7 days (1 week).
 * Saves deletion status to Firestore companies/{companyUid}.
 */
export const scheduleWorkspaceDeletion = async ({ companyUid, adminUid, requestedBy, scheduledDate }) => {
  if (!companyUid) throw new Error('Company ID missing.');
  const { db, doc, setDoc, serverTimestamp } = await getFirebase();

  if (db && companyUid) {
    try {
      await setDoc(doc(db, 'companies', companyUid), {
        deletionStatus: {
          isPending: true,
          scheduledDeletionDate: scheduledDate,
          requestedAt: serverTimestamp(),
          requestedBy: {
            name: requestedBy?.name || 'Administrator',
            email: requestedBy?.email || '',
            uid: requestedBy?.uid || adminUid || ''
          }
        }
      }, { merge: true });
    } catch (err) {
      console.warn('Failed to update company deletionStatus:', err);
    }
  }

  return true;
};

/**
 * Cancels a scheduled workspace deletion.
 */
export const cancelWorkspaceDeletion = async ({ companyUid }) => {
  if (!companyUid) throw new Error('Company ID missing.');
  const { db, doc, setDoc } = await getFirebase();

  if (db && companyUid) {
    try {
      await setDoc(doc(db, 'companies', companyUid), {
        deletionStatus: null
      }, { merge: true });
    } catch (err) {
      console.warn('Failed to clear company deletionStatus:', err);
    }
  }

  return true;
};

export const setAuthPersistence = async (remember = true) => {
  if (!auth) return;
  try {
    const persistenceType = remember ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistenceType);
  } catch (err) {
    console.warn('Failed to set auth persistence:', err);
  }
};

// Tries popup sign-in first (works on all browsers). Falls back to
// redirect-based sign-in only when the popup is blocked (e.g. strict popup
// blockers). Redirect is deprecated on Chrome, so it's only a last resort.
export const loginWithGoogle = async (remember = true) => {
  if (!auth) throw new Error('Firebase not configured');
  await setAuthPersistence(remember);
  const provider = new GoogleAuthProvider();
  // Ensure Google displays the account profile chooser so user can select their active profile
  provider.setCustomParameters({
    prompt: 'select_account'
  });
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

export const loginWithEmail = async (email, password, remember = true) => {
  if (!auth) throw new Error('Firebase not configured');
  await setAuthPersistence(remember);
  const parsedEmail = parseIdentifier(email);
  const result = await signInWithEmailAndPassword(auth, parsedEmail, password);
  return result.user;
};

export const registerWithEmail = async (email, password, remember = true) => {
  if (!auth) throw new Error('Firebase not configured');
  await setAuthPersistence(remember);
  const parsedEmail = parseIdentifier(email);
  const result = await createUserWithEmailAndPassword(auth, parsedEmail, password);
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
