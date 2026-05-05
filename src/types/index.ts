/**
 * Shared type definitions for the E2EE application
 */

export interface CryptoKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface EncryptedMessage {
  sender: string;
  recipient: string;
  message: string; // Base64-encoded encrypted bundle
  timestamp?: string;
  id?: string;
}

export interface User {
  username: string;
  public_key: string;
}

export interface Account {
  success: boolean;
  username: string;
}
