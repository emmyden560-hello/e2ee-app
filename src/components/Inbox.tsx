'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { decryptMessage } from '@/lib/crypto';
import { getPrivateKey } from '@/lib/storage';
import { Unlock, Mail, AlertCircle, RefreshCw, Lock } from 'lucide-react';

interface DecryptedMessage {
    id: string;
    sender: string;
    content: string;
    error?: boolean;
    timestamp?: string;
}

export default function Inbox({ username }: { username: string }) {
    const [messages, setMessages] = useState<DecryptedMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchAndDecrypt = async () => {
        setLoading(true);
        setError('');
        try {
            const encryptedData = await api.getMessages(username);

            if (!encryptedData || encryptedData.length === 0) {
                setMessages([]);
                return;
            }

            const privKey = await getPrivateKey();

            if (!privKey) {
                throw new Error("Private key is missing from IndexedDB. Your identity may have been reset.");
            }

            // Map through messages and attempt decryption
            const decryptedList = await Promise.all(
                encryptedData.map(async (msg: any, index: number) => {
                    try {
                        // When receiving messages, we are NOT the sender, so isSender = false
                        const cleartext = await decryptMessage(msg.message, privKey, false);
                        return {
                            id: msg.id || `msg-${index}`,
                            sender: msg.sender,
                            content: cleartext,
                            timestamp: msg.timestamp
                        };
                    } catch (err) {
                        console.error(`Failed to decrypt message from ${msg.sender}:`, err);
                        return {
                            id: msg.id || `msg-${index}`,
                            sender: msg.sender,
                            content: "Decryption failed: This message may have been corrupted or sent with an incompatible key.",
                            error: true,
                            timestamp: msg.timestamp
                        };
                    }
                })
            );

            setMessages(decryptedList.reverse()); // Newest first
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to load messages';
            console.error("Inbox Error:", err);
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAndDecrypt();
    }, [username]);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Your Secure Inbox
                </h3>
                <button
                    onClick={fetchAndDecrypt}
                    disabled={loading}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {loading && (
                <div className="text-center py-8">
                    <div className="inline-block">
                        <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                    </div>
                    <p className="text-slate-400 text-sm mt-2">Loading messages...</p>
                </div>
            )}

            {messages.length === 0 && !loading && !error && (
                <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-xl">
                    <Lock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-400">No messages yet.</p>
                    <p className="text-xs text-slate-300 mt-1">Messages appear here once friends send you encrypted notes.</p>
                </div>
            )}

            <div className="space-y-3">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`p-4 rounded-xl border transition-all ${msg.error
                                ? 'bg-red-50 border-red-100'
                                : 'bg-slate-50 border-slate-200 hover:shadow-md'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                📬 From: <span className="text-blue-600">{msg.sender}</span>
                            </span>
                            {msg.error ? (
                                <AlertCircle className="w-4 h-4 text-red-500" />
                            ) : (
                                <Unlock className="w-4 h-4 text-green-500" />
                            )}
                        </div>
                        <p className={`text-sm leading-relaxed ${msg.error
                                ? 'text-red-600 italic'
                                : 'text-slate-700'
                            }`}>
                            {msg.content}
                        </p>
                        {msg.timestamp && (
                            <p className="text-xs text-slate-400 mt-2">
                                {new Date(msg.timestamp).toLocaleString()}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
