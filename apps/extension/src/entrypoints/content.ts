import { supabaseClient } from "@/client/supabase";
import { parseChatGPTResponse } from "@/core/parser";

export default defineContentScript({
  matches: ["https://chat.openai.com/*", "https://chatgpt.com/*"],
  main() {
    console.log("Token tracker started");

    // Initialize chat history sync by monitoring network requests
    initializeChatHistoryMonitor();
  },
});

function initializeChatHistoryMonitor() {
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const [resource] = args;
    console.log("[resources] : \n", resource);
    const url =
      typeof resource === "string" ? resource : (resource as Request).url;

    console.log("[url] : \n", url);
    // Only monitor GET requests to past conversation history
    if (
      url.includes("chatgpt.com/backend-api/conversation/") &&
      url.match(/\/conversation\/[a-f0-9-]+$/)
    ) {
      try {
        const response = await originalFetch.apply(this, args);
        console.log("[response] : \n", response);

        if (response.ok) {
          // Wait a bit and then process the response
          setTimeout(async () => {
            const clonedResponse = response.clone();
            await processChatHistoryResponse(clonedResponse);
          }, 100);
        }

        return response;
      } catch (error) {
        console.error("Error monitoring chat history request:", error);
        return originalFetch.apply(this, args);
      }
    }

    return originalFetch.apply(this, args);
  };
}

async function processChatHistoryResponse(response: Response) {
  try {
    const responseData = await response.json();

    // Use the modular parser to extract conversation data
    const parsedConversation = parseChatGPTResponse(responseData);

    if (!parsedConversation) {
      console.log("No valid conversation data found");
      return;
    }

    // Sync all messages to Supabase
    for (const message of parsedConversation.allMessages) {
      if (message.content.trim()) {
        await syncMessageToSupabase({
          conversation_id: parsedConversation.conversation_id,
          role: message.role,
          content: message.content.trim(),
        });
      }
    }

    console.log(
      `Synced ${parsedConversation.allMessages.length} messages for conversation ${parsedConversation.conversation_id}`
    );
  } catch (error) {
    console.error("Error processing chat history response:", error);
  }
}

async function syncMessageToSupabase(message: {
  conversation_id: string;
  role: string;
  content: string;
}) {
  try {
    const { data, error } = await supabaseClient
      .from("chat_messages")
      .insert([
        {
          conversation_id: message.conversation_id,
          role: message.role,
          content: message.content,
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
