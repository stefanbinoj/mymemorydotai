import { encode } from "gpt-tokenizer";

export function countTokens(text: string): number {
  if (!text) return 0;
  try {
    return encode(text).length;
  } catch {
    return 0;
  }
}
