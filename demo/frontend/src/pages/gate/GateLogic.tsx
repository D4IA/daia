import React, { useEffect, useState } from 'react';
import { GateAgentConfig } from '../../agents/agents/gate/agent';
import { MessageType, SocketMessage } from '../../socket/message';
import { useSocket } from '../../socket/socket';
import { GateHandler } from './GateHandler';

interface GateLogicProps {
	config: GateAgentConfig;
}

export const GateLogic: React.FC<GateLogicProps> = ({ config }) => {
	const { socket, connectionData } = useSocket();
	const [waitingCars, setWaitingCars] = useState<(SocketMessage & { role: MessageType.CAR_AWAITS_HANDLING })[]>([]);

	useEffect(() => {
		if (!socket) return;

		const handleMessage = (message: SocketMessage) => {
			if (
				message.role === MessageType.CAR_AWAITS_HANDLING &&
				message.gateClientId === connectionData.clientId
			) {
				setTimeout(() => {
					setWaitingCars(prev => [...prev, message]);
				}, 1000);
			}

		};

		socket.on('message', handleMessage);

		return () => {
			socket.off('message', handleMessage);
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [socket]);

	const handleCarComplete = (sessionId: string) => {
		setWaitingCars(prev => prev.filter(c => c.sessionIdToUse !== sessionId));
	};

	if (!socket) {
		return <div>No socket connection</div>;
	}

	return (
		<div>
			<h3>Waiting Cars ({waitingCars.length})</h3>
			{waitingCars.length === 0 ? (
				<p>No cars waiting</p>
			) : (
				waitingCars.map((car) => (
					<GateHandler
						key={car.sessionIdToUse}
						car={car}
						socket={socket}
						config={config}
						onComplete={() => handleCarComplete(car.sessionIdToUse)}
					/>
				))
			)}
		</div>
	);
};