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
      return null;
    }

    // Get conversation title (if available)
    const titleElement = document.querySelector("title");
    const title =
      titleElement?.textContent?.replace(" | ChatGPT", "") || undefined;

    const messages: ParsedMessage[] = [];

    // Find all conversation turns using the new selector pattern
    const conversationTurns = document.querySelectorAll(
      '[data-testid*="conversation-turn"]'
    );

    if (conversationTurns.length === 0) {
      return null;
    }

    conversationTurns.forEach((turn, index) => {
      try {
        // Find the message element within this turn
        const messageElement = turn.querySelector("[data-message-author-role]");

        if (messageElement) {
          const role = messageElement.getAttribute(
            "data-message-author-role"
          ) as "user" | "assistant";
          const messageId =
            messageElement.getAttribute("data-message-id") || `turn-${index}`;

          let content = "";

          if (role === "user") {
            // For user messages, content is typically in a whitespace-pre-wrap div
            const contentElement = messageElement.querySelector(
              ".whitespace-pre-wrap"
            );
            content = contentElement
              ? contentElement.textContent?.trim() || ""
              : "";
          } else if (role === "assistant") {
            // For assistant messages, content is in markdown prose format
            const proseElement =
              messageElement.querySelector(".markdown.prose");
            if (proseElement) {
              // Extract text content while preserving structure
              content = extractAssistantContent(proseElement);
            }
          }

          if (content) {
            messages.push({
              id: messageId,
              role: role,
              content: content.trim(),
            });
          }
        }
      } catch (error) {
        console.error(`Error processing turn ${index}:`, error);
      }
    });

    const result = {
      conversation_id: conversationId,
      title,
      messages,
    };

    // Print extracted conversation
    printExtractedConversation(result);

    return result;
  } catch (error) {
    console.error("Error parsing chat history from DOM:", error);
    return null;
  }
}

// Improved helper function to extract assistant content while preserving structure
function extractAssistantContent(proseElement: Element): string {
  let content = "";

  // Walk through all child nodes and extract text with basic formatting
  function processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const tagName = el.tagName.toLowerCase();
      let text = "";

      // Handle different elements
      switch (tagName) {
        case "h1":
        case "h2":
        case "h3":
        case "h4":
        case "h5":
        case "h6":
          text =
            "\n" + Array.from(el.childNodes).map(processNode).join("") + "\n";
          break;
        case "p":
          text = Array.from(el.childNodes).map(processNode).join("") + "\n\n";
          break;
        case "br":
          text = "\n";
          break;
        case "hr":
          text = "\n---\n";
          break;
        case "ul":
        case "ol":
          text =
            "\n" + Array.from(el.childNodes).map(processNode).join("") + "\n";
          break;
        case "li":
          text =
            "• " + Array.from(el.childNodes).map(processNode).join("") + "\n";
          break;
        case "code":
          // Handle inline code
          if (
            el.parentElement &&
            el.parentElement.tagName.toLowerCase() === "pre"
          ) {
            text = Array.from(el.childNodes).map(processNode).join("");
          } else {
            text =
              "`" + Array.from(el.childNodes).map(processNode).join("") + "`";
          }
          break;
        case "pre":
          text =
            "\n```\n" +
            Array.from(el.childNodes).map(processNode).join("") +
            "\n```\n";
          break;
        case "strong":
        case "b":
          text =
            "**" + Array.from(el.childNodes).map(processNode).join("") + "**";
          break;
        case "em":
        case "i":
          text =
            "*" + Array.from(el.childNodes).map(processNode).join("") + "*";
          break;
        default:
          text = Array.from(el.childNodes).map(processNode).join("");
      }

      return text;
    }
    return "";
  }

  content = Array.from(proseElement.childNodes).map(processNode).join("");

  // Clean up extra whitespace
  content = content.replace(/\n{3,}/g, "\n\n").trim();

  return content;
}

// Alternative simpler version that just extracts plain text
export function parseSimpleChatGPTFromDOM(): ParsedConversation | null {
  try {
    // Extract conversation ID from URL
    const url = window.location.href;
    const conversationId = url.match(/\/c\/([a-f0-9-]+)/)?.[1];

    if (!conversationId) {
      return null;
    }

    // Get conversation title
    const titleElement = document.querySelector("title");
    const title =
      titleElement?.textContent?.replace(" | ChatGPT", "") || undefined;

    // Find all conversation turns
    const conversationTurns = document.querySelectorAll(
      '[data-testid*="conversation-turn"]'
    );

    if (conversationTurns.length === 0) {
      return null;
    }

    const messages: ParsedMessage[] = [];

    conversationTurns.forEach((turn, index) => {
      try {
        const messageElement = turn.querySelector("[data-message-author-role]");

        if (messageElement) {
          const role = messageElement.getAttribute(
            "data-message-author-role"
          ) as "user" | "assistant";
          const messageId =
            messageElement.getAttribute("data-message-id") || `turn-${index}`;
          let content = "";

          if (role === "user") {
            const contentElement = messageElement.querySelector(
              ".whitespace-pre-wrap"
            );
            content = contentElement
              ? contentElement.textContent?.trim() || ""
              : "";
          } else if (role === "assistant") {
            const proseElement =
              messageElement.querySelector(".markdown.prose");
            content = proseElement
              ? proseElement.textContent?.trim() || ""
              : "";
          }

          if (content) {
            messages.push({
              id: messageId,
              role,
              content: content,
            });
          }
        }
      } catch (error) {
        console.error(`Error processing turn ${index}:`, error);
      }
    });

    return {
      conversation_id: conversationId,
      title,
      messages,
    };
  } catch (error) {
    console.error("Error parsing chat history from DOM:", error);
    return null;
  }
}

// Updated extraction function that integrates with your existing code
export function extractAndSyncConversation() {
  try {
    const conversationData = parseChatGPTFromDOM();

    if (conversationData && conversationData.messages.length > 0) {
      syncConversationToSupabase(conversationData);
    }
  } catch (error) {
    console.error("Error extracting conversation:", error);
  }
}

// Integration with your existing sync function
async function syncConversationToSupabase(
  conversationData: ParsedConversation
) {
  try {
    console.log(
      `\n🔄 [SYNC] Starting sync process for conversation: ${conversationData.conversation_id}`
    );
    console.log(
      `📊 [SYNC] Total messages to process: ${conversationData.messages.length}`
    );

    const messagesToSync = conversationData.messages
      .filter((message) => message.content.trim())
      .map((message) => ({
        conversation_id: conversationData.conversation_id,
        role: message.role,
        content: message.content.trim(),
        message_id: message.id, // Include the original message ID
        created_at: new Date().toISOString(), // Add timestamp
      }));

    console.log(`📊 [SYNC] Messages after filtering: ${messagesToSync.length}`);
    console.log(
      "🔍 [SYNC] Messages to sync:",
      messagesToSync.map((m, i) => ({
        index: i + 1,
        role: m.role,
        message_id: m.message_id,
        contentLength: m.content.length,
        contentPreview: m.content.substring(0, 50) + "...",
      }))
    );

    if (messagesToSync.length > 0) {
      // Use the new simplified message passing approach
      const message = {
        action: "saveChatData",
        data: messagesToSync,
      };

      console.log(
        "📤 [SYNC] Sending messages to background script via chrome.runtime.sendMessage..."
      );
      console.log(
        "🔍 [SYNC] Message payload:",
        JSON.stringify(message, null, 2)
      );

      // Send message directly to background script
      chrome.runtime.sendMessage(message, (response) => {
        if (response && response.success) {
          console.log(
            `✅ [SYNC] Successfully saved ${messagesToSync.length} messages to Supabase!`
          );
          console.log("📊 [SYNC] Response data:", response.data);
        } else {
          console.error(
            `❌ [SYNC] Failed to save messages:`,
            response?.error || "Unknown error"
          );
        }
      });

      console.log(
        `✅ [SYNC] Successfully sent ${messagesToSync.length} messages to background script`
      );
    } else {
      console.warn("⚠️ [SYNC] No messages to sync after filtering");
    }
  } catch (error) {
    console.error("❌ [SYNC] Error syncing to Supabase:", error);
  }
}

// Parse HTML string using DOMParser (for cases where HTML is available as string)
export function parseChatGPTFromHTML(
  htmlString: string
): ParsedConversation | null {
  try {
    // Create a DOM parser to work with the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");

    // Extract conversation ID from the HTML (if available)
    const conversationId =
      extractConversationIdFromHTML(doc) || `html-${Date.now()}`;

    // Get conversation title
    const titleElement = doc.querySelector("title");
    const title =
      titleElement?.textContent?.replace(" | ChatGPT", "") || undefined;

    const messages: ParsedMessage[] = [];

    // Find all conversation turns
    const conversationTurns = doc.querySelectorAll(
      '[data-testid*="conversation-turn"]'
    );

    conversationTurns.forEach((turn, index) => {
      try {
        // Find the message element within this turn
        const messageElement = turn.querySelector("[data-message-author-role]");

        if (messageElement) {
          const role = messageElement.getAttribute(
            "data-message-author-role"
          ) as "user" | "assistant";
          const messageId =
            messageElement.getAttribute("data-message-id") || `turn-${index}`;

          let content = "";

          if (role === "user") {
            // For user messages, content is typically in a whitespace-pre-wrap div
            const contentElement = messageElement.querySelector(
              ".whitespace-pre-wrap"
            );
            content = contentElement
              ? contentElement.textContent?.trim() || ""
              : "";
          } else if (role === "assistant") {
            // For assistant messages, content is in markdown prose format
            const proseElement =
              messageElement.querySelector(".markdown.prose");
            if (proseElement) {
              // Extract text content while preserving structure
              content = extractAssistantContentFromHTML(proseElement);
            }
          }

          if (content) {
            messages.push({
              role: role,
              id: messageId,
              content: content.trim(),
            });
          }
        }
      } catch (error) {
        console.error(`Error processing turn ${index}:`, error);
      }
    });

    const result = {
      conversation_id: conversationId,
      title,
      messages,
    };

    // Print extracted conversation
    printExtractedConversation(result);

    return result;
  } catch (error) {
    console.error("Error parsing chat history from HTML:", error);
    return null;
  }
}

// Alternative simpler version that just extracts plain text from HTML
export function parseSimpleChatGPTFromHTML(
  htmlString: string
): ParsedConversation | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");

    const conversationId =
      extractConversationIdFromHTML(doc) || `html-simple-${Date.now()}`;
    const titleElement = doc.querySelector("title");
    const title =
      titleElement?.textContent?.replace(" | ChatGPT", "") || undefined;

    const messages: ParsedMessage[] = [];

    // Find all conversation turns
    const conversationTurns = doc.querySelectorAll(
      '[data-testid*="conversation-turn"]'
    );

    conversationTurns.forEach((turn, index) => {
      try {
        const messageElement = turn.querySelector("[data-message-author-role]");

        if (messageElement) {
          const role = messageElement.getAttribute(
            "data-message-author-role"
          ) as "user" | "assistant";
          const messageId =
            messageElement.getAttribute("data-message-id") || `turn-${index}`;
          let content = "";

          if (role === "user") {
            const contentElement = messageElement.querySelector(
              ".whitespace-pre-wrap"
            );
            content = contentElement
              ? contentElement.textContent?.trim() || ""
              : "";
          } else if (role === "assistant") {
            const proseElement =
              messageElement.querySelector(".markdown.prose");
            content = proseElement
              ? proseElement.textContent?.trim() || ""
              : "";
          }

          if (content) {
            messages.push({
              id: messageId,
              role,
              content: content,
            });
          }
        }
      } catch (error) {
        console.error(`Error processing turn ${index}:`, error);
      }
    });

    return {
      conversation_id: conversationId,
      title,
      messages,
    };
  } catch (error) {
    console.error("Error parsing chat history from HTML:", error);
    return null;
  }
}

// Helper function to extract assistant content from HTML while preserving structure
function extractAssistantContentFromHTML(element: Element): string {
  let content = "";

  // Walk through all child nodes and extract text with basic formatting
  function processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const tagName = el.tagName.toLowerCase();
      let text = "";

      // Skip unwanted elements
      if (el.matches('button, svg, .sr-only, [aria-hidden="true"]')) {
        return "";
      }

      // Handle different elements
      switch (tagName) {
        case "h1":
        case "h2":
        case "h3":
        case "h4":
        case "h5":
        case "h6":
          text =
            "\n" + Array.from(el.childNodes).map(processNode).join("") + "\n";
          break;
        case "p":
          text = Array.from(el.childNodes).map(processNode).join("") + "\n\n";
          break;
        case "br":
          text = "\n";
          break;
        case "hr":
          text = "\n---\n";
          break;
        case "ul":
        case "ol":
          text =
            "\n" + Array.from(el.childNodes).map(processNode).join("") + "\n";
          break;
        case "li":
          text =
            "• " + Array.from(el.childNodes).map(processNode).join("") + "\n";
          break;
        case "code":
          // Handle inline code
          if (
            el.parentElement &&
            el.parentElement.tagName.toLowerCase() === "pre"
          ) {
            text = Array.from(el.childNodes).map(processNode).join("");
          } else {
            text =
              "`" + Array.from(el.childNodes).map(processNode).join("") + "`";
          }
          break;
        case "pre":
          text =
            "\n```\n" +
            Array.from(el.childNodes).map(processNode).join("") +
            "\n```\n";
          break;
        case "strong":
        case "b":
          text =
            "**" + Array.from(el.childNodes).map(processNode).join("") + "**";
          break;
        case "em":
        case "i":
          text =
            "*" + Array.from(el.childNodes).map(processNode).join("") + "*";
          break;
        case "blockquote":
          text =
            "\n> " + Array.from(el.childNodes).map(processNode).join("") + "\n";
          break;
        case "a":
          const href = el.getAttribute("href");
          const linkText = Array.from(el.childNodes).map(processNode).join("");
          text = href ? `[${linkText}](${href})` : linkText;
          break;
        default:
          text = Array.from(el.childNodes).map(processNode).join("");
      }

      return text;
    }
    return "";
  }

  content = Array.from(element.childNodes).map(processNode).join("");

  // Clean up extra whitespace
  content = content.replace(/\n{3,}/g, "\n\n").trim();

  return content;
}

// Helper function to extract conversation ID from HTML document
function extractConversationIdFromHTML(doc: Document): string | null {
  // Try to find conversation ID in various places
  const urlElement = doc.querySelector('meta[property="og:url"]');
  if (urlElement) {
    const url = urlElement.getAttribute("content");
    if (url) {
      const match = url.match(/\/c\/([a-f0-9-]+)/);
      if (match) return match[1];
    }
  }

  // Try to find it in any link or script tag
  const links = doc.querySelectorAll('a[href*="/c/"]');
  for (const link of links) {
    const href = link.getAttribute("href");
    if (href) {
      const match = href.match(/\/c\/([a-f0-9-]+)/);
      if (match) return match[1];
    }
  }

  return null;
}

// Function to print extracted conversation in a readable format
function printExtractedConversation(conversation: ParsedConversation): void {
  console.log("\n" + "=".repeat(80));
  console.log(`📄 EXTRACTED CONVERSATION`);
  console.log("=".repeat(80));
  console.log(`🆔 ID: ${conversation.conversation_id}`);
  console.log(`📝 Title: ${conversation.title || "Untitled"}`);
  console.log(`💬 Messages: ${conversation.messages.length}`);
  console.log("=".repeat(80));

  conversation.messages.forEach((message, index) => {
    const roleIcon = message.role === "user" ? "👤" : "🤖";
    const roleName = message.role === "user" ? "USER" : "ASSISTANT";

    console.log(
      `\n${roleIcon} ${roleName} (${index + 1}/${conversation.messages.length})`
    );
    console.log("-".repeat(40));
    console.log(message.content);
    console.log("-".repeat(40));
  });

  console.log("\n" + "=".repeat(80));
  console.log("✅ EXTRACTION COMPLETE");
  console.log("=".repeat(80) + "\n");
}
