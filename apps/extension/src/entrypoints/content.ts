import { supabaseClient } from "@/client/supabase";
import { countTokens } from "@/core/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  conversation_id?: string;
}

export default defineContentScript({
  matches: ["https://chat.openai.com/*", "https://chatgpt.com/*"],
  main() {
    console.log("Token tracker started");

    // Initialize chat history sync
    initializeChatHistorySync();
  },
});

function initializeChatHistorySync() {
  // Intercept fetch requests to ChatGPT API
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const [resource, config] = args;
    const url = typeof resource === "string" ? resource : resource.url;

    // Check if this is a ChatGPT conversation API call
    if (
      url.includes("/backend-api/conversation") ||
      url.includes("/api/conversation")
    ) {
      try {
        const response = await originalFetch.apply(this, args);
        const clonedResponse = response.clone();

        // Handle the request (user message)
        if (config?.method === "POST" && config?.body) {
          await handleChatRequest(config.body, url);
        }

        // Handle the response (assistant message)
        if (response.ok) {
          handleChatResponse(clonedResponse, url);
        }

        return response;
      } catch (error) {
        console.error("Error intercepting ChatGPT API:", error);
        return originalFetch.apply(this, args);
      }
    }

    return originalFetch.apply(this, args);
  };
}

async function handleChatRequest(requestBody: BodyInit, url: string) {
  try {
    const bodyText =
      typeof requestBody === "string"
        ? requestBody
        : await new Response(requestBody).text();
    const requestData = JSON.parse(bodyText);

    // Extract conversation ID from URL or request data
    const conversationId = extractConversationId(url, requestData);

    // Extract user message from request
    if (requestData.messages && Array.isArray(requestData.messages)) {
      const lastMessage = requestData.messages[requestData.messages.length - 1];
      if (lastMessage && lastMessage.role === "user") {
        await syncMessageToSupabase({
          role: "user",
          content: lastMessage.content,
          conversation_id: conversationId,
        });
      }
    }
  } catch (error) {
    console.error("Error handling chat request:", error);
  }
}

async function handleChatResponse(response: Response, url: string) {
  try {
    const responseText = await response.text();

    // ChatGPT responses are often streamed, so we need to handle both regular JSON and SSE format
    if (responseText.includes("data: ")) {
      // Handle Server-Sent Events format
      const lines = responseText.split("\n");
      let assistantMessage = "";
      let conversationId = "";

      for (const line of lines) {
        if (line.startsWith("data: ") && line !== "data: [DONE]") {
          try {
            const data = JSON.parse(line.slice(6));

            // Extract conversation ID
            if (data.conversation_id) {
              conversationId = data.conversation_id;
            }

            // Extract message content
            if (data.message?.content?.parts) {
              assistantMessage = data.message.content.parts.join("");
            }
          } catch (e) {
            // Skip malformed JSON lines
          }
        }
      }

      if (assistantMessage && conversationId) {
        await syncMessageToSupabase({
          role: "assistant",
          content: assistantMessage,
          conversation_id: conversationId,
        });
      }
    } else {
      // Handle regular JSON response
      try {
        const responseData = JSON.parse(responseText);
        const conversationId = extractConversationId(url, responseData);

        if (responseData.message?.content?.parts) {
          const content = responseData.message.content.parts.join("");
          await syncMessageToSupabase({
            role: "assistant",
            content: content,
            conversation_id: conversationId,
          });
        }
      } catch (e) {
        console.error("Error parsing response JSON:", e);
      }
    }
  } catch (error) {
    console.error("Error handling chat response:", error);
  }
}

function extractConversationId(url: string, data: any): string {
  // Try to extract from URL first
  const urlMatch = url.match(/\/conversation\/([^\/\?]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }

  // Try to extract from data
  if (data?.conversation_id) {
    return data.conversation_id;
  }

  // Fallback to current URL path
  const pathMatch = window.location.pathname.match(/\/c\/([^\/]+)/);
  if (pathMatch) {
    return pathMatch[1];
  }

  // Generate a fallback ID based on current session
  return `session_${Date.now()}`;
}

async function syncMessageToSupabase(message: ChatMessage) {
  try {
    const { data, error } = await supabaseClient
      .from("chat_messages")
      .insert([
        {
          conversation_id: message.conversation_id,
          role: message.role,
          content: message.content.trim(),
        },
      ])
      .single();

    if (error) {
      console.error("Error syncing message to Supabase:", error);
    } else {
      console.log("Message synced successfully:", data);
    }
  } catch (error) {
    console.error("Error syncing message to Supabase:", error);
  }
}
