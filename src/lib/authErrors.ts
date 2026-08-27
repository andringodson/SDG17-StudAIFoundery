/** Maps API error codes to the exact user-facing copy from the auth spec.
 * Shared by every auth surface (the Action Centre quick panel and the
 * dedicated /auth/* pages) so the wording stays consistent in one place. */
export function authErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'invalid_credentials':
      return 'The email or password you entered is incorrect.';
    case 'not_verified':
      return 'Please verify your email before continuing.';
    case 'email_registered':
      return 'An account already exists with this email.';
    case 'weak_password':
      return 'Please create a stronger password.';
    case 'too_many_attempts':
      return 'Too many login attempts. Please wait before trying again or reset your password.';
    case 'db_not_configured':
      return 'The database is not connected yet — this needs a Postgres project (Neon recommended) set up in .env.local.';
    case 'network_error':
      return 'Unable to connect. Please check your internet connection and try again.';
    default:
      return code || 'Something went wrong. Please try again.';
  }
}
