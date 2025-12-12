import { END, START, StateGraph } from "@langchain/langgraph";
import { describe, test, expect } from "vitest";
import z from "zod/v3";
import { DaiaStateSchema, DaiaStateBuilder, DaiaStateAccessor } from "../../state";
import { makeDaiaRouterGraph } from "../daiaRouterGraph";
import { makeDaiaRequestPublicIdentityGraph } from "../daiaRequestPublicIdentityGraph";
import { makeDaiaResponsePublicIdentityGraph } from "../daiaResponsePublicIdentityGraph";
import { makeDaiaGeneratePublicIdentityResponseGraph } from "../daiaGeneratePublicIdentityResponse";

describe("public key exchange example", () => {

    const state = z.object({
        daia: DaiaStateSchema,
        messageCounter: z.number()
    })

    const daiaRouterNode = makeDaiaRouterGraph({
        onDaiaOffer: "handle_daia_offer",
        onPublicIdentityRequest: "generate_public_id_response",
        onPublicIdentityResponse: "handle_public_id_res",
        onNonDaiaInput: "send_public_id_request",
    })

    const publicKeyRequestNode = makeDaiaRequestPublicIdentityGraph({
        onRequestPerformed: END
    })

    const publicKeyResponseGenerator = makeDaiaGeneratePublicIdentityResponseGraph({
        onResponseGenerated: END
    })

    const onPublicKeyIdResponse = makeDaiaResponsePublicIdentityGraph({
        onResponseProcessed: "handle_answer_after_public_key_response"
    })

    const graph = new StateGraph(state)
        .addNode("handle_daia_offer", () => ({}))
        .addNode("handle_answer_after_public_key_response", () => ({}))
        .addNode("send_public_id_request", publicKeyRequestNode, {
            ends: [END]
        })
        .addNode("generate_public_id_response", publicKeyResponseGenerator, {
            ends: [END]
        })
        .addNode("handle_public_id_res", onPublicKeyIdResponse, {
            ends: ["handle_answer_after_public_key_response"]
        })
        .addNode("router", daiaRouterNode, {
            ends: ["handle_daia_offer", "send_public_id_request", "generate_public_id_response", "handle_public_id_res"]
        })
        .addEdge(START, "router")
        .compile();

    test("can exchange public keys between two parties", async () => {
        const MY_PUBLIC_KEY_A = "public-key-alice-123";
        const MY_PUBLIC_KEY_B = "public-key-bob-456";

        const stateA = {
            daia: new DaiaStateBuilder()
                .withPublicKey(MY_PUBLIC_KEY_A)
                .build(),
            messageCounter: 0
        };

        const stateB = {
            daia: new DaiaStateBuilder()
                .withPublicKey(MY_PUBLIC_KEY_B)
                .build(),
            messageCounter: 0
        };

        const resultA1 = await graph.invoke({
            ...stateA,
            daia: DaiaStateBuilder.fromExisting(stateA.daia)
                .withInputText("request_public_key")
                .build()
        });
        const accessorA1 = new DaiaStateAccessor(resultA1);
        expect(accessorA1.getDaiaOutput()).toBe('DAIA://{"type":"public-identity-request"}');

        const resultB1 = await graph.invoke({
            ...stateB,
            daia: DaiaStateBuilder.fromExisting(stateB.daia)
                .withInputText(accessorA1.getDaiaOutput())
                .build()
        });
        const accessorB1 = new DaiaStateAccessor(resultB1);
        expect(accessorB1.getDaiaOutput()).toBe(`DAIA://{"type":"public-identity-response","publicKey":"${MY_PUBLIC_KEY_B}"}`);

        const resultA2 = await graph.invoke({
            ...resultA1,
            daia: DaiaStateBuilder.fromExisting(resultA1.daia)
                .withInputText(accessorB1.getDaiaOutput())
                .build()
        });
        const accessorA2 = new DaiaStateAccessor(resultA2);
        
        // Verify: Alice should have Bob's public key
        expect(accessorA2.getRemotePublicKey()).toBe(MY_PUBLIC_KEY_B);
        expect(accessorA2.isPublicIdentityResponseProcessed()).toBe(true);
    })

    test("can exchange public keys using message loop", async () => {
        const MY_PUBLIC_KEY_A = "public-key-alice-123";
        const MY_PUBLIC_KEY_B = "public-key-bob-456";

        let stateA = {
            daia: new DaiaStateBuilder()
                .withPublicKey(MY_PUBLIC_KEY_A)
                .build(),
            messageCounter: 0
        };

        let stateB = {
            daia: new DaiaStateBuilder()
                .withPublicKey(MY_PUBLIC_KEY_B)
                .build(),
            messageCounter: 0
        };

        let inputToA = "request_public_key";
        let inputToB = "request_public_key";
        
        // Loop: exchange messages until both have keys
        for (let i = 0; i < 10; i++) {
            // A processes input and generates output
            stateA = {
                ...stateA,
                daia: DaiaStateBuilder.fromExisting(stateA.daia)
                    .withInputText(inputToA)
                    .build()
            };
            const resultA = await graph.invoke(stateA);
            stateA = resultA;
            const outputFromA = new DaiaStateAccessor(resultA).getDaiaOutput();
            
            // B processes input and generates output
            stateB = {
                ...stateB,
                daia: DaiaStateBuilder.fromExisting(stateB.daia)
                    .withInputText(inputToB)
                    .build()
            };
            const resultB = await graph.invoke(stateB);
            stateB = resultB;
            const outputFromB = new DaiaStateAccessor(resultB).getDaiaOutput();
            
            // Check if both have exchanged keys
            const accessorA = new DaiaStateAccessor(stateA);
            const accessorB = new DaiaStateAccessor(stateB);
            
            if (accessorA.getRemotePublicKey() && accessorB.getRemotePublicKey()) {
                break;
            }
            
            // Set next inputs (each receives the other's output)
            inputToA = outputFromB;
            inputToB = outputFromA;
        }
        
        // Verify both parties have exchanged keys
        const finalAccessorA = new DaiaStateAccessor(stateA);
        const finalAccessorB = new DaiaStateAccessor(stateB);
        
        expect(finalAccessorA.getRemotePublicKey()).toBe(MY_PUBLIC_KEY_B);
        expect(finalAccessorB.getRemotePublicKey()).toBe(MY_PUBLIC_KEY_A);
    })
})