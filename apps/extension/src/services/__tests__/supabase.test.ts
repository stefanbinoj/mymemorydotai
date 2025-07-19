import { describe, it, expect, vi, beforeEach } from "vitest";
import { SupabaseService, type ChatMessage } from "../supabase";

// Mock the Supabase client
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(),
      insert: vi.fn(),
      upsert: vi.fn(),
      eq: vi.fn(),
      limit: vi.fn(),
      order: vi.fn(),
    })),
  })),
}));

// Mock environment variables
vi.mock("import.meta.env", () => ({
  WXT_APP_SUPABASE_URL: "https://test.supabase.co",
  WXT_APP_SUPABASE_ANON_KEY: "test-key",
}));

describe("SupabaseService", () => {
  let service: SupabaseService;
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock the client methods
    mockClient = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      })),
    };

    // Create service instance
    service = new SupabaseService();
    (service as any).client = mockClient;
    (service as any).isInitialized = true;
  });

  describe("testConnection", () => {
    it("should return success when connection test passes", async () => {
      // Mock successful connection test
      const mockQuery = {
        select: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      mockClient.from.mockReturnValue(mockQuery);

      const result = await service.testConnection();

      expect(result.success).toBe(true);
      expect(result.data?.success).toBe(true);
      expect(mockClient.from).toHaveBeenCalledWith("chat_messages");
    });

    it("should return error when connection test fails", async () => {
      // Mock failed connection test
      const mockError = { message: "Connection failed", code: "PGRST301" };
      const mockQuery = {
        select: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      };
      mockClient.from.mockReturnValue(mockQuery);

      const result = await service.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Connection test failed");
      expect(result.errorCode).toBe("PGRST301");
    });
  });

  describe("insertChatMessages", () => {
    const mockMessage: ChatMessage = {
      conversation_id: "test-conv-123",
      message_id: "test-msg-456",
      role: "user",
      content: "Test message",
      created_at: "2025-01-01T00:00:00.000Z",
    };

    it("should insert single message successfully", async () => {
      // Mock successful insert
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [mockMessage],
          error: null,
        }),
      };
      mockClient.from.mockReturnValue(mockQuery);

      const result = await service.insertChatMessages(mockMessage);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockMessage]);
      expect(mockQuery.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          conversation_id: mockMessage.conversation_id,
          role: mockMessage.role,
          content: mockMessage.content,
        }),
      ]);
    });

    it("should insert multiple messages successfully", async () => {
      const messages = [
        mockMessage,
        { ...mockMessage, message_id: "test-msg-789" },
      ];

      // Mock successful batch insert
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: messages,
          error: null,
        }),
      };
      mockClient.from.mockReturnValue(mockQuery);

      const result = await service.insertChatMessages(messages);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(messages);
      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            conversation_id: mockMessage.conversation_id,
          }),
        ])
      );
    });

    it("should handle insert errors", async () => {
      const mockError = { message: "Insert failed", code: "23505" };
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      };
      mockClient.from.mockReturnValue(mockQuery);

      const result = await service.insertChatMessages(mockMessage);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to insert chat messages");
      expect(result.errorCode).toBe("23505");
    });

    it("should validate required fields", async () => {
      const invalidMessage = { ...mockMessage, conversation_id: "" };

      const result = await service.insertChatMessages(invalidMessage);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to insert chat messages");
    });
  });

  describe("upsertChatMessages", () => {
    const mockMessage: ChatMessage = {
      conversation_id: "test-conv-123",
      message_id: "test-msg-456",
      role: "user",
      content: "Test message",
      created_at: "2025-01-01T00:00:00.000Z",
    };

    it("should upsert message successfully", async () => {
      // Mock successful upsert
      const mockQuery = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [mockMessage],
          error: null,
        }),
      };
      mockClient.from.mockReturnValue(mockQuery);

      const result = await service.upsertChatMessages(mockMessage);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockMessage]);
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            conversation_id: mockMessage.conversation_id,
            role: mockMessage.role,
            content: mockMessage.content,
          }),
        ],
        { onConflict: "conversation_id,message_id" }
      );
    });
  });

  describe("queryChatHistory", () => {
    const mockMessages: ChatMessage[] = [
      {
        conversation_id: "test-conv-123",
        message_id: "test-msg-1",
        role: "user",
        content: "Hello",
        created_at: "2025-01-01T00:00:00.000Z",
      },
      {
        conversation_id: "test-conv-123",
        message_id: "test-msg-2",
        role: "assistant",
        content: "Hi there!",
        created_at: "2025-01-01T00:01:00.000Z",
      },
    ];

    it("should query chat history successfully", async () => {
      // Mock successful query
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockMessages,
          error: null,
        }),
      };
      mockClient.from.mockReturnValue(mockQuery);

      const result = await service.queryChatHistory("test-conv-123");

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockMessages);
      expect(mockQuery.eq).toHaveBeenCalledWith(
        "conversation_id",
        "test-conv-123"
      );
      expect(mockQuery.order).toHaveBeenCalledWith("created_at", {
        ascending: true,
      });
    });

    it("should apply query options", async () => {
      // Mock query with options
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockMessages.slice(0, 1),
          error: null,
        }),
      };
      mockClient.from.mockReturnValue(mockQuery);

      const result = await service.queryChatHistory("test-conv-123", {
        limit: 1,
        orderBy: "created_at",
        ascending: false,
      });

      expect(result.success).toBe(true);
      expect(mockQuery.limit).toHaveBeenCalledWith(1);
      expect(mockQuery.order).toHaveBeenCalledWith("created_at", {
        ascending: false,
      });
    });

    it("should handle missing conversation ID", async () => {
      const result = await service.queryChatHistory("");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to query chat history");
    });
  });
});
