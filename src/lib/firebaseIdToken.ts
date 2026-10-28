import { verify as verifySignature } from 'node:crypto';
import firebaseConfigData from '../../firebase-applet-config.json' with { type: 'json' };

interface FirebaseTokenHeader {
  alg?: unknown;
  kid?: unknown;
  typ?: unknown;
}

interface FirebaseTokenClaims {
  aud?: unknown;
  iss?: unknown;
  exp?: unknown;
  iat?: unknown;
  auth_time?: unknown;
  nbf?: unknown;
  sub?: unknown;
  email?: unknown;
  email_verified?: unknown;
  [claim: string]: unknown;
}

export interface VerifiedFirebaseIdToken {
  uid: string;
  email?: string;
  email_verified?: boolean;
  [claim: string]: unknown;
}

interface CertificateCache {
  certificates: Record<string, string>;
  expiresAt: number;
}

const FIREBASE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let certificateCache: CertificateCache | undefined;

function decodeJsonSegment<T>(segment: string): T {
  try {
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as T;
  } catch {
    throw new Error('Malformed Firebase ID token JSON.');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function getSigningCertificates(forceRefresh = false): Promise<Record<string, string>> {
  if (!forceRefresh && certificateCache && certificateCache.expiresAt > Date.now()) {
    return certificateCache.certificates;
  }

  const response = await fetch(FIREBASE_CERTS_URL, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`Firebase signing certificates unavailable (HTTP ${response.status}).`);

  const payload: unknown = await response.json();
  if (!isRecord(payload) || !Object.values(payload).every((value) => typeof value === 'string')) {
    throw new Error('Firebase signing certificate response was invalid.');
  }

  const cacheControl = response.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/(?:^|,)\s*max-age=(\d+)/i);
  const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 300;
  certificateCache = {
    certificates: payload as Record<string, string>,
    expiresAt: Date.now() + Math.max(0, maxAgeSeconds) * 1000,
  };
  return certificateCache.certificates;
}

/**
 * Verifies Firebase ID tokens against Google's rotating public X.509 certificates.
 * Checks RS256, the signature, issuer, audience, expiry, issue/auth times and UID.
 * Revocation checks are not performed (matching Firebase Admin's default verifyIdToken behavior).
 */
export async function verifyFirebaseIdToken(token: string): Promise<VerifiedFirebaseIdToken> {
  if (typeof token !== 'string' || token.length > 16_384) {
    throw new Error('Invalid Firebase ID token size.');
  }

  const pieces = token.split('.');
  if (pieces.length !== 3 || pieces.some((part) => !part)) {
    throw new Error('Malformed Firebase ID token.');
  }

  const header = decodeJsonSegment<FirebaseTokenHeader>(pieces[0]);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid) {
    throw new Error('Unsupported Firebase ID token signing header.');
  }

  let certificates = await getSigningCertificates();
  let certificate = certificates[header.kid];
  if (!certificate) {
    certificates = await getSigningCertificates(true);
    certificate = certificates[header.kid];
  }
  if (!certificate) throw new Error('Firebase signing key ID was not found.');

  const signedContent = Buffer.from(`${pieces[0]}.${pieces[1]}`, 'utf8');
  const signature = Buffer.from(pieces[2], 'base64url');
  if (!verifySignature('RSA-SHA256', signedContent, certificate, signature)) {
    throw new Error('Firebase ID token signature is invalid.');
  }

  const claims = decodeJsonSegment<FirebaseTokenClaims>(pieces[1]);
  const projectId = String(firebaseConfigData.projectId || process.env.FIREBASE_PROJECT_ID || '');
  const now = Math.floor(Date.now() / 1000);

  if (!projectId || claims.aud !== projectId) throw new Error('Firebase ID token audience is invalid.');
  if (claims.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error('Firebase ID token issuer is invalid.');
  }
  if (typeof claims.exp !== 'number' || !Number.isFinite(claims.exp) || claims.exp <= now) {
    throw new Error('Firebase ID token has expired.');
  }
  if (typeof claims.iat !== 'number' || !Number.isFinite(claims.iat) || claims.iat > now + 60) {
    throw new Error('Firebase ID token issue time is invalid.');
  }
  if (typeof claims.auth_time !== 'number' || !Number.isFinite(claims.auth_time) || claims.auth_time > now + 60) {
    throw new Error('Firebase ID token authentication time is invalid.');
  }
  if (
    claims.nbf !== undefined &&
    (typeof claims.nbf !== 'number' || !Number.isFinite(claims.nbf) || claims.nbf > now + 60)
  ) {
    throw new Error('Firebase ID token is not yet valid.');
  }
  if (typeof claims.exp === 'number' && typeof claims.iat === 'number' && claims.exp <= claims.iat) {
    throw new Error('Firebase ID token expiry is invalid.');
  }
  if (typeof claims.sub !== 'string' || claims.sub.length < 1 || claims.sub.length > 128) {
    throw new Error('Firebase ID token user ID is invalid.');
  }

  return {
    ...claims,
    uid: claims.sub,
    email: typeof claims.email === 'string' ? claims.email : undefined,
    email_verified: typeof claims.email_verified === 'boolean' ? claims.email_verified : undefined,
  };
}
