'use client';

import React, { useState } from 'react';
import { setupNewAccount, loginExistingAccount } from '@/lib/auth';
import { MessageCircle, Loader2, Lock, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

export default function Onboarding({ onComplete }: { onComplete: (username: string) => void }) {
    const [isLogin, setIsLogin] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim()) {
            setErrorMessage('Please enter a username');
            return;
        }
        if (!password || (!isLogin && password.length < 8)) {
            setErrorMessage(isLogin ? 'Please enter your password' : 'Password must be at least 8 characters');
            return;
        }

        setStatus('loading');
        setErrorMessage('');
        try {
            if (isLogin) {
                await loginExistingAccount(username.trim(), password);
            } else {
                await setupNewAccount(username.trim(), password);
            }
            setStatus('success');
            setTimeout(() => {
                onComplete(username.trim());
            }, 500);
        } catch (err) {
            console.error(err);
            const errorMsg = err instanceof Error ? err.message : `Failed to ${isLogin ? 'login' : 'create account'}`;
            setErrorMessage(errorMsg);
            setStatus('error');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-white">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
                        <MessageCircle className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">WhisperBox</h1>
                    <p className="text-gray-500 text-center mt-3 text-sm leading-relaxed flex items-center justify-center gap-1">
                        <Lock className="w-4 h-4" /> Private & Encrypted Messaging
                    </p>
                </div>

                {/* Error Message */}
                {errorMessage && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{errorMessage}</p>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Username Input */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                            Username
                        </label>
                        <input
                            type="text"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => {
                                setUsername(e.target.value);
                                setErrorMessage('');
                            }}
                            disabled={status === 'loading'}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 text-slate-700 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        />
                    </div>

                    {/* Password Input */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder={isLogin ? 'Enter your password' : 'Minimum 8 characters'}
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setErrorMessage('');
                                }}
                                disabled={status === 'loading'}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 text-slate-700 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={status === 'loading' || !username.trim() || (!isLogin && password.length < 8) || (isLogin && !password)}
                        className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed mt-6"
                    >
                        {status === 'loading' ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                {isLogin ? 'Logging in...' : 'Generating Keys...'}
                            </>
                        ) : status === 'success' ? (
                            <>
                                <CheckCircle className="w-5 h-5" />
                                Done!
                            </>
                        ) : (
                            isLogin ? 'Log In' : 'Create Account'
                        )}
                    </button>
                    
                    {/* Toggle Login/Register */}
                    <div className="text-center mt-4">
                        <button
                            type="button"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setErrorMessage('');
                                setStatus('idle');
                            }}
                            className="text-sm text-green-600 hover:text-green-700 font-medium"
                            disabled={status === 'loading'}
                        >
                            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
                        </button>
                    </div>
                </form>

                {/* Info Box */}
                <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-900 leading-relaxed">
                        <strong>🔒 Your Privacy:</strong> All messages are encrypted end-to-end. Only you and the recipient can read them.
                    </p>
                </div>
            </div>
        </div>
    );
}
