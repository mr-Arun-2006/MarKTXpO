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

  if (code === 'auth/unauthorized-domain') {
    return `Firebase blocked this website domain: ${hostname}. In Firebase Console for project "${projectId}", open Authentication → Settings → Authorized domains and add exactly "${hostname}" (hostname only: no https://, port, or path). Also add your stable production domain so future deploys continue to work. Save, reload the site, and try Google sign-in again. Firebase auth domain: ${authDomain}.`;
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
