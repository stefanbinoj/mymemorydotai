import { createClient, SupabaseClient } from "@supabase/supabase-js";

// TypeScript interfaces for all operations and responses
export interface ChatMessage {
  conversation_id: string;
  message_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface SupabaseResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  details?: any;
  retryable?: boolean;
  retryAfter?: number;
}

export interface ConnectionStatus {
  success: boolean;
  message: string;
  tableExists?: boolean;
  sampleData?: any;
}

export interface InsertChatMessagesOptions {
  onConflict?: string;
  returning?: boolean;
}

export interface QueryChatHistoryOptions {
  limit?: number;
  orderBy?: string;
  ascending?: boolean;
}

/**
 * Unified Supabase Service for all database operations
 * Provides consistent error handling and response formatting
 */
export class SupabaseService {
  private client: SupabaseClient;
  private isInitialized: boolean = false;

  constructor() {
    this.client = createClient(
      import.meta.env.WXT_APP_SUPABASE_URL,
      import.meta.env.WXT_APP_SUPABASE_ANON_KEY
    );
    this.validateConfiguration();
  }

  /**
   * Validate Supabase configuration on initialization
   */
  private validateConfiguration(): void {
    const url = import.meta.env.WXT_APP_SUPABASE_URL;
    const key = import.meta.env.WXT_APP_SUPABASE_ANON_KEY;

    if (!url || !key) {
      console.error("❌ [SUPABASE-SERVICE] Missing configuration:", {
        hasUrl: !!url,
        hasKey: !!key,
      });
      throw new Error("Supabase configuration is incomplete");
    }

    console.log("✅ [SUPABASE-SERVICE] Configuration validated:", {
      url: url.substring(0, 30) + "...",
      hasKey: !!key,
    });

    this.isInitialized = true;
  }

  /**
   * Test connection to Supabase and verify table access
   */
  async testConnection(): Promise<SupabaseResponse<ConnectionStatus>> {
    try {
      console.log("🧪 [SUPABASE-SERVICE] Testing connection...");

      if (!this.isInitialized) {
        throw new Error("Service not properly initialized");
      }

      // Test basic connection by checking table count
      const { data, error } = await this.client
        .from("chat_messages")
        .select("count", { count: "exact", head: true });

      if (error) {
        console.error("❌ [SUPABASE-SERVICE] Connection test failed:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });

        return this.formatErrorResponse(error, "Connection test failed");
      }

      // Test table structure by fetching one row
      const { data: sampleData, error: sampleError } = await this.client
        .from("chat_messages")
        .select("*")
        .limit(1);

      if (sampleError) {
        console.warn("⚠️ [SUPABASE-SERVICE] Could not fetch sample data:", {
          message: sampleError.message,
          code: sampleError.code,
        });
      }

      console.log("✅ [SUPABASE-SERVICE] Connection test successful");

      const result: ConnectionStatus = {
        success: true,
        message: "Supabase connection working!",
        tableExists: !error,
        sampleData: sampleData,
      };

      return this.formatSuccessResponse(result);
    } catch (error) {
      console.error("❌ [SUPABASE-SERVICE] Connection test error:", error);
      return this.formatErrorResponse(error, "Connection test failed");
    }
  }

  /**
   * Insert chat messages into the database
   */
  async insertChatMessages(
    messages: ChatMessage | ChatMessage[],
    options: InsertChatMessagesOptions = {}
  ): Promise<SupabaseResponse<ChatMessage[]>> {
    try {
      console.log("💾 [SUPABASE-SERVICE] Inserting chat messages:", {
        isArray: Array.isArray(messages),
        count: Array.isArray(messages) ? messages.length : 1,
        options,
      });

      if (!this.isInitialized) {
        throw new Error("Service not properly initialized");
      }

      // Normalize to array for consistent processing
      const messageArray = Array.isArray(messages) ? messages : [messages];

      // Validate messages
      this.validateChatMessages(messageArray);

      // Prepare insert data with timestamps
      const insertData = messageArray.map((msg) => ({
        ...msg,
        created_at: msg.created_at || new Date().toISOString(),
        message_id:
          msg.message_id ||
          `${msg.conversation_id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      }));

      console.log("💾 [SUPABASE-SERVICE] Prepared insert data:", {
        count: insertData.length,
        sample: insertData[0],
      });

      // Perform insert operation
      let query = this.client.from("chat_messages").insert(insertData);

      if (options.returning !== false) {
        query = query.select();
      }

      const { data, error } = await query;

      if (error) {
        console.error("❌ [SUPABASE-SERVICE] Insert failed:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });

        return this.formatErrorResponse(
          error,
          "Failed to insert chat messages"
        );
      }

      console.log("✅ [SUPABASE-SERVICE] Messages inserted successfully:", {
        insertedCount: data?.length || 0,
      });

      return this.formatSuccessResponse(data || []);
    } catch (error) {
      console.error("❌ [SUPABASE-SERVICE] Insert error:", error);
      return this.formatErrorResponse(error, "Failed to insert chat messages");
    }
  }

  /**
   * Upsert chat messages (insert or update if exists)
   */
  async upsertChatMessages(
    messages: ChatMessage | ChatMessage[],
    onConflict: string = "conversation_id,message_id"
  ): Promise<SupabaseResponse<ChatMessage[]>> {
    try {
      console.log("🔄 [SUPABASE-SERVICE] Upserting chat messages:", {
        isArray: Array.isArray(messages),
        count: Array.isArray(messages) ? messages.length : 1,
        onConflict,
      });

      if (!this.isInitialized) {
        throw new Error("Service not properly initialized");
      }

      // Normalize to array for consistent processing
      const messageArray = Array.isArray(messages) ? messages : [messages];

      // Validate messages
      this.validateChatMessages(messageArray);

      // Prepare upsert data with timestamps
      const upsertData = messageArray.map((msg) => ({
        ...msg,
        created_at: msg.created_at || new Date().toISOString(),
        message_id:
          msg.message_id ||
          `${msg.conversation_id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      }));

      console.log("🔄 [SUPABASE-SERVICE] Prepared upsert data:", {
        count: upsertData.length,
        sample: upsertData[0],
      });

      // Perform upsert operation
      const { data, error } = await this.client
        .from("chat_messages")
        .upsert(upsertData, { onConflict })
        .select();

      if (error) {
        console.error("❌ [SUPABASE-SERVICE] Upsert failed:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });

        return this.formatErrorResponse(
          error,
          "Failed to upsert chat messages"
        );
      }

      console.log("✅ [SUPABASE-SERVICE] Messages upserted successfully:", {
        upsertedCount: data?.length || 0,
      });

      return this.formatSuccessResponse(data || []);
    } catch (error) {
      console.error("❌ [SUPABASE-SERVICE] Upsert error:", error);
      return this.formatErrorResponse(error, "Failed to upsert chat messages");
    }
  }

  /**
   * Query chat history for a specific conversation
   */
  async queryChatHistory(
    conversationId: string,
    options: QueryChatHistoryOptions = {}
  ): Promise<SupabaseResponse<ChatMessage[]>> {
    try {
      console.log("🔍 [SUPABASE-SERVICE] Querying chat history:", {
        conversationId,
        options,
      });

      if (!this.isInitialized) {
        throw new Error("Service not properly initialized");
      }

      if (!conversationId) {
        throw new Error("Conversation ID is required");
      }

      // Build query
      let query = this.client
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId);

      // Apply options
      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.orderBy) {
        query = query.order(options.orderBy, {
          ascending: options.ascending ?? true,
        });
      } else {
        // Default ordering by created_at
        query = query.order("created_at", { ascending: true });
      }

      const { data, error } = await query;

      if (error) {
        console.error("❌ [SUPABASE-SERVICE] Query failed:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });

        return this.formatErrorResponse(error, "Failed to query chat history");
      }

      console.log("✅ [SUPABASE-SERVICE] Chat history retrieved:", {
        messageCount: data?.length || 0,
      });

      return this.formatSuccessResponse(data || []);
    } catch (error) {
      console.error("❌ [SUPABASE-SERVICE] Query error:", error);
      return this.formatErrorResponse(error, "Failed to query chat history");
    }
  }

  /**
   * Validate chat message structure
   */
  private validateChatMessages(messages: ChatMessage[]): void {
    for (const message of messages) {
      if (!message.conversation_id) {
        throw new Error("Missing required field: conversation_id");
      }
      if (!message.role || !["user", "assistant"].includes(message.role)) {
        throw new Error("Invalid or missing role field");
      }
      if (!message.content) {
        throw new Error("Missing required field: content");
      }
    }
  }

  /**
   * Format successful response
   */
  private formatSuccessResponse<T>(data: T): SupabaseResponse<T> {
    return {
      success: true,
      data,
    };
  }

  /**
   * Format error response with consistent structure
   */
  private formatErrorResponse(error: any, message: string): SupabaseResponse {
    const isSupabaseError =
      error && typeof error === "object" && "code" in error;
    const isRetryable = this.isRetryableError(error);

    return {
      success: false,
      error: message,
      errorCode: isSupabaseError ? error.code : undefined,
      details: isSupabaseError
        ? {
            message: error.message,
            details: error.details,
            hint: error.hint,
          }
        : {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          },
      retryable: isRetryable,
      retryAfter: isRetryable ? this.getRetryDelay(error) : undefined,
    };
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;

    // Network errors are typically retryable
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return true;
    }

    // Supabase specific retryable errors
    if (error.code) {
      const retryableCodes = [
        "PGRST301", // Connection timeout
        "PGRST302", // Connection failed
        "23505", // Unique violation (might be retryable with different data)
      ];
      return retryableCodes.includes(error.code);
    }

    // HTTP status codes that are retryable
    if (error.status) {
      const retryableStatuses = [408, 429, 500, 502, 503, 504];
      return retryableStatuses.includes(error.status);
    }

    return false;
  }

  /**
   * Get retry delay based on error type
   */
  private getRetryDelay(error: any): number {
    // Rate limiting - respect Retry-After header if available
    if (error.status === 429) {
      return 60; // Default 60 seconds for rate limiting
    }

    // Server errors - shorter delay
    if (error.status >= 500) {
      return 5; // 5 seconds for server errors
    }

    // Default retry delay
    return 10; // 10 seconds default
  }
}

// Export singleton instance
export const supabaseService = new SupabaseService();
