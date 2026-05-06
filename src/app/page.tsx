'use client';

import { useState, useEffect } from 'react';
import Onboarding from '@/components/Onboarding';
import SendMessage from '@/components/SendMessage';
import { Lock, LogOut, Settings } from 'lucide-react';
import Inbox from '@/components/Inbox';
import ChatList from '@/components/ChatList';
import { deletePrivateKey } from '@/lib/storage';

interface Conversation {
    id: string;
    name: string;
    lastMessage?: string;
    timestamp?: string;
}

export default function Home() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatUsername, setNewChatUsername] = useState('');

  useEffect(() => {
    setMounted(true);
    const savedUser = localStorage.getItem('whisper_username');
    if (savedUser) setCurrentUser(savedUser);
  }, []);

  const handleAddNewChat = async () => {
    if (!newChatUsername.trim()) return;
    
    const exists = conversations.find(c => c.name.toLowerCase() === newChatUsername.toLowerCase());
    if (exists) {
      setSelectedChat(exists.id);
      setNewChatUsername('');
      setShowNewChat(false);
      return;
    }

    const newConversation: Conversation = {
      id: newChatUsername.toLowerCase(),
      name: newChatUsername.trim(),
      lastMessage: 'No messages yet',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setConversations([newConversation, ...conversations]);
    setSelectedChat(newConversation.id);
    setNewChatUsername('');
    setShowNewChat(false);
  };

  const handleReset = async () => {
    if (confirm('This will delete your local keys and username. Are you sure?')) {
      try {
        await deletePrivateKey();
      } finally {
        localStorage.removeItem('whisper_username');
        localStorage.removeItem('whisper_public_key');
      }
      setCurrentUser(null);
    }
  };

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  if (!currentUser) {
    return <Onboarding onComplete={(name) => setCurrentUser(name)} />;
  }

  return (
    <main className="flex h-screen bg-white text-slate-900 flex-col md:flex-row overflow-hidden">
      {/* Desktop Header */}
      <div className="hidden md:flex items-center justify-between bg-green-500 text-white px-4 py-3 fixed top-0 left-0 right-0 h-16 z-10 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">WhisperBox</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { }}
            className="p-2 hover:bg-green-600 rounded-full transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 hover:bg-green-600 rounded-full transition-colors"
            title="Reset account"
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
        {/* Chat List Sidebar - Hidden on mobile when chat is selected, visible on desktop */}
        <div className={`${selectedChat && 'md:block hidden md:flex'} ${!selectedChat && 'flex'} flex-col`}>
          <ChatList
            conversations={conversations}
            selectedConversation={selectedChat}
            onSelectConversation={setSelectedChat}
            onNewChat={() => setShowNewChat(true)}
          />
        </div>

        {/* Main Chat Area - Hidden on mobile when no chat selected, visible on desktop */}
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
              <Inbox username={currentUser} />

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Start New Chat</h3>
            <input
              type="text"
              placeholder="Enter username"
              value={newChatUsername}
              onChange={(e) => setNewChatUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddNewChat()}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowNewChat(false);
                  setNewChatUsername('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNewChat}
                disabled={!newChatUsername.trim()}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
              >
                Start Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
