// src/lib/api.ts
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://whisperbox.koyeb.app/api';

// Type definitions
interface RegisterResponse {
  success: boolean;
  message?: string;
  id?: string;
}

interface PublicKeyResponse {
  public_key: string;
  username: string;
}

interface MessageData {
  id: string;
  sender: string;
  message: string;
  timestamp?: string;
}

interface SendMessageResponse {
  success: boolean;
  message?: string;
  id?: string;
}

/**
 * Parse error response from backend
 */
function parseErrorResponse(status: number, errorData: any): string {
  if (typeof errorData === 'string') {
    return errorData;
  }

  if (typeof errorData === 'object') {
    return errorData.error || errorData.message || `HTTP ${status}`;
  }

  return `Server error: ${status}`;
}

export const api = {
  registerUser: async (username: string, publicKey: string): Promise<RegisterResponse> => {
    if (!username || !publicKey) {
      throw new Error('Username and public key are required');
    }

    console.log("📤 Sending Registration:", { username, public_key_length: publicKey.length });

    try {
      const res = await fetch(`${BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          username: username.trim(),
          public_key: publicKey
        }),
      });

      if (!res.ok) {
        let errorMessage = `HTTP ${res.status}`;
        try {
          const contentType = res.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            const errorData = await res.json();
            errorMessage = parseErrorResponse(res.status, errorData);
          } else {
            const errorText = await res.text();
            errorMessage = errorText || `HTTP ${res.status}`;
          }
        } catch (e) {
          console.warn("Could not parse error response:", e);
        }

        console.error(`❌ Registration Error:`, errorMessage);
        throw new Error(errorMessage);
      }

      const data = await res.json();
      console.log("✅ Registration successful:", data);
      return data;
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('Network error: Unable to reach the server. Check your connection.');
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error during registration');
    }
  },

  getPublicKey: async (username: string): Promise<string> => {
    if (!username) {
      throw new Error('Username is required');
    }

    try {
      const encodedUsername = encodeURIComponent(username.trim());
      const res = await fetch(`${BASE_URL}/users/public-key/${encodedUsername}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(`User "${username}" not found`);
        }

        let errorMessage = `HTTP ${res.status}`;
        try {
          const contentType = res.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            const errorData = await res.json();
            errorMessage = parseErrorResponse(res.status, errorData);
          } else {
            const errorText = await res.text();
            errorMessage = errorText || `HTTP ${res.status}`;
          }
        } catch (e) {
          console.warn("Could not parse error response:", e);
        }

        throw new Error(errorMessage);
      }

      const data: PublicKeyResponse = await res.json();
      if (!data.public_key) {
        throw new Error('Server returned no public key');
      }
      return data.public_key;
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('Network error: Unable to reach the server');
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch public key');
    }
  },

  sendMessage: async (sender: string, recipient: string, encryptedMessage: string): Promise<SendMessageResponse> => {
    if (!sender || !recipient || !encryptedMessage) {
      throw new Error('Sender, recipient, and message are required');
    }

    try {
      const res = await fetch(`${BASE_URL}/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          sender: sender.trim(),
          recipient: recipient.trim(),
          message: encryptedMessage,
        }),
      });

      if (!res.ok) {
        let errorMessage = `HTTP ${res.status}`;
        try {
          const contentType = res.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            const errorData = await res.json();
            errorMessage = parseErrorResponse(res.status, errorData);
          } else {
            const errorText = await res.text();
            errorMessage = errorText || `HTTP ${res.status}`;
          }
        } catch (e) {
          console.warn("Could not parse error response:", e);
        }

        throw new Error(errorMessage);
      }

      const data = await res.json();
      console.log("✅ Message sent successfully:", data);
      return data;
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('Network error: Unable to reach the server');
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to send message');
    }
  },

  getMessages: async (username: string): Promise<MessageData[]> => {
    if (!username) {
      throw new Error('Username is required');
    }

    try {
      const encodedUsername = encodeURIComponent(username.trim());
      const res = await fetch(`${BASE_URL}/messages/inbox/${encodedUsername}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!res.ok) {
        if (res.status === 404) {
          // No messages yet is not an error
          return [];
        }

        let errorMessage = `HTTP ${res.status}`;
        try {
          const contentType = res.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            const errorData = await res.json();
            errorMessage = parseErrorResponse(res.status, errorData);
          } else {
            const errorText = await res.text();
            errorMessage = errorText || `HTTP ${res.status}`;
          }
        } catch (e) {
          console.warn("Could not parse error response:", e);
        }

        throw new Error(errorMessage);
      }

      const data = await res.json();
      return Array.isArray(data) ? data : data.messages || [];
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('Network error: Unable to reach the server');
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch messages');
    }
  },
};
