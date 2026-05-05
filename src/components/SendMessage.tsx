'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { encryptMessage } from '@/lib/crypto';
import { Send, User, Lock, Loader2, AlertCircle } from 'lucide-react';

export default function SendMessage({ sender }: { sender: string }) {
    const [recipient, setRecipient] = useState('');
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [senderPubKey, setSenderPubKey] = useState('');

    // Load sender's public key on component mount
    useEffect(() => {
        const localPub = localStorage.getItem('whisper_public_key');
        if (localPub) {
            setSenderPubKey(localPub);
            return;
        }
        setError('Could not load your local public key. Please reset identity and register again.');
    }, [sender]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recipient.trim() || !text.trim()) {
            setError('Recipient and message are required');
            return;
        }

        if (!senderPubKey) {
            setError('Your public key is not loaded. Please refresh.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // 1. Fetch recipient's Public Key from backend
            const recipientPubKey = await api.getPublicKey(recipient.trim());

            // 2. Encrypt message locally with both sender and recipient public keys
            const encryptedBlob = await encryptMessage(text, recipientPubKey, senderPubKey);

            // 3. Send only the ciphertext to the backend
            await api.sendMessage(sender, recipient.trim(), encryptedBlob);

            setText('');
            setRecipient('');
            setError('');
            alert("Message sent securely! ✅");
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
            if (errorMsg.includes('not found')) {
                setError(`Recipient "${recipient.trim()}" does not exist. Check the username and try again.`);
            } else {
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white border border-gray-200 p-5 rounded space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-gray-700" /> Send Secure Message
            </h3>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-700">{error}</p>
                </div>
            )}

            <form onSubmit={handleSend} className="space-y-3">
                <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Recipient username"
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                        value={recipient}
                        onChange={(e) => {
                            setRecipient(e.target.value);
                            setError('');
                        }}
                        disabled={loading || !senderPubKey}
                    />
                </div>
                <textarea
                    placeholder="Your message..."
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-20 resize-none disabled:opacity-50 font-normal"
                    value={text}
                    onChange={(e) => {
                        setText(e.target.value);
                        setError('');
                    }}
                    disabled={loading || !senderPubKey}
                />
                <button
                    type="submit"
                    disabled={loading || !senderPubKey || !recipient.trim() || !text.trim()}
                    className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Encrypting...
                        </>
                    ) : !senderPubKey ? (
                        <>
                            <AlertCircle className="w-4 h-4" />
                            Loading...
                        </>
                    ) : (
                        <>
                            <Lock className="w-4 h-4" />
                            Send
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
