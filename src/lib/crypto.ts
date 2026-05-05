import type { CryptoKeyPair } from '@/types';

/**
 * PART 1: IDENTITY & KEY MANAGEMENT
 * 
 * Generates an RSA-2048 key pair for E2EE messaging.
 * - Public key: Can be extracted and shared with others
 * - Private key: Never extractable, stays on device
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
      false, // Private key is NOT extractable for maximum security
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
export async function encryptMessage(
  plaintext: string,
  recipientPubKeyBase64: string,
  senderPubKeyBase64: string // Required so sender can read their own sent messages
): Promise<string> {
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

    // 5. Pack the packet: [IV] + [EncRecipient] + [EncSender] + [Ciphertext]
    const packet = new Uint8Array(
      iv.length +
      encryptedAesKeyRecipient.byteLength +
      encryptedAesKeySender.byteLength +
      encryptedContent.byteLength
    );

    let offset = 0;
    packet.set(iv, offset);
    offset += iv.length;
    packet.set(new Uint8Array(encryptedAesKeyRecipient), offset);
    offset += 256;
    packet.set(new Uint8Array(encryptedAesKeySender), offset);
    offset += 256;
    packet.set(new Uint8Array(encryptedContent), offset);

    // 6. Encode to Base64 for transmission
    return btoa(String.fromCharCode(...packet));
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
  encryptedBundleBase64: string,
  privateKey: CryptoKey,
  isSender: boolean = false
): Promise<string> {
  try {
    if (!encryptedBundleBase64 || encryptedBundleBase64.trim().length === 0) {
      throw new Error('Encrypted message is empty');
    }

    if (!privateKey) {
      throw new Error('Private key is required for decryption');
    }

    // 1. Decode the Base64 bundle
    const bundle = Uint8Array.from(atob(encryptedBundleBase64), c => c.charCodeAt(0));

    // Validate bundle size
    const minSize = 12 + 256 + 256; // IV + 2 encrypted keys
    if (bundle.length < minSize) {
      throw new Error('Invalid encrypted message format: too short');
    }

    // 2. Unpack the bundle
    const iv = bundle.slice(0, 12);

    // If we are the sender, use the second encrypted key block
    // Otherwise (recipient), use the first encrypted key block
    const keyOffset = isSender ? 12 + 256 : 12;
    const encryptedAesKey = bundle.slice(keyOffset, keyOffset + 256);
    const ciphertext = bundle.slice(12 + 256 + 256);

    // 3. Decrypt the AES Key using our private key
    const aesKeyRaw = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      encryptedAesKey
    );

    // 4. Import the decrypted AES key
    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      aesKeyRaw,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );

    // 5. Decrypt the message content
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

