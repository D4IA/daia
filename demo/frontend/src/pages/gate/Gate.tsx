import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { SocketBoundary, SocketProvider } from '../../socket/socket';
import { SocketStatus } from '../../socket/status';
import { generateUUID } from '../../utils/uuid';
import { GateLogic } from './GateLogic';
import { createMockGateConfig } from './mockConfig';
import { HourlyRateProvider, useHourlyRate } from '../../context/HourlyRateContext';

// Hourly Rate Input Component
function HourlyRateInput() {
	const { hourlyRate, setHourlyRate } = useHourlyRate();

	const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newRate = parseFloat(e.target.value);
		if (!isNaN(newRate) && newRate >= 0) {
			setHourlyRate(newRate);
		}
	};

	return (
		<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
			<label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700 mb-2">
				Hourly Parking Rate ($)
			</label>
			<div className="flex items-center space-x-2">
				<span className="text-gray-500">$</span>
				<input
					id="hourlyRate"
					type="number"
					min="0"
					step="0.50"
					value={hourlyRate}
					onChange={handleRateChange}
					className="block w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
					placeholder="8.50"
				/>
				<span className="text-sm text-gray-500">per hour</span>
			</div>
			<p className="text-xs text-gray-500 mt-1">
				This rate will be used in negotiations and billing calculations
			</p>
		</div>
	);
}

// Gate status indicator component
function GateStatusIndicator() {
	const [status, setStatus] = useState<'idle' | 'allowed' | 'denied'>('idle');
	const [message, setMessage] = useState<string>('');

	useEffect(() => {
		const handleGateAction = (event: CustomEvent) => {
			const { status: actionStatus, message: actionMessage } = event.detail;
			
			if (actionStatus === 'allowed') {
				setStatus('allowed');
				setMessage(actionMessage);
				// Show green light for 5 seconds
				setTimeout(() => {
					setStatus('idle');
					setMessage('');
				}, 15000);
			} else if (actionStatus === 'denied') {
				setStatus('denied');
				setMessage(actionMessage);
				// Show red X for 5 seconds
				setTimeout(() => {
					setStatus('idle');
					setMessage('');
				}, 15000);
			}
		};

		window.addEventListener('gateAction', handleGateAction as EventListener);
		
		return () => {
			window.removeEventListener('gateAction', handleGateAction as EventListener);
		};
	}, []);

	if (status === 'idle') {
		return (
			<div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg border">
				<div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center mb-2">
					<span className="text-2xl text-gray-500">⚪</span>
				</div>
				<p className="text-sm text-gray-500">Gate Status: Ready</p>
			</div>
		);
	}

	if (status === 'allowed') {
		return (
			<div className="flex flex-col items-center p-4 bg-green-50 rounded-lg border border-green-200">
				<div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mb-2 animate-pulse">
					<span className="text-2xl text-white">✓</span>
				</div>
				<p className="text-sm text-green-700 font-medium text-center">{message}</p>
			</div>
		);
	}

	if (status === 'denied') {
		return (
			<div className="flex flex-col items-center p-4 bg-red-50 rounded-lg border border-red-200">
				<div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center mb-2 animate-pulse">
					<span className="text-2xl text-white">✗</span>
				</div>
				<p className="text-sm text-red-700 font-medium text-center">{message}</p>
			</div>
		);
	}

	return null;
}

// Main Gate Content Component (uses context)
function GateContent() {
	const [clientId] = useState(() => generateUUID());
	const [connectionData] = useState(() => ({
		clientId,
		role: "gate" as const
	}));
	
	const mockConfig = createMockGateConfig();

	return (
		<SocketProvider connectionData={connectionData}>
			<SocketBoundary>
				<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
					<div className="max-w-4xl mx-auto">
						<div className="bg-white rounded-xl shadow-lg p-8 mb-8">
							<h1 className="text-4xl font-bold text-gray-800 mb-2 text-center">Gate Access Control</h1>
							<p className="text-gray-600 text-center mb-8">Scan the QR code below to connect your vehicle to this gate</p>
							
							<HourlyRateInput />
							
							<div className="flex flex-col items-center mb-8">
								<div className="bg-white p-6 rounded-lg shadow-md border-2 border-gray-200 mb-4">
									<QRCode value={clientId} size={200} />
								</div>
								<div className="bg-gray-100 rounded-lg px-4 py-2">
									<p className="text-sm text-gray-600">Gate ID:</p>
									<p className="font-mono text-lg font-semibold text-gray-800 break-all">{clientId}</p>
								</div>
							</div>

							<div className="grid md:grid-cols-2 gap-4 mb-8">
								<a 
									href={`/car/handle?gateId=${clientId}&agentRole=entering`} 
									target="_blank"
									className="flex items-center justify-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
								>
									<span className="mr-2">🚗</span>
									Run Vehicle Entering (opens new tab)
								</a>
								<a 
									href={`/car/handle?gateId=${clientId}&agentRole=exiting`} 
									target="_blank"
									className="flex items-center justify-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
								>
									<span className="mr-2">🚙</span>
									Run Vehicle Exiting (opens new tab)
								</a>
							</div>

							<div className="border-t border-gray-200 pt-6">
								<SocketStatus />
								<div className="mt-6">
									<GateStatusIndicator />
								</div>
							</div>
						</div>
						
						<div className="bg-white rounded-xl shadow-lg p-6">
							<GateLogic config={mockConfig} />
						</div>
					</div>
				</div>
			</SocketBoundary>
		</SocketProvider>
	);
}

export function Gate() {
	return (
		<HourlyRateProvider defaultRate={8.5}>
			<GateContent />
		</HourlyRateProvider>
	);
}