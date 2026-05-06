import type { CryptoKeyPair } from '@/types';

/**
 * PART 1: IDENTITY & KEY MANAGEMENT
 * 
 * Generates an RSA-2048 key pair for E2EE messaging.
 * - Public key: Can be extracted and shared with others
 * - Private key: extractable for wrapping during registration/login restore
 */
export async function generateIdentityKeys(): Promise<CryptoKeyPair> {
  try {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]), // Standard 65537 value
        hash: "SHA-256",
      },
      true, // Required so private key can be wrapped with password-derived AES-KW
      ["encrypt", "decrypt"]
    );

    return keyPair as CryptoKeyPair;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to generate keys';
    throw new Error(`Key generation failed: ${msg}`);
  }
}

/**
 * Exports a public key to Base64 format for transmission
 */
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  try {
    const exported = await window.crypto.subtle.exportKey("spki", key);

    // Convert ArrayBuffer to Base64 string
    const binary = String.fromCharCode(...new Uint8Array(exported));
    return window.btoa(binary);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to export public key';
    throw new Error(`Public key export failed: ${msg}`);
  }
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Wrap private key with a password-derived AES-KW key (PBKDF2)
 * so backend stores only encrypted private key material.
 */
export async function wrapPrivateKeyWithPassword(
  privateKey: CryptoKey,
  password: string
): Promise<{ wrappedPrivateKey: string; pbkdf2Salt: string }> {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordBytes = new TextEncoder().encode(password);

  const baseKey = await crypto.subtle.importKey(
    "raw",
    passwordBytes,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const wrappingKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 250000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  // AES-KW requires data length multiple-of-8. PKCS#8 private key blobs are
  // variable length, so we encrypt exported PKCS#8 bytes with AES-GCM instead.
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", privateKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    pkcs8
  );

  const packet = new Uint8Array(iv.length + encrypted.byteLength);
  packet.set(iv, 0);
  packet.set(new Uint8Array(encrypted), iv.length);

  return {
    wrappedPrivateKey: toBase64(packet),
    pbkdf2Salt: toBase64(salt),
  };
}

/**
 * Unwrap private key with password-derived AES-KW key
 */
export async function unwrapPrivateKey(
  wrappedPrivateKeyBase64: string,
  pbkdf2SaltBase64: string,
  password: string
): Promise<CryptoKey> {
  const salt = Uint8Array.from(atob(pbkdf2SaltBase64), c => c.charCodeAt(0));
  const packet = Uint8Array.from(atob(wrappedPrivateKeyBase64), c => c.charCodeAt(0));
  
  if (packet.length < 12) {
    throw new Error('Invalid wrapped key format');
  }

  const iv = packet.slice(0, 12);
  const encrypted = packet.slice(12);
  const passwordBytes = new TextEncoder().encode(password);

  const baseKey = await crypto.subtle.importKey(
    "raw",
    passwordBytes,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const unwrappingKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 250000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const pkcs8 = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    unwrappingKey,
    encrypted
  );

  return await crypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  );
}

/**
 * PART 2: MESSAGE ENCRYPTION ENGINE
 * 
 * Encrypts a message using:
 * 1. AES-GCM for symmetric encryption of the message content
 * 2. RSA-OAEP to encrypt the AES key for both recipient and sender
 * 
 * Packet structure:
 * [IV(12 bytes)] + [EncRecipient(256 bytes)] + [EncSender(256 bytes)] + [Ciphertext(variable)]
 */
export interface EncryptedPayload {
  encryptedKey: string;
  encryptedKeyForSelf: string;
  ciphertext: string;
  iv: string;
}

export async function encryptMessage(
  plaintext: string,
  recipientPubKeyBase64: string,
  senderPubKeyBase64: string
): Promise<EncryptedPayload> {
  try {
    if (!plaintext || plaintext.trim().length === 0) {
      throw new Error('Message cannot be empty');
    }

    if (!recipientPubKeyBase64 || !senderPubKeyBase64) {
      throw new Error('Both recipient and sender public keys are required');
    }

    // 1. Import the Public Keys
    const importKey = async (b64: string): Promise<CryptoKey> => {
      try {
        const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        return await window.crypto.subtle.importKey(
          "spki",
          bin,
          { name: "RSA-OAEP", hash: "SHA-256" },
          true,
          ["encrypt"]
        );
      } catch (err) {
        throw new Error('Invalid public key format');
      }
    };

    const recipientKey = await importKey(recipientPubKeyBase64);
    const senderKey = await importKey(senderPubKeyBase64);

    // 2. Generate a random AES-GCM key for this message
    const aesKey = await window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    // 3. Encrypt the message text with AES-GCM
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedMessage = new TextEncoder().encode(plaintext);
    const encryptedContent = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      aesKey,
      encodedMessage
    );

    // 4. Encrypt the AES key for BOTH recipient and sender
    const exportedAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

    const encryptedAesKeyRecipient = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      recipientKey,
      exportedAesKey
    );

    const encryptedAesKeySender = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      senderKey,
      exportedAesKey
    );

    return {
      encryptedKey: toBase64(new Uint8Array(encryptedAesKeyRecipient)),
      encryptedKeyForSelf: toBase64(new Uint8Array(encryptedAesKeySender)),
      ciphertext: toBase64(new Uint8Array(encryptedContent)),
      iv: toBase64(iv),
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Encryption failed';
    throw new Error(`Message encryption failed: ${msg}`);
  }
}

/**
 * PART 3: DECRYPTION
 * 
 * Decrypts a message encrypted with encryptMessage()
 * @param isSender - true if decrypting a message you sent, false if receiving
 */
export async function decryptMessage(
  payload: Omit<EncryptedPayload, 'encryptedKeyForSelf'>,
  privateKey: CryptoKey
): Promise<string> {
  try {
    if (!payload.encryptedKey || !payload.ciphertext || !payload.iv) {
      throw new Error('Encrypted payload is missing required fields');
    }

    if (!privateKey) {
      throw new Error('Private key is required for decryption');
    }

    // 1. Decode the Base64 strings
    const iv = Uint8Array.from(atob(payload.iv), c => c.charCodeAt(0));
    const encryptedAesKey = Uint8Array.from(atob(payload.encryptedKey), c => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(payload.ciphertext), c => c.charCodeAt(0));

    // 2. Decrypt the AES Key using our private key
    const aesKeyRaw = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      encryptedAesKey
    );

    // 3. Import the decrypted AES key
    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      aesKeyRaw,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );

    // 4. Decrypt the message content
    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      aesKey,
      ciphertext
    );

    return new TextDecoder().decode(decryptedContent);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Decryption failed';
    throw new Error(`Message decryption failed: ${msg}`);
  }
}

