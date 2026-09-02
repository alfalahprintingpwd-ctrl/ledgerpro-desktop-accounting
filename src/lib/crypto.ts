/**
 * Standalone, deterministic SHA-256 implementation in pure TypeScript.
 * Produces standard 64-character lowercase hex string matching standard SHA-256.
 */

function utf8Encode(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

// SHA-256 constants
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rightRotate(v: number, n: number): number {
  return (v >>> n) | (v << (32 - n));
}

export function sha256Hex(input: string): string {
  const bytes = utf8Encode(input);
  const bitLength = bytes.length * 8;

  // 512-bit (64-byte) blocks
  const newLength = ((bytes.length + 8) >> 6) + 1;
  const wordCount = newLength * 16;
  const words = new Uint32Array(wordCount);

  for (let i = 0; i < bytes.length; i++) {
    words[i >> 2] |= bytes[i] << (24 - (i % 4) * 8);
  }
  words[bytes.length >> 2] |= 0x80 << (24 - (bytes.length % 4) * 8);
  words[wordCount - 1] = bitLength;

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  for (let i = 0; i < wordCount; i += 16) {
    for (let t = 0; t < 16; t++) {
      w[t] = words[i + t];
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rightRotate(w[t - 15], 7) ^ rightRotate(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rightRotate(w[t - 2], 17) ^ rightRotate(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let t = 0; t < 64; t++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + w[t]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const toHex = (n: number) => ('00000000' + (n >>> 0).toString(16)).slice(-8);
  return `${toHex(h0)}${toHex(h1)}${toHex(h2)}${toHex(h3)}${toHex(h4)}${toHex(h5)}${toHex(h6)}${toHex(h7)}`;
}

/**
 * Standard password hashing with domain prefix
 */
export function hashPassword(password: string): string {
  if (!password) return '';
  return `lp_sha256_${sha256Hex(password)}`;
}

/**
 * Legacy hash for backward compatibility
 */
export function legacySimpleHash(text: string): string {
  if (!text) return '';
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'lp_hash_' + Math.abs(hash).toString(36) + '_' + text.length;
}

/**
 * Secure, multi-format password verification:
 * 1. Checks current standard SHA-256 hash (lp_sha256_...)
 * 2. Checks legacy hash format (lp_hash_...)
 * 3. Checks raw matching (in case plain text existed in dev/seed)
 * 4. Supports case sensitivity as requested
 */
export function verifyPassword(
  enteredPassword: string,
  storedPasswordHash: string | null | undefined
): boolean {
  if (!storedPasswordHash) return true; // No password configured
  if (!enteredPassword) return false;

  const currentShaHash = hashPassword(enteredPassword);
  if (storedPasswordHash === currentShaHash) {
    return true;
  }

  const legacyHash = legacySimpleHash(enteredPassword);
  if (storedPasswordHash === legacyHash) {
    return true;
  }

  // Raw plain-text comparison (e.g. if plain password was stored in older format)
  if (storedPasswordHash === enteredPassword) {
    return true;
  }

  // Handle case where stored hash is pure 64-char sha256 hex without lp_sha256_ prefix
  if (storedPasswordHash.length === 64 && storedPasswordHash === sha256Hex(enteredPassword)) {
    return true;
  }

  // Handle case with accidental leading/trailing whitespace if exact match didn't succeed
  const trimmed = enteredPassword.trim();
  if (trimmed !== enteredPassword && trimmed.length > 0) {
    if (
      storedPasswordHash === hashPassword(trimmed) ||
      storedPasswordHash === legacySimpleHash(trimmed) ||
      storedPasswordHash === trimmed
    ) {
      return true;
    }
  }

  return false;
}
