import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signOut as fbSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  User,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';
import { GMAIL_SCOPES, setGmailAccessToken } from './gmail';

const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
};

// Initialize Firebase App
export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth: Auth = getAuth(app);

// Initialize Firestore with custom database ID
const customDbId = (firebaseConfigData as any).firestoreDatabaseId;
export const db: Firestore = customDbId
  ? getFirestore(app, customDbId)
  : getFirestore(app);

// Remove legacy simulated sessions from versions that stored local passwords for demo sign-in.
const LEGACY_FALLBACK_SESSION_KEY = 'marktxpo_active_fallback_user';
const LEGACY_REGISTERED_ACCOUNTS_KEY = 'marktxpo_registered_accounts';
try {
  localStorage.removeItem(LEGACY_FALLBACK_SESSION_KEY);
  localStorage.removeItem(LEGACY_REGISTERED_ACCOUNTS_KEY);
} catch {
  // Storage can be unavailable in privacy-restricted browser contexts.
}
type AuthListener = (user: User | null) => void;
const authListeners = new Set<AuthListener>();

function notifyAuthListeners(user: User | null) {
  authListeners.forEach((listener) => {
    try {
      listener(user);
    } catch {}
  });
}

export function getActiveUser(): User | null {
  return auth.currentUser;
}

// Test connection check as mandated by Firebase skill
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    // A permission-denied response proves the server was reached; other errors
    // should not be reported as a healthy database connection.
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
    if (code === 'permission-denied') return true;

    console.warn('Firestore connection check failed:', error);
    return false;
  }
}

// Subscribe to Firebase Authentication only. Local browser records are not identities.
export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  authListeners.add(callback);
  const unsubscribe = onAuthStateChanged(auth, callback);
  return () => {
    authListeners.delete(callback);
    unsubscribe();
  };
}

// Sync authenticated Firebase or fallback trader user with Cloud SQL backend
async function syncUserToCloudSql(user: User, displayName?: string): Promise<void> {
  try {
    const token = await user.getIdToken();
    if (!token) throw new Error('Firebase did not return an ID token.');

    const response = await fetch('/api/sql/sync-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        displayName: displayName || user.displayName || undefined,
      }),
    });
    if (!response.ok) {
      console.warn(`[Cloud SQL] User sync returned HTTP ${response.status}; Firebase Auth remains the identity source.`);
    }
  } catch (error) {
    // SQL profile sync is best-effort; never substitute caller-controlled identity headers.
    console.warn('[Cloud SQL] User sync unavailable:', error instanceof Error ? error.message : 'unknown error');
  }
}

// Provision starter profile, watchlist, and game progress for a user
async function provisionStarterData(user: User, input?: Partial<RegisterUserInput>): Promise<void> {
  const existingProfile = await getDbUserProfile(user.uid);
  const profileDoc: DbUserProfile = {
    uid: user.uid,
    displayName: input?.displayName || user.displayName || existingProfile?.displayName || 'Floor Trader',
    email: input?.email || user.email || existingProfile?.email || '',
    role: existingProfile?.role || 'user',
    language: input?.language || existingProfile?.language || 'en',
    totalXP: existingProfile?.totalXP ?? 0,
    rankTitle: existingProfile?.rankTitle || 'Junior Floor Trader',
    preferredExchange: input?.preferredExchange || existingProfile?.preferredExchange || 'BOTH',
    experienceLevel: input?.experienceLevel || existingProfile?.experienceLevel || 'Beginner Student',
    virtualCapital: input?.virtualCapital || existingProfile?.virtualCapital || 1000000,
    createdAt: existingProfile?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await saveDbUserProfile(profileDoc);

  if (!existingProfile) {
    // Initialize empty progress; do not seed demo tickers into a new user's real watchlist.
    await saveDbGameProgress({
      id: 'progress-' + user.uid,
      userId: user.uid,
      totalXP: 0,
      currentStreak: 0,
      highestStreak: 0,
      completedLevels: '{}',
      updatedAt: new Date().toISOString(),
    });
  }
}

// Guest access is still a genuine Firebase anonymous-auth session, not a local fake identity.
export async function signInAsGuest(): Promise<User> {
  try {
    const result = await signInAnonymously(auth);
    await provisionStarterData(result.user, {
      displayName: 'Guest Floor Trader',
      preferredExchange: 'BOTH',
    });
    await syncUserToCloudSql(result.user, 'Guest Floor Trader');
    return result.user;
  } catch (error) {
    throw new Error(
      'Guest access is unavailable. Enable Anonymous Authentication in Firebase Console or sign in with an account.',
      { cause: error },
    );
  }
}

// Google sign-in must complete in Firebase; no local identity is created on failure.
export async function signInWithGoogle(customInput?: Partial<RegisterUserInput>): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');
  provider.setCustomParameters({ prompt: 'select_account' });

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (credential?.accessToken) setGmailAccessToken(credential.accessToken);

  await provisionStarterData(result.user, customInput);
  await syncUserToCloudSql(result.user, customInput?.displayName);
  notifyAuthListeners(result.user);
  return result.user;
}

// Sign out from the real Firebase session and discard legacy simulated account records.
export async function logOut(): Promise<void> {
  const uid = auth.currentUser?.uid;
  try {
    localStorage.removeItem(LEGACY_FALLBACK_SESSION_KEY);
    localStorage.removeItem(LEGACY_REGISTERED_ACCOUNTS_KEY);
    localStorage.removeItem('marktxpo_user_profile');
    if (uid) {
      for (const key of [
        `marktxpo_profile_${uid}`,
        `marktxpo_watchlist_${uid}`,
        `marktxpo_portfolio_${uid}`,
        `marktxpo_game_${uid}`,
        `marktxpo_alerts_${uid}`,
      ]) localStorage.removeItem(key);
    }
  } catch {}
  setGmailAccessToken(null);
  await fbSignOut(auth);
  notifyAuthListeners(null);
}

// User Registration Input
export interface RegisterUserInput {
  email: string;
  password?: string;
  displayName: string;
  preferredExchange?: 'NSE' | 'BSE' | 'BOTH';
  experienceLevel?: string;
  language?: 'en' | 'hi' | 'gu' | 'ta' | 'mr' | 'bn';
  virtualCapital?: number;
}

// Registration succeeds only when Firebase creates a real account.
export async function registerNewUser(input: RegisterUserInput): Promise<User> {
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();
  if (!email || !email.includes('@')) throw new Error('Enter a valid email address.');
  if (!input.password || input.password.length < 6) throw new Error('Password must contain at least 6 characters.');
  if (!displayName || displayName.length > 100) throw new Error('Name must contain 1–100 characters.');
  const initialCapital = input.virtualCapital ?? 1000000;
  if (!Number.isFinite(initialCapital) || initialCapital < 100000 || initialCapital > 10000000) {
    throw new Error('Starting virtual capital must be between ₹1 lakh and ₹1 crore.');
  }

  const credential = await createUserWithEmailAndPassword(auth, email, input.password);
  if (displayName) {
    try {
      await updateProfile(credential.user, { displayName });
    } catch {
      console.warn('Firebase account was created, but the display name could not be updated.');
    }
  }

  await provisionStarterData(credential.user, { ...input, email, displayName });
  await syncUserToCloudSql(credential.user, displayName);
  notifyAuthListeners(credential.user);
  return credential.user;
}

// Login succeeds only when Firebase verifies the email/password credentials.
export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const normalizedEmail = email.trim().toLowerCase();
  const credential = await signInWithEmailAndPassword(auth, normalizedEmail, pass);
  await provisionStarterData(credential.user);
  await syncUserToCloudSql(credential.user);
  notifyAuthListeners(credential.user);
  return credential.user;
}

// Send a password reset email through Firebase Auth without creating a local session.
export async function requestPasswordReset(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Enter a valid email address first.');
  }
  await sendPasswordResetEmail(auth, normalizedEmail);
}

// Database Interfaces
export interface DbUserProfile {
  uid: string;
  displayName?: string;
  email?: string;
  role: 'user' | 'admin';
  language?: 'en' | 'hi' | 'gu' | 'ta' | 'mr' | 'bn';
  totalXP: number;
  rankTitle?: string;
  preferredExchange?: 'NSE' | 'BSE' | 'BOTH';
  experienceLevel?: string;
  virtualCapital?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DbWatchlistItem {
  id: string;
  userId: string;
  ticker: string;
  stockName: string;
  exchange?: 'NSE' | 'BSE' | 'BOTH';
  targetPrice?: number;
  notes?: string;
  addedAt: string;
}

export interface DbPortfolioPosition {
  id: string;
  userId: string;
  ticker: string;
  stockName?: string;
  exchange?: 'NSE' | 'BSE';
  type: 'BUY' | 'SHORT';
  shares: number;
  entryPrice: number;
  stopLoss?: number;
  targetPrice?: number;
  isPaperTrade: boolean;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  closedAt?: string;
}

export interface DbTradeAlert {
  id: string;
  userId: string;
  ticker: string;
  condition: 'ABOVE' | 'BELOW' | 'ARBITRAGE_SPREAD' | 'VOLATILITY_EXPANSION';
  threshold: number;
  intradayRange?: number;
  average14DayRange?: number;
  expansionRatio?: number;
  isActive: boolean;
  createdAt: string;
}

export interface DbGameProgress {
  id: string;
  userId: string;
  completedLevels?: string;
  totalXP: number;
  currentStreak: number;
  highestStreak: number;
  lastChallengeDate?: string;
  updatedAt: string;
}

// Save or Update User Profile
export async function saveDbUserProfile(profile: DbUserProfile): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== profile.uid) throw new Error('Sign in with the matching account before saving a user profile.');
  try {
    localStorage.setItem(`marktxpo_profile_${profile.uid}`, JSON.stringify(profile));
  } catch {}
  if (!auth.currentUser || auth.currentUser.uid !== profile.uid) return;
  try {
    const userRef = doc(db, 'users', profile.uid);
    await setDoc(userRef, profile, { merge: true });
  } catch (err) {
    console.error('Failed to save user profile to Firestore:', err);
    throw new Error('Could not save the user profile. Check the connection and Firestore rules.', { cause: err });
  }
}

// Fetch User Profile
export async function getDbUserProfile(uid: string): Promise<DbUserProfile | null> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return null;
  if (auth.currentUser && auth.currentUser.uid === uid) {
    try {
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data() as DbUserProfile;
        try {
          localStorage.setItem(`marktxpo_profile_${uid}`, JSON.stringify(data));
        } catch {}
        return data;
      }
    } catch (err) {
      console.error('Failed to get user profile from Firestore:', err);
    }
  }
  try {
    const cached = localStorage.getItem(`marktxpo_profile_${uid}`);
    if (cached) return JSON.parse(cached) as DbUserProfile;
  } catch {}
  return null;
}

// Watchlist CRUD
export async function saveDbWatchlistItem(item: DbWatchlistItem): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== item.userId) throw new Error('Sign in with the matching account before saving a watchlist item.');
  try {
    const key = `marktxpo_watchlist_${item.userId}`;
    const existing: DbWatchlistItem[] = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = existing.filter((i) => i.id !== item.id);
    filtered.push(item);
    localStorage.setItem(key, JSON.stringify(filtered));
  } catch {}
  if (!auth.currentUser || auth.currentUser.uid !== item.userId) return;
  try {
    const itemRef = doc(db, 'users', item.userId, 'watchlist', item.id);
    await setDoc(itemRef, item);
  } catch (err) {
    console.error('Failed to save watchlist item to Firestore:', err);
    throw new Error('Could not save the watchlist item.', { cause: err });
  }
}

export async function deleteDbWatchlistItem(userId: string, itemId: string): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    throw new Error('Sign in with the matching account before deleting a watchlist item.');
  }
  try {
    await deleteDoc(doc(db, 'users', userId, 'watchlist', itemId));
    try {
      const key = 'marktxpo_watchlist_' + userId;
      const existing: DbWatchlistItem[] = JSON.parse(localStorage.getItem(key) || '[]');
      localStorage.setItem(key, JSON.stringify(existing.filter((item) => item.id !== itemId)));
    } catch {}
  } catch (error) {
    throw new Error('Could not delete the watchlist item from Firestore.', { cause: error });
  }
}

export async function getDbWatchlist(userId: string): Promise<DbWatchlistItem[]> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return [];
  if (auth.currentUser && auth.currentUser.uid === userId) {
    try {
      const collRef = collection(db, 'users', userId, 'watchlist');
      const snap = await getDocs(collRef);
      return snap.docs.map((d) => d.data() as DbWatchlistItem);
    } catch (err) {
      console.error('Failed to get watchlist from Firestore:', err);
    }
  }
  try {
    const key = `marktxpo_watchlist_${userId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

// Portfolio CRUD
export async function saveDbPortfolioPosition(pos: DbPortfolioPosition): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== pos.userId) {
    throw new Error('Sign in with the matching account before saving a portfolio position.');
  }
  try {
    const posRef = doc(db, 'users', pos.userId, 'portfolio', pos.id);
    await setDoc(posRef, pos);
    const key = 'marktxpo_portfolio_' + pos.userId;
    const existing: DbPortfolioPosition[] = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify([...existing.filter((item) => item.id !== pos.id), pos]));
  } catch (error) {
    throw new Error('Could not save this portfolio position to Firestore. Check the connection and security rules.', { cause: error });
  }
}

export async function getDbPortfolio(userId: string): Promise<DbPortfolioPosition[]> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    throw new Error('You can only read the signed-in user portfolio.');
  }
  try {
    const collRef = collection(db, 'users', userId, 'portfolio');
    const snap = await getDocs(collRef);
    const positions = snap.docs.map((docSnap) => docSnap.data() as DbPortfolioPosition);
    try { localStorage.setItem('marktxpo_portfolio_' + userId, JSON.stringify(positions)); } catch {}
    return positions;
  } catch (error) {
    throw new Error('Could not load this portfolio from Firestore.', { cause: error });
  }
}

export async function deleteDbPortfolioPosition(userId: string, positionId: string): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    throw new Error('Sign in with the matching account before deleting a portfolio position.');
  }
  try {
    await deleteDoc(doc(db, 'users', userId, 'portfolio', positionId));
    const key = 'marktxpo_portfolio_' + userId;
    const existing: DbPortfolioPosition[] = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify(existing.filter((item) => item.id !== positionId)));
  } catch (error) {
    throw new Error('Could not delete this portfolio position from Firestore.', { cause: error });
  }
}
// Game Progress & Streaks Sync
export async function saveDbGameProgress(progress: DbGameProgress): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== progress.userId) throw new Error('Sign in with the matching account before saving game progress.');
  try {
    localStorage.setItem(`marktxpo_game_${progress.userId}`, JSON.stringify(progress));
  } catch {}
  if (!auth.currentUser || auth.currentUser.uid !== progress.userId) return;
  try {
    const progRef = doc(db, 'users', progress.userId, 'game_progress', progress.id);
    await setDoc(progRef, progress, { merge: true });
  } catch (err) {
    console.error('Failed to save game progress to Firestore:', err);
    throw new Error('Could not save game progress.', { cause: err });
  }
}

export async function getDbGameProgress(userId: string): Promise<DbGameProgress | null> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return null;
  if (auth.currentUser && auth.currentUser.uid === userId) {
    try {
      const collRef = collection(db, 'users', userId, 'game_progress');
      const snap = await getDocs(collRef);
      if (!snap.empty) {
        return snap.docs[0].data() as DbGameProgress;
      }
    } catch (err) {
      console.error('Failed to get game progress from Firestore:', err);
    }
  }
  try {
    const cached = localStorage.getItem(`marktxpo_game_${userId}`);
    if (cached) return JSON.parse(cached) as DbGameProgress;
  } catch {}
  return null;
}

// Trade Alerts CRUD
export async function saveDbTradeAlert(alert: DbTradeAlert): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== alert.userId) throw new Error('Sign in with the matching account before saving an alert.');
  try {
    const key = `marktxpo_alerts_${alert.userId}`;
    const existing: DbTradeAlert[] = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = existing.filter((a) => a.id !== alert.id);
    filtered.push(alert);
    localStorage.setItem(key, JSON.stringify(filtered));
  } catch {}
  if (!auth.currentUser || auth.currentUser.uid !== alert.userId) return;
  try {
    const alertRef = doc(db, 'users', alert.userId, 'alerts', alert.id);
    await setDoc(alertRef, alert, { merge: true });
  } catch (err) {
    console.error('Failed to save trade alert to Firestore:', err);
  }
}

export async function deleteDbTradeAlert(userId: string, alertId: string): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) throw new Error('Sign in with the matching account before deleting an alert.');
  try {
    const key = `marktxpo_alerts_${userId}`;
    const existing: DbTradeAlert[] = JSON.parse(localStorage.getItem(key) || '[]');
    localStorage.setItem(key, JSON.stringify(existing.filter((a) => a.id !== alertId)));
  } catch {}
  if (!auth.currentUser || auth.currentUser.uid !== userId) return;
  try {
    const alertRef = doc(db, 'users', userId, 'alerts', alertId);
    await deleteDoc(alertRef);
  } catch (err) {
    console.error('Failed to delete trade alert from Firestore:', err);
  }
}

export async function getDbTradeAlerts(userId: string): Promise<DbTradeAlert[]> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return [];
  if (auth.currentUser && auth.currentUser.uid === userId) {
    try {
      const collRef = collection(db, 'users', userId, 'alerts');
      const snap = await getDocs(collRef);
      return snap.docs.map((d) => d.data() as DbTradeAlert);
    } catch (err) {
      console.error('Failed to get trade alerts from Firestore:', err);
    }
  }
  try {
    const key = `marktxpo_alerts_${userId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}
