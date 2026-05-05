'use client';

import React, { useState } from 'react';
import { setupNewAccount } from '@/lib/auth';
import { ShieldCheck, Loader2, Lock, AlertCircle, CheckCircle } from 'lucide-react';

export default function Onboarding({ onComplete }: { onComplete: (username: string) => void }) {
    const [username, setUsername] = useState('');
    const [status, setStatus] = useState<'idle' | 'generating' | 'error' | 'success'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim()) {
            setErrorMessage('Please enter a username');
            return;
        }

        setStatus('generating');
        setErrorMessage('');
        try {
            await setupNewAccount(username.trim());
            setStatus('success');
            setTimeout(() => {
                onComplete(username.trim());
            }, 500);
        } catch (err) {
            console.error(err);
            const errorMsg = err instanceof Error ? err.message : 'Failed to create account';
            setErrorMessage(errorMsg);
            setStatus('error');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 bg-gradient-to-br from-blue-50 to-slate-100">
            <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
                <div className="flex flex-col items-center mb-8">
                    <div className="p-3 bg-blue-50 rounded-full mb-4">
                        <ShieldCheck className="w-10 h-10 text-blue-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">WhisperBox</h1>
                    <p className="text-slate-500 text-center mt-2 text-sm">
                        Secure, end-to-end encrypted messaging. No one else can read your data.
                    </p>
                </div>

                {errorMessage && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-red-800">Registration Failed</p>
                            <p className="text-xs text-red-700 mt-1">{errorMessage}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleJoin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Pick a Username
                        </label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-2 border border-slate-200 text-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 disabled:bg-slate-50"
                            placeholder="e.g., frontend_wizard"
                            value={username}
                            onChange={(e) => {
                                setUsername(e.target.value);
                                setErrorMessage('');
                            }}
                            disabled={status === 'generating' || status === 'success'}
                            minLength={3}
                            maxLength={30}
                        />
                        <p className="text-xs text-slate-400 mt-1">3-30 characters, alphanumeric and underscores</p>
                    </div>

                    <button
                        type="submit"
                        disabled={status === 'generating' || status === 'success' || !username.trim()}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {status === 'generating' ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Generating Keys...
                            </>
                        ) : status === 'success' ? (
                            <>
                                <CheckCircle className="w-5 h-5" />
                                Account Created!
                            </>
                        ) : (
                            'Create Account'
                        )}
                    </button>
                </form>

                <div className="mt-6 space-y-3 text-xs text-slate-500">
                    <div className="flex items-start gap-2">
                        <Lock className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>Your private key never leaves this device.</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <Lock className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>Keys are generated using Web Crypto API with RSA-2048.</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <Lock className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>Only your public key is shared with others.</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
