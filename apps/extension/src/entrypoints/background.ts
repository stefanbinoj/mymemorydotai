import { supabaseService, type ChatMessage } from "@/services/supabase";

export default defineBackground({
  main() {
    console.log("🚀 Background script loaded");

    // Test Supabase connection on startup
    console.log("🚀 [BACKGROUND] Starting up, testing Supabase connection...");
    testSupabaseConnection()
      .then((result) => {
        console.log("🚀 [BACKGROUND] Startup test result:", result);
      })
      .catch((error) => {
        console.error("🚀 [BACKGROUND] Startup test error:", error);
      });

    // Make test function available globally for manual testing
    (globalThis as any).testSupabase = testSupabaseConnection;
    console.log("🧪 [BACKGROUND] Test function available as testSupabase()");

    // Listen for messages from content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log("📨 [BACKGROUND] Received message:", {
        type: message.type,
        action: message.action,
        hasData: !!message.data,
        sender: sender.tab?.url || "unknown",
        message: message,
      });

      if (message.type === "TEST") {
        console.log("🧪 [BACKGROUND] Processing test message");
        sendResponse({
          success: true,
          message: "Background script is working!",
        });
        return false;
      }

      if (message.type === "TEST_SUPABASE") {
        console.log("🧪 [BACKGROUND] Processing Supabase test request");
        testSupabaseConnection()
          .then((result) => {
            console.log(
              "🧪 [BACKGROUND] Test completed, sending response:",
              result
            );
            sendResponse(result);
          })
          .catch((error) => {
            console.error("🧪 [BACKGROUND] Test failed, sending error:", error);
            sendResponse({ success: false, error: error.message });
          });
        return true;
      }

      if (message.type === "SYNC_MESSAGE") {
        console.log("🔄 [BACKGROUND] Processing sync message");
        handleSyncMessage(message.data)
          .then((result) => {
            console.log(
              "🔄 [BACKGROUND] Sync completed, sending response:",
              result
            );
            sendResponse(result);
          })
          .catch((error) => {
            console.error("🔄 [BACKGROUND] Sync failed, sending error:", error);
            sendResponse({ success: false, error: error.message });
          });
        return true; // Keep the message channel open for async response
      }

      // Unified message handler for saveChatData action
      if (message.action === "saveChatData") {
        console.log("💾 [BACKGROUND] Processing saveChatData action");
        handleSaveChatData(message.data)
          .then((result) => {
            console.log(
              "💾 [BACKGROUND] Save completed, sending response:",
              result
            );
            sendResponse(result);
          })
          .catch((error) => {
            console.error("💾 [BACKGROUND] Save failed, sending error:", error);
            sendResponse({ success: false, error: error.message });
          });
        return true; // Keep the message channel open for async response
      }

      // Unified handler for Supabase operations
      if (message.type === "SUPABASE_OPERATION") {
        console.log(
          "🔧 [BACKGROUND] Processing Supabase operation:",
          message.action
        );
        handleSupabaseOperation(message)
          .then((result) => {
            console.log(
              "🔧 [BACKGROUND] Operation completed, sending response:",
              result
            );
            sendResponse(result);
          })
          .catch((error) => {
            console.error(
              "🔧 [BACKGROUND] Operation failed, sending error:",
              error
            );
            sendResponse({ success: false, error: error.message });
          });
        return true; // Keep the message channel open for async response
      }

      console.log("❌ [BACKGROUND] Unknown message type:", message.type);
      console.log("❌ [BACKGROUND] Unknown message action:", message.action);
      sendResponse({ success: false, error: "Unknown message type" });
      return false;
    });
  },
});

async function testSupabaseConnection() {
  try {
    console.log(
      "🧪 [BACKGROUND] Testing Supabase connection using unified service..."
    );
    const result = await supabaseService.testConnection();
    return result;
  } catch (error) {
    console.error("❌ [BACKGROUND] Supabase test failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    };
  }
}

async function handleSyncMessage(message: {
  conversation_id: string;
  role: string;
  content: string;
  message_id?: string;
}) {
  try {
    console.log(
      "🔍 [BACKGROUND] Starting to sync message using unified service:",
      {
        conversation_id: message.conversation_id,
        message_id: message.message_id,
        role: message.role,
        contentLength: message.content.length,
        contentPreview: message.content.substring(0, 50),
      }
    );

    // Convert to ChatMessage format
    const chatMessage: ChatMessage = {
      conversation_id: message.conversation_id,
      message_id:
        message.message_id || `${message.conversation_id}-${Date.now()}`,
      role: message.role as "user" | "assistant",
      content: message.content,
      created_at: new Date().toISOString(),
    };

    // Use unified service for upsert
    const result = await supabaseService.upsertChatMessages(chatMessage);

    if (!result.success) {
      throw new Error(result.error || "Upsert failed");
    }

    console.log(
      `✅ [BACKGROUND] Successfully synced ${message.role} message to Supabase!`
    );

    return {
      success: true,
      data: result.data,
      message: `Successfully synced ${message.role} message`,
    };
  } catch (error) {
    console.error("❌ [BACKGROUND] Error syncing message:", error);
    throw error;
  }
}

// Unified function to handle saveChatData action using the service
async function handleSaveChatData(data: any) {
  try {
    console.log(
      "💾 [BACKGROUND] Starting to save chat data using unified service:",
      {
        dataType: typeof data,
        isArray: Array.isArray(data),
        length: Array.isArray(data) ? data.length : "N/A",
      }
    );

    // Use unified service for insert
    const result = await supabaseService.insertChatMessages(data);

    if (!result.success) {
      throw new Error(result.error || "Insert failed");
    }

    const count = Array.isArray(data) ? data.length : 1;
    console.log(
      `✅ [BACKGROUND] Successfully saved ${count} message(s) to Supabase!`
    );

    return {
      success: true,
      data: result.data,
      message: `Successfully saved ${count} message(s)`,
    };
  } catch (error) {
    console.error("❌ [BACKGROUND] Error saving chat data:", error);
    throw error;
  }
}

// Unified handler for all Supabase operations
async function handleSupabaseOperation(message: {
  type: string;
  action: string;
  data: any;
  requestId?: string;
}) {
  try {
    console.log("🔧 [BACKGROUND] Processing Supabase operation:", {
      action: message.action,
      hasData: !!message.data,
      requestId: message.requestId,
    });

    switch (message.action) {
      case "insert":
        return await supabaseService.insertChatMessages(message.data);

      case "upsert":
        return await supabaseService.upsertChatMessages(message.data);

      case "query":
        const { conversationId, options } = message.data;
        return await supabaseService.queryChatHistory(conversationId, options);

      case "test":
        return await supabaseService.testConnection();

      default:
        throw new Error(`Unknown Supabase operation: ${message.action}`);
    }
  } catch (error) {
    console.error("❌ [BACKGROUND] Supabase operation failed:", error);
    throw error;
  }
}
