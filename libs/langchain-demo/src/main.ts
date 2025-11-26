#!/usr/bin/env node

import { config } from "dotenv";
import { ChatOpenAI } from "@langchain/openai";
import { CarAgent } from "./agents/car/index.js";
import { ParkingGateAgent } from "./agents/gate/index.js";

config();

const MAX_ITERATIONS = 20;

async function main() {
  console.log("=".repeat(70));
  console.log("DAIA LangChain Demo: Chain-based Agents");
  console.log("=".repeat(70));
  console.log();

  if (!process.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY environment variable not set");
    console.error("Please create a .env file with: OPENAI_API_KEY=your-key-here");
    process.exit(1);
  }

  if (!process.env.CAR_PRIVATE_KEY) {
    console.error("Error: CAR_PRIVATE_KEY environment variable not set");
    console.error("Please add CAR_PRIVATE_KEY to your .env file");
    process.exit(1);
  }

  if (!process.env.GATE_PRIVATE_KEY) {
    console.error("Error: GATE_PRIVATE_KEY environment variable not set");
    console.error("Please add GATE_PRIVATE_KEY to your .env file");
    process.exit(1);
  }

  const llm = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.7,
  });

  console.log("Initializing chain-based agents...\n");

  const carAgent = new CarAgent({
    llm,
    carId: "CAR-001",
    minAcceptableRate: 500,
    maxAcceptableRate: 1200,
    privateKey: process.env.CAR_PRIVATE_KEY,
  });

  const parkingGateAgent = new ParkingGateAgent({
    llm,
    gateId: "GATE-MAIN",
    minHourlyRate: 800,
    maxHourlyRate: 1500,
    preferredHourlyRate: 1000,
    privateKey: process.env.GATE_PRIVATE_KEY,
  });

  console.log("Chain-based agents initialized");
  console.log(`Car Public Key: ${carAgent.getPublicKey().substring(0, 40)}...`);
  console.log(`Gate Public Key: ${parkingGateAgent.getPublicKey().substring(0, 40)}...`);
  console.log();
  console.log("=".repeat(70));
  console.log("ARCHITECTURE: Using DAIA-LangChain library chains");
  console.log("  - PubKeyExchangeChain: Handles key exchange protocol");
  console.log("  - OfferNegotiationChain: Handles offer creation/validation");
  console.log("  - AgreementChain: Handles signing/verification");
  console.log("=".repeat(70));
  console.log();

  let carMessage: string | null = null;
  let gateMessage: string | null = null;
  let iteration = 0;

  console.log("--- Starting Conversation Loop ---\n");

  while (!carAgent.isDone() && !parkingGateAgent.isDone() && iteration < MAX_ITERATIONS) {
    iteration++;
    console.log(`--- Iteration ${iteration} ---`);

    carMessage = await carAgent.processMessage(gateMessage);
    
    gateMessage = await parkingGateAgent.processMessage(carMessage);
    
    console.log();

    if (carMessage === null && gateMessage === null) {
      break;
    }
  }

  if (iteration >= MAX_ITERATIONS) {
    console.log("WARNING: Reached maximum iteration limit");
  }

  console.log("=".repeat(70));
  console.log("--- Final Outcome ---");
  console.log("=".repeat(70));
  
  const carState = carAgent.getState();
  const gateState = parkingGateAgent.getState();
  
  console.log(`Car State: ${carState}`);
  console.log(`Gate State: ${gateState}`);
  console.log();

  if (carState === "accepted" && gateState === "accepted") {
    console.log("SUCCESS: Agreement reached using chain-based architecture!");
    console.log("Signature verification passed.");
    console.log("Agreed Rate: Negotiated successfully within both parties' ranges");
  } else if ((carState === "done" || carState === "accepted") && gateState === "done") {
    console.log("SUCCESS: Agreement reached using chain-based architecture!");
    console.log("Signature verification passed.");
    console.log("Agreed Rate: Negotiated successfully within both parties' ranges");
  } else if (carState === "rejected" || gateState === "rejected") {
    console.log("NO AGREEMENT: Car left without parking.");
    if (gateState === "rejected") {
      console.log("   Reason: Maximum offers exceeded or verification failed.");
    }
  } else {
    console.log("INCOMPLETE: Conversation ended without resolution.");
  }
  
  console.log("=".repeat(70));
  console.log();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
