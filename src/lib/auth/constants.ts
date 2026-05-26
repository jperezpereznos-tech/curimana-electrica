export const ROLE_COOKIE = 'x-user-role'

function sha256(message: string): string {
  const ch = (x: number, y: number, z: number) => (x & y) ^ (~x & z);
  const maj = (x: number, y: number, z: number) => (x & y) ^ (x & z) ^ (y & z);
  const rotateRight = (n: number, x: number) => (x >>> n) | (x << (32 - n));
  
  const sigma0 = (x: number) => rotateRight(2, x) ^ rotateRight(13, x) ^ rotateRight(22, x);
  const sigma1 = (x: number) => rotateRight(6, x) ^ rotateRight(11, x) ^ rotateRight(25, x);
  const gamma0 = (x: number) => rotateRight(7, x) ^ rotateRight(18, x) ^ (x >>> 3);
  const gamma1 = (x: number) => rotateRight(17, x) ^ rotateRight(19, x) ^ (x >>> 10);

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  const hash = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

  const msgBytes: number[] = [];
  for (let i = 0; i < message.length; i++) {
    const c = message.charCodeAt(i);
    if (c < 128) {
      msgBytes.push(c);
    } else if (c < 2048) {
      msgBytes.push((c >> 6) | 192);
      msgBytes.push((c & 63) | 128);
    } else {
      msgBytes.push((c >> 12) | 224);
      msgBytes.push(((c >> 6) & 63) | 128);
      msgBytes.push((c & 63) | 128);
    }
  }

  const l = msgBytes.length * 8;
  msgBytes.push(0x80);
  while ((msgBytes.length + 8) % 64 !== 0) {
    msgBytes.push(0x00);
  }
  for (let i = 7; i >= 0; i--) {
    msgBytes.push((l >>> (i * 8)) & 0xff);
  }

  const w = new Array(64);
  for (let chunk = 0; chunk < msgBytes.length; chunk += 64) {
    for (let i = 0; i < 16; i++) {
      const idx = chunk + i * 4;
      w[i] = (msgBytes[idx] << 24) | (msgBytes[idx + 1] << 16) | (msgBytes[idx + 2] << 8) | msgBytes[idx + 3];
    }
    for (let i = 16; i < 64; i++) {
      w[i] = (gamma1(w[i - 2]) + w[i - 7] + gamma0(w[i - 15]) + w[i - 16]) | 0;
    }

    let [a, b, c, d, e, f, g, h] = hash;

    for (let i = 0; i < 64; i++) {
      const t1 = (h + sigma1(e) + ch(e, f, g) + k[i] + w[i]) | 0;
      const t2 = (sigma0(a) + maj(a, b, c)) | 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }

    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  return hash.map(x => {
    const hex = (x >>> 0).toString(16);
    return '00000000'.substring(hex.length) + hex;
  }).join('');
}

function getHmacSecret(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!secret) {
    return 'fallback-secret-key-curimana-electrica'
  }
  return secret
}

function computeHmac(payload: string): string {
  return sha256(`${payload}:${getHmacSecret()}`)
}

export function encodeRoleCookie(userId: string, role: string): string {
  const payload = `${userId}:${role}`
  const sig = computeHmac(payload)
  return `${payload}:${sig}`
}

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

export function decodeRoleCookie(raw: string | undefined, expectedUserId: string): string | null {
  if (!raw) return null

  const firstSep = raw.indexOf(':')
  if (firstSep === -1) return null
  const cookieUserId = raw.substring(0, firstSep)
  const rest = raw.substring(firstSep + 1)

  const secondSep = rest.indexOf(':')
  if (secondSep === -1) return null
  const cookieRole = rest.substring(0, secondSep)
  const cookieSig = rest.substring(secondSep + 1)

  if (cookieUserId !== expectedUserId) return null

  const expectedSig = computeHmac(`${cookieUserId}:${cookieRole}`)
  if (cookieSig.length !== expectedSig.length) return null
  if (!safeCompare(cookieSig, expectedSig)) return null

  return cookieRole
}
