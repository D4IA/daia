#!/usr/bin/env node
/**
 * Script to extract testnet addresses from private keys in .env file
 * Use these addresses at: https://faucet.bsvblockchain.org/
 */

import { config } from "dotenv";
import { PrivateKey } from "@bsv/sdk";

// Load environment variables
config();

console.log("=".repeat(70));
console.log("BSV TESTNET ADDRESSES");
console.log("=".repeat(70));
console.log();

if (!process.env.CAR_PRIVATE_KEY) {
  console.error("❌ Error: CAR_PRIVATE_KEY not found in .env file");
  process.exit(1);
}

if (!process.env.GATE_PRIVATE_KEY) {
  console.error("❌ Error: GATE_PRIVATE_KEY not found in .env file");
  process.exit(1);
}

try {
  // Load private keys
  const carKey = PrivateKey.fromWif(process.env.CAR_PRIVATE_KEY);
  const gateKey = PrivateKey.fromWif(process.env.GATE_PRIVATE_KEY);

  // Get public keys and testnet addresses
  const carPubKey = carKey.toPublicKey();
  const gatePubKey = gateKey.toPublicKey();
  
  // Get testnet addresses (start with 'm' or 'n')
  const carAddress = carPubKey.toAddress('testnet');
  const gateAddress = gatePubKey.toAddress('testnet');

  console.log("🚗 CAR AGENT");
  console.log("   Public Key:", carPubKey.toString());
  console.log("   Address:   ", carAddress);
  console.log();
  
  console.log("🚧 GATE AGENT");
  console.log("   Public Key:", gatePubKey.toString());
  console.log("   Address:   ", gateAddress);
  console.log();
  
  console.log("=".repeat(70));
  console.log("TESTNET FAUCET");
  console.log("=".repeat(70));
  console.log("Visit: https://faucet.bsvblockchain.org/");
  console.log();
  console.log("Request testnet BSV for these addresses:");
  console.log(`  Car:  ${carAddress}`);
  console.log(`  Gate: ${gateAddress}`);
  console.log("=".repeat(70));
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
