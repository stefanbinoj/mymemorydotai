import { supabaseClient } from "@/client/supabase";

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
            sendResponse({ success: true, data: result });
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
            sendResponse({ success: true, data: result });
          })
          .catch((error) => {
            console.error("🔄 [BACKGROUND] Sync failed, sending error:", error);
            sendResponse({ success: false, error: error.message });
          });
        return true; // Keep the message channel open for async response
      }

      // New simplified message handler for saveChatData action
      if (message.action === "saveChatData") {
        console.log("💾 [BACKGROUND] Processing saveChatData action");
        handleSaveChatData(message.data)
          .then((result) => {
            console.log(
              "💾 [BACKGROUND] Save completed, sending response:",
              result
            );
            sendResponse({ success: true, data: result });
          })
          .catch((error) => {
            console.error("💾 [BACKGROUND] Save failed, sending error:", error);
            sendResponse({ success: false, error: error.message });
          });
        return true; // Keep the message channel open for async response
      }

      console.log("❌ [BACKGROUND] Unknown message type:", message.type);
      sendResponse({ success: false, error: "Unknown message type" });
      return false;
    });
  },
});

async function testSupabaseConnection() {
  try {
    console.log("🧪 [BACKGROUND] Testing Supabase connection...");
    console.log("🧪 [BACKGROUND] Supabase client:", !!supabaseClient);
    console.log("🧪 [BACKGROUND] Environment check:", {
      hasUrl: !!import.meta.env.WXT_APP_SUPABASE_URL,
      hasKey: !!import.meta.env.WXT_APP_SUPABASE_ANON_KEY,
      url: import.meta.env.WXT_APP_SUPABASE_URL?.substring(0, 30) + "...",
    });

    // Test basic connection first
    console.log("🧪 [BACKGROUND] Testing basic connection...");
    const { data, error } = await supabaseClient
      .from("chat_messages")
      .select("count", { count: "exact", head: true });

    if (error) {
      console.error("❌ [BACKGROUND] Supabase connection failed:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return { success: false, error: error.message, details: error };
    }

    console.log("✅ [BACKGROUND] Supabase connection successful!");
    console.log("📊 [BACKGROUND] Table info:", { count: data });

    // Test table structure by trying to select one row
    console.log("🧪 [BACKGROUND] Testing table structure...");
    const { data: sampleData, error: sampleError } = await supabaseClient
      .from("chat_messages")
      .select("*")
      .limit(1);

    if (sampleError) {
      console.warn("⚠️ [BACKGROUND] Could not fetch sample data:", {
        message: sampleError.message,
        details: sampleError.details,
        hint: sampleError.hint,
        code: sampleError.code,
      });
    } else {
      console.log("📊 [BACKGROUND] Sample data structure:", sampleData);
    }

    return {
      success: true,
      message: "Supabase connection working!",
      tableExists: !error,
      sampleData: sampleData,
    };
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
    console.log("🔍 [BACKGROUND] Starting to sync message to Supabase:", {
      conversation_id: message.conversation_id,
      message_id: message.message_id,
      role: message.role,
      contentLength: message.content.length,
      contentPreview: message.content.substring(0, 50),
    });

    // Validate required fields
    if (!message.conversation_id || !message.role || !message.content) {
      throw new Error(
        "Missing required fields: conversation_id, role, or content"
      );
    }

    console.log("🔍 [BACKGROUND] Preparing Supabase upsert data...");
    const upsertData = {
      conversation_id: message.conversation_id,
      message_id:
        message.message_id || `${message.conversation_id}-${Date.now()}`,
      role: message.role,
      content: message.content,
      created_at: new Date().toISOString(),
    };

    console.log(
      "🔍 [BACKGROUND] Full upsert data:",
      JSON.stringify(upsertData, null, 2)
    );

    console.log("🔍 [BACKGROUND] Testing Supabase connection...");

    // First, test the connection by trying to select from the table
    const { data: testData, error: testError } = await supabaseClient
      .from("chat_messages")
      .select("count", { count: "exact", head: true });

    if (testError) {
      console.error(
        "❌ [BACKGROUND] Supabase connection test failed:",
        testError
      );
      throw new Error(`Supabase connection failed: ${testError.message}`);
    }

    console.log("✅ [BACKGROUND] Supabase connection successful, table exists");

    console.log("🔍 [BACKGROUND] Calling Supabase upsert...");
    const { data, error } = await supabaseClient
      .from("chat_messages")
      .upsert([upsertData], {
        onConflict: "conversation_id,message_id",
      })
      .select();

    console.log("🔍 [BACKGROUND] Supabase upsert response:", {
      data: data,
      error: error,
      hasData: !!data,
      dataLength: data?.length || 0,
    });

    if (error) {
      console.error("❌ [BACKGROUND] Supabase upsert error:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw new Error(`Supabase error: ${error.message} (${error.code})`);
    }

    if (!data || data.length === 0) {
      console.warn("⚠️ [BACKGROUND] Upsert succeeded but no data returned");
    }

    console.log(
      `✅ [BACKGROUND] Successfully synced ${message.role} message to Supabase!`
    );
    console.log("📊 [BACKGROUND] Synced data:", data);

    return {
      success: true,
      data: data,
      message: `Successfully synced ${message.role} message`,
    };
  } catch (error) {
    console.error("❌ [BACKGROUND] Error syncing message:", {
      error: error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

// New simplified function to handle saveChatData action
async function handleSaveChatData(data: any) {
  try {
    console.log("💾 [BACKGROUND] Starting to save chat data to Supabase:", {
      dataType: typeof data,
      isArray: Array.isArray(data),
      length: Array.isArray(data) ? data.length : "N/A",
    });

    // If data is an array, insert all messages
    if (Array.isArray(data)) {
      console.log(
        `💾 [BACKGROUND] Processing ${data.length} messages for batch insert`
      );

      const { data: result, error } = await supabaseClient
        .from("chat_messages")
        .insert(data);

      if (error) {
        console.error("❌ [BACKGROUND] Batch insert error:", error);
        throw error;
      }

      console.log(
        `✅ [BACKGROUND] Successfully saved ${data.length} messages to Supabase!`
      );
      return {
        success: true,
        data: result,
        message: `Successfully saved ${data.length} messages`,
      };
    } else {
      // Single message insert
      console.log("💾 [BACKGROUND] Processing single message insert");

      const { data: result, error } = await supabaseClient
        .from("chat_messages")
        .insert(data);

      if (error) {
        console.error("❌ [BACKGROUND] Single insert error:", error);
        throw error;
      }

      console.log("✅ [BACKGROUND] Successfully saved message to Supabase!");
      return {
        success: true,
        data: result,
        message: "Successfully saved message",
      };
    }
  } catch (error) {
    console.error("❌ [BACKGROUND] Error saving chat data:", {
      error: error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
