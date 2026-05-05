'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { decryptMessage } from '@/lib/crypto';
import { getPrivateKey } from '@/lib/storage';
import { Mail, AlertCircle, RefreshCw, Lock } from 'lucide-react';

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
                        const isSender = String(msg.sender) === username;
                        const cleartext = await decryptMessage(msg.message, privKey, isSender);
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
        <div className="space-y-3">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Secure Inbox
                </h3>
                <button
                    onClick={fetchAndDecrypt}
                    disabled={loading}
                    className="p-1.5 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Refresh messages"
                >
                    <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">{error}</p>
                </div>
            )}

            {loading && (
                <div className="text-center py-8">
                    <div className="inline-block">
                        <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-xs mt-2">Loading messages...</p>
                </div>
            )}

            {messages.length === 0 && !loading && !error && (
                <div className="text-center py-10 border border-dashed border-gray-200 rounded">
                    <Lock className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No messages yet</p>
                    <p className="text-xs text-gray-400 mt-1">Messages will appear here once received</p>
                </div>
            )}

            <div className="space-y-2">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`p-3 rounded border transition-all ${msg.error
                            ? 'bg-red-50 border-red-200'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-semibold text-gray-900">
                                {msg.sender}
                            </span>
                            {msg.error ? (
                                <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                            ) : (
                                <Lock className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                            )}
                        </div>
                        <p className={`text-xs leading-relaxed ${msg.error
                            ? 'text-red-700'
                            : 'text-gray-700'
                            }`}>
                            {msg.content}
                        </p>
                        {msg.timestamp && (
                            <p className="text-xs text-gray-400 mt-2">
                                {new Date(msg.timestamp).toLocaleString()}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
