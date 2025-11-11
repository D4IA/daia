import React from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'react-qr-code';

export const Home: React.FC = () => {
    const currentUrl = window.location.href;
    
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-5 bg-gray-50">
            <h1 className="mb-10 text-4xl font-bold text-center text-gray-800">
                Welcome to the Navigation Hub
            </h1>
            
            {/* QR Code Section */}
            <div className="mb-10 p-6 bg-white rounded-lg shadow-lg">
                <h2 className="mb-4 text-xl font-semibold text-center text-gray-700">
                    Scan QR Code to Access
                </h2>
                <div className="flex justify-center">
                    <QRCode
                        size={200}
                        value={currentUrl}
                        level="M"
                        className="border-4 border-gray-200 rounded-lg"
                    />
                </div>
                <p className="mt-3 text-sm text-center text-gray-500">
                    {currentUrl}
                </p>
            </div>
            
            <div className="flex flex-col gap-5 w-full max-w-md">
                <Link 
                    to="/gate" 
                    className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg text-center rounded-lg transition-colors duration-300 no-underline"
                >
                    Go to Gate
                </Link>

                <Link 
                    to="/car" 
                    className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold text-lg text-center rounded-lg transition-colors duration-300 no-underline"
                >
                    Go to Car Scanning
                </Link>

                <Link 
                    to="/spectator" 
                    className="px-8 py-4 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-lg text-center rounded-lg transition-colors duration-300 no-underline"
                >
                    Go to Spectator
                </Link>
            </div>
        </div>
    );
};

export default Home;