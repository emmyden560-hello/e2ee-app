'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { encryptMessage } from '@/lib/crypto';
import { wsManager } from '@/lib/websocket';
import { Send, Loader2, AlertCircle } from 'lucide-react';

interface SendMessageProps {
    sender: string;
    recipient: string; // This should be the recipient's user ID
    onMessageSent?: () => void;
}

export default function SendMessage({ sender, recipient, onMessageSent }: SendMessageProps) {
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
        setError('Could not load your local public key. Please reset identity and log in again.');
    }, [sender]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recipient || !text.trim()) {
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

            // 1. Fetch recipient's Public Key from backend
            console.log(`🔍 Step 1: Fetching recipient's public key...`);
            const recipientPubKey = await api.getPublicKey(recipient);

            // 2. Encrypt message locally with both sender and recipient public keys
            console.log(`🔐 Step 2: Encrypting message...`);
            const encryptedPayload = await encryptMessage(text, recipientPubKey, senderPubKey);

            // 3. Send over WebSocket with REST fallback
            console.log(`📤 Step 3: Sending encrypted message...`);
            const payload = {
                to: recipient,
                payload: {
                    encrypted_key: encryptedPayload.encryptedKey,
                    encrypted_key_for_self: encryptedPayload.encryptedKeyForSelf,
                    ciphertext: encryptedPayload.ciphertext,
                    iv: encryptedPayload.iv
                }
            };

            const wsSuccess = wsManager.send(payload);

            if (!wsSuccess) {
                console.log(`⚠️ WebSocket unavailable, falling back to REST...`);
                await api.sendRestMessage(payload);
            }

            console.log(`✅ Message sent successfully`);
            setText('');
            setError('');
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
            onMessageSent?.();

            // Trigger conversations refresh by dispatching a custom event
            window.dispatchEvent(new CustomEvent('message-sent'));
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
            console.error('❌ Error during send:', errorMsg);

            if (errorMsg.includes('not found') || errorMsg.includes('User')) {
                setError(`Recipient does not exist or public key not found.`);
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
                        disabled={loading || !senderPubKey || !text.trim()}
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
