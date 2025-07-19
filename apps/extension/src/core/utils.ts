import { encode } from "gpt-tokenizer";

export function countTokens(text: string): number {
  if (!text) return 0;
  try {
    return encode(text).length;
  } catch {
    return 0;
  }
}

export function getSessionId(): string | null {
  const match = window.location.pathname.match(/\/c\/([a-z0-9-]+)/i);
  return match ? match[1] : null;
}
