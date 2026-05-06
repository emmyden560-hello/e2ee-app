'use client';

import { useState, useEffect } from 'react';
import Onboarding from '@/components/Onboarding';
import SendMessage from '@/components/SendMessage';
import { Lock, LogOut, Settings, Search, UserPlus } from 'lucide-react';
import Inbox from '@/components/Inbox';
import ChatList from '@/components/ChatList';
import { deletePrivateKey } from '@/lib/storage';
import { api, UserProfile, Conversation } from '@/lib/api';
import { logoutUser } from '@/lib/auth';

interface LocalConversation {
    id: string;
    name: string;
    lastMessage?: string;
    timestamp?: string;
    unread?: number;
}

export default function Home() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [conversations, setConversations] = useState<LocalConversation[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedUser = localStorage.getItem('whisper_username');
    const token = localStorage.getItem('whisper_access_token');
    
    if (savedUser && token) {
      setCurrentUser(savedUser);
      loadConversations();
    } else {
      // Clear legacy state so the user is forced to log in or register
      localStorage.removeItem('whisper_username');
      setCurrentUser(null);
    }
  }, []);

  const loadConversations = async () => {
    try {
      const convs = await api.getConversations();
      setConversations(convs.map(c => ({
        id: c.user_id,
        name: c.display_name || c.username,
        timestamp: c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
      })));
    } catch (e) {
      console.error('Failed to load conversations', e);
    }
  };

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await api.searchUsers(searchQuery);
      setSearchResults(results);
    } catch (e) {
      console.error('Failed to search users', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartChat = (user: UserProfile) => {
    const exists = conversations.find(c => c.id === user.id);
    if (!exists) {
      const newConversation: LocalConversation = {
        id: user.id,
        name: user.display_name || user.username,
      };
      setConversations([newConversation, ...conversations]);
    }
    
    setSelectedChat(user.id);
    setShowNewChat(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to log out?')) {
      try {
        await logoutUser();
      } finally {
        setCurrentUser(null);
      }
    }
  };

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  if (!currentUser) {
    return <Onboarding onComplete={(name) => {
      setCurrentUser(name);
      loadConversations();
    }} />;
  }

  return (
    <main className="flex h-screen bg-white text-slate-900 flex-col md:flex-row overflow-hidden">
      {/* Desktop Header */}
      <div className="hidden md:flex items-center justify-between bg-green-500 text-white px-4 py-3 fixed top-0 left-0 right-0 h-16 z-10 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">WhisperBox</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="mr-4 text-sm font-medium">@{currentUser}</span>
          <button
            onClick={handleReset}
            className="p-2 hover:bg-green-600 rounded-full transition-colors"
            title="Log out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden bg-green-500 text-white p-4 flex justify-between items-center sticky top-0 z-20 h-16">
        <h1 className="text-xl font-bold">WhisperBox</h1>
        <button
          onClick={handleReset}
          className="p-2 hover:bg-green-600 rounded-full transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Layout Container */}
      <div className="flex flex-1 overflow-hidden md:pt-16">
        {/* Chat List Sidebar */}
        <div className={`${selectedChat && 'md:block hidden md:flex'} ${!selectedChat && 'flex'} flex-col`}>
          <ChatList
            conversations={conversations}
            selectedConversation={selectedChat}
            onSelectConversation={setSelectedChat}
            onNewChat={() => setShowNewChat(true)}
          />
        </div>

        {/* Main Chat Area */}
        <div className={`${!selectedChat && 'md:flex hidden md:flex-col'} ${selectedChat && 'flex'} flex-col flex-1 overflow-hidden`}>
          {selectedChat ? (
            <>
              {/* Mobile Back Button */}
              <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center gap-3">
                <button
                  onClick={() => setSelectedChat(null)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  ← Back
                </button>
                <h2 className="font-semibold text-gray-900">
                  {conversations.find(c => c.id === selectedChat)?.name}
                </h2>
              </div>

              {/* Messages Area */}
              <Inbox recipientId={selectedChat} />

              {/* Send Message Area */}
              <SendMessage sender={currentUser} recipient={selectedChat} />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center bg-gray-50">
              <div className="text-center">
                <Lock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-600 mb-2">No chat selected</h2>
                <p className="text-gray-500">Select a contact to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full max-h-[80vh] flex flex-col">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Start New Chat</h3>
            
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Search username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                autoFocus
              />
              <button
                onClick={handleSearchUsers}
                disabled={!searchQuery.trim() || isSearching}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mb-4 min-h-[150px]">
              {isSearching ? (
                <div className="text-center py-4 text-gray-500 text-sm">Searching...</div>
              ) : searchResults.length > 0 ? (
                <ul className="space-y-2">
                  {searchResults.map(user => (
                    <li key={user.id}>
                      <button
                        onClick={() => handleStartChat(user)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg border border-gray-100 transition-colors text-left"
                      >
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <UserPlus className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{user.display_name}</p>
                          <p className="text-sm text-gray-500 truncate">@{user.username}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm">
                  {searchQuery ? 'No users found' : 'Search for someone to chat with'}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowNewChat(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 w-full"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
