'use client';

import { useState, useEffect } from 'react';
import Onboarding from '@/components/Onboarding';
import SendMessage from '@/components/SendMessage';
import { Lock, LogOut } from 'lucide-react';
import Inbox from '@/components/Inbox';

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

  const handleReset = () => {
    if (confirm('This will delete your local keys and username. Are you sure?')) {
      localStorage.clear();
      setCurrentUser(null);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Welcome, <span className="text-blue-600">{currentUser}</span>
              </h1>
              <p className="text-sm text-green-600 flex items-center gap-1 mt-2">
                <Lock className="w-4 h-4" /> End-to-End Encryption Active
              </p>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Reset Identity
            </button>
          </div>
        </div>

        {/* Send Message */}
        <SendMessage sender={currentUser} />

        {/* Divider */}
        <div className="my-8 flex items-center gap-4">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400 uppercase">Inbox</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Inbox */}
        <Inbox username={currentUser} />
      </div>
    </main>
  );
}
