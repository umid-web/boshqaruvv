const ITERATIONS = 120_000;

const hex = (buffer) => [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
const bytes = (value) => Uint8Array.from(value.match(/.{2}/g) ?? [], (part) => Number.parseInt(part, 16));

const derive = async (password, salt, iterations) => {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
};

export const hashPassword = async (password) => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITERATIONS}$${hex(salt)}$${hex(await derive(password, salt, ITERATIONS))}`;
};

export const verifyPassword = async (password, stored) => {
  try {
    const [scheme, rounds, saltHex, hashHex] = String(stored).split('$');
    const iterations = Number(rounds);
    if (scheme !== 'pbkdf2' || !Number.isInteger(iterations) || iterations < 1 || !saltHex || !hashHex) return false;
    const actual = new Uint8Array(await derive(password, bytes(saltHex), iterations));
    const expected = bytes(hashHex);
    if (actual.length !== expected.length) return false;
    let mismatch = 0;
    for (let i = 0; i < actual.length; i += 1) mismatch |= actual[i] ^ expected[i];
    return mismatch === 0;
  } catch {
    return false;
  }
};
