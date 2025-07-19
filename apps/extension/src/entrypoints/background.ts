import { supabaseClient } from "@/client/supabase";

export default defineBackground({
  main() {
    console.log("Background script loaded");

    // Listen for messages from content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log("📨 Background received message:", message);

      if (message.type === "TEST") {
        console.log("🧪 Background received test message");
        sendResponse({
          success: true,
          message: "Background script is working!",
        });
        return false;
      }

      if (message.type === "SYNC_MESSAGE") {
        console.log("🔄 Background processing sync message");
        handleSyncMessage(message.data)
          .then((result) => sendResponse({ success: true, data: result }))
          .catch((error) =>
            sendResponse({ success: false, error: error.message })
          );
        return true; // Keep the message channel open for async response
      }
    });
  },
});

async function handleSyncMessage(message: {
  conversation_id: string;
  role: string;
  content: string;
  message_id?: string;
}) {
  try {
    console.log("🔍 [BACKGROUND] Starting to sync message to Supabase:", {
      conversation_id: message.conversation_id,
      message_id: message.message_id,
      role: message.role,
      contentLength: message.content.length,
      contentPreview: message.content.substring(0, 50),
    });

    console.log("🔍 [BACKGROUND] Preparing Supabase upsert data...");
    const upsertData = {
      conversation_id: message.conversation_id,
      message_id: message.message_id,
      role: message.role,
      content: message.content,
      created_at: new Date().toISOString(),
    };
    console.log("🔍 [BACKGROUND] Upsert data:", upsertData);

    console.log("🔍 [BACKGROUND] Calling Supabase upsert...");
    const { error } = await supabaseClient
      .from("chat_messages")
      .upsert([upsertData], {
        onConflict: "conversation_id,message_id",
      });

    console.log(
      "🔍 [BACKGROUND] Supabase response received, checking for errors..."
    );

    if (error) {
      console.error("[BACKGROUND] ❌ Supabase error:", error);
      throw new Error(error.message);
    } else {
      console.log(
        `✅ [BACKGROUND] Successfully synced ${message.role} message (${message.message_id?.substring(0, 8)}...)`
      );
      return { success: true };
    }
  } catch (error) {
    console.error("[BACKGROUND] ❌ Error syncing message:", error);
    throw error;
  }
}
