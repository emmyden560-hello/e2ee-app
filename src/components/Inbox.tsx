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
    const [myUserId, setMyUserId] = useState<string | null>(null);

    useEffect(() => {
        setMyUserId(localStorage.getItem('whisper_user_id'));
    }, []);

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

            const currentUserId = localStorage.getItem('whisper_user_id');

            // Map through messages and attempt decryption
            const decryptedList = await Promise.all(
                encryptedData.map(async (msg: MessageData, index: number) => {
                    try {
                        const isSender = msg.from_user_id === currentUserId;
                        // For decryption, we need the encryptedKey. If we are the sender, we use encryptedKeyForSelf.
                        const keyToUse = isSender && msg.payload.encryptedKeyForSelf
                            ? msg.payload.encryptedKeyForSelf
                            : msg.payload.encryptedKey;

                        const cleartext = await decryptMessage(
                            { encryptedKey: keyToUse, ciphertext: msg.payload.ciphertext, iv: msg.payload.iv },
                            privKey
                        );
                        return {
                            id: msg.id || `msg-${index}`,
                            sender: msg.from_user_id, // We'll just display ID for now
                            content: cleartext,
                            timestamp: msg.created_at
                        };
                    } catch (err) {
                        console.error(`Failed to decrypt message from ${msg.from_user_id}:`, err);
                        return {
                            id: msg.id || `msg-${index}`,
                            sender: msg.from_user_id,
                            content: "Decryption failed: This message may have been corrupted.",
                            error: true,
                            timestamp: msg.created_at
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

        // Reset state when changing conversations
        setMessages([]);
        setError('');
        setLoading(true);

        fetchAndDecrypt();

        // Listen for optimistic message updates (when user sends a message)
        const handleMessageSending = (event: Event) => {
            const customEvent = event as CustomEvent;
            const { content, sender, timestamp, recipient } = customEvent.detail;

            // Only add message if it's for the current conversation
            if (recipient === recipientId) {
                const newMsg: DecryptedMessage = {
                    id: `optimistic-${timestamp}`,
                    sender: sender,
                    content: content,
                    timestamp: timestamp
                };
                setMessages(prev => [...prev, newMsg]);
            }
        };

        // Subscribe to WebSocket for other incoming messages
        const unsubscribe = wsManager.subscribe(async (msg: WSMessageReceivePayload) => {
            const currentUserId = localStorage.getItem('whisper_user_id');
            // Only process messages for the current conversation
            if (msg.from_user_id === recipientId || msg.to_user_id === recipientId) {
                try {
                    const privKey = await getPrivateKey();
                    if (!privKey) return;

                    const isSender = msg.from_user_id === currentUserId;
                    const keyToUse = isSender && msg.payload.encryptedKeyForSelf
                        ? msg.payload.encryptedKeyForSelf
                        : msg.payload.encryptedKey;

                    const cleartext = await decryptMessage(
                        { encryptedKey: keyToUse, ciphertext: msg.payload.ciphertext, iv: msg.payload.iv },
                        privKey
                    );

                    const newDecryptedMsg: DecryptedMessage = {
                        id: msg.id,
                        sender: msg.from_user_id,
                        content: cleartext,
                        timestamp: msg.created_at
                    };

                    // Replace optimistic messages with real ones
                    setMessages(prev => {
                        if (newDecryptedMsg.sender === currentUserId) {
                            // Remove optimistic messages when we get the real one back
                            const filtered = prev.filter(m => !m.id.startsWith('optimistic-'));
                            // Add the real message if not already there
                            if (!filtered.some(m => m.id === msg.id)) {
                                return [...filtered, newDecryptedMsg];
                            }
                            return filtered;
                        }
                        // For received messages, just add if not already there
                        if (!prev.some(m => m.id === msg.id)) {
                            return [...prev, newDecryptedMsg];
                        }
                        return prev;
                    });
                } catch (err) {
                    console.error("Failed to decrypt incoming WS message", err);
                    setMessages(prev => [...prev, {
                        id: msg.id,
                        sender: msg.from_user_id,
                        content: "Decryption failed for incoming message.",
                        error: true,
                        timestamp: msg.created_at
                    }]);
                }
            }
        });

        window.addEventListener('message-sending', handleMessageSending);

        return () => {
            unsubscribe();
            window.removeEventListener('message-sending', handleMessageSending);
        };
    }, [recipientId]);

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
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
