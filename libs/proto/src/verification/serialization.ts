import { DaiaOfferContentSchema, type DaiaOfferContent } from "../types/offer";

/**
 * Serialization utilities for offer content.
 * Handles proper Map serialization/deserialization.
 */

/**
 * Serialize offer content to JSON string.
 * Converts Map to plain object for JSON compatibility.
 */
export function serializeOfferContent(offerContent: DaiaOfferContent): string {
  return JSON.stringify({
    ...offerContent,
    requirements: Object.fromEntries(offerContent.requirements),
  });
}

/**
 * Deserialize and validate offer content from JSON string.
 * @throws ZodError if validation fails
 */
export function deserializeOfferContent(serialized: string): DaiaOfferContent {
  const parsed = JSON.parse(serialized);
  
  // Convert requirements object back to Map
  // Don't provide default empty object - let Zod validation catch missing field
  const withMap = {
    ...parsed,
    requirements: parsed.requirements 
      ? new Map(Object.entries(parsed.requirements))
      : parsed.requirements, // Keep undefined/null to trigger validation error
  };

  // Validate using Zod schema
  const validated = DaiaOfferContentSchema.parse(withMap);
  
  return validated;
}
