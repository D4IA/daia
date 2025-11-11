import React from 'react';
import { useSocketOptional } from './socket';

interface SocketStatusProps {
    showDetails?: boolean;
    className?: string;
}

export const SocketStatus: React.FC<SocketStatusProps> = ({ 
    showDetails = true, 
    className = '' 
}) => {
    const socketContext = useSocketOptional();
    
    // Extract properties, providing defaults when context is null
    const socket = socketContext?.socket;
    const isConnected = socketContext?.isConnected || false;
    const error = socketContext?.error;
    const reconnect = socketContext?.reconnect;

    const getStatusText = () => {
        if (error) return 'Error';
        if (isConnected) return 'Connected';
        return 'Connecting...';
    };

    return (
        <div className={`socket-status ${className}`}>
            <span>Status: {getStatusText()}</span>
            
            {showDetails && (
                <>
                    <div>Socket ID: {socket?.id || 'N/A'}</div>
                    
                    {error && (
                        <div>Error: {error}</div>
                    )}

                    {(error || !isConnected) && (
                        <button onClick={reconnect}>
                            Reconnect
                        </button>
                    )}
                </>
            )}
        </div>
    );
};

export default SocketStatus;