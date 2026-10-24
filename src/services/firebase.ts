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
export const db: Firestore = firebaseConfigData.firestoreDatabaseId
  ? getFirestore(app, firebaseConfigData.firestoreDatabaseId)
  : getFirestore(app);

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

// Subscribe to Auth State
export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

// Guest Anonymous Sign-In
export async function signInAsGuest(): Promise<User> {
  const result = await signInAnonymously(auth);
  return result.user;
}

// Google Sign-In
export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

// Sign Out
export async function logOut(): Promise<void> {
  await fbSignOut(auth);
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

// Register New User in Firebase Auth and Firestore Database
export async function registerNewUser(input: RegisterUserInput): Promise<User> {
  let user: User;
  if (input.password && input.password.length >= 6) {
    const cred = await createUserWithEmailAndPassword(auth, input.email, input.password);
    user = cred.user;
  } else {
    const cred = await signInAnonymously(auth);
    user = cred.user;
  }

  if (input.displayName) {
    try {
      await updateProfile(user, { displayName: input.displayName });
    } catch {}
  }

  // 1. Initialize user profile document in Firestore
  const profileDoc: DbUserProfile = {
    uid: user.uid,
    displayName: input.displayName,
    email: input.email || user.email || '',
    role: 'user',
    language: input.language || 'en',
    totalXP: 100, // Welcome signup bonus
    rankTitle: 'Junior Floor Trader',
    preferredExchange: input.preferredExchange || 'BOTH',
    experienceLevel: input.experienceLevel || 'Beginner Student',
    virtualCapital: input.virtualCapital || 1000000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await saveDbUserProfile(profileDoc);

  // 2. Initialize default starter watchlist in Firestore
  const starterTickers = [
    { ticker: 'RELIANCE', name: 'Reliance Industries Ltd.', target: 2850 },
    { ticker: 'TCS', name: 'Tata Consultancy Services', target: 4100 },
    { ticker: 'HDFCBANK', name: 'HDFC Bank Ltd.', target: 1650 },
  ];
  for (const st of starterTickers) {
    await saveDbWatchlistItem({
      id: `w-${st.ticker}-${user.uid}`,
      userId: user.uid,
      ticker: st.ticker,
      stockName: st.name,
      exchange: input.preferredExchange || 'BOTH',
      targetPrice: st.target,
      notes: 'Initial starter watchlist allocation.',
      addedAt: new Date().toISOString(),
    });
  }

  // 3. Initialize game progress document in Firestore
  await saveDbGameProgress({
    id: `progress-${user.uid}`,
    userId: user.uid,
    totalXP: 100,
    currentStreak: 0,
    highestStreak: 0,
    completedLevels: '{}',
    updatedAt: new Date().toISOString(),
  });

  return user;
}

// Login with Email and Password
export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  return cred.user;
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
  try {
    const userRef = doc(db, 'users', profile.uid);
    await setDoc(userRef, profile, { merge: true });
  } catch (err) {
    console.error('Failed to save user profile to Firestore:', err);
    throw new Error('Could not save the user profile. Check the connection and Firestore rules.', { cause: err });
  }

// Fetch User Profile
export async function getDbUserProfile(uid: string): Promise<DbUserProfile | null> {
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as DbUserProfile;
    }
  } catch (err) {
    console.error('Failed to get user profile from Firestore:', err);
  }
  return null;
}

// Watchlist CRUD
export async function saveDbWatchlistItem(item: DbWatchlistItem): Promise<void> {
  try {
    const itemRef = doc(db, 'users', item.userId, 'watchlist', item.id);
    await setDoc(itemRef, item);
  } catch (err) {
    console.error('Failed to save watchlist item to Firestore:', err);
    throw new Error('Could not save the watchlist item.', { cause: err });
  }

export async function deleteDbWatchlistItem(userId: string, itemId: string): Promise<void> {
  try {
    const itemRef = doc(db, 'users', userId, 'watchlist', itemId);
    await deleteDoc(itemRef);
  } catch (err) {
    console.error('Failed to delete watchlist item from Firestore:', err);
  }
}

export async function getDbWatchlist(userId: string): Promise<DbWatchlistItem[]> {
  try {
    const collRef = collection(db, 'users', userId, 'watchlist');
    const snap = await getDocs(collRef);
    return snap.docs.map((d) => d.data() as DbWatchlistItem);
  } catch (err) {
    console.error('Failed to get watchlist from Firestore:', err);
    return [];
  }
}

// Portfolio CRUD
export async function saveDbPortfolioPosition(pos: DbPortfolioPosition): Promise<void> {
  try {
    const posRef = doc(db, 'users', pos.userId, 'portfolio', pos.id);
    await setDoc(posRef, pos);
  } catch (err) {
    console.error('Failed to save portfolio position to Firestore:', err);
  }
}

export async function getDbPortfolio(userId: string): Promise<DbPortfolioPosition[]> {
  try {
    const collRef = collection(db, 'users', userId, 'portfolio');
    const snap = await getDocs(collRef);
    return snap.docs.map((d) => d.data() as DbPortfolioPosition);
  } catch (err) {
    console.error('Failed to get portfolio from Firestore:', err);
    return [];
  }
}

// Game Progress & Streaks Sync
export async function saveDbGameProgress(progress: DbGameProgress): Promise<void> {
  try {
    const progRef = doc(db, 'users', progress.userId, 'game_progress', progress.id);
    await setDoc(progRef, progress, { merge: true });
  } catch (err) {
    console.error('Failed to save game progress to Firestore:', err);
    throw new Error('Could not save game progress.', { cause: err });
  }

export async function getDbGameProgress(userId: string): Promise<DbGameProgress | null> {
  try {
    const collRef = collection(db, 'users', userId, 'game_progress');
    const snap = await getDocs(collRef);
    if (!snap.empty) {
      return snap.docs[0].data() as DbGameProgress;
    }
  } catch (err) {
    console.error('Failed to get game progress from Firestore:', err);
  }
  return null;
}

// Trade Alerts CRUD
export async function saveDbTradeAlert(alert: DbTradeAlert): Promise<void> {
  try {
    const alertRef = doc(db, 'users', alert.userId, 'alerts', alert.id);
    await setDoc(alertRef, alert, { merge: true });
  } catch (err) {
    console.error('Failed to save trade alert to Firestore:', err);
  }
}

export async function deleteDbTradeAlert(userId: string, alertId: string): Promise<void> {
  try {
    const alertRef = doc(db, 'users', userId, 'alerts', alertId);
    await deleteDoc(alertRef);
  } catch (err) {
    console.error('Failed to delete trade alert from Firestore:', err);
  }
}

export async function getDbTradeAlerts(userId: string): Promise<DbTradeAlert[]> {
  try {
    const collRef = collection(db, 'users', userId, 'alerts');
    const snap = await getDocs(collRef);
    return snap.docs.map((d) => d.data() as DbTradeAlert);
  } catch (err) {
    console.error('Failed to get trade alerts from Firestore:', err);
    return [];
  }
}

