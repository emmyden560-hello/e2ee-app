'use client';

import { useState, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';

interface Conversation {
    id: string;
    name: string;
    lastMessage?: string;
    timestamp?: string;
    unread?: number;
}

interface ChatListProps {
    conversations: Conversation[];
    selectedConversation: string | null;
    onSelectConversation: (id: string) => void;
    onNewChat: () => void;
}

export default function ChatList({
    conversations,
    selectedConversation,
    onSelectConversation,
    onNewChat
}: ChatListProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredConversations, setFilteredConversations] = useState(conversations);

    useEffect(() => {
        const filtered = conversations.filter(conv => {
            const name = conv.name || '';
            const query = searchQuery || '';
            return name.toLowerCase().includes(query.toLowerCase());
        });
        setFilteredConversations(filtered);
    }, [searchQuery, conversations]);

    return (
        <div className="w-full md:w-96 bg-white border-r border-gray-200 h-screen md:h-auto flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold text-gray-900">Chats</h1>
                    <button
                        onClick={onNewChat}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        title="New chat"
                    >
                        <Plus className="w-6 h-6 text-gray-600" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search contacts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm outline-none focus:bg-gray-200 transition-colors"
                    />
                </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
                {filteredConversations.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                        {searchQuery ? 'No contacts found' : 'No conversations yet'}
                    </div>
                ) : (
                    filteredConversations.map((conversation) => (
                        <button
                            key={conversation.id}
                            onClick={() => onSelectConversation(conversation.id)}
                            className={`w-full px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
                                selectedConversation === conversation.id ? 'bg-gray-100' : ''
                            }`}
                        >
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 truncate">
                                        {conversation.name}
                                    </h3>
                                    <p className="text-sm text-gray-500 truncate mt-1">
                                        {conversation.lastMessage || 'No messages yet'}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className="text-xs text-gray-500">{conversation.timestamp}</span>
                                    {conversation.unread && conversation.unread > 0 && (
                                        <span className="bg-green-500 text-white text-xs rounded-full px-2 py-0.5 font-semibold">
                                            {conversation.unread}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
