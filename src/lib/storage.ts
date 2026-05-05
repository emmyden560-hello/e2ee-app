import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'whisper-vault';
const STORE_NAME = 'keys';
const PRIVATE_KEY_ID = 'private_key';

/**
 * Initialize IndexedDB database for secure key storage
 */
export async function initDB(): Promise<IDBPDatabase> {
  try {
    return await openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to initialize database';
    throw new Error(`IndexedDB initialization failed: ${msg}`);
  }
}

/**
 * Securely save the private key to IndexedDB
 * Private keys cannot be extracted from the CryptoKey object (by design)
 * IndexedDB keeps them in the browser's secure storage
 */
export async function savePrivateKey(key: CryptoKey): Promise<void> {
  try {
    if (!key || key.type !== 'private') {
      throw new Error('Invalid or non-private CryptoKey');
    }

    const db = await initDB();
    await db.put(STORE_NAME, key, PRIVATE_KEY_ID);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to save private key';
    throw new Error(`Private key storage failed: ${msg}`);
  }
}

/**
 * Retrieve the private key from IndexedDB
 */
export async function getPrivateKey(): Promise<CryptoKey | undefined> {
  try {
    const db = await initDB();
    const key = await db.get(STORE_NAME, PRIVATE_KEY_ID);
    return key as CryptoKey | undefined;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to retrieve private key';
    throw new Error(`Private key retrieval failed: ${msg}`);
  }
}

/**
 * Delete the private key from IndexedDB (for account reset)
 */
export async function deletePrivateKey(): Promise<void> {
  try {
    const db = await initDB();
    await db.delete(STORE_NAME, PRIVATE_KEY_ID);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to delete private key';
    throw new Error(`Private key deletion failed: ${msg}`);
  }
}

