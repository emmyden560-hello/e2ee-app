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
    localStorage.setItem('whisper_user_id', response.user.id);
    localStorage.setItem('whisper_username', response.user.username);
    localStorage.setItem('whisper_public_key', pubKeyString);
    localStorage.setItem('whisper_access_token', response.access_token);
    localStorage.setItem('whisper_refresh_token', response.refresh_token);
    
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
    const response = await api.loginUser(username.trim(), password);
    
    // Validate response has required auth fields
    if (!response.access_token || !response.refresh_token) {
      throw new Error("Invalid login response: missing authentication tokens");
    }
    
    // Validate response has required key material
    if (!response.wrapped_private_key || !response.pbkdf2_salt) {
      throw new Error("Server did not return encryption key material. Contact support if this persists.");
    }
    
    const privateKey = await unwrapPrivateKey(
      response.wrapped_private_key,
      response.pbkdf2_salt,
      password
    );
    
    await savePrivateKey(privateKey);
    
    // Fetch user's public key (to cache it locally like during registration)
    const pubKeyString = await api.getPublicKey(response.user.id);
    
    // Cache identity material and tokens
    localStorage.setItem('whisper_user_id', response.user.id);
    localStorage.setItem('whisper_username', response.user.username);
    localStorage.setItem('whisper_public_key', pubKeyString);
    localStorage.setItem('whisper_access_token', response.access_token);
    localStorage.setItem('whisper_refresh_token', response.refresh_token);
    
    // Connect WebSocket
    wsManager.connect();
    
    return { success: true, user: response.user };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error during login';
    throw new Error(errorMsg);
  }
}

/**
 * Log out
 */
export async function logoutUser() {
  const refreshToken = localStorage.getItem('whisper_refresh_token');
  if (refreshToken) {
    await api.logoutUser(refreshToken);
  }
  
  wsManager.disconnect();
  
  localStorage.removeItem('whisper_user_id');
  localStorage.removeItem('whisper_username');
  localStorage.removeItem('whisper_public_key');
  localStorage.removeItem('whisper_access_token');
  localStorage.removeItem('whisper_refresh_token');
}
