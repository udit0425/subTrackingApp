import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

import { decrypt, encrypt, hashPassword, verifyPassword } from '../src/crypto.js';

describe('crypto helpers', () => {
  it('encrypts and decrypts, and rejects tampered data', () => {
    const key = randomBytes(32);
    const enc = encrypt(key, 'hello ₹649');
    assert.equal(decrypt(key, enc), 'hello ₹649');
    const buf = Buffer.from(enc, 'base64');
    buf[buf.length - 1] ^= 0x01;
    assert.throws(() => decrypt(key, buf.toString('base64')));
  });

  it('uses a fresh IV every time', () => {
    const key = randomBytes(32);
    assert.notEqual(encrypt(key, 'same'), encrypt(key, 'same'));
  });

  it('verifies passwords against scrypt hashes', async () => {
    const stored = await hashPassword('a long passphrase');
    assert.equal(await verifyPassword('a long passphrase', stored), true);
    assert.equal(await verifyPassword('a long passphrase!', stored), false);
    assert.equal(await verifyPassword('x', 'not-a-hash'), false);
  });
});
