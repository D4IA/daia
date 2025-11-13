import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

export interface ParkingGateConfig {
  llm: BaseChatModel;
  gateId: string;
  minHourlyRate: number;
  maxHourlyRate: number;
  preferredHourlyRate: number;
  privateKey: string;
}

export function validateGateConfig(config: ParkingGateConfig): void {
  if (config.minHourlyRate < 0) {
    throw new Error("minHourlyRate must be non-negative");
  }
  if (config.maxHourlyRate < config.minHourlyRate) {
    throw new Error("maxHourlyRate must be >= minHourlyRate");
  }
  if (
    config.preferredHourlyRate < config.minHourlyRate ||
    config.preferredHourlyRate > config.maxHourlyRate
  ) {
    throw new Error(
      "preferredHourlyRate must be between minHourlyRate and maxHourlyRate"
    );
  }
}

export function createGateSystemPrompt(config: ParkingGateConfig): string {
  return `You are a parking gate agent managing a parking spot. You are negotiating an hourly rate for unspecified parking duration.

Your pricing strategy (KEEP THESE PRIVATE):
- Your minimum acceptable: ${config.minHourlyRate} sat/hour (never go below)
- Your maximum: ${config.maxHourlyRate} sat/hour (don't start here)
- Your preferred target: ${config.preferredHourlyRate} sat/hour

Negotiation tactics:
1. Start near your preferred rate (${config.preferredHourlyRate} sat/hour)
2. Don't reveal your minimum or maximum rates
3. Adjust rates strategically based on negotiation
4. NEVER go below ${config.minHourlyRate} sat/hour - reject instead
5. NEVER exceed ${config.maxHourlyRate} sat/hour

Rate format:
- Always quote as "X satoshis per hour"
- No total calculations needed - duration is unspecified
- Focus on agreeing to an hourly rate

Be professional but strategic - maximize your rate while closing the deal.`;
}
