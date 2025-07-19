// ISOLATED world script for Chrome API access
export default defineContentScript({
  matches: ["https://chat.openai.com/*", "https://chatgpt.com/*"],
  world: "ISOLATED",
  runAt: "document_start",
  main() {
    console.log("🚀 ChatGPT Extension Started (ISOLATED world)");

    // Listen for messages from MAIN world
    window.addEventListener("message", (event) => {
      console.log("📨 [ISOLATED] Received message event:", {
        type: event.data?.type,
        source: event.source === window ? "same-window" : "different-window",
        origin: event.origin,
        data: event.data,
      });

      if (event.source !== window) {
        console.log("❌ [ISOLATED] Message not from same window, ignoring");
        return;
      }

      if (event.data.type === "CHATGPT_SYNC") {
        console.log("📨 [ISOLATED] Received sync request from MAIN world");
        handleSyncRequest(event.data.payload);
        return;
      }

      if (event.data.type === "CHATGPT_SAVE_DATA") {
        console.log("📨 [ISOLATED] Received save data request from MAIN world");
        handleSaveDataRequest(event.data.payload);
        return;
      }

      if (event.data.type === "CHATGPT_POST_REQUEST") {
        console.log("📨 [ISOLATED] Received POST request from MAIN world");
        handlePostRequest(event.data.payload);
        return;
      }

      if (event.data.type === "CHATGPT_TEST_SUPABASE") {
        console.log(
          "🧪 [ISOLATED] Received Supabase test request from MAIN world"
        );
        handleSupabaseTest();
        return;
      }

      console.log(
        "❌ [ISOLATED] Unknown message type, ignoring:",
        event.data.type
      );
    });

    // Add a direct test button that bypasses MAIN world communication
    setTimeout(() => {
      console.log("🧪 [ISOLATED] Adding direct test functionality...");

      // Test direct communication with background script
      const testDirectConnection = async () => {
        console.log(
          "🧪 [ISOLATED] Testing direct background script communication..."
        );
        try {
          const response = await chrome.runtime.sendMessage({
            type: "TEST_SUPABASE",
            data: { test: true, direct: true },
          });
          console.log("🧪 [ISOLATED] Direct test response:", response);
        } catch (error) {
          console.error("❌ [ISOLATED] Direct test failed:", error);
        }
      };

      // Run the test automatically after 2 seconds
      setTimeout(testDirectConnection, 2000);

      // Also make it available globally for manual testing
      (window as any).testSupabaseDirect = testDirectConnection;
      console.log(
        "🧪 [ISOLATED] Direct test function available as window.testSupabaseDirect()"
      );
    }, 1000);

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
      "🔍 [ISOLATED] Full message data:",
      JSON.stringify(messages, null, 2)
    );

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      console.log(
        `\n📤 [ISOLATED] Processing message ${i + 1}/${messages.length}:`
      );
      console.log("🔍 [ISOLATED] Message details:", {
        conversation_id: message.conversation_id,
        role: message.role,
        message_id: message.message_id,
        contentLength: message.content.length,
        contentPreview: message.content.substring(0, 100) + "...",
      });

      try {
        console.log("🔍 [ISOLATED] Sending message to background script...");
        const response = await chrome.runtime.sendMessage({
          type: "SYNC_MESSAGE",
          data: message,
        });

        console.log("📨 [ISOLATED] Background script response:", response);

        if (response && response.success) {
          successCount++;
          console.log(`✅ [ISOLATED] Message ${i + 1} synced successfully!`);
          if (response.data) {
            console.log("📊 [ISOLATED] Supabase response data:", response.data);
          }
        } else {
          errorCount++;
          console.error(
            `❌ [ISOLATED] Message ${i + 1} sync failed:`,
            response?.error || "Unknown error"
          );
        }
      } catch (messageError) {
        errorCount++;
        console.error(
          `❌ [ISOLATED] Error sending message ${i + 1}:`,
          messageError
        );
      }

      // Add a small delay between messages to avoid overwhelming the background script
      if (i < messages.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(`\n📊 [ISOLATED] Sync Summary:`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📊 Total: ${messages.length}`);

    if (successCount === messages.length) {
      console.log(
        `🎉 [ISOLATED] All ${messages.length} messages synced successfully!`
      );
    } else if (successCount > 0) {
      console.log(
        `⚠️ [ISOLATED] Partial sync: ${successCount}/${messages.length} messages synced`
      );
    } else {
      console.error(
        `💥 [ISOLATED] Sync failed: 0/${messages.length} messages synced`
      );
    }
  } catch (error) {
    console.error("❌ [ISOLATED] Critical error handling sync request:", error);
  }
}

async function handleSupabaseTest() {
  try {
    console.log(
      "🧪 [ISOLATED] Testing Supabase connection via background script..."
    );

    const response = await chrome.runtime.sendMessage({
      type: "TEST_SUPABASE",
      data: { test: true },
    });

    console.log("🧪 [ISOLATED] Supabase test response:", response);

    if (response && response.success) {
      console.log("✅ [ISOLATED] Supabase connection test successful!");
      if (response.data) {
        console.log("📊 [ISOLATED] Test data:", response.data);
      }
    } else {
      console.error(
        "❌ [ISOLATED] Supabase connection test failed:",
        response?.error || "Unknown error"
      );
    }
  } catch (error) {
    console.error("❌ [ISOLATED] Error testing Supabase connection:", error);
  }
}

// New function to handle save data requests
async function handleSaveDataRequest(payload: { action: string; data: any }) {
  try {
    console.log("💾 [ISOLATED] Processing save data request:", {
      action: payload.action,
      dataType: typeof payload.data,
      isArray: Array.isArray(payload.data),
      length: Array.isArray(payload.data) ? payload.data.length : "N/A",
    });

    if (payload.action === "saveChatData") {
      console.log(
        `💾 [ISOLATED] Sending ${payload.data.length} messages to background script`
      );

      const response = await chrome.runtime.sendMessage({
        action: "saveChatData",
        data: payload.data,
      });

      console.log("📨 [ISOLATED] Background script response:", response);

      if (response && response.success) {
        console.log(
          `✅ [ISOLATED] Successfully saved ${payload.data.length} messages to Supabase!`
        );
        if (response.data) {
          console.log("📊 [ISOLATED] Supabase response data:", response.data);
        }
      } else {
        console.error(
          "❌ [ISOLATED] Failed to save messages:",
          response?.error || "Unknown error"
        );
      }
    } else {
      console.error("❌ [ISOLATED] Unknown action:", payload.action);
    }
  } catch (error) {
    console.error("❌ [ISOLATED] Error handling save data request:", error);
  }
}

// New function to handle POST requests
async function handlePostRequest(payload: { action: string; data: any }) {
  try {
    console.log("📤 [ISOLATED] Processing POST request:", {
      action: payload.action,
      dataType: typeof payload.data,
      data: payload.data,
    });

    if (payload.action === "postToSupabase") {
      console.log("📤 [ISOLATED] Sending POST request to background script");
      console.log("📤 [ISOLATED] Message being sent:", {
        action: "postToSupabase",
        data: payload.data,
      });

      const response = await chrome.runtime.sendMessage({
        action: "postToSupabase",
        data: payload.data,
      });

      console.log("📨 [ISOLATED] Background script POST response:", response);

      if (response && response.success) {
        console.log("✅ [ISOLATED] POST request successful!");
        if (response.data) {
          console.log("📊 [ISOLATED] POST response data:", response.data);
        }
      } else {
        console.error(
          "❌ [ISOLATED] POST request failed:",
          response?.error || "Unknown error"
        );
      }
    } else {
      console.error("❌ [ISOLATED] Unknown POST action:", payload.action);
    }
  } catch (error) {
    console.error("❌ [ISOLATED] Error handling POST request:", error);
  }
}
