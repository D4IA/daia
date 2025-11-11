import React, { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { CarAgentConfig } from '../../agents/agents/car/agent';
import { IoConn } from '../../agents/conn/ioConn';
import { useCarAgent } from '../../run/useCar';
import { MessageType, SocketMessage } from '../../socket/message';
import { usePreventReload } from '../../utils/hooks/usePreventReload';
import { createMockCarControls } from './mockConfig';

interface CarHandlerProps {
	socket: Socket;
	config: CarAgentConfig;
	carAgentId: string,
	gateAgentId: string;
	sessionId: string,
}

export const CarHandler: React.FC<CarHandlerProps> = ({
	socket,
	config,
	carAgentId,
	gateAgentId,
	sessionId,
}) => {
	const [controls] = useState(createMockCarControls());

	const { run, result } = useCarAgent({
		controls,
		config,
		sessionId,
	});

	usePreventReload(result.status === "pending");

	useEffect(() => {
		if (!socket) return;

		let isActive = true;

		const handleConnection = async () => {
			try {
				const initMsg: SocketMessage = {
					role: MessageType.CAR_AWAITS_HANDLING,
					sessionIdToUse: sessionId,
					carClientId: carAgentId,
					gateClientId: gateAgentId,
				}
				socket.emit("message", initMsg);

				const ioConn = new IoConn(socket, {
					acceptRole: MessageType.GATE,
					emitRole: MessageType.CAR,
					sessionId,
					remoteClientId: gateAgentId,
				});

				console.log("Starting car run with gateAgentId:", gateAgentId, "sessionId:", sessionId);
				if (isActive) {
					await run(ioConn);
				}
			} catch (error) {
				console.error('Error connecting to gate:', error);
			} finally {
				if (isActive) {
					console.log("Finished car run", gateAgentId);
				}
			}
		};

		handleConnection();

		return () => {
			isActive = false;
		};
	}, [sessionId, socket, run, gateAgentId, carAgentId]);

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
}