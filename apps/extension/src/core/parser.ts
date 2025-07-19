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
    console.log("🔍 [DOM] Starting DOM extraction...");

    // Extract conversation ID from URL
    const url = window.location.href;
    console.log("🔍 [DOM] Current URL:", url);
    const conversationId = url.match(/\/c\/([a-f0-9-]+)/)?.[1];
    console.log("🔍 [DOM] Extracted conversation ID:", conversationId);

    if (!conversationId) {
      console.log("⚠️ [DOM] No conversation ID found in URL");
      return null;
    }

    // Get conversation title (if available)
    const titleElement = document.querySelector("title");
    const title =
      titleElement?.textContent?.replace(" | ChatGPT", "") || undefined;
    console.log("🔍 [DOM] Extracted title:", title);

    // Find all conversation turns
    const conversationTurns = document.querySelectorAll(
      '[data-testid^="conversation-turn"]'
    );
    console.log("🔍 [DOM] Found conversation turns:", conversationTurns.length);

    if (conversationTurns.length === 0) {
      console.log("⚠️ [DOM] No conversation turns found");
      return null;
    }

    const messages: ParsedMessage[] = [];

    conversationTurns.forEach((turn, index) => {
      try {
        console.log(`🔍 [DOM] Processing turn ${index}...`);

        // Find message container within this turn
        const messageElement = turn.querySelector("[data-message-author-role]");

        if (!messageElement) {
          console.log(`⚠️ [DOM] No message container found in turn ${index}`);
          return;
        }

        // Extract message metadata
        const role = messageElement.getAttribute("data-message-author-role") as
          | "user"
          | "assistant";
        const messageId =
          messageElement.getAttribute("data-message-id") || `turn-${index}`;
        console.log(`🔍 [DOM] Turn ${index} - Role: ${role}, ID: ${messageId}`);

        // Extract message content based on role
        let content = "";
        console.log(`🔍 [DOM] Extracting content for ${role} message...`);

        if (role === "user") {
          // For user messages, content is typically in a whitespace-pre-wrap div
          const contentElement = messageElement.querySelector(
            ".whitespace-pre-wrap"
          );
          content = contentElement
            ? contentElement.textContent?.trim() || ""
            : "";

          // Fallback: try other selectors if the main one doesn't work
          if (!content) {
            const fallbackSelectors = [
              "[data-message-author-role='user'] .whitespace-pre-wrap",
              "[data-message-author-role='user']",
              ".markdown.prose",
              ".prose",
            ];

            for (const selector of fallbackSelectors) {
              const userContent = messageElement.querySelector(selector);
              if (userContent) {
                content = userContent.textContent?.trim() || "";
                if (content.length > 0) break;
              }
            }
          }

          console.log(`🔍 [DOM] User content length: ${content.length}`);
        } else if (role === "assistant") {
          // For assistant messages, content is in markdown prose format
          const proseElement = messageElement.querySelector(".markdown.prose");

          if (proseElement) {
            // Extract text content while preserving structure
            content = extractAssistantContent(proseElement);
            console.log(
              `🔍 [DOM] Assistant content (formatted) length: ${content.length}`
            );
          } else {
            // Fallback: try other selectors
            const fallbackSelectors = [
              '[class*="markdown"]',
              '[class*="prose"]',
              ".prose",
              '[data-message-author-role="assistant"] .markdown',
              '[data-message-author-role="assistant"] .prose',
            ];

            for (const selector of fallbackSelectors) {
              const assistantContent = messageElement.querySelector(selector);
              if (assistantContent) {
                content = extractAssistantContent(assistantContent);
                if (content.length > 0) break;
              }
            }

            // Final fallback: get all text content
            if (!content) {
              content = messageElement.textContent?.trim() || "";
            }
          }
        }

        console.log(
          `🔍 [DOM] Final content for ${role}: "${content.substring(0, 100)}..."`
        );

        if (content && content.length > 0) {
          console.log(
            `🔍 [DOM] Adding message - Role: ${role}, Content preview: "${content.substring(0, 50)}..."`
          );
          messages.push({
            id: messageId,
            role,
            content,
          });
        } else {
          console.log(`⚠️ [DOM] Skipping empty message in turn ${index}`);
        }
      } catch (error) {
        console.error(`❌ [DOM] Error processing turn ${index}:`, error);
      }
    });

    console.log(`✅ [DOM] Extracted ${messages.length} messages from DOM`);
    console.log("🔍 [DOM] Final conversation data:", {
      conversation_id: conversationId,
      title,
      messageCount: messages.length,
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        contentLength: m.content.length,
        contentPreview:
          m.content.substring(0, 100) + (m.content.length > 100 ? "..." : ""),
      })),
    });

    return {
      conversation_id: conversationId,
      title,
      messages,
    };
  } catch (error) {
    console.error("❌ [DOM] Error parsing chat history from DOM:", error);
    return null;
  }
}

// Improved helper function to extract assistant content while preserving structure
function extractAssistantContent(element: Element): string {
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

// Alternative simpler version that just extracts plain text
export function parseSimpleChatGPTFromDOM(): ParsedConversation | null {
  try {
    console.log("🔍 [SIMPLE] Starting simple DOM extraction...");

    // Extract conversation ID from URL
    const url = window.location.href;
    const conversationId = url.match(/\/c\/([a-f0-9-]+)/)?.[1];

    if (!conversationId) {
      console.log("⚠️ [SIMPLE] No conversation ID found in URL");
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
      console.log("⚠️ [SIMPLE] No conversation turns found");
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
        console.error(`❌ [SIMPLE] Error processing turn ${index}:`, error);
      }
    });

    console.log(`✅ [SIMPLE] Extracted ${messages.length} messages from DOM`);

    return {
      conversation_id: conversationId,
      title,
      messages,
    };
  } catch (error) {
    console.error("❌ [SIMPLE] Error parsing chat history from DOM:", error);
    return null;
  }
}

// Updated extraction function that integrates with your existing code
export function extractAndSyncConversation() {
  try {
    console.log("🔍 [EXTRACT] Starting conversation extraction...");

    const conversationData = parseChatGPTFromDOM();
    console.log(
      "🔍 [EXTRACT] Parsed conversation data:",
      conversationData ? "SUCCESS" : "NULL"
    );

    if (conversationData && conversationData.messages.length > 0) {
      console.log(
        "🔍 [EXTRACT] Found valid conversation data, proceeding to sync..."
      );
      syncConversationToSupabase(conversationData);
    } else {
      console.log("⚠️ [EXTRACT] No conversation data found or empty messages");
    }
  } catch (error) {
    console.error("❌ [EXTRACT] Error extracting conversation:", error);
  }
}

// Integration with your existing sync function
async function syncConversationToSupabase(
  conversationData: ParsedConversation
) {
  console.log(
    `🔄 [SYNC] Starting sync for ${conversationData.messages.length} messages in conversation ${conversationData.conversation_id}`
  );

  try {
    console.log("🔍 [SYNC] Filtering and mapping messages...");
    const messagesToSync = conversationData.messages
      .filter((message) => message.content.trim())
      .map((message) => ({
        conversation_id: conversationData.conversation_id,
        role: message.role,
        content: message.content.trim(),
        message_id: message.id, // Include the original message ID
      }));

    console.log(
      "🔍 [SYNC] Messages to sync:",
      messagesToSync.map((m) => ({
        role: m.role,
        message_id: m.message_id,
        contentLength: m.content.length,
        contentPreview: m.content.substring(0, 50),
      }))
    );

    if (messagesToSync.length > 0) {
      // Send all messages in a batch to ISOLATED world
      const message = {
        type: "CHATGPT_SYNC",
        payload: messagesToSync,
      };

      console.log("🔍 [SYNC] Preparing to send message to ISOLATED world:", {
        type: message.type,
        payloadCount: message.payload.length,
        conversationId: conversationData.conversation_id,
      });

      window.postMessage(message, "*");
      console.log("🔍 [SYNC] Message sent to ISOLATED world via postMessage");

      console.log(
        `✅ [SYNC] Successfully sent ${messagesToSync.length} messages to ISOLATED world`
      );
    } else {
      console.log("⚠️ [SYNC] No messages to sync after filtering");
    }

    console.log(
      `✅ [SYNC] Sync process completed for conversation ${conversationData.conversation_id}`
    );
  } catch (error) {
    console.error("❌ [SYNC] Error syncing to Supabase:", error);
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

// Parse HTML string using DOMParser (for cases where HTML is available as string)
export function parseChatGPTFromHTML(
  htmlString: string
): ParsedConversation | null {
  try {
    console.log("🔍 [HTML] Starting HTML string parsing...");

    // Create a DOM parser to work with the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");

    // Extract conversation ID from the HTML (if available)
    const conversationId =
      extractConversationIdFromHTML(doc) || `html-${Date.now()}`;
    console.log("🔍 [HTML] Extracted conversation ID:", conversationId);

    // Get conversation title
    const titleElement = doc.querySelector("title");
    const title =
      titleElement?.textContent?.replace(" | ChatGPT", "") || undefined;
    console.log("🔍 [HTML] Extracted title:", title);

    const messages: ParsedMessage[] = [];

    // Find all conversation turns
    const conversationTurns = doc.querySelectorAll(
      '[data-testid*="conversation-turn"]'
    );
    console.log(
      "🔍 [HTML] Found conversation turns:",
      conversationTurns.length
    );

    conversationTurns.forEach((turn, index) => {
      try {
        console.log(`🔍 [HTML] Processing turn ${index}...`);

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
            } else {
              // Fallback: get plain text
              content = messageElement.textContent?.trim() || "";
            }
          }

          if (content) {
            console.log(
              `🔍 [HTML] Adding message - Role: ${role}, Content preview: "${content.substring(0, 50)}..."`
            );
            messages.push({
              role: role,
              id: messageId,
              content: content.trim(),
            });
          }
        }
      } catch (error) {
        console.error(`❌ [HTML] Error processing turn ${index}:`, error);
      }
    });

    console.log(`✅ [HTML] Extracted ${messages.length} messages from HTML`);

    return {
      conversation_id: conversationId,
      title,
      messages,
    };
  } catch (error) {
    console.error("❌ [HTML] Error parsing chat history from HTML:", error);
    return null;
  }
}

// Alternative simpler version that just extracts plain text from HTML
export function parseSimpleChatGPTFromHTML(
  htmlString: string
): ParsedConversation | null {
  try {
    console.log("🔍 [SIMPLE-HTML] Starting simple HTML parsing...");

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
        console.error(
          `❌ [SIMPLE-HTML] Error processing turn ${index}:`,
          error
        );
      }
    });

    console.log(
      `✅ [SIMPLE-HTML] Extracted ${messages.length} messages from HTML`
    );

    return {
      conversation_id: conversationId,
      title,
      messages,
    };
  } catch (error) {
    console.error(
      "❌ [SIMPLE-HTML] Error parsing chat history from HTML:",
      error
    );
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
