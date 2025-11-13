#!/usr/bin/env node
/**
 * LangChain Demo - Car and Parking Gate Agent Interaction
 * 
 * This demo shows two LLM agents negotiating a parking agreement using the DAIA protocol.
 * One agent represents a car requesting parking, the other represents a parking gate offering parking.
 * 
 * Features:
 * - Public key exchange at the beginning of conversation
 * - Signature-based verification (no payment required for this demo)
 * - Maximum 3 offers per conversation
 * - Full agreement verification using BSV signatures
 */

import { config } from "dotenv";
import { ChatOpenAI } from "@langchain/openai";
import { CarAgent } from "./agents/car/index.js";
import { ParkingGateAgent } from "./agents/gate/index.js";

// Load environment variables
config();

// Maximum iterations to prevent infinite loops
const MAX_ITERATIONS = 20;

/**
 * Main demo function
 */
async function main() {
  console.log("=".repeat(70));
  console.log("🚗 DAIA LangChain Demo: Car vs Parking Gate 🚧");
  console.log("=".repeat(70));
  console.log();

  // Check for required environment variables
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ Error: OPENAI_API_KEY environment variable not set");
    console.error("Please create a .env file with: OPENAI_API_KEY=your-key-here");
    process.exit(1);
  }

  if (!process.env.CAR_PRIVATE_KEY) {
    console.error("❌ Error: CAR_PRIVATE_KEY environment variable not set");
    console.error("Please add CAR_PRIVATE_KEY to your .env file");
    process.exit(1);
  }

  if (!process.env.GATE_PRIVATE_KEY) {
    console.error("❌ Error: GATE_PRIVATE_KEY environment variable not set");
    console.error("Please add GATE_PRIVATE_KEY to your .env file");
    process.exit(1);
  }

  // Initialize LLM (using gpt-4.5-mini for structured outputs)
  const llm = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.7,
  });

  // Create agents with private keys
  console.log("🔧 Initializing agents...\n");

  const carAgent = new CarAgent({
    llm,
    carId: "CAR-001",
    minAcceptableRate: 500, // Prefers 500 sat/hour
    maxAcceptableRate: 1200, // Will walk away above 1200 sat/hour
    privateKey: process.env.CAR_PRIVATE_KEY,
  });

  const parkingGateAgent = new ParkingGateAgent({
    llm,
    gateId: "GATE-MAIN",
    minHourlyRate: 800, // Never goes below 800 sat/hour
    maxHourlyRate: 1500, // Ceiling at 1500 sat/hour
    preferredHourlyRate: 1000, // Targets 1000 sat/hour
    privateKey: process.env.GATE_PRIVATE_KEY,
  });

  console.log("✅ Agents initialized");
  console.log(`🚗 Car Public Key: ${carAgent.getPublicKey().substring(0, 40)}...`);
  console.log(`🚧 Gate Public Key: ${parkingGateAgent.getPublicKey().substring(0, 40)}...`);
  console.log();
  console.log("=".repeat(70));
  console.log("SCENARIO: Car requests parking (unspecified duration)");
  console.log("NEGOTIATION: Gate quotes 800-1500 sat/hr (targets 1000), Car accepts up to 1200");
  console.log("PROTOCOL: Public key exchange → Rate negotiation → Signature verification");
  console.log("MAX OFFERS: 3 per conversation");
  console.log("=".repeat(70));
  console.log();

  // Conversation loop
  let carMessage: string | null = null;
  let gateMessage: string | null = null;
  let iteration = 0;

  console.log("--- Starting Conversation Loop ---\n");

  while (!carAgent.isDone() && !parkingGateAgent.isDone() && iteration < MAX_ITERATIONS) {
    iteration++;
    console.log(`--- Iteration ${iteration} ---`);

    // Car's turn
    carMessage = await carAgent.processMessage(gateMessage);
    
    // Gate's turn
    gateMessage = await parkingGateAgent.processMessage(carMessage);
    
    console.log();

    // If both agents have nothing to say, end the conversation
    if (carMessage === null && gateMessage === null) {
      break;
    }
  }

  // Check if we hit the iteration limit
  if (iteration >= MAX_ITERATIONS) {
    console.log("⚠️  WARNING: Reached maximum iteration limit");
  }

  // Print final outcome
  console.log("=".repeat(70));
  console.log("--- Final Outcome ---");
  console.log("=".repeat(70));
  
  const carState = carAgent.getState();
  const gateState = parkingGateAgent.getState();
  
  console.log(`🚗 Car State: ${carState}`);
  console.log(`🚧 Gate State: ${gateState}`);
  console.log();

  if ((carState === "done" || carState === "accepted") && gateState === "done") {
    // Success - agreement reached and verified
    console.log("✅ SUCCESS: Agreement reached and verified! Car is parked.");
    console.log("🎉 Signature verification passed.");
    console.log("💰 Agreed Rate: Negotiated successfully within both parties' ranges");
  } else if (carState === "rejected" || gateState === "rejected") {
    console.log("❌ NO AGREEMENT: Car left without parking.");
    if (gateState === "rejected") {
      console.log("   Reason: Maximum offers exceeded or verification failed.");
    }
  } else {
    console.log("⚠️  INCOMPLETE: Conversation ended without resolution.");
  }
  
  console.log("=".repeat(70));
  console.log();
}

// Run the demo
main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
