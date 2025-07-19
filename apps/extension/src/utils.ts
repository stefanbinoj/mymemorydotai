import { encode } from "gpt-tokenizer";

// Count tokens in text
export function countTokens(text: string): number {
  if (!text) return 0;
  try {
    return encode(text).length;
  } catch {
    return 0;
  }
}

// Get current ChatGPT session ID
export function getSessionId(): string | null {
  const match = window.location.pathname.match(/\/c\/([a-z0-9-]+)/i);
  return match ? match[1] : null;
}

// Save data to Chrome storage
export async function saveData(key: string, data: any): Promise<void> {
  if (chrome?.storage?.local) {
    await chrome.storage.local.set({ [key]: data });
  }
}

// Load data from Chrome storage
export async function loadData(key: string): Promise<any> {
  if (chrome?.storage?.local) {
    const result = await chrome.storage.local.get(key);
    return result[key];
  }
  return null;
}
