'use client';

import { MessageCircle, Phone, Info } from 'lucide-react';

interface ChatWindowProps {
    contactName: string | null;
    onClose: () => void;
}

export default function ChatWindow({ contactName, onClose }: ChatWindowProps) {
    if (!contactName) {
        return (
            <div className="hidden md:flex flex-1 bg-gray-50 flex-col items-center justify-center">
                <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
                <h2 className="text-xl font-semibold text-gray-600 mb-2">Select a chat</h2>
                <p className="text-gray-500 text-sm">Choose a contact to start messaging</p>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-gray-50 flex flex-col h-screen md:h-auto">
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold">
                        {contactName?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h2 className="font-semibold text-gray-900">{contactName}</h2>
                        <p className="text-xs text-gray-500">Online</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <Phone className="w-5 h-5 text-gray-600" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <Info className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="text-center py-4">
                    <p className="text-sm text-gray-500">Messages are end-to-end encrypted</p>
                </div>
            </div>

            {/* Message Input Area */}
            <div className="bg-white border-t border-gray-200 p-4">
                <div className="flex items-end gap-2">
                    <input
                        type="text"
                        placeholder="Message"
                        className="flex-1 px-4 py-2 bg-gray-100 rounded-full outline-none focus:bg-gray-200 transition-colors text-sm"
                    />
                    <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <MessageCircle className="w-5 h-5 text-green-500" />
                    </button>
                </div>
            </div>
        </div>
    );
}
