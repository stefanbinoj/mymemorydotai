// ISOLATED world script for Chrome API access
export default defineContentScript({
  matches: ["https://chat.openai.com/*", "https://chatgpt.com/*"],
  world: "ISOLATED",
  runAt: "document_start",
  main() {
    console.log("🚀 ChatGPT Extension Started (ISOLATED world)");

    // Listen for messages from MAIN world
    window.addEventListener("message", (event) => {
      console.log("📨 ISOLATED world received message:", event.data);

      if (event.source !== window) {
        console.log("❌ Message not from same window, ignoring");
        return;
      }

      if (event.data.type !== "CHATGPT_SYNC") {
        console.log("❌ Message type not CHATGPT_SYNC, ignoring");
        return;
      }

      console.log("📨 Received sync request from MAIN world");
      handleSyncRequest(event.data.payload);
    });

    // Also try to send a test message to background script
    setTimeout(() => {
      console.log("🧪 Testing background script communication...");
      chrome.runtime.sendMessage({ type: "TEST" }, (response) => {
        console.log("🧪 Background test response:", response);
      });
    }, 1000);
  },
});

async function handleSyncRequest(
  messages: Array<{
    conversation_id: string;
    role: string;
    content: string;
    message_id?: string;
  }>
) {
  try {
    console.log(`🔄 [ISOLATED] Starting sync for ${messages.length} messages`);
    console.log(
      "🔍 [ISOLATED] Message details:",
      messages.map((m) => ({
        role: m.role,
        message_id: m.message_id,
        contentLength: m.content.length,
        conversation_id: m.conversation_id,
      }))
    );

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      console.log(
        `🔍 [ISOLATED] Processing message ${i + 1}/${messages.length}:`,
        {
          role: message.role,
          message_id: message.message_id,
          contentLength: message.content.length,
          contentPreview: message.content.substring(0, 50),
        }
      );

      console.log("🔍 [ISOLATED] Sending message to background script...");
      const response = await chrome.runtime.sendMessage({
        type: "SYNC_MESSAGE",
        data: message,
      });

      console.log("🔍 [ISOLATED] Background script response:", response);

      if (response.success) {
        console.log(
          `✅ [ISOLATED] Successfully synced ${message.role} message (${message.message_id?.substring(0, 8)}...)`
        );
      } else {
        console.error("[ISOLATED] ❌ Error syncing message:", response.error);
      }
    }

    console.log(
      `✅ [ISOLATED] Successfully synced ${messages.length} messages via ISOLATED world`
    );
  } catch (error) {
    console.error("[ISOLATED] ❌ Error handling sync request:", error);
  }
}
