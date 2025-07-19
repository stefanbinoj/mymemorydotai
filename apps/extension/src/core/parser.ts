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
      // Send all messages in a batch to ISOLATED world
      const message = {
        type: "CHATGPT_SYNC",
        payload: messagesToSync,
      };

      console.log(
        "📤 [SYNC] Sending messages to ISOLATED world via postMessage..."
      );
      console.log(
        "🔍 [SYNC] Message payload:",
        JSON.stringify(message, null, 2)
      );

      window.postMessage(message, "*");
      console.log("🔍 [SYNC] Message sent to ISOLATED world via postMessage");

      console.log(
        `✅ [SYNC] Successfully sent ${messagesToSync.length} messages to ISOLATED world`
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

// Simple POST request function to Supabase REST API
async function postToSupabase(data: any) {
  const SUPABASE_URL =
    "https://rpqodqmuvyuudsawpjlf.supabase.co/rest/v1/chat_messages";
  const SUPABASE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwcW9kcW11dnl1dWRzYXdwamxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MzIzMjEsImV4cCI6MjA2ODUwODMyMX0.XFRTlLSfY6kbp-eScXOAwqZaDLVjaCA";

  try {
    console.log("📤 [POST] Sending POST request to Supabase:", {
      url: SUPABASE_URL,
      dataType: typeof data,
      isArray: Array.isArray(data),
      length: Array.isArray(data) ? data.length : "N/A",
    });

    const response = await fetch(SUPABASE_URL, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(data),
    });

    console.log("📨 [POST] Response status:", response.status);
    console.log(
      "📨 [POST] Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ [POST] HTTP error:", response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log("✅ [POST] Success response:", result);
    return result;
  } catch (error) {
    console.error("❌ [POST] Request failed:", error);
    throw error;
  }
}

// New function to sync using POST requests via background script
export async function syncConversationWithPostRequest(): Promise<void> {
  try {
    console.log("🔄 [POST-SYNC] Starting POST-based sync...");

    const conversationData = parseChatGPTFromDOM();

    if (!conversationData || conversationData.messages.length === 0) {
      console.warn("⚠️ [POST-SYNC] No conversation data found");
      return;
    }

    console.log(
      `📊 [POST-SYNC] Found ${conversationData.messages.length} messages`
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

    console.log(`📊 [POST-SYNC] Messages to sync: ${messagesToSync.length}`);

    if (messagesToSync.length > 0) {
      let successCount = 0;
      let errorCount = 0;

      // Send each message individually via background script
      for (let i = 0; i < messagesToSync.length; i++) {
        const message = messagesToSync[i];
        console.log(
          `📤 [POST-SYNC] Sending message ${i + 1}/${messagesToSync.length}:`,
          {
            role: message.role,
            message_id: message.message_id,
            contentLength: message.content.length,
            contentPreview: message.content.substring(0, 50) + "...",
          }
        );

        try {
          // Send to background script via ISOLATED world
          const messageToSend = {
            type: "CHATGPT_POST_REQUEST",
            payload: {
              action: "postToSupabase",
              data: message,
            },
          };

          console.log(
            "📤 [POST-SYNC] Sending to ISOLATED world:",
            messageToSend
          );
          window.postMessage(messageToSend, "*");

          // Note: We can't get the response directly from MAIN world
          // The background script will handle the POST request
          successCount++;
          console.log(
            `✅ [POST-SYNC] Message ${i + 1} sent to background script`
          );
        } catch (error) {
          errorCount++;
          console.error(`❌ [POST-SYNC] Message ${i + 1} failed:`, error);
        }

        // Add a small delay between requests
        if (i < messagesToSync.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      console.log(`\n📊 [POST-SYNC] Sync Summary:`);
      console.log(`✅ Sent to background: ${successCount}`);
      console.log(`❌ Failed: ${errorCount}`);
      console.log(`📊 Total: ${messagesToSync.length}`);

      if (successCount === messagesToSync.length) {
        console.log(
          `🎉 [POST-SYNC] All ${messagesToSync.length} messages sent to background script!`
        );
        console.log(
          "📤 [POST-SYNC] Check background script logs for POST results"
        );
      } else if (successCount > 0) {
        console.log(
          `⚠️ [POST-SYNC] Partial send: ${successCount}/${messagesToSync.length} messages sent`
        );
      } else {
        console.error(
          `💥 [POST-SYNC] Send failed: 0/${messagesToSync.length} messages sent`
        );
      }
    } else {
      console.warn("⚠️ [POST-SYNC] No messages to sync after filtering");
    }
  } catch (error) {
    console.error("❌ [POST-SYNC] Error in POST-based sync:", error);
  }
}
