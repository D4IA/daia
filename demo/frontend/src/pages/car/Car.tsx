import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ConnectionData, SocketBoundary, SocketProvider, useSocket } from '../../socket/socket';
import { SocketStatus } from '../../socket/status';
import { CarHandler } from './CarHandler';
import { createMockCarConfig } from './mockConfig';
import { generateUUID } from '../../utils/uuid';

function CarContent({ role, gateId } : { role: 'entering' | 'exiting', gateId: string }) {
    const { socket, connectionData } = useSocket();
    const mode = role === 'entering' ? 'entry' : 'exit';
    const config = useMemo(() => createMockCarConfig(mode), [mode]);
    const [sessionId] = useState(generateUUID());

    if (!socket) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 text-lg">Connecting to server...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
                    <h1 className="text-4xl font-bold text-gray-800 mb-6 text-center">
                        {role === 'entering' ? '🚗 Vehicle Entering' : '🚙 Vehicle Exiting'}
                    </h1>
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-8">
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h2 className="text-sm font-semibold text-gray-600 mb-2">Client ID</h2>
                            <p className="font-mono text-sm text-gray-800 break-all">{connectionData.clientId}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h2 className="text-sm font-semibold text-gray-600 mb-2">Gate ID</h2>
                            <p className="font-mono text-sm text-gray-800 break-all">{gateId}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h2 className="text-sm font-semibold text-gray-600 mb-2">Session ID</h2>
                            <p className="font-mono text-sm text-gray-800 break-all">{sessionId}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h2 className="text-sm font-semibold text-gray-600 mb-2">Vehicle Mode</h2>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                role === 'entering' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                            }`}>
                                {role === 'entering' ? 'Entering' : 'Exiting'}
                            </span>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6 mb-8">
                        <SocketStatus />
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                    <CarHandler
                        socket={socket}
                        config={config}
                        gateAgentId={gateId}
                        carAgentId={connectionData.clientId}
                        sessionId={sessionId}
                    />
                </div>
            </div>
        </div>
    );
}

export function Car() {
    const [searchParams] = useSearchParams();
    const gateId = searchParams.get('gateId') ?? "";
    const agentRole = searchParams.get('agentRole') ?? "";

    if (!gateId) {
        throw new Error(`No gateId provided in URL. Please provide a valid gateId.`);
    }

    // Validate and convert agentRole to the expected type
    if (!agentRole || (agentRole !== 'entering' && agentRole !== 'exiting')) {
        throw new Error(`Invalid or missing agentRole. Must be 'entering' or 'exiting', got: ${agentRole}`);
    }

    const role: 'entering' | 'exiting' = agentRole as 'entering' | 'exiting';

    const [connectionData] = useState<ConnectionData>(() => ({
        clientId: generateUUID(),
        role: "car" as const
    }));

    return (
        <SocketProvider connectionData={connectionData}>
            <SocketBoundary>
                <CarContent role={role} gateId={gateId} />
            </SocketBoundary>
        </SocketProvider>
    );
}