import { Values } from "#types/values";

export const NETWORK_TYPES = {
    MAINNET: "main",
    TESTNET: "test",
} as const;

export type NetworkType = Values<typeof NETWORK_TYPES>;