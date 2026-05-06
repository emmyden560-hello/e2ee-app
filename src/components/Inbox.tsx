'use client';

import { useEffect, useState } from 'react';
import { api, MessageData } from '@/lib/api';
import { decryptMessage } from '@/lib/crypto';
import { getPrivateKey } from '@/lib/storage';
import { wsManager, WSMessageReceivePayload } from '@/lib/websocket';
import { AlertCircle, RefreshCw, Lock } from 'lucide-react';
import MessageBubble from './MessageBubble';

interface DecryptedMessage {
    id: string;
    sender: string;
    content: string;
    error?: boolean;
    timestamp?: string;
}

export default function Inbox({ recipientId }: { recipientId: string }) {
    const [messages, setMessages] = useState<DecryptedMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchAndDecrypt = async () => {
        setLoading(true);
        setError('');
        try {
            const encryptedData = await api.getConversationMessages(recipientId);

            if (!encryptedData || encryptedData.length === 0) {
                setMessages([]);
                return;
            }

            const privKey = await getPrivateKey();

            if (!privKey) {
                throw new Error("Private key is missing from IndexedDB. Your identity may have been reset.");
            }

            const myUserId = localStorage.getItem('whisper_user_id');

            // Map through messages and attempt decryption
            const decryptedList = await Promise.all(
                encryptedData.map(async (msg: MessageData, index: number) => {
                    try {
                        const isSender = msg.sender_id === myUserId;
                        // For decryption, we need the encryptedKey. If we are the sender, we use encrypted_key_for_self.
                        const keyToUse = isSender && msg.encrypted_key_for_self 
                            ? msg.encrypted_key_for_self 
                            : msg.encrypted_key;

                        const cleartext = await decryptMessage(
                            { encryptedKey: keyToUse, ciphertext: msg.ciphertext, iv: msg.iv }, 
                            privKey
                        );
                        return {
                            id: msg.id || `msg-${index}`,
                            sender: msg.sender_id, // We'll just display ID for now
                            content: cleartext,
                            timestamp: msg.timestamp
                        };
                    } catch (err) {
                        console.error(`Failed to decrypt message from ${msg.sender_id}:`, err);
                        return {
                            id: msg.id || `msg-${index}`,
                            sender: msg.sender_id,
                            content: "Decryption failed: This message may have been corrupted.",
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
        if (!recipientId) return;
        fetchAndDecrypt();

        // Subscribe to WebSocket
        const unsubscribe = wsManager.subscribe(async (msg: WSMessageReceivePayload) => {
            const myUserId = localStorage.getItem('whisper_user_id');
            // Only process messages for the current conversation
            if (msg.sender_id === recipientId || msg.recipient_id === recipientId) {
                try {
                    const privKey = await getPrivateKey();
                    if (!privKey) return;
                    
                    const isSender = msg.sender_id === myUserId;
                    const keyToUse = isSender && msg.encrypted_key_for_self 
                        ? msg.encrypted_key_for_self 
                        : msg.encrypted_key;

                    const cleartext = await decryptMessage(
                        { encryptedKey: keyToUse, ciphertext: msg.ciphertext, iv: msg.iv }, 
                        privKey
                    );
                    
                    const newDecryptedMsg: DecryptedMessage = {
                        id: msg.id,
                        sender: msg.sender_id,
                        content: cleartext,
                        timestamp: msg.timestamp
                    };
                    
                    setMessages(prev => [...prev, newDecryptedMsg]);
                } catch (err) {
                    console.error("Failed to decrypt incoming WS message", err);
                    setMessages(prev => [...prev, {
                        id: msg.id,
                        sender: msg.sender_id,
                        content: "Decryption failed for incoming message.",
                        error: true,
                        timestamp: msg.timestamp
                    }]);
                }
            }
        });

        return () => unsubscribe();
    }, [recipientId]);

    const myUserId = typeof window !== 'undefined' ? localStorage.getItem('whisper_user_id') : null;

    return (
        <div className="w-full md:flex-1 bg-gray-50 flex flex-col h-screen md:h-auto">
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 sticky top-0">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {loading && (
                    <div className="text-center py-8">
                        <div className="inline-block">
                            <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                        </div>
                        <p className="text-gray-500 text-sm mt-2">Loading messages...</p>
                    </div>
                )}

                {messages.length === 0 && !loading && !error && (
                    <div className="text-center py-16">
                        <Lock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-600 text-sm font-medium">No messages yet</p>
                        <p className="text-gray-500 text-xs mt-1">Messages will appear here once received</p>
                    </div>
                )}

                {messages.map((msg) => (
                    <MessageBubble
                        key={msg.id}
                        content={msg.content}
                        sender={msg.sender}
                        isSent={msg.sender === myUserId}
                        timestamp={msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        error={msg.error}
                    />
                ))}
            </div>

            {/* Refresh Button */}
            <div className="p-4 bg-white border-t border-gray-200 flex justify-center">
                <button
                    onClick={fetchAndDecrypt}
                    disabled={loading}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Refresh messages"
                >
                    <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>
        </div>
    );
}
