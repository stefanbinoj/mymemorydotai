import { extractAndSyncConversation, parseChatGPTFromDOM } from "@/core/parser";

// MAIN world script for DOM access
export default defineContentScript({
  matches: ["https://chat.openai.com/*", "https://chatgpt.com/*"],
  world: "MAIN",
  runAt: "document_start",
  main() {
    console.log("🚀 ChatGPT Extension Started (MAIN world)");

    // Wait for DOM to be ready before initializing observers
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        initializeDOMMonitor();
        addManualSyncButton();
        console.log("✅ DOM Monitor initialized");
      });
    } else {
      // DOM is already loaded
      initializeDOMMonitor();
      addManualSyncButton();
      console.log("✅ DOM Monitor initialized");
    }
  },
});

function initializeDOMMonitor() {
  // Monitor for new messages
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;

            // Look for new conversation turns
            if (
              element.matches('[data-testid^="conversation-turn"]') ||
              element.querySelector('[data-testid^="conversation-turn"]')
            ) {
              console.log("💬 New conversation turn detected");
              debounceExtractConversation();
            }
          }
        });
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Also monitor URL changes for SPA navigation
  let lastUrl = location.href;

  // Use popstate and pushstate/replacestate to detect URL changes
  const handleUrlChange = () => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      if (currentUrl.match(/\/c\/[a-f0-9-]+/)) {
        console.log("🔄 Conversation page loaded");
        setTimeout(extractAndSyncConversation, 2000); // Wait for content to load
      }
    }
  };

  // Listen for browser navigation
  window.addEventListener("popstate", handleUrlChange);

  // Override pushState and replaceState to catch programmatic navigation
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    originalPushState.apply(history, args);
    handleUrlChange();
  };

  history.replaceState = function (...args) {
    originalReplaceState.apply(history, args);
    handleUrlChange();
  };
}

let extractTimeout: ReturnType<typeof setTimeout>;

function debounceExtractConversation() {
  clearTimeout(extractTimeout);
  extractTimeout = setTimeout(extractAndSyncConversation, 1500);
}

// New simplified sync function using direct background script communication
async function syncChatDataToSupabase() {
  try {
    console.log("🔄 [SIMPLE-SYNC] Starting simplified sync process...");

    const conversationData = parseChatGPTFromDOM();

    if (!conversationData || conversationData.messages.length === 0) {
      console.warn("⚠️ [SIMPLE-SYNC] No conversation data found");
      return;
    }

    console.log(
      `📊 [SIMPLE-SYNC] Found ${conversationData.messages.length} messages`
    );

    const messagesToSync = conversationData.messages
      .filter((message) => message.content.trim())
      .map((message) => ({
        conversation_id: conversationData.conversation_id,
        role: message.role,
        content: message.content.trim(),
        message_id: message.id,
        created_at: new Date().toISOString(),
      }));

    console.log(`📊 [SIMPLE-SYNC] Messages to sync: ${messagesToSync.length}`);

    if (messagesToSync.length > 0) {
      // Send data to background script using the new approach
      chrome.runtime.sendMessage(
        {
          action: "saveChatData",
          data: messagesToSync,
        },
        (response: any) => {
          if (response && response.success) {
            console.log(
              `✅ [SIMPLE-SYNC] Successfully saved ${messagesToSync.length} messages to Supabase!`
            );
            console.log("📊 [SIMPLE-SYNC] Response:", response.data);
          } else {
            console.error(
              `❌ [SIMPLE-SYNC] Failed to save messages:`,
              response?.error || "Unknown error"
            );
          }
        }
      );
    } else {
      console.warn("⚠️ [SIMPLE-SYNC] No messages to sync after filtering");
    }
  } catch (error) {
    console.error("❌ [SIMPLE-SYNC] Error in simplified sync:", error);
  }
}

// Optional: Add manual sync button for testing
function addManualSyncButton() {
  // Create container for buttons
  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 5px;
  `;

  // Sync button
  const syncButton = document.createElement("button");
  syncButton.textContent = "🔄 Sync Chat";
  syncButton.style.cssText = `
    background: #10a37f;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  `;
  syncButton.onclick = extractAndSyncConversation;

  // Simple sync button (new approach)
  const simpleSyncButton = document.createElement("button");
  simpleSyncButton.textContent = "💾 Simple Sync";
  simpleSyncButton.style.cssText = `
    background: #3b82f6;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  `;
  simpleSyncButton.onclick = syncChatDataToSupabase;

  // Test Supabase button
  const testButton = document.createElement("button");
  testButton.textContent = "🧪 Test DB";
  testButton.style.cssText = `
    background: #f59e0b;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  `;
  testButton.onclick = testSupabaseConnection;

  container.appendChild(syncButton);
  container.appendChild(simpleSyncButton);
  container.appendChild(testButton);
  document.body.appendChild(container);
}

// Test Supabase connection function
function testSupabaseConnection() {
  console.log("🧪 [MAIN] Testing Supabase connection...");
  console.log("🧪 [MAIN] Sending message to ISOLATED world...");

  // Send test message to ISOLATED world, which will forward to background
  const message = {
    type: "CHATGPT_TEST_SUPABASE",
    payload: { test: true },
  };

  console.log("🧪 [MAIN] Message being sent:", message);
  window.postMessage(message, "*");

  console.log("🧪 [MAIN] Message sent via postMessage");

  // Also add a timeout to check if we get a response
  setTimeout(() => {
    console.log(
      "⏰ [MAIN] 3 seconds passed - if no ISOLATED world logs appeared, there might be a communication issue"
    );
  }, 3000);
}
