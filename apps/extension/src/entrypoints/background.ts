import { supabaseClient } from "@/client/supabase";

export default defineBackground({
  main() {
    console.log("Background script loaded");

    // Listen for messages from content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === "SYNC_MESSAGE") {
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
    const { error } = await supabaseClient.from("chat_messages").upsert(
      [
        {
          conversation_id: message.conversation_id,
          message_id: message.message_id,
          role: message.role,
          content: message.content,
          created_at: new Date().toISOString(),
        },
      ],
      {
        onConflict: "conversation_id,message_id",
      }
    );

    if (error) {
      console.error("[Background] ❌ Error syncing message:", error);
      throw new Error(error.message);
    } else {
      console.log(
        `[Background] ✅ Synced ${message.role} message (${message.message_id?.substring(0, 8)}...)`
      );
      return { success: true };
    }
  } catch (error) {
    console.error("[Background] ❌ Error syncing message:", error);
    throw error;
  }
}
