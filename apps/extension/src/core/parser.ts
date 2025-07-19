export interface ParsedMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export interface ParsedConversation {
  conversation_id: string;
  title?: string;
  messages: ParsedMessage[];
}

export function parseChatGPTFromDOM(): ParsedConversation | null {
  try {
    // Extract conversation ID from URL
    const url = window.location.href;
    const conversationId = url.match(/\/c\/([a-f0-9-]+)/)?.[1];

    if (!conversationId) {
      console.log("⚠️ No conversation ID found in URL");
      return null;
    }

    // Get conversation title (if available)
    const titleElement = document.querySelector("title");
    const title =
      titleElement?.textContent?.replace(" | ChatGPT", "") || undefined;

    // Find all conversation turns
    const conversationTurns = document.querySelectorAll(
      '[data-testid^="conversation-turn"]'
    );

    if (conversationTurns.length === 0) {
      console.log("⚠️ No conversation turns found");
      return null;
    }

    const messages: ParsedMessage[] = [];

    conversationTurns.forEach((turn, index) => {
      try {
        // Find message container within this turn
        const messageContainer = turn.querySelector(
          "[data-message-author-role]"
        );

        if (!messageContainer) {
          console.log(`⚠️ No message container found in turn ${index}`);
          return;
        }

        // Extract message metadata
        const role = messageContainer.getAttribute(
          "data-message-author-role"
        ) as "user" | "assistant";
        const messageId =
          messageContainer.getAttribute("data-message-id") || `turn-${index}`;

        // Extract message content based on role
        let content = "";
        if (role === "user") {
          // For user messages, look for whitespace-pre-wrap content
          const userContent = messageContainer.querySelector(
            ".whitespace-pre-wrap"
          );
          content = userContent?.textContent?.trim() || "";
        } else if (role === "assistant") {
          // For assistant messages, extract from markdown/prose content
          const assistantContent = messageContainer.querySelector(
            '.markdown.prose, [class*="markdown"], [class*="prose"]'
          );

          if (assistantContent) {
            // Try to get clean text content, preserving some structure
            content = extractAssistantContent(assistantContent);
          } else {
            // Fallback: get all text content from the message container
            const textNodes = getTextContent(messageContainer);
            content = textNodes.trim();
          }
        }

        if (content && content.length > 0) {
          messages.push({
            id: messageId,
            role,
            content,
          });
        }
      } catch (error) {
        console.error(`❌ Error processing turn ${index}:`, error);
      }
    });

    console.log(`✅ Extracted ${messages.length} messages from DOM`);
    return {
      conversation_id: conversationId,
      title,
      messages,
    };
  } catch (error) {
    console.error("❌ Error parsing chat history from DOM:", error);
    return null;
  }
}

// Helper function to extract assistant content while preserving structure
function extractAssistantContent(element: Element): string {
  let content = "";

  // Walk through all child nodes
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node) => {
        // Skip certain elements that don't contain message content
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as Element;
          if (el.matches('button, svg, .sr-only, [aria-hidden="true"]')) {
            return NodeFilter.FILTER_REJECT;
          }
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        content += text + " ";
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;

      // Add line breaks for certain elements
      if (el.matches("br, hr")) {
        content += "\n";
      } else if (el.matches("h1, h2, h3, h4, h5, h6, p, div[data-start]")) {
        // Add line breaks before/after headings and paragraphs
        if (content && !content.endsWith("\n")) {
          content += "\n";
        }
      } else if (el.matches("li")) {
        content += "\n• ";
      } else if (el.matches("code")) {
        const codeText = el.textContent?.trim();
        if (codeText) {
          content += `\`${codeText}\` `;
        }
      } else if (el.matches("pre")) {
        const preText = el.textContent?.trim();
        if (preText) {
          content += "\n```\n" + preText + "\n```\n";
        }
      }
    }
  }

  return content
    .trim()
    .replace(/\n\s*\n/g, "\n")
    .replace(/\s+/g, " ");
}

// Fallback function to get text content
function getTextContent(element: Element): string {
  // Clone the element to avoid modifying the original
  const clone = element.cloneNode(true) as Element;

  // Remove unwanted elements
  const unwanted = clone.querySelectorAll(
    'button, svg, .sr-only, [aria-hidden="true"]'
  );
  unwanted.forEach((el) => el.remove());

  return clone.textContent?.trim() || "";
}

// Updated extraction function that integrates with your existing code
export function extractAndSyncConversation() {
  try {
    console.log("🔍 Extracting conversation from DOM...");

    const conversationData = parseChatGPTFromDOM();

    if (conversationData && conversationData.messages.length > 0) {
      syncConversationToSupabase(conversationData);
    } else {
      console.log("⚠️ No conversation data found");
    }
  } catch (error) {
    console.error("❌ Error extracting conversation:", error);
  }
}

// Integration with your existing sync function
async function syncConversationToSupabase(
  conversationData: ParsedConversation
) {
  console.log(
    `🔄 Syncing ${conversationData.messages.length} messages for conversation ${conversationData.conversation_id}`
  );

  try {
    const messagesToSync = conversationData.messages
      .filter((message) => message.content.trim())
      .map((message) => ({
        conversation_id: conversationData.conversation_id,
        role: message.role,
        content: message.content.trim(),
        message_id: message.id, // Include the original message ID
      }));

    if (messagesToSync.length > 0) {
      // Send all messages in a batch to ISOLATED world
      window.postMessage(
        {
          type: "CHATGPT_SYNC",
          payload: messagesToSync,
        },
        "*"
      );

      console.log(
        `[MAIN] 📤 Sent ${messagesToSync.length} messages to ISOLATED world`
      );
    }

    console.log(
      `✅ Successfully synced conversation ${conversationData.conversation_id}`
    );
  } catch (error) {
    console.error("❌ Error syncing to Supabase:", error);
  }
}

// Updated sync function to handle message IDs via ISOLATED world
async function syncMessageToSupabase(message: {
  conversation_id: string;
  role: string;
  content: string;
  message_id?: string;
}) {
  try {
    // Send message to ISOLATED world via window.postMessage
    window.postMessage(
      {
        type: "CHATGPT_SYNC",
        payload: [message],
      },
      "*"
    );

    console.log(`[MAIN] 📤 Sent ${message.role} message to ISOLATED world`);
  } catch (error) {
    console.error("[MAIN] ❌ Error sending message to ISOLATED world:", error);
  }
}

// Legacy function for backward compatibility
export function parseChatGPTResponse(resp: any): any {
  console.warn(
    "parseChatGPTResponse is deprecated, use parseChatGPTFromDOM instead"
  );
  return null;
}
