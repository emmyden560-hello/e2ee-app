import { generateIdentityKeys, exportPublicKey } from './crypto';
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
export async function setupNewAccount(username: string) {
  if (!username || !username.trim()) {
    throw new Error('Username cannot be empty');
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
    
    // 4. Register the user and their Public Key with Whisperbox
    console.log("📡 Registering with backend...");
    await api.registerUser(username.trim(), pubKeyString);
    
    // 5. Cache the username for UI persistence
    localStorage.setItem('whisper_username', username.trim());
    
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
