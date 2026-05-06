'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { encryptMessage } from '@/lib/crypto';
import { Send, Loader2, AlertCircle } from 'lucide-react';

interface SendMessageProps {
    sender: string;
    recipient?: string;
    onMessageSent?: () => void;
}

export default function SendMessage({ sender, recipient: initialRecipient, onMessageSent }: SendMessageProps) {
    const [recipient, setRecipient] = useState(initialRecipient || '');
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [senderPubKey, setSenderPubKey] = useState('');
    const [success, setSuccess] = useState(false);

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
        setSuccess(false);

        try {
            console.log(`🚀 Starting message send process...`);
            console.log(`📱 Sender: ${sender}`);
            console.log(`📱 Recipient: ${recipient}`);
            
            // 1. Fetch recipient's Public Key from backend
            console.log(`🔍 Step 1: Fetching recipient's public key...`);
            const recipientPubKey = await api.getPublicKey(recipient.trim());
            console.log(`✅ Step 1: Public key fetched`);

            // 2. Encrypt message locally with both sender and recipient public keys
            console.log(`🔐 Step 2: Encrypting message...`);
            const encryptedBlob = await encryptMessage(text, recipientPubKey, senderPubKey);
            console.log(`✅ Step 2: Message encrypted`);

            // 3. Send only the ciphertext to the backend
            console.log(`📤 Step 3: Sending encrypted message to server...`);
            await api.sendMessage(sender, recipient.trim(), encryptedBlob);
            console.log(`✅ Step 3: Message sent to server`);

            setText('');
            setError('');
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
            onMessageSent?.();
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
            console.error('❌ Error during send:', errorMsg);
            
            if (errorMsg.includes('not found') || errorMsg.includes('User')) {
                setError(`User "${recipient.trim()}" does not exist. Make sure:\n• The username is spelled correctly\n• The recipient has registered an account\n• Try using lowercase`);
            } else if (errorMsg.includes('Network')) {
                setError(`Network error: ${errorMsg}. Check your connection and API settings.`);
            } else {
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white border-t border-gray-200 p-4">
            {error && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-700 whitespace-pre-wrap">{error}</p>
                </div>
            )}

            {success && (
                <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs text-green-700 font-medium">✓ Message sent securely!</p>
                </div>
            )}

            <form onSubmit={handleSend} className="space-y-3">
                {!initialRecipient && (
                    <input
                        type="text"
                        placeholder="Recipient username"
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50"
                        value={recipient}
                        onChange={(e) => {
                            setRecipient(e.target.value);
                            setError('');
                        }}
                        disabled={loading || !senderPubKey}
                    />
                )}

                <div className="flex gap-2">
                    <textarea
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none disabled:opacity-50 h-10"
                        value={text}
                        onChange={(e) => {
                            setText(e.target.value);
                            setError('');
                        }}
                        disabled={loading || !senderPubKey}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend(e);
                            }
                        }}
                    />
                    <button
                        type="submit"
                        disabled={loading || !senderPubKey || !recipient.trim() || !text.trim()}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center"
                        title="Send message"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
