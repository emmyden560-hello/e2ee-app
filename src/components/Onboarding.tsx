'use client';

import React, { useState } from 'react';
import { setupNewAccount } from '@/lib/auth';
import { ShieldCheck, Loader2, Lock, AlertCircle, CheckCircle } from 'lucide-react';

export default function Onboarding({ onComplete }: { onComplete: (username: string) => void }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'generating' | 'error' | 'success'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim()) {
            setErrorMessage('Please enter a username');
            return;
        }
        if (!password || password.length < 8) {
            setErrorMessage('Password must be at least 8 characters');
            return;
        }

        setStatus('generating');
        setErrorMessage('');
        try {
            await setupNewAccount(username.trim(), password);
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
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-white">
            <div className="w-full max-w-sm bg-white p-8">
                <div className="flex flex-col items-center mb-8">
                    <div className="p-2 bg-gray-100 rounded-full mb-4">
                        <ShieldCheck className="w-8 h-8 text-gray-700" />
                    </div>
                    <h1 className="text-xl font-semibold text-gray-900">WhisperBox</h1>
                    <p className="text-gray-600 text-center mt-2 text-sm leading-relaxed">
                        Secure, end-to-end encrypted messaging. Your privacy is protected.
                    </p>
                </div>

                {errorMessage && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded flex items-start gap-3">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-medium text-red-800">Error</p>
                            <p className="text-xs text-red-700 mt-0.5">{errorMessage}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleJoin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                            Username
                        </label>
                        <input
                            type="text"
                            required
                            className="w-full px-3 py-2 border border-gray-200 text-gray-900 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50"
                            placeholder="e.g., wizard_123"
                            value={username}
                            onChange={(e) => {
                                setUsername(e.target.value);
                                setErrorMessage('');
                            }}
                            disabled={status === 'generating' || status === 'success'}
                            minLength={3}
                            maxLength={30}
                        />
                        <p className="text-xs text-gray-500 mt-1">3-30 characters</p>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            required
                            minLength={8}
                            className="w-full px-3 py-2 border border-gray-200 text-gray-900 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50"
                            placeholder="8+ characters"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setErrorMessage('');
                            }}
                            disabled={status === 'generating' || status === 'success'}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={status === 'generating' || status === 'success' || !username.trim() || password.length < 8}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {status === 'generating' ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Creating...
                            </>
                        ) : status === 'success' ? (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                Created!
                            </>
                        ) : (
                            'Create Account'
                        )}
                    </button>
                </form>

                <div className="mt-6 space-y-2 text-xs text-gray-600 border-t border-gray-200 pt-6">
                    <div className="flex items-start gap-2">
                        <Lock className="w-3 h-3 mt-0.5 flex-shrink-0 text-gray-500" />
                        <span>Your private key stays on this device only.</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <Lock className="w-3 h-3 mt-0.5 flex-shrink-0 text-gray-500" />
                        <span>RSA-2048 encryption via Web Crypto API.</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <Lock className="w-3 h-3 mt-0.5 flex-shrink-0 text-gray-500" />
                        <span>Only your public key is shared.</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
