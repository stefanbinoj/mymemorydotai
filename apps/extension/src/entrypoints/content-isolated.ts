// ISOLATED world script for Chrome API access
export default defineContentScript({
  matches: ["https://chat.openai.com/*", "https://chatgpt.com/*"],
  world: "ISOLATED",
  runAt: "document_start",
  main() {
    console.log("🚀 ChatGPT Extension Started (ISOLATED world)");

    // Listen for messages from MAIN world
    window.addEventListener("message", (event) => {
      if (event.source !== window) return;
      if (event.data.type !== "CHATGPT_SYNC") return;

      console.log("📨 Received sync request from MAIN world");
      handleSyncRequest(event.data.payload);
    });
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
    console.log(`🔄 Syncing ${messages.length} messages via ISOLATED world`);

    for (const message of messages) {
      const response = await chrome.runtime.sendMessage({
        type: "SYNC_MESSAGE",
        data: message,
      });

      if (response.success) {
        console.log(
          `[ISOLATED] ✅ Synced ${message.role} message (${message.message_id?.substring(0, 8)}...)`
        );
      } else {
        console.error("[ISOLATED] ❌ Error syncing message:", response.error);
      }
    }

    console.log(
      `✅ Successfully synced ${messages.length} messages via ISOLATED world`
    );
  } catch (error) {
    console.error("[ISOLATED] ❌ Error handling sync request:", error);
  }
}
