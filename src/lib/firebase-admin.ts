import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfigData from '../../firebase-applet-config.json';

function loadServiceAccount(): ServiceAccount | undefined {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return undefined;

  try {
    return JSON.parse(raw) as ServiceAccount;
  } catch (error) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.', { cause: error });
  }
}

if (!getApps().length) {
  const serviceAccount = loadServiceAccount();
  initializeApp({
    projectId: firebaseConfigData.projectId,
    ...(serviceAccount ? { credential: cert(serviceAccount) } : {}),
  });
}

export const adminAuth = getAuth();
