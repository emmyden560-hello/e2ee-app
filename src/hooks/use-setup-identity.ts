import { useState, useEffect } from 'react';
import { generateIdentityKeys, exportPublicKey } from '@/lib/crypto';
import { savePrivateKey, getPrivateKey } from '@/lib/storage';

export function useSetupIdentity() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [pubKey, setPubKey] = useState<string | null>(null);

  const init = async () => {
    try {
      let privKey = await getPrivateKey();
      
      if (!privKey) {
        console.log("🛠 Generating new secure keys...");
        const pair = await generateIdentityKeys();
        await savePrivateKey(pair.privateKey);
        const exportedPub = await exportPublicKey(pair.publicKey);
        setPubKey(exportedPub);
      }
      
      setStatus('ready');
    } catch (err) {
      console.error("Crypto Setup Failed:", err);
      setStatus('error');
    }
  };

  useEffect(() => { init(); }, []);

  return { status, pubKey };
}
