import React, { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { GateAgentConfig } from '../../agents/agents/gate/agent';
import { IoConn } from '../../agents/conn/ioConn';
import { useGateAgent } from '../../run/useGate';
import { MessageType, SocketMessage } from '../../socket/message';
import { createMockGateControls } from './mockConfig';
import { usePreventReload } from '../../utils/hooks/usePreventReload';
import { useHourlyRate } from '../../context/HourlyRateContext';

interface CarHandlerProps {
    car: SocketMessage & { role: MessageType.CAR_AWAITS_HANDLING };
    socket: Socket;
    config: GateAgentConfig;
    onComplete: () => void;
}

export const GateHandler: React.FC<CarHandlerProps> = ({
    car,
    socket,
    config,
    onComplete
}) => {
    const { hourlyRate } = useHourlyRate();
    const [controls] = useState(() => createMockGateControls(hourlyRate));
    
    const { run, result } = useGateAgent({
        controls,
        config,
        sessionId: car.sessionIdToUse,
    });

    usePreventReload(result.status === "pending");

    const handleGate = async () => {
        try {
            const ioConn = new IoConn(socket, {
                emitRole: MessageType.GATE,
                acceptRole: MessageType.CAR,
                sessionId: car.sessionIdToUse,
                remoteClientId: car.carClientId,
            });

            await run(ioConn);
        } catch (error) {
            console.error('Error handling gate:', error);
        } finally {
            console.log("Complete handling gate!")
            onComplete();
        }
    };

    useEffect(() => {
        handleGate()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const getStatusDisplay = () => {
        switch (result.status) {
            case 'pending':
                return <div style={{ padding: '10px', color: '#ff9800' }}>Status: Pending</div>;
            case 'success':
                return <div style={{ padding: '10px', color: '#4caf50' }}>Status: Resolved</div>;
            case 'error':
                return (
                    <div style={{ padding: '10px', color: '#f44336' }}>
                        Status: Rejected
                        {result.error && <div style={{ fontSize: '0.8em', marginTop: '5px' }}>Error: {result.error.message}</div>}
                    </div>
                );
            default:
                return <div style={{ padding: '10px', color: '#757575' }}>Status: Unknown</div>;
        }
    };

    return (
        <div>
            {getStatusDisplay()}
        </div>
    );
};