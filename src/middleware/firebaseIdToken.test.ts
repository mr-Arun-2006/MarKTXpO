import assert from 'node:assert/strict';
import { createSign, generateKeyPairSync } from 'node:crypto';
import test from 'node:test';
import { verifyFirebaseIdToken } from '../lib/firebaseIdToken.ts';

const PROJECT_ID = 'cobalt-plating-p01dl';

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function makeToken(
  header: Record<string, unknown>,
  claims: Record<string, unknown>,
  privateKey?: ReturnType<typeof generateKeyPairSync>['privateKey'],
  signerOverride?: unknown,
): string {
  const encodedHeader = encodeJson(header);
  const encodedClaims = encodeJson(claims);
  const message = `${encodedHeader}.${encodedClaims}`;
  const key = (signerOverride ?? privateKey) as import('node:crypto').KeyObject;
  if (!key) return `${message}.c2ln`;
  const signer = createSign('RSA-SHA256');
  signer.update(message);
  signer.end();
  return `${message}.${signer.sign(key).toString('base64url')}`;
}

function validClaims(overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    aud: PROJECT_ID,
    iss: `https://securetoken.google.com/${PROJECT_ID}`,
    exp: now + 3600,
    iat: now,
    auth_time: now,
    sub: 'unit-test-user',
    email: 'user@example.com',
    email_verified: true,
    ...overrides,
  };
}

test('rejects malformed ID token structures before network access', async () => {
  await assert.rejects(() => verifyFirebaseIdToken('not-a-jwt'), /Malformed Firebase ID token/);
  await assert.rejects(() => verifyFirebaseIdToken('one.two'), /Malformed Firebase ID token/);
});

test('rejects token algorithms other than RS256 before network access', async () => {
  const malformed = `${encodeJson({ alg: 'HS256', kid: 'test' })}.${encodeJson(validClaims())}.c2ln`;
  await assert.rejects(() => verifyFirebaseIdToken(malformed), /Unsupported Firebase ID token signing header/);
});

test('rejects ID token headers that do not specify a key ID', async () => {
  const malformed = `${encodeJson({ alg: 'RS256' })}.${encodeJson(validClaims())}.c2ln`;
  await assert.rejects(() => verifyFirebaseIdToken(malformed), /Unsupported Firebase ID token signing header/);
});

test('verifies Firebase token signature and required claims using cached Google certificates', async () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const certificateKey = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ 'unit-test-key': certificateKey }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=60' },
  })) as typeof fetch;

  try {
    const valid = await verifyFirebaseIdToken(
      makeToken({ alg: 'RS256', kid: 'unit-test-key', typ: 'JWT' }, validClaims(), privateKey),
    );
    assert.equal(valid.uid, 'unit-test-user');
    assert.equal(valid.email, 'user@example.com');
    assert.equal(valid.email_verified, true);

    await assert.rejects(
      () => verifyFirebaseIdToken(makeToken(
        { alg: 'RS256', kid: 'unit-test-key' },
        validClaims({ aud: 'another-project' }),
        privateKey,
      )),
      /audience is invalid/,
    );

    const { privateKey: wrongPrivateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    await assert.rejects(
      () => verifyFirebaseIdToken(makeToken(
        { alg: 'RS256', kid: 'unit-test-key' },
        validClaims(),
        wrongPrivateKey,
      )),
      /signature is invalid/,
    );

    await assert.rejects(
      () => verifyFirebaseIdToken(makeToken(
        { alg: 'RS256', kid: 'unit-test-key' },
        validClaims({ exp: Math.floor(Date.now() / 1000) - 1 }),
        privateKey,
      )),
      /has expired/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
