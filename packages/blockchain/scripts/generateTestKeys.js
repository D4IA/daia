#!/usr/bin/env node

const { PrivateKey } = require('@bsv/sdk');
const fs = require('fs');
const path = require('path');

// Path to .env.test in parent directory
const envTestPath = path.join(__dirname, '..', '.env.test');

// Check if .env.test exists and contains the required variables
let shouldWriteEnv = true;
if (fs.existsSync(envTestPath)) {
	const envContent = fs.readFileSync(envTestPath, 'utf-8');
	if (envContent.includes('TEST_PRIVATE_KEY') && 
	    envContent.includes('TEST_PUBLIC_KEY') && 
	    envContent.includes('TEST_PUBLIC_ADDRESS')) {
		shouldWriteEnv = false;
		console.log('⚠️  .env.test already contains test keys. Skipping file write.\n');
	}
}

// Generate a new private key
const privateKey = PrivateKey.fromRandom();

// Get the corresponding public key
const publicKey = privateKey.toPublicKey();

// Generate testnet address (prefix 0x6f)
const testnetAddress = publicKey.toAddress('testnet');

// Display results
console.log('=== BSV Test Keys Generated ===\n');
console.log('Private Key (WIF):', privateKey.toWif());
console.log('Public Key (hex):', publicKey.toString());
console.log('Testnet Address:', testnetAddress);

// Write to .env.test if needed
if (shouldWriteEnv) {
	const envContent = `# BSV Test Keys (generated ${new Date().toISOString()})
TEST_PRIVATE_KEY=${privateKey.toWif()}
TEST_PUBLIC_KEY=${publicKey.toString()}
TEST_PUBLIC_ADDRESS=${testnetAddress}

# Testnet Faucets - Get free test BSV:
# https://faucet.bitcoincloud.net/
# https://testnet.satoshisvision.network/
# https://witnessonchain.com/faucet/tbsv
`;
	
	fs.writeFileSync(envTestPath, envContent, 'utf-8');
	console.log('\n✅ Keys saved to .env.test');
}

console.log('\n=== Testnet Faucets ===');
console.log('Get free testnet BSV from these faucets:');
console.log('1. https://faucet.bitcoincloud.net/');
console.log('2. https://testnet.satoshisvision.network/');
console.log('3. https://witnessonchain.com/faucet/tbsv');
console.log('\nUse your testnet address above to receive test BSV.');
