import { PrivateKey } from "@daia/blockchain";

/**
 * Generate BSV testnet keys for car and gate agents
 *
 * This script generates two private keys and displays their corresponding addresses.
 * Use a BSV testnet faucet to fund these addresses before running the demo.
 *
 * Recommended faucet: https://faucet.bsvblockchain.org/
 */
function generateKeys(): void {
	console.log("=".repeat(80));
	console.log("BSV TESTNET KEY GENERATOR");
	console.log("=".repeat(80));
	console.log();

	// Generate car agent keys
	const carPrivateKey = PrivateKey.fromRandom();
	const carPublicKey = carPrivateKey.toPublicKey();
	const carAddress = carPublicKey.toAddress("testnet");

	console.log("CAR AGENT:");
	console.log(`  Private Key (WIF): ${carPrivateKey.toWif()}`);
	console.log(`  Address: ${carAddress}`);
	console.log();

	// Generate gate agent keys
	const gatePrivateKey = PrivateKey.fromRandom();
	const gatePublicKey = gatePrivateKey.toPublicKey();
	const gateAddress = gatePublicKey.toAddress("testnet");

	console.log("GATE AGENT:");
	console.log(`  Private Key (WIF): ${gatePrivateKey.toWif()}`);
	console.log(`  Address: ${gateAddress}`);
	console.log();

	console.log("=".repeat(80));
	console.log("NEXT STEPS:");
	console.log("=".repeat(80));
	console.log("1. Copy the private keys above");
	console.log("2. Add them to your .env file:");
	console.log(`   CAR_PRIVATE_KEY=${carPrivateKey.toWif()}`);
	console.log(`   GATE_PRIVATE_KEY=${gatePrivateKey.toWif()}`);
	console.log();
	console.log("3. Fund the addresses using BSV testnet faucet:");
	console.log("   https://faucet.bsvblockchain.org/");
	console.log(`   Car Address:  ${carAddress}`);
	console.log(`   Gate Address: ${gateAddress}`);
	console.log();
	console.log("4. Wait for the transactions to confirm (usually 1-2 minutes)");
	console.log("5. Run the demo: npm run demo:enter");
	console.log();
}

// Run the key generator
generateKeys();
