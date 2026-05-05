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
        const loadSenderKey = async () => {
            try {
                const pubKey = await api.getPublicKey(sender);
                setSenderPubKey(pubKey);
            } catch (err) {
                console.error("Failed to load sender public key:", err);
                setError('Could not load your public key. Please refresh the page.');
            }
        };
        loadSenderKey();
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
            console.error("Send error:", err);
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-500" /> New Secure Message
            </h3>

            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            <form onSubmit={handleSend} className="space-y-4">
                <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Recipient Username"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        value={recipient}
                        onChange={(e) => {
                            setRecipient(e.target.value);
                            setError('');
                        }}
                        disabled={loading || !senderPubKey}
                    />
                </div>
                <textarea
                    placeholder="Type your secret message..."
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none disabled:opacity-50"
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
                    className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                            Encrypt & Send
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
