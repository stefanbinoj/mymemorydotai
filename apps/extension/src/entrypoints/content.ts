import { extractAndSyncConversation } from "@/core/parser";

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

// Optional: Add manual sync button for testing
function addManualSyncButton() {
  const button = document.createElement("button");
  button.textContent = "🔄 Sync Chat";
  button.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 9999;
    background: #10a37f;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  `;

  button.onclick = extractAndSyncConversation;
  document.body.appendChild(button);
}
