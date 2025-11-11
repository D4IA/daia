import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSocket, SocketProvider, SocketBoundary } from '../socket/socket';
import { MessagesDisplay } from '../components/messageDisplay';
import { SocketMessage, SocketMessageSchema } from '../socket/message';
import { generateUUID } from '../utils/uuid';

const STORAGE_KEY = 'spectator_messages';

interface SessionInfo {
    sessionId: string;
    firstSeen: Date;
}

interface SpectatorHeaderProps {
    isConnected: boolean;
    sessionInfos: SessionInfo[];
    selectedSessionId: string | null;
    onSessionChange: (sessionId: string | null) => void;
    onResetMessages: () => void;
    autoScroll: boolean;
    onAutoScrollChange: (autoScroll: boolean) => void;
}

function SpectatorHeader({ 
    isConnected, 
    sessionInfos, 
    selectedSessionId, 
    onSessionChange, 
    onResetMessages,
    autoScroll,
    onAutoScrollChange
}: SpectatorHeaderProps) {
    return (
        <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Message Sniffer</h1>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-sm font-medium text-gray-700">
                            {isConnected ? 'Connected' : 'Disconnected'}
                        </span>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <input
                            type="checkbox"
                            checked={autoScroll}
                            onChange={(e) => onAutoScrollChange(e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        />
                        Auto Scroll
                    </label>
                    <select
                        value={selectedSessionId || ''}
                        onChange={(e) => onSessionChange(e.target.value || null)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All Sessions</option>
                        {sessionInfos.map(({ sessionId, firstSeen }) => (
                            <option key={sessionId} value={sessionId}>
                                {sessionId} ({firstSeen.toLocaleString()})
                            </option>
                        ))}
                    </select>
                    <button 
                        onClick={onResetMessages}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
                    >
                        Reset All Messages
                    </button>
                </div>
            </div>
        </div>
    );
}

function SpectatorContent() {
    const { socket, isConnected } = useSocket();
    const [messages, setMessages] = useState<SocketMessage[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [autoScroll, setAutoScroll] = useState<boolean>(true);

    // Load messages from localStorage on component mount
    useEffect(() => {
        const savedMessages = localStorage.getItem(STORAGE_KEY);
        if (savedMessages) {
            try {
                const parsed = JSON.parse(savedMessages);
                // Validate the entire array using Zod schema
                const validatedMessages = SocketMessageSchema.array().parse(parsed);
                setMessages(validatedMessages);
            } catch (error) {
                console.error('Failed to parse saved messages:', error);
            }
        }
    }, []);

    // Save messages to localStorage whenever messages change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }, [messages]);

    // Handle incoming messages
    const handleMessage = useCallback((data: unknown) => {
        try {
            // Validate the message structure
            const message = SocketMessageSchema.parse(data);
            setMessages(prev => [...prev, message]);
        } catch (error) {
            console.error('Invalid message received:', error, data);
        }
    }, []);

    // Set up socket listeners
    useEffect(() => {
        if (socket) {
            socket.on('message', handleMessage);

            return () => {
                socket.off('message', handleMessage);
            };
        }
    }, [socket, handleMessage]);

    // Reset all messages
    const resetMessages = useCallback(() => {
        setMessages([]);
        localStorage.removeItem(STORAGE_KEY);
        setSelectedSessionId(null);
    }, []);

    // Extract unique session information
    const sessionInfos = useMemo(() => {
        const sessionMap = new Map<string, Date>();
        
        messages.forEach(message => {
            // Get sessionId from different message types
            let sessionId: string | undefined;
            if ('sessionId' in message) {
                sessionId = message.sessionId;
            } else if ('sessionIdToUse' in message) {
                sessionId = message.sessionIdToUse;
            }
            
            if (sessionId && !sessionMap.has(sessionId)) {
                sessionMap.set(sessionId, new Date());
            }
        });

        return Array.from(sessionMap.entries()).map(([sessionId, firstSeen]) => ({
            sessionId,
            firstSeen
        })).sort((a, b) => a.firstSeen.getTime() - b.firstSeen.getTime());
    }, [messages]);

    // Filter messages by selected session
    const filteredMessages = useMemo(() => {
        if (!selectedSessionId) return messages;
        
        return messages.filter(message => {
            if ('sessionId' in message) {
                return message.sessionId === selectedSessionId;
            } else if ('sessionIdToUse' in message) {
                return message.sessionIdToUse === selectedSessionId;
            }
            return false;
        });
    }, [messages, selectedSessionId]);

    return (
        <div className="h-screen flex flex-col">
            <SpectatorHeader
                isConnected={isConnected}
                sessionInfos={sessionInfos}
                selectedSessionId={selectedSessionId}
                onSessionChange={setSelectedSessionId}
                onResetMessages={resetMessages}
                autoScroll={autoScroll}
                onAutoScrollChange={setAutoScroll}
            />
            
            <div className="flex-1 overflow-hidden">
                <MessagesDisplay 
                    messages={filteredMessages} 
                    autoScroll={autoScroll}
                    className="h-full" 
                />
            </div>
        </div>
    );
}

export const SpectatorPage: React.FC = () => {
    const connectionData = React.useMemo(() => ({
        clientId: generateUUID(),
        role: "gate" as const
    }), []);

    return (
        <SocketProvider connectionData={connectionData}>
            <SocketBoundary>
                <SpectatorContent />
            </SocketBoundary>
        </SocketProvider>
    );
};

export default SpectatorPage;