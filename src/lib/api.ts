// src/lib/api.ts
function resolveBaseUrl(baseUrl: string): string {
  let url = (baseUrl || '').trim();
  if (!url) url = 'https://whisperbox.koyeb.app';
  if (url.endsWith('/')) url = url.slice(0, -1);
  if (url.toLowerCase().endsWith('/api')) url = url.slice(0, -4);
  return url;
}

export const BASE_URL = resolveBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL || 'https://whisperbox.koyeb.app');

// Type definitions
export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserProfile;
  wrapped_private_key?: string;
  pbkdf2_salt?: string;
}

export interface PublicKeyResponse {
  public_key: string;
  username: string;
}

export interface MessageData {
  id: string;
  sender_id: string;
  recipient_id: string;
  encrypted_key: string;
  encrypted_key_for_self?: string;
  ciphertext: string;
  iv: string;
  timestamp: string;
}

export interface SendMessagePayload {
  recipient_id: string;
  encrypted_key: string;
  encrypted_key_for_self: string;
  ciphertext: string;
  iv: string;
}

export interface Conversation {
  user_id: string;
  username: string;
  display_name: string;
  last_message_at: string;
}

/**
 * Parse error response from backend
 */
async function parseError(res: Response): Promise<string> {
  let errorMessage = `HTTP ${res.status}`;
  try {
    const contentType = res.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const errorData = await res.json();
      if (typeof errorData === 'object') {
        if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail
            .map((d: any) => `${d.loc?.join('.') || 'field'}: ${d.msg || 'invalid value'}`)
            .join('; ');
        } else {
          errorMessage = errorData.detail || errorData.error || errorData.message || `HTTP ${res.status}`;
        }
      }
    } else {
      errorMessage = await res.text() || `HTTP ${res.status}`;
    }
  } catch (e) {
    console.warn("Could not parse error response:", e);
  }
  return errorMessage;
}

// Token management helper
const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('whisper_access_token') : null;
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const api = {
  registerUser: async (payload: {
    username: string;
    display_name: string;
    password?: string;
    public_key: string;
    wrapped_private_key: string;
    pbkdf2_salt: string;
  }): Promise<AuthResponse> => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(await parseError(res));
    const data = await res.json();
    return data;
  },

  loginUser: async (username: string, password?: string): Promise<AuthResponse> => {
    // Some implementations might use form data for login, but we'll try JSON first based on instructions
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) throw new Error(await parseError(res));
    const data = await res.json();
    return data;
  },

  refreshToken: async (refresh_token: string): Promise<AuthResponse> => {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ refresh_token }),
    });

    if (!res.ok) throw new Error(await parseError(res));
    return await res.json();
  },

  logoutUser: async (refresh_token: string): Promise<void> => {
    await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ refresh_token }),
    }).catch(e => console.error('Logout error:', e));
  },

  searchUsers: async (query: string): Promise<UserProfile[]> => {
    if (!query) return [];
    const encodedQuery = encodeURIComponent(query);
    const res = await fetch(`${BASE_URL}/users/search?q=${encodedQuery}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!res.ok) throw new Error(await parseError(res));
    return await res.json();
  },

  getPublicKey: async (userId: string): Promise<string> => {
    const encodedId = encodeURIComponent(userId);
    const res = await fetch(`${BASE_URL}/users/${encodedId}/public-key`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!res.ok) throw new Error(await parseError(res));
    const data: PublicKeyResponse = await res.json();
    return data.public_key;
  },

  getConversations: async (): Promise<Conversation[]> => {
    const res = await fetch(`${BASE_URL}/conversations`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!res.ok) throw new Error(await parseError(res));
    return await res.json();
  },

  getConversationMessages: async (userId: string, before?: string): Promise<MessageData[]> => {
    const encodedId = encodeURIComponent(userId);
    const url = new URL(`${BASE_URL}/conversations/${encodedId}/messages`);
    if (before) url.searchParams.append('before', before);
    
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!res.ok) throw new Error(await parseError(res));
    return await res.json();
  },

  sendRestMessage: async (payload: SendMessagePayload): Promise<MessageData> => {
    const res = await fetch(`${BASE_URL}/messages`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(await parseError(res));
    return await res.json();
  },
};
