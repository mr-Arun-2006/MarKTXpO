import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyFirebaseIdToken } from '../lib/firebaseIdToken.ts';

function token(header: unknown, claims: unknown = {}, signature = 'c2ln') {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode(header)}.${encode(claims)}.${signature}`;
}

test('rejects malformed ID token structures before network access', async () => {
  await assert.rejects(() => verifyFirebaseIdToken('not-a-jwt'), /Malformed Firebase ID token/);
  await assert.rejects(() => verifyFirebaseIdToken('one.two'), /Malformed Firebase ID token/);
});

test('rejects token algorithms other than RS256 before network access', async () => {
  await assert.rejects(
    () => verifyFirebaseIdToken(token({ alg: 'HS256', kid: 'test' })),
    /Unsupported Firebase ID token signing header/,
  );
});

test('rejects ID token headers that do not specify a key ID', async () => {
  await assert.rejects(
    () => verifyFirebaseIdToken(token({ alg: 'RS256' })),
    /Unsupported Firebase ID token signing header/,
  );
});
