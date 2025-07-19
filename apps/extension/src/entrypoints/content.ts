import { countTokens, getSessionId } from "../core/utils";

export default defineContentScript({
  matches: ["https://chat.openai.com/*", "https://chatgpt.com/*"],
  main() {
    console.log("Token tracker started");

    const sessionId = getSessionId();
    if (sessionId) {
      console.log("Session ID:", sessionId);
    }

    // Example: Count tokens in a message
    const sampleText = "Hello, how are you?";
    const tokens = countTokens(sampleText);
    console.log(`"${sampleText}" has ${tokens} tokens`);
  },
});
