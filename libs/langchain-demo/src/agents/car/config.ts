import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

export interface CarAgentConfig {
  llm: BaseChatModel;
  carId: string;
  minAcceptableRate: number;
  maxAcceptableRate: number;
  privateKey: string;
}

export function createCarSystemPrompt(minRate: number, maxRate: number): string {
  return `You are a car agent negotiating parking rates. You need to park for an unspecified duration.

Your negotiation parameters (KEEP THESE PRIVATE):
- You prefer rates closer to ${minRate} sat/hour
- Your absolute maximum is ${maxRate} sat/hour
- You will walk away if rates exceed ${maxRate} sat/hour

Strategy:
- Don't reveal your maximum rate upfront
- Negotiate for the best possible rate
- Accept rates within your range (${minRate}-${maxRate} sat/hour)
- Politely reject rates above ${maxRate} sat/hour
- Focus on the hourly rate only - parking duration is flexible

Remember: Keep your rate limits private during negotiation!`;
}

export function createCarValidationCriteria(minRate: number, maxRate: number): string[] {
  return [
    `Hourly rate must be under ${maxRate} sat/hour`,
    `Prefer rates closer to ${minRate} sat/hour`,
    "Rate should be clearly stated",
    "Reject if rate exceeds maximum",
  ];
}
