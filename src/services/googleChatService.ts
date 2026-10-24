import { GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
import { auth } from './firebase.ts';

// Configured Google Chat user scopes
export const GOOGLE_CHAT_SCOPES = [
  'https://www.googleapis.com/auth/chat.spaces.readonly',
  'https://www.googleapis.com/auth/chat.spaces',
  'https://www.googleapis.com/auth/chat.messages.create',
  'https://www.googleapis.com/auth/chat.messages.readonly',
];

export const GOOGLE_PROJECT_ID = 'cobalt-plating-p01dl';

// In-memory token cache (never stored in localStorage/sessionStorage as required by workspace-integration skill)
let inMemoryAccessToken: string | null = null;

export function getCachedChatAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function setCachedChatAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

// Clear token on auth change
if (auth) {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      inMemoryAccessToken = null;
    }
  });
}

export interface GoogleChatSpace {
  name: string; // e.g., "spaces/AAAAAAAAAA"
  displayName?: string;
  type?: 'SPACE' | 'GROUP_CHAT' | 'DIRECT_MESSAGE';
  spaceType?: 'SPACE' | 'GROUP_CHAT' | 'DIRECT_MESSAGE';
  description?: string;
  externalUserAllowed?: boolean;
}

export interface GoogleChatMessage {
  name: string;
  text?: string;
  createTime?: string;
  sender?: {
    name?: string;
    displayName?: string;
    avatarUrl?: string;
    type?: string;
  };
}

export interface ChatApiError {
  isConfigError: boolean;
  message: string;
  statusCode?: number;
  consoleUrl?: string;
}

/**
 * Initiates Google OAuth popup with Google Chat scopes requested.
 * Caches access token in-memory and returns the authenticated user and token.
 */
export async function connectGoogleChat(): Promise<{ user: User; accessToken: string }> {
  const provider = new GoogleAuthProvider();
  for (const scope of GOOGLE_CHAT_SCOPES) {
    provider.addScope(scope);
  }
  // Force prompt to ensure the user can consent to chat permissions
  provider.setCustomParameters({
    prompt: 'consent',
    access_type: 'offline',
  });

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken;

  if (!accessToken) {
    throw new Error('No OAuth access token was returned for Google Chat. Please try signing in again.');
  }

  inMemoryAccessToken = accessToken;
  return { user: result.user, accessToken };
}

/**
 * Disconnects the in-memory Google Chat session.
 */
export function disconnectGoogleChat(): void {
  inMemoryAccessToken = null;
}

/**
 * Formats API errors, identifying 404 Chat app configuration prerequisites.
 */
function parseChatError(err: any, status?: number): ChatApiError {
  const msg = err?.error?.message || err?.message || String(err);
  const is404 = status === 404 || msg.includes('Google Chat app not found') || msg.includes('404');
  const consoleUrl = `https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat?project=${GOOGLE_PROJECT_ID}`;

  if (is404) {
    return {
      isConfigError: true,
      statusCode: 404,
      message:
        'Google Chat app not found. To create a Chat app, you must turn on the Chat API and configure the app in the Google Cloud console.',
      consoleUrl,
    };
  }

  if (status === 401 || status === 403) {
    return {
      isConfigError: false,
      statusCode: status,
      message:
        msg.includes('insufficient') || status === 403
          ? 'Access denied. Google Chat API requires a Google Workspace (Business or Enterprise) account. Standard @gmail.com consumer accounts are not supported by the Google Chat user API.'
          : 'Authentication session expired. Please reconnect your Google Workspace account.',
    };
  }

  return {
    isConfigError: false,
    statusCode: status,
    message: msg || 'An unexpected error occurred while communicating with Google Chat API.',
  };
}

/**
 * Fetches all accessible Google Chat spaces for the authenticated user.
 */
export async function fetchChatSpaces(token?: string): Promise<{ spaces: GoogleChatSpace[]; error?: ChatApiError }> {
  const activeToken = token || inMemoryAccessToken;
  if (!activeToken) {
    return {
      spaces: [],
      error: {
        isConfigError: false,
        message: 'No active Google Chat connection. Please connect your Google Workspace account.',
      },
    };
  }

  try {
    const res = await fetch('https://chat.googleapis.com/v1/spaces', {
      headers: {
        Authorization: `Bearer ${activeToken}`,
        Accept: 'application/json',
      },
    });

    const data = await res.json();
    if (!res.ok) {
      return { spaces: [], error: parseChatError(data, res.status) };
    }

    const spaces: GoogleChatSpace[] = data.spaces || [];
    return { spaces };
  } catch (err: any) {
    return { spaces: [], error: parseChatError(err) };
  }
}

/**
 * Lists recent messages in a given Google Chat space.
 */
export async function fetchSpaceMessages(
  spaceName: string,
  token?: string
): Promise<{ messages: GoogleChatMessage[]; error?: ChatApiError }> {
  const activeToken = token || inMemoryAccessToken;
  if (!activeToken) {
    return {
      messages: [],
      error: {
        isConfigError: false,
        message: 'Authentication required to view messages.',
      },
    };
  }

  try {
    const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages?pageSize=25`, {
      headers: {
        Authorization: `Bearer ${activeToken}`,
        Accept: 'application/json',
      },
    });

    const data = await res.json();
    if (!res.ok) {
      return { messages: [], error: parseChatError(data, res.status) };
    }

    const messages: GoogleChatMessage[] = data.messages || [];
    return { messages };
  } catch (err: any) {
    return { messages: [], error: parseChatError(err) };
  }
}

/**
 * Sends a message to a Google Chat space.
 * MANDATORY: Call this ONLY after the user has explicitly confirmed in the UI dialog.
 */
export async function sendChatMessage(
  spaceName: string,
  text: string,
  token?: string
): Promise<{ success: boolean; message?: GoogleChatMessage; error?: ChatApiError }> {
  const activeToken = token || inMemoryAccessToken;
  if (!activeToken) {
    return {
      success: false,
      error: {
        isConfigError: false,
        message: 'Authentication required to post messages.',
      },
    };
  }

  try {
    const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${activeToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: parseChatError(data, res.status) };
    }

    return { success: true, message: data };
  } catch (err: any) {
    return { success: false, error: parseChatError(err) };
  }
}
