import { generateIdentityKeys, exportPublicKey, wrapPrivateKeyWithPassword } from './crypto';
import { savePrivateKey } from './storage';
import { api } from './api';

/**
 * High-level service to handle the full E2EE onboarding flow.
 * 1. Generates RSA Key Pair locally
 * 2. Stores Private Key securely in IndexedDB
 * 3. Exports Public Key in Base64 format
 * 4. Registers with backend
 * 5. Caches username for UI persistence
 */
export async function setupNewAccount(username: string, password: string) {
  if (!username || !username.trim()) {
    throw new Error('Username cannot be empty');
  }
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  try {
    // 1. Generate the RSA Key Pair locally
    console.log("🔐 Generating RSA key pair...");
    const pair = await generateIdentityKeys();
    
    // 2. Securely store Private Key in IndexedDB (The Vault)
    console.log("🔒 Storing private key securely...");
    await savePrivateKey(pair.privateKey);
    
    // 3. Export Public Key to a format the backend understands (Base64)
    console.log("📤 Exporting public key...");
    const pubKeyString = await exportPublicKey(pair.publicKey);

    // 4. Wrap private key with password-derived AES-KW for backend storage
    console.log("🧩 Wrapping private key...");
    const { wrappedPrivateKey, pbkdf2Salt } = await wrapPrivateKeyWithPassword(
      pair.privateKey,
      password
    );

    // 5. Register with backend using required schema
    console.log("📡 Registering with backend...");
    await api.registerUser({
      username: username.trim(),
      display_name: username.trim(),
      password,
      public_key: pubKeyString,
      wrapped_private_key: wrappedPrivateKey,
      pbkdf2_salt: pbkdf2Salt,
    });
    
    // 6. Cache identity material for current UI flow
    localStorage.setItem('whisper_username', username.trim());
    localStorage.setItem('whisper_public_key', pubKeyString);
    
    console.log("✅ Account setup complete!");
    return { success: true, username: username.trim() };
  } catch (error) {
    // Clean up private key if registration fails
    try {
      // Try to clear the failed key from storage
      localStorage.removeItem('whisper_username');
    } catch (cleanupErr) {
      console.warn("Cleanup error:", cleanupErr);
    }

    const errorMsg = error instanceof Error ? error.message : 'Unknown error during account setup';
    console.error("❌ Onboarding failed:", errorMsg);
    throw new Error(errorMsg);
  }
}
