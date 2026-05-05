'use client';

import { useState, useEffect } from 'react';
import Onboarding from '@/components/Onboarding';
import SendMessage from '@/components/SendMessage';
import { Lock, LogOut } from 'lucide-react';
import Inbox from '@/components/Inbox';
import { deletePrivateKey } from '@/lib/storage';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedUser = localStorage.getItem('whisper_username');
    if (savedUser) setCurrentUser(savedUser);
  }, []);

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  if (!currentUser) {
    return <Onboarding onComplete={(name) => setCurrentUser(name)} />;
  }

  const handleReset = async () => {
    if (confirm('This will delete your local keys and username. Are you sure?')) {
      try {
        await deletePrivateKey();
      } finally {
        localStorage.removeItem('whisper_username');
        localStorage.removeItem('whisper_public_key');
      }
      setCurrentUser(null);
    }
  };

  return (
    <main className="min-h-screen bg-white py-6 text-slate-900">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 pb-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                WhisperBox
              </h1>
              <p className="text-xs text-gray-600 font-normal flex items-center gap-1 mt-2">
                <Lock className="w-3.5 h-3.5" /> End-to-End Encryption Active
              </p>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors border border-gray-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>

        {/* Send Message */}
        <SendMessage sender={currentUser} />

        {/* Divider */}
        <div className="my-6 border-b border-gray-200" />

        {/* Inbox */}
        <Inbox username={currentUser} />
      </div>
    </main>
  );
}
