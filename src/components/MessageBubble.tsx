'use client';

import { Check, CheckCheck } from 'lucide-react';

interface MessageBubbleProps {
    content: string;
    sender: string;
    isSent: boolean;
    timestamp?: string;
    error?: boolean;
    sending?: boolean;
}

export default function MessageBubble({
    content,
    sender,
    isSent,
    timestamp,
    error,
    sending
}: MessageBubbleProps) {
    return (
        <div className={`flex gap-2 mb-2 ${isSent ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`max-w-xs px-4 py-2 rounded-2xl ${sending
                        ? 'bg-green-400 text-white rounded-br-none opacity-75'
                        : isSent
                            ? 'bg-green-500 text-white rounded-br-none'
                            : error
                                ? 'bg-red-100 text-red-700 rounded-bl-none border border-red-300'
                                : 'bg-white text-gray-900 rounded-bl-none border border-gray-200'
                    }`}
            >
                <p className="text-sm break-words">{content}</p>
                <div className={`flex items-center gap-1 mt-1 ${isSent ? 'justify-end' : 'justify-start'}`}>
                    <span className={`text-xs ${isSent ? 'text-green-100' : 'text-gray-500'}`}>
                        {timestamp}
                    </span>
                    {isSent && (
                        <Check className={`w-3 h-3 ${sending ? 'text-green-100 opacity-50' : error ? 'text-red-500' : 'text-green-100'}`} />
                    )}
                </div>
            </div>
        </div>
    );
}
