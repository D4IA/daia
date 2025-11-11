import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SocketMessage } from './message';

export interface ConnectionData {
    clientId: string;
    role: "car" | "gate";
}

interface SocketContextType {
    socket: Socket;
    isConnected: boolean;
    error: string | null;
    reconnect: () => void;
    send: (message: SocketMessage) => void;
    connectionData: ConnectionData;
}

const SocketContext = createContext<SocketContextType | null>(null);

interface SocketProviderProps {
    children: ReactNode;
    serverUrl?: string;
    connectionData: ConnectionData;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({
    children,
    serverUrl = `${window.location.protocol}//${window.location.host}`,
    connectionData
}) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reconnectCounter, setReconnectCounter] = useState(0);

    const reconnect = useCallback(() => {
        setError(null);
        setReconnectCounter(prev => prev + 1);
    }, []);

    useEffect(() => {
        // Create new socket connection with handshake data
        const newSocket = io(serverUrl, {
            transports: ['polling'],
            forceNew: true,
            auth: {
                clientId: connectionData.clientId,
                role: connectionData.role,
            },
        });

        // Connection event handlers
        newSocket.on('connect', () => {
            console.log('Connected to server:', newSocket.id);
            setIsConnected(true);
            setError(null);
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from server');
            setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            setIsConnected(false);
            setError(error.message || 'Connection failed');
        });

        setSocket(newSocket);

        // Cleanup function to close socket when effect re-runs or component unmounts
        return () => {
            newSocket.close();
            setSocket(null);
            setIsConnected(false);
        };
    }, [serverUrl, connectionData, reconnectCounter]);

    const send = useCallback((message: SocketMessage) => {
        if (socket && isConnected) {
            socket.emit('message', message);
        } else {
            throw new Error(`Socket not connected`)
        }
    }, [socket, isConnected]);

    // Only provide context value when socket is available
    const value: SocketContextType | null = socket ? {
        socket,
        isConnected,
        error,
        reconnect,
        send,
        connectionData,
    } : null;

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};

// Custom hook to use socket context
export const useSocket = (): SocketContextType => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

// Custom hook to optionally use socket context (returns null if not available)
export const useSocketOptional = (): SocketContextType | null => {
    return useContext(SocketContext);
};

interface SocketBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

export const SocketBoundary: React.FC<SocketBoundaryProps> = ({
    children,
    fallback = <div>Connecting to server...</div>
}) => {
    const context = useSocketOptional();

    if (!context || !context.socket || (!context.isConnected || context.error !== null)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
};

export default SocketProvider;