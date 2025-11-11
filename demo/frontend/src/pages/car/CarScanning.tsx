import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { generateUUID } from '../../utils/uuid';

export function CarScanning() {
	const scannerRef = useRef<Html5QrcodeScanner | null>(null);
	const navigate = useNavigate();
	const [isScanning, setIsScanning] = useState(true);
	const [error, setError] = useState<string>('');
	const [qrReaderElement, setQrReaderElement] = useState<HTMLDivElement | null>(null);
	const [qrReaderId] = useState(() => generateUUID());
	const [agentRole, setAgentRole] = useState<'entering' | 'exiting'>('entering');

	useEffect(() => {
		// Only initialize scanner if we're scanning and the element exists
		if (!isScanning || !qrReaderElement) return;

		// Clean up any existing scanner first
		if (scannerRef.current) {
			scannerRef.current.clear().catch(console.error);
			scannerRef.current = null;
		}

		// Clear any existing content in the element
		qrReaderElement.innerHTML = '';

		const scanner = new Html5QrcodeScanner(
			qrReaderId,
			{
				fps: 10,
				qrbox: { width: 250, height: 250 },
				aspectRatio: 1.0,
			},
			/* verbose= */ false
		);

		scannerRef.current = scanner;

		const onScanSuccess = (decodedText: string) => {
			console.log('QR Code scanned:', decodedText);
			setIsScanning(false);
			
			// Clean up scanner before navigation
			if (scannerRef.current) {
				scannerRef.current.clear().catch(console.error);
				scannerRef.current = null;
			}
			
			// Extract gate ID from QR code and navigate
			try {
				// Assume the QR code contains a UUID gate ID
				const gateId = decodedText.trim();
				
				// Basic UUID validation (checking format)
				const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
				
				if (uuidRegex.test(gateId)) {
					navigate(`/car/handle?gateId=${gateId}&agentRole=${agentRole}`);
				} else {
					setError('Invalid gate ID format in QR code');
					setIsScanning(true);
				}
			} catch {
				setError('Invalid QR code format');
				setIsScanning(true);
			}
		};

		const onScanFailure = (error: string) => {
			// Handle scan failure silently or log for debugging
			console.warn('QR scan error:', error);
		};

		scanner.render(onScanSuccess, onScanFailure);

		return () => {
			if (scannerRef.current) {
				scannerRef.current.clear().catch(console.error);
				scannerRef.current = null;
			}
		};
	}, [navigate, isScanning, qrReaderElement, qrReaderId, agentRole]);

	const resetScanner = () => {
		// Clean up existing scanner before resetting
		if (scannerRef.current) {
			scannerRef.current.clear().catch(console.error);
			scannerRef.current = null;
		}
		
		// Clear the DOM element content
		if (qrReaderElement) {
			qrReaderElement.innerHTML = '';
		}
		
		setError('');
		setIsScanning(true);
	};

	return (
		<div style={{ padding: '20px', textAlign: 'center' }}>
			<h2>QR Code Scanner</h2>
			
			{/* Role selection buttons */}
			<div style={{ marginBottom: '20px' }}>
				<button 
					onClick={() => setAgentRole('entering')}
					style={{
						padding: '10px 20px',
						marginRight: '10px',
						backgroundColor: agentRole === 'entering' ? '#007bff' : '#6c757d',
						color: 'white',
						border: 'none',
						borderRadius: '5px',
						cursor: 'pointer'
					}}
				>
					Car Entering Agent
				</button>
				<button 
					onClick={() => setAgentRole('exiting')}
					style={{
						padding: '10px 20px',
						backgroundColor: agentRole === 'exiting' ? '#007bff' : '#6c757d',
						color: 'white',
						border: 'none',
						borderRadius: '5px',
						cursor: 'pointer'
					}}
				>
					Car Exiting Agent
				</button>
			</div>
			
			<p style={{ marginBottom: '20px', fontWeight: 'bold' }}>
				Current Role: {agentRole === 'entering' ? 'Car Entering Agent' : 'Car Exiting Agent'}
			</p>
			
			{error && (
				<div style={{ color: 'red', marginBottom: '10px' }}>
					{error}
					<button onClick={resetScanner} style={{ marginLeft: '10px' }}>
						Try Again
					</button>
				</div>
			)}
			
			{isScanning ? (
				<div>
					<p>Point your camera at a QR code to scan</p>
					<div 
						ref={setQrReaderElement}
						id={qrReaderId}
						style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}
					></div>
				</div>
			) : (
				<div>
					<p>QR Code scanned successfully! Navigating...</p>
				</div>
			)}
		</div>
	);
}