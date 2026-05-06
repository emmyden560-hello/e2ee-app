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
    console.log("🔐 Generating RSA key pair...");
    const pair = await generateIdentityKeys();
    
    console.log("🔒 Storing private key securely...");
    await savePrivateKey(pair.privateKey);
    
    console.log("📤 Exporting public key...");
    const pubKeyString = await exportPublicKey(pair.publicKey);

    console.log("🧩 Wrapping private key...");
    const { wrappedPrivateKey, pbkdf2Salt } = await wrapPrivateKeyWithPassword(
      pair.privateKey,
      password
    );

    console.log("📡 Registering with backend...");
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
    
    console.log("✅ Account setup complete!");
    return { success: true, user: response.user };
  } catch (error) {
    localStorage.removeItem('whisper_username');
    localStorage.removeItem('whisper_user_id');
    const errorMsg = error instanceof Error ? error.message : 'Unknown error during account setup';
    console.error("❌ Onboarding failed:", errorMsg);
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
    console.log("📡 Logging in...");
    const response = await api.loginUser(username.trim(), password);
    
    if (!response.wrapped_private_key || !response.pbkdf2_salt) {
      throw new Error("Server did not return key material required to log in.");
    }
    
    console.log("🧩 Unwrapping private key...");
    const privateKey = await unwrapPrivateKey(
      response.wrapped_private_key,
      response.pbkdf2_salt,
      password
    );
    
    console.log("🔒 Storing private key securely...");
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
    
    console.log("✅ Login complete!");
    return { success: true, user: response.user };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error during login';
    console.error("❌ Login failed:", errorMsg);
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
