import assert from 'node:assert/strict';
import test from 'node:test';
import { isDevelopmentFallbackAuthEnabled } from './authPolicy.ts';

test('fallback authentication is disabled by default', () => {
  assert.equal(isDevelopmentFallbackAuthEnabled({}), false);
  assert.equal(isDevelopmentFallbackAuthEnabled({ NODE_ENV: 'development' }), false);
});

test('fallback authentication requires an explicit non-production opt-in', () => {
  assert.equal(
    isDevelopmentFallbackAuthEnabled({
      NODE_ENV: 'development',
      ALLOW_INSECURE_FALLBACK_AUTH: 'true',
    }),
    true,
  );
  assert.equal(
    isDevelopmentFallbackAuthEnabled({
      NODE_ENV: 'development',
      ALLOW_INSECURE_FALLBACK_AUTH: 'TRUE',
    }),
    false,
  );
});

test('fallback authentication stays disabled in production even when opted in', () => {
  assert.equal(
    isDevelopmentFallbackAuthEnabled({
      NODE_ENV: 'production',
      ALLOW_INSECURE_FALLBACK_AUTH: 'true',
    }),
    false,
  );
});
