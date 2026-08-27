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
      // Deliberately says nothing about DATABASE_URL, .env.local, or which
      // database vendor is missing. This renders on public pages, so it is
      // written for the person trying to sign up, not for whoever deploys
      // the app — they get the full diagnostic in the server logs via
      // DbNotConfiguredError instead.
      return 'Accounts are temporarily unavailable while this platform is being set up. Everything else on the site works — please try again later.';
    case 'server_error':
      return 'Something went wrong on our side. Please try again.';
    case 'network_error':
      return 'Unable to connect. Please check your internet connection and try again.';
    default:
      // Deliberate passthrough: unmapped strings reaching here are validation
      // messages written for the person filling in the form ("Enter a valid
      // phone number"). Raw internal errors never reach this point — see
      // handleApiError, which replaces 500 detail with a generic message
      // before it leaves the server.
      return code || 'Something went wrong. Please try again.';
  }
}
