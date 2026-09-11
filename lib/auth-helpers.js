const crypto = require('crypto');

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = await new Promise((res, rej) =>
    crypto.scrypt(password, salt, 64, (err, k) => err ? rej(err) : res(k))
  );
  return `${salt}:${key.toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
  try {
    const [salt, key] = storedHash.split(':');
    const k = await new Promise((res, rej) =>
      crypto.scrypt(password, salt, 64, (err, k) => err ? rej(err) : res(k))
    );
    return crypto.timingSafeEqual(Buffer.from(key, 'hex'), k);
  } catch { return false; }
}

module.exports = { hashPassword, verifyPassword };
