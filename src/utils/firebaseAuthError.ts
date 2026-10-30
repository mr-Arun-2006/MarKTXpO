import firebaseConfigData from '../../firebase-applet-config.json';

type AuthProvider = 'google' | 'email' | 'guest';

function getErrorCode(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('code' in error)) return '';
  return String((error as { code?: unknown }).code || '').toLowerCase();
}

export function getFirebaseAuthErrorMessage(error: unknown, provider: AuthProvider = 'email'): string {
  const code = getErrorCode(error);
  const projectId = String(firebaseConfigData.projectId || 'your Firebase project');
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'your deployed hostname';
  const authDomain = String(firebaseConfigData.authDomain || '');
  const firebaseSettingsUrl = `https://console.firebase.google.com/project/${encodeURIComponent(projectId)}/authentication/settings`;
  const stableProductionHostname = 'marktxpocom.vercel.app';

  if (code === 'auth/unauthorized-domain') {
    const wrongProjectHint = projectId === 'cobalt-plating-p01dl'
      ? 'The app is configured for cobalt-plating-p01dl. If the domains list shows marktxpo.firebaseapp.com or marktxpo.web.app, switch Firebase Console to cobalt-plating-p01dl; those are domains for a different Firebase project.'
      : '';
    const productionHint = hostname === stableProductionHostname
      ? ''
      : ` Also authorize the stable production hostname "${stableProductionHostname}" so future production visits work.`;

    return [
      `Firebase rejected the website hostname "${hostname}".`,
      `Open Firebase Authentication settings: ${firebaseSettingsUrl}`,
      `Confirm the selected project is "${projectId}" (configured auth domain: "${authDomain}").`,
      `Under Authentication → Settings → Authorized domains, add exactly "${hostname}" — hostname only, without https://, a port, or a path.${productionHint}`,
      wrongProjectHint,
      'Save the change, reload this site, and retry sign-in. The authorized-domain list is managed in Firebase Console; it cannot be changed by frontend code.',
    ].filter(Boolean).join(' ');
  }
  if (code === 'auth/operation-not-allowed') {
    if (provider === 'google') return 'Google sign-in is disabled for this Firebase project. Enable Google under Firebase Console → Authentication → Sign-in method.';
    if (provider === 'guest') return 'Guest sign-in is disabled for this Firebase project. Enable Anonymous under Firebase Console → Authentication → Sign-in method.';
    return 'Email/password sign-in is disabled for this Firebase project. Enable Email/Password under Firebase Console → Authentication → Sign-in method.';
  }
  if (code === 'auth/email-already-in-use') return 'An account with this email already exists. Switch to Sign In.';
  if (code === 'auth/weak-password') return 'Choose a password with at least 6 characters.';
  if (code === 'auth/invalid-email') return 'Enter a valid email address.';
  if (code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
    return 'Email or password is incorrect. Check the details and try again.';
  }
  if (code === 'auth/network-request-failed') return 'Firebase could not be reached. Check your connection and try again.';
  if (code === 'auth/too-many-requests') return 'Firebase temporarily limited sign-in attempts. Wait a little and retry.';
  if (code === 'auth/popup-blocked') return 'Your browser blocked the Google sign-in popup. Allow popups for this site and retry.';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Google sign-in was closed before it finished. Start the sign-in again when ready.';
  }
  if (code === 'auth/account-exists-with-different-credential') {
    return 'This email is already registered with another sign-in method. Use the original sign-in method for this account.';
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Firebase authentication failed. Check the Firebase project configuration and try again.';
}
