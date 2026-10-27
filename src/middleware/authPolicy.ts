type AuthEnvironment = {
  readonly NODE_ENV?: string;
  readonly ALLOW_INSECURE_FALLBACK_AUTH?: string;
};

/**
 * Fallback identity headers are forgeable and must never be used as production
 * authentication. They are supported only for explicit local development.
 */
export function isDevelopmentFallbackAuthEnabled(
  environment: AuthEnvironment = process.env,
): boolean {
  return environment.NODE_ENV !== 'production'
    && environment.ALLOW_INSECURE_FALLBACK_AUTH === 'true';
}
