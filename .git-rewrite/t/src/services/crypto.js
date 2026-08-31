const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function base64Encode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64Decode(str) {
  return Uint8Array.from(atob(str), c => c.charCodeAt(0));
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  const combined = new Uint8Array(64);
  combined.set(salt);
  combined.set(new Uint8Array(derivedBits), 32);
  return base64Encode(combined);
}

export async function verifyPassword(password, storedHash) {
  try {
    const combined = base64Decode(storedHash);
    if (combined.length !== 64) {
      return storedHash === password;
    }
    const salt = combined.slice(0, 32);
    const storedKey = combined.slice(32);
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      textEncoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );
    const derivedKey = new Uint8Array(derivedBits);
    if (derivedKey.length !== storedKey.length) return false;
    return derivedKey.every((byte, i) => byte === storedKey[i]);
  } catch {
    return storedHash === password;
  }
}

export function toBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

export function fromBase64(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export async function deriveAesKey(material) {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(material));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptJson(value, keyMaterial) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(keyMaterial);
  const plaintext = textEncoder.encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return JSON.stringify({
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(ciphertext))
  });
}

export async function decryptJson(payload, keyMaterial) {
  const parsed = JSON.parse(payload);
  if (!parsed?.iv || !parsed?.data) return null;
  const key = await deriveAesKey(keyMaterial);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(parsed.iv) },
    key,
    fromBase64(parsed.data)
  );
  return JSON.parse(textDecoder.decode(new Uint8Array(decrypted)));
}
