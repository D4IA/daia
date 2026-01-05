---
title: "Building an AI Agent with DAIA"
description: "A comprehensive step-by-step guide to building an AI agent that uses the DAIA protocol for decentralized agreements."
summary: ""
date: 2024-01-05T13:00:00+00:00
lastmod: 2024-01-05T13:00:00+00:00
draft: false
weight: 300
toc: true
seo:
  title: "Building an AI Agent with DAIA"
  description: "Learn how to build AI agents that use DAIA protocol for autonomous negotiation and agreement creation"
  canonical: ""
  noindex: false
---

This guide walks you through building an AI agent that uses the DAIA protocol to autonomously negotiate, create, and verify decentralized agreements. We'll use the car parking demo as a reference implementation.

## Overview

A DAIA-enabled AI agent combines:
- **LangGraph** for state management and workflow orchestration
- **LLM integration** (e.g., OpenAI) for natural language processing
- **DAIA protocol** for creating and verifying blockchain-based agreements
- **Custom business logic** for domain-specific decision making

## Architecture

The agent architecture consists of five main components:

1. **State** - Defines agent's data structure
2. **Adapter** - Abstracts LLM and business logic
3. **Graph** - Orchestrates the workflow using LangGraph
4. **Config** - Configuration parameters
5. **Agent** - Main entry point that ties everything together

## Step 1: Define Your State

The state represents all data your agent needs to track during conversations and negotiations.

```typescript
import z from "zod/v3";
import { DaiaLanggraphStateSchema, makeInitialDaiaLanggraphState } from "@d4ia/langchain";

// Define message schema for conversation history
export const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

// Define your agent's state
export const MyAgentStateSchema = z.object({
  // Current input from user
  input: z.string(),
  // Current output to user
  output: z.string(),
  
  // Track conversation history
  conversationHistory: z.array(MessageSchema).default([]),
  
  // DAIA protocol state (required)
  daia: DaiaLanggraphStateSchema,
  
  // Add your custom domain-specific fields here
  // Example: customData: z.object({ ... })
});

export type MyAgentState = z.infer<typeof MyAgentStateSchema>;

// Define initial state
export const initialMyAgentState: MyAgentState = {
  input: "",
  output: "",
  conversationHistory: [],
  daia: makeInitialDaiaLanggraphState(),
};
```

**Key Points:**
- `daia` field is required for DAIA protocol integration
- Use Zod schemas for runtime validation
- Include conversation history for LLM context
- Add domain-specific fields as needed

## Step 2: Define Configuration

Create a configuration type that contains all dependencies and settings.

```typescript
import { PrivateKey } from "@d4ia/blockchain";
import { DaiaOfferSigner, DaiaAgreementVerifier } from "@d4ia/core";

export type MyAgentConfig = {
  // Blockchain identity
  privateKey: PrivateKey;
  
  // DAIA protocol components
  signer: DaiaOfferSigner;
  verifier: DaiaAgreementVerifier;
  
  // LLM configuration
  openAIApiKey: string;
  conversingModel: string;      // e.g., "gpt-4o"
  offerAnalysisModel: string;   // e.g., "gpt-4o"
  
  // Prompts
  conversingPrompt: string;
  offerAnalysisPrompt: string;
  
  // Optional: custom settings
  shouldPublishTransactions: boolean;
  logCallback?: (message: string) => void;
};
```

## Step 3: Create the Adapter Interface

The adapter abstracts away LLM implementation details and provides high-level operations.

```typescript
import { PublicKey } from "@d4ia/blockchain";
import { DaiaOfferSigner } from "@d4ia/core";

export type Message = {
  role: "user" | "assistant";
  content: string;
};

export type OfferDecision = 
  | { accepted: true }
  | { accepted: false; rationale: string };

/**
 * Adapter interface - abstracts LLM and business logic.
 * The adapter is stateless - state management is handled by the graph.
 */
export interface MyAgentAdapter {
  /**
   * Get the public key that identifies this agent
   */
  getPublicKey(): PublicKey;
  
  /**
   * Get the signer for blockchain operations
   */
  getSigner(): DaiaOfferSigner;
  
  /**
   * Get the configuration
   */
  getConfig(): MyAgentConfig;
  
  /**
   * Generate a conversational response based on conversation history.
   * This is a pure function that does not manage state.
   */
  runConversation(
    conversationHistory: ReadonlyArray<Message>,
    userMessage: string,
  ): Promise<string>;
  
  /**
   * Analyze an offer and decide whether to accept or reject it.
   * Uses LLM to make the decision based on offer content.
   */
  considerOffer(offerText: string): Promise<OfferDecision>;
}
```

## Step 4: Implement the Adapter

Create a concrete implementation using LangChain and OpenAI.

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { PublicKey } from "@d4ia/blockchain";
import { DaiaOfferSigner } from "@d4ia/core";
import z from "zod/v3";

export class DefaultMyAgentAdapter implements MyAgentAdapter {
  private readonly publicKey: PublicKey;
  private readonly signer: DaiaOfferSigner;
  private readonly config: MyAgentConfig;
  
  constructor(config: MyAgentConfig) {
    this.publicKey = config.privateKey.toPublicKey();
    this.signer = config.signer;
    this.config = { ...config };
  }
  
  getPublicKey(): PublicKey {
    return this.publicKey;
  }
  
  getSigner(): DaiaOfferSigner {
    return this.signer;
  }
  
  getConfig(): MyAgentConfig {
    return this.config;
  }
  
  async runConversation(
    conversationHistory: ReadonlyArray<Message>,
    userMessage: string,
  ): Promise<string> {
    const llm = new ChatOpenAI({
      model: this.config.conversingModel,
      apiKey: this.config.openAIApiKey,
    });
    
    const prompt = [
      { role: "system", content: this.config.conversingPrompt },
      ...conversationHistory,
      { role: "user" as const, content: userMessage },
    ];
    
    const response = await llm.invoke(
      prompt.map((msg) => ({ role: msg.role, content: msg.content })),
    );
    
    return `${response.content}`;
  }
  
  async considerOffer(offerText: string): Promise<OfferDecision> {
    // Define schema for structured output
    const OfferAnalysisSchema = z.object({
      result: z.enum(["ACCEPT", "REJECT"]).describe("The decision: ACCEPT or REJECT"),
      rationale: z
        .string()
        .nullable()
        .describe("Why the offer was rejected (only if REJECT, otherwise null)"),
    });
    
    // Use structured output for reliable parsing
    const llm = new ChatOpenAI({
      model: this.config.offerAnalysisModel,
      apiKey: this.config.openAIApiKey,
    }).withStructuredOutput(OfferAnalysisSchema);
    
    const prompt = [
      { role: "system", content: this.config.offerAnalysisPrompt },
      { role: "user" as const, content: offerText },
    ];
    
    const analysis = await llm.invoke(
      prompt.map((msg) => ({ role: msg.role, content: msg.content })),
    );
    
    if (analysis.result === "ACCEPT") {
      return { accepted: true };
    } else {
      return {
        accepted: false,
        rationale: analysis.rationale ?? "No reason provided",
      };
    }
  }
}
```

**Key Points:**
- Use `withStructuredOutput()` for reliable LLM responses
- Keep adapter stateless - it's just a wrapper around LLM calls
- Use system prompts to define agent behavior

## Step 5: Build the LangGraph Workflow

The graph orchestrates the entire agent workflow, integrating DAIA protocol with your business logic.

```typescript
import {
  DaiaLanggraphMachineNode,
  DaiaLanggraphStateAccessor,
  DaiaLanggraphStateWriter,
  makeDaiaGraph,
} from "@d4ia/langchain";
import { END, START, StateGraph } from "@langchain/langgraph";
import { produce } from "immer";
import { DaiaAgreementReferenceResult, DaiaOfferSignResponseType } from "@d4ia/core";
import z from "zod/v3";

export function createMyAgentGraph(adapter: MyAgentAdapter) {
  // Create DAIA subgraph with namespaced nodes
  const daiaSubgraph = makeDaiaGraph<z.infer<typeof MyAgentStateSchema>>({
    publicKey: adapter.getPublicKey().toString(),
    mapNode: (node) => "D_" + node, // Prefix to avoid conflicts
  });
  
  // Define node names for DAIA subgraph exit points
  const sendDaiaOutput = "D_" + DaiaLanggraphMachineNode.SEND_DAIA_OUTPUT;
  const continueConversation = "D_" + DaiaLanggraphMachineNode.CONTINUE_CONVERSING;
  const afterOfferReceived = "D_" + DaiaLanggraphMachineNode.OFFER_RECEIVED;
  const afterRemoteProcessedOffer = "D_" + DaiaLanggraphMachineNode.REMOTE_PROCESSED_OFFER;
  
  const graph = new StateGraph(MyAgentStateSchema)
    // Node 1: Handle incoming input
    .addNode("handleInputs", async (state) => {
      const writer = DaiaLanggraphStateWriter.fromState(state.daia);
      
      return {
        daia: writer.setInput(state.input).build(),
      };
    })
    
    // Node 2: DAIA subgraph handles protocol logic
    .addNode(
      "daiaSubgraph",
      async (state) => {
        const result = await daiaSubgraph.invoke(state);
        return result;
      },
      {
        // Define possible exit points from subgraph
        ends: [
          sendDaiaOutput,
          continueConversation,
          afterOfferReceived,
          afterRemoteProcessedOffer,
        ],
      },
    )
    
    // Node 3: Handle offers received from other agents
    .addNode(afterOfferReceived, async (state) => {
      const accessor = DaiaLanggraphStateAccessor.fromNamespacedState(state);
      const offerRaw = accessor.getOffer();
      
      if (!offerRaw) throw new Error("Offer must be present");
      
      // Summarize offer for human-readable analysis
      const result = await adapter.getSigner().summarizeOffer(offerRaw);
      
      // Validate offer type (domain-specific)
      if (result.content.offerTypeIdentifier !== "YOUR_OFFER_TYPE") {
        return produce(state, (draft) => {
          const daiaState = DaiaLanggraphStateWriter.fromState(state.daia)
            .setOfferResponse({
              result: DaiaAgreementReferenceResult.REJECT,
              rationale: "Invalid offer type",
            })
            .build();
          draft.daia = daiaState;
        });
      }
      
      // Use LLM to decide whether to accept offer
      const decision = await adapter.considerOffer(
        result.content.naturalLanguageOfferContent
      );
      
      if (decision.accepted) {
        // Sign the offer to create an agreement
        const signResponse = await adapter.getSigner().signOffer({
          offer: offerRaw,
        });
        
        if (signResponse.type !== DaiaOfferSignResponseType.SUCCESS) {
          throw new Error(`Offer signing failed: ${signResponse.type}`);
        }
        
        // Optionally publish to blockchain
        if (adapter.getConfig().shouldPublishTransactions) {
          await signResponse.transaction.publish();
          // Wait for propagation
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        // Update conversation history
        return produce(state, (draft) => {
          draft.conversationHistory.push(
            {
              role: "user" as const,
              content: `INCOMING OFFER: ${result.content.naturalLanguageOfferContent}`,
            },
            { role: "assistant" as const, content: "ACCEPT" },
          );
          
          // Send acceptance response
          const daiaState = DaiaLanggraphStateWriter.fromState(state.daia)
            .setOfferResponse({
              result: DaiaAgreementReferenceResult.ACCEPT,
              agreement: signResponse.agreement,
              agreementReference: signResponse.transaction.id,
            })
            .build();
          
          draft.daia = daiaState;
        });
      } else {
        // Reject the offer
        return produce(state, (draft) => {
          draft.conversationHistory.push(
            {
              role: "user" as const,
              content: `INCOMING OFFER: ${result.content.naturalLanguageOfferContent}`,
            },
            { role: "assistant" as const, content: `REJECT - ${decision.rationale}` },
          );
          
          const daiaState = DaiaLanggraphStateWriter.fromState(state.daia)
            .setOfferResponse({
              result: DaiaAgreementReferenceResult.REJECT,
              rationale: decision.rationale,
            })
            .build();
          
          draft.daia = daiaState;
        });
      }
    })
    
    // Node 4: Handle protocol output messages
    .addNode(sendDaiaOutput, async (state) => {
      return produce(state, (draft) => {
        draft.output = DaiaLanggraphStateAccessor.fromNamespacedState(state).getOutput();
      });
    })
    
    // Node 5: Continue normal conversation
    .addNode(continueConversation, async (state) => {
      const input = DaiaLanggraphStateAccessor.fromNamespacedState(state).getInput();
      
      // Use LLM to generate response
      const assistantResponse = await adapter.runConversation(
        state.conversationHistory,
        input
      );
      
      return produce(state, (draft) => {
        draft.output = assistantResponse;
        draft.conversationHistory.push(
          { role: "user" as const, content: input },
          { role: "assistant" as const, content: assistantResponse },
        );
      });
    })
    
    // Define edges (workflow flow)
    .addEdge(START, "handleInputs")
    .addEdge("handleInputs", "daiaSubgraph")
    .addEdge(afterOfferReceived, "daiaSubgraph")
    .addEdge(continueConversation, END)
    .addEdge(sendDaiaOutput, END);
  
  return graph as StateGraph<z.infer<typeof MyAgentStateSchema>>;
}
```

**Key Concepts:**

1. **DAIA Subgraph**: Handles protocol logic (key exchange, offer exchange, verification)
2. **Exit Points**: The subgraph can exit at different points based on what happened
3. **State Accessor**: Read DAIA protocol state
4. **State Writer**: Modify DAIA protocol state
5. **Immer's `produce`**: Safely update state immutably

## Step 6: Create the Agent Class

The agent class is the main entry point that ties everything together.

```typescript
import { AgentResponse } from "./interfaces";

export class MyAgent {
  private graph: ReturnType<typeof createMyAgentGraph>["compile"] extends () => infer R
    ? R
    : never;
  private state: MyAgentState;
  private adapter: MyAgentAdapter;
  
  constructor(config: MyAgentConfig) {
    this.adapter = new DefaultMyAgentAdapter(config);
    const graphBuilder = createMyAgentGraph(this.adapter);
    this.graph = graphBuilder.compile();
    this.state = { ...initialMyAgentState };
  }
  
  public readonly processInput = async (input: string): Promise<AgentResponse> => {
    // Update state with new input
    this.state.input = input;
    
    // Execute graph
    this.state = (await this.graph.invoke(this.state)) as MyAgentState;
    
    // Return output
    return {
      type: "message",
      content: this.state.output,
    };
  };
  
  public readonly getState = (): Readonly<MyAgentState> => {
    return this.state;
  };
}
```

## Step 7: Usage Example

Here's how to use your agent:

```typescript
import { PrivateKey } from "@d4ia/blockchain";
import { DefaultDaiaOfferSigner } from "@d4ia/core";

// Create configuration
const config: MyAgentConfig = {
  privateKey: PrivateKey.fromWif("your-private-key"),
  signer: new DefaultDaiaOfferSigner({
    privateKey: PrivateKey.fromWif("your-private-key"),
    // ... other signer config
  }),
  openAIApiKey: process.env.OPENAI_API_KEY!,
  conversingModel: "gpt-4o",
  offerAnalysisModel: "gpt-4o",
  conversingPrompt: `You are a helpful agent that can negotiate agreements.
Be conversational and friendly.`,
  offerAnalysisPrompt: `You are analyzing an offer.
Decide whether to ACCEPT or REJECT it based on the content.`,
  shouldPublishTransactions: true,
};

// Create agent
const agent = new MyAgent(config);

// Process user input
const response1 = await agent.processInput("Hello!");
console.log(response1.content); // Agent's response

// Continue conversation
const response2 = await agent.processInput("Can we make a deal?");
console.log(response2.content);
```

## Key Patterns and Best Practices

### 1. State Management
- Keep state immutable using `immer`'s `produce()`
- Use DAIA state accessor/writer for protocol state
- Track conversation history for LLM context

### 2. Error Handling
```typescript
// Validate offers before processing
if (result.content.offerTypeIdentifier !== EXPECTED_TYPE) {
  return reject("Invalid offer type");
}

// Handle signing failures
if (signResponse.type !== DaiaOfferSignResponseType.SUCCESS) {
  throw new Error(`Signing failed: ${signResponse.type}`);
}
```

### 3. Transaction Publishing
```typescript
// Publish to blockchain
if (config.shouldPublishTransactions) {
  await transaction.publish();
  // Wait for propagation
  await new Promise(resolve => setTimeout(resolve, 5000));
}
```

### 4. LLM Integration
- Use structured output for reliable parsing
- Provide clear system prompts
- Include relevant context in conversation history

### 5. Testing
```typescript
// Disable transaction publishing for tests
const testConfig = {
  ...config,
  shouldPublishTransactions: false,
};
```

## Advanced: Creating Offers

If your agent needs to create offers (not just respond to them), add this to your adapter:

```typescript
interface MyAgentAdapter {
  // ... existing methods ...
  
  /**
   * Create an offer to send to another agent
   */
  createOffer(conversationHistory: ReadonlyArray<Message>): Promise<OfferData>;
}
```

Then in your graph, add logic to detect when to make an offer:

```typescript
.addNode(continueConversation, async (state) => {
  const input = DaiaLanggraphStateAccessor.fromNamespacedState(state).getInput();
  
  // Detect if we should make an offer (using LLM or business logic)
  const shouldMakeOffer = await detectOfferIntent(input);
  
  if (shouldMakeOffer) {
    const offerData = await adapter.createOffer(state.conversationHistory);
    
    const offer = DaiaOfferBuilder.new()
      .setNaturalLanguageContent(offerData.description)
      .setOfferTypeIdentifier("YOUR_OFFER_TYPE")
      .addSelfSignedRequirement(adapter.getConfig().privateKey)
      .addSignRequirement(accessor.remotePublicKey()!)
      .build();
    
    const daia = DaiaLanggraphStateWriter.fromState(state.daia)
      .setMethodCall({
        methodId: DaiaLanggraphMethodId.SEND_OFFER,
        offer,
      })
      .build();
    
    return new Command({
      goto: "daiaSubgraph",
      update: { daia },
    });
  }
  
  // Otherwise, continue normal conversation
  // ...
})
```

## Summary

Building a DAIA agent involves:

1. **Define State** - What data your agent tracks
2. **Define Config** - Dependencies and settings
3. **Create Adapter Interface** - Abstract LLM operations
4. **Implement Adapter** - Concrete LLM integration
5. **Build Graph** - Orchestrate workflow with LangGraph
6. **Create Agent Class** - Main entry point
7. **Use It** - Process inputs and handle responses

The DAIA protocol handles:
- Public key exchange
- Offer transmission and signing
- Agreement verification
- Blockchain integration

Your code handles:
- Business logic (what offers to accept)
- Conversation management
- Domain-specific validation
- User interaction

This separation of concerns makes it easy to build complex autonomous agents that can negotiate and create verifiable agreements.
