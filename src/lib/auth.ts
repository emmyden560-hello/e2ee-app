import { generateIdentityKeys, exportPublicKey, wrapPrivateKeyWithPassword, unwrapPrivateKey } from './crypto';
import { savePrivateKey } from './storage';
import { api } from './api';
import { wsManager } from './websocket';

/**
 * Register a new account
 */
export async function setupNewAccount(username: string, password: string) {
  if (!username || !username.trim()) {
    throw new Error('Username cannot be empty');
  }
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  try {
    const pair = await generateIdentityKeys();
    
    await savePrivateKey(pair.privateKey);
    
    const pubKeyString = await exportPublicKey(pair.publicKey);

    const { wrappedPrivateKey, pbkdf2Salt } = await wrapPrivateKeyWithPassword(
      pair.privateKey,
      password
    );

    const response = await api.registerUser({
      username: username.trim(),
      display_name: username.trim(),
      password,
      public_key: pubKeyString,
      wrapped_private_key: wrappedPrivateKey,
      pbkdf2_salt: pbkdf2Salt,
    });
    
    // Cache identity material and tokens
    const cleanUsername = username.trim();
    localStorage.setItem('whisper_user_id', response.user.id);
    localStorage.setItem('whisper_username', response.user.username);
    localStorage.setItem('whisper_public_key', pubKeyString);
    localStorage.setItem('whisper_access_token', response.access_token);
    localStorage.setItem('whisper_refresh_token', response.refresh_token);
    
    // Store key material locally for login retrieval (backend may not return it)
    localStorage.setItem(`whisper_wrapped_key_${cleanUsername}`, wrappedPrivateKey);
    localStorage.setItem(`whisper_salt_${cleanUsername}`, pbkdf2Salt);
    
    // Connect WebSocket
    wsManager.connect();
    
    return { success: true, user: response.user };
  } catch (error) {
    localStorage.removeItem('whisper_username');
    localStorage.removeItem('whisper_user_id');
    const errorMsg = error instanceof Error ? error.message : 'Unknown error during account setup';
    throw new Error(errorMsg);
  }
}

/**
 * Log in to an existing account
 */
export async function loginExistingAccount(username: string, password: string) {
  if (!username || !username.trim()) {
    throw new Error('Username cannot be empty');
  }
  if (!password) {
    throw new Error('Password cannot be empty');
  }

  try {
    const cleanUsername = username.trim();
    const response = await api.loginUser(cleanUsername, password);
    
    // Validate response has required auth fields
    if (!response.access_token || !response.refresh_token) {
      throw new Error("Invalid login response: missing authentication tokens");
    }
    
    // Get key material from response or localStorage
    let wrappedPrivateKey = response.wrapped_private_key;
    let pbkdf2Salt = response.pbkdf2_salt;
    
    // If backend didn't return key material, try to retrieve from localStorage (stored during registration)
    if (!wrappedPrivateKey || !pbkdf2Salt) {
      wrappedPrivateKey = localStorage.getItem(`whisper_wrapped_key_${cleanUsername}`) ?? undefined;
      pbkdf2Salt = localStorage.getItem(`whisper_salt_${cleanUsername}`) ?? undefined;
    }
    
    if (!wrappedPrivateKey || !pbkdf2Salt) {
      throw new Error("Encryption key material not found. Please register a new account or contact support.");
    }
    
    // Unwrap private key with password before storing tokens
    let privateKey;
    try {
      privateKey = await unwrapPrivateKey(
        wrappedPrivateKey,
        pbkdf2Salt,
        password
      );
    } catch (unwrapError) {
      throw new Error("Incorrect password or corrupted key material.");
    }
    
    // Store private key securely
    await savePrivateKey(privateKey);
    
    // Cache tokens immediately so subsequent API calls (like getPublicKey) have the Authorization header
    localStorage.setItem('whisper_access_token', response.access_token);
    localStorage.setItem('whisper_refresh_token', response.refresh_token);
    
    // Fetch user's public key (to cache it locally like during registration)
    const pubKeyString = await api.getPublicKey(response.user.id);
    
    // Cache identity material (only after successful key unwrap)
    localStorage.setItem('whisper_user_id', response.user.id);
    localStorage.setItem('whisper_username', response.user.username);
    localStorage.setItem('whisper_public_key', pubKeyString);
    
    // Connect WebSocket only after successful login
    wsManager.connect();
    
    return { success: true, user: response.user };
  } catch (error) {
    // Ensure no partial auth state is left
    localStorage.removeItem('whisper_user_id');
    localStorage.removeItem('whisper_username');
    localStorage.removeItem('whisper_access_token');
    localStorage.removeItem('whisper_refresh_token');
    
    const errorMsg = error instanceof Error ? error.message : 'Unknown error during login';
    throw new Error(errorMsg);
  }
}

/**
 * Log out
 */
export async function logoutUser() {
  try {
    const refreshToken = localStorage.getItem('whisper_refresh_token');
    if (refreshToken) {
      // Attempt to notify backend, but don't fail if it errors
      await api.logoutUser(refreshToken);
    }
  } catch (e) {
    // Logout should always succeed client-side, even if backend call fails
    console.warn('Backend logout notification failed, but local state will persist');
  } finally {
    // Disconnect WebSocket and clear session
    wsManager.disconnect();
    
    // Clear all identity material and tokens
    localStorage.removeItem('whisper_user_id');
    localStorage.removeItem('whisper_username');
    localStorage.removeItem('whisper_public_key');
    localStorage.removeItem('whisper_access_token');
    localStorage.removeItem('whisper_refresh_token');
    
    // Note: We keep whisper_wrapped_key_{username} and whisper_salt_{username} 
    // to allow easier login for the same user, which is standard practice.
  }
}
