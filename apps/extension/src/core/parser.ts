export interface ParsedMessage {
  role: "user" | "assistant";
  content: string;
  create_time: number;
}

export interface ParsedConversation {
  conversation_id: string;
  userMessages: string[];
  assistantMessages: string[];
  allMessages: ParsedMessage[];
}

export function parseChatGPTResponse(resp: any): ParsedConversation | null {
  try {
    // 1. Parse your response (if it's still a string)
    const data = typeof resp === "string" ? JSON.parse(resp) : resp;

    // 2. Grab the conversation ID
    const conversationId = data.conversation_id;

    if (!conversationId || !data.mapping) {
      return null;
    }

    // 3. Flatten out all the "message" nodes in your `mapping`
    const allMessages = Object.values(data.mapping)
      .map((node: any) => node.message)
      .filter((msg: any) => msg && msg.content.content_type === "text");

    // 4. Sort by creation time so they're in chronological order
    allMessages.sort(
      (a: any, b: any) => (a.create_time || 0) - (b.create_time || 0)
    );

    // 5. Separate user vs assistant
    const userMessages = allMessages
      .filter((m: any) => m.author.role === "user")
      .map((m: any) => m.content.parts.join(""));

    const assistantMessages = allMessages
      .filter((m: any) => m.author.role === "assistant")
      .map((m: any) => m.content.parts.join(""));

    // Create structured message array
    const parsedMessages: ParsedMessage[] = allMessages.map((m: any) => ({
      role: m.author.role,
      content: m.content.parts.join(""),
      create_time: m.create_time || 0,
    }));

    console.log("conversation_id:", conversationId);
    console.log("user says:", userMessages);
    console.log("assistant says:", assistantMessages);

    return {
      conversation_id: conversationId,
      userMessages,
      assistantMessages,
      allMessages: parsedMessages,
    };
  } catch (error) {
    console.error("Error parsing ChatGPT response:", error);
    return null;
  }
}
