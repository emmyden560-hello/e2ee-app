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
  from_user_id: string;
  to_user_id: string;
  payload: {
    encryptedKey: string;
    encryptedKeyForSelf?: string;
    ciphertext: string;
    iv: string;
  };
  created_at: string;
  delivered?: boolean;
}

export interface SendMessagePayload {
  to: string;
  payload: {
    encrypted_key: string;
    encrypted_key_for_self: string;
    ciphertext: string;
    iv: string;
  };
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

/**
 * Handle fetch errors with better diagnostics
 */
function handleFetchError(error: unknown, endpoint: string): string {
  if (error instanceof TypeError) {
    if (error.message.includes('Failed to fetch')) {
      return `Cannot connect to server at ${BASE_URL}. Check your internet connection and ensure the backend is running. Endpoint: ${endpoint}`;
    }
    if (error.message.includes('NetworkError')) {
      return `Network error: Unable to reach the backend server at ${BASE_URL}`;
    }
  }
  const errorMsg = error instanceof Error ? error.message : String(error);
  return `Request failed: ${errorMsg}`;
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

/**
 * Enhanced fetch that handles token refresh on 401
 */
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };

  let res = await fetch(url, { ...options, headers });

  // If unauthorized, attempt to refresh the token once
  if (res.status === 401) {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('whisper_refresh_token') : null;
    if (refreshToken) {
      console.log('🔄 Access token expired, attempting refresh...');
      try {
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (refreshRes.ok) {
          const data: AuthResponse = await refreshRes.json();
          if (data.access_token) {
            localStorage.setItem('whisper_access_token', data.access_token);
            if (data.refresh_token) {
              localStorage.setItem('whisper_refresh_token', data.refresh_token);
            }
            
            console.log('✅ Token refreshed successfully, retrying request');
            
            // Retry with new token
            const retryHeaders = {
              ...getAuthHeaders(),
              ...(options.headers || {}),
            };
            res = await fetch(url, { ...options, headers: retryHeaders });
          }
        } else {
          console.warn('❌ Token refresh failed - session expired');
          // Clear tokens and notify UI
          localStorage.removeItem('whisper_access_token');
          localStorage.removeItem('whisper_refresh_token');
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('whisper_session_expired'));
          }
        }
      } catch (e) {
        console.error('❌ Error during token refresh:', e);
      }
    }
  }

  return res;
}

export const api = {
  registerUser: async (payload: {
    username: string;
    display_name: string;
    password?: string;
    public_key: string;
    wrapped_private_key: string;
    pbkdf2_salt: string;
  }): Promise<AuthResponse> => {
    try {
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
    } catch (error) {
      throw new Error(handleFetchError(error, '/auth/register'));
    }
  },

  loginUser: async (username: string, password?: string): Promise<AuthResponse> => {
    try {
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
    } catch (error) {
      throw new Error(handleFetchError(error, '/auth/login'));
    }
  },

  refreshToken: async (refresh_token: string): Promise<AuthResponse> => {
    try {
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
    } catch (error) {
      throw new Error(handleFetchError(error, '/auth/refresh'));
    }
  },

  logoutUser: async (refresh_token: string): Promise<void> => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/auth/logout`, {
        method: 'POST',
        body: JSON.stringify({ refresh_token }),
      });
      // Don't throw on error - logout should succeed even if endpoint fails
      if (!res.ok) {
        console.warn(`Logout endpoint returned ${res.status}`);
      }
    } catch (e) {
      console.warn('Logout request failed:', e instanceof Error ? e.message : e);
    }
  },

  searchUsers: async (query: string): Promise<UserProfile[]> => {
    if (!query) return [];
    try {
      const encodedQuery = encodeURIComponent(query);
      const res = await fetchWithAuth(`${BASE_URL}/users/search?q=${encodedQuery}`, {
        method: 'GET',
      });

      if (!res.ok) throw new Error(await parseError(res));
      return await res.json();
    } catch (error) {
      throw new Error(handleFetchError(error, '/users/search'));
    }
  },

  getPublicKey: async (userId: string): Promise<string> => {
    try {
      const encodedId = encodeURIComponent(userId);
      const res = await fetchWithAuth(`${BASE_URL}/users/${encodedId}/public-key`, {
        method: 'GET',
      });

      if (!res.ok) throw new Error(await parseError(res));
      const data: PublicKeyResponse = await res.json();
      return data.public_key;
    } catch (error) {
      throw new Error(handleFetchError(error, '/users/:id/public-key'));
    }
  },

  getConversations: async (): Promise<Conversation[]> => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/conversations`, {
        method: 'GET',
      });

      if (!res.ok) throw new Error(await parseError(res));
      return await res.json();
    } catch (error) {
      throw new Error(handleFetchError(error, '/conversations'));
    }
  },

  getConversationMessages: async (userId: string, before?: string): Promise<MessageData[]> => {
    try {
      const encodedId = encodeURIComponent(userId);
      const url = new URL(`${BASE_URL}/conversations/${encodedId}/messages`);
      if (before) url.searchParams.append('before', before);
      
      const res = await fetchWithAuth(url.toString(), {
        method: 'GET',
      });

      if (!res.ok) throw new Error(await parseError(res));
      return await res.json();
    } catch (error) {
      throw new Error(handleFetchError(error, '/conversations/:userId/messages'));
    }
  },

  sendRestMessage: async (payload: SendMessagePayload): Promise<MessageData> => {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/messages`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await parseError(res));
      return await res.json();
    } catch (error) {
      throw new Error(handleFetchError(error, '/messages'));
    }
  },
};
