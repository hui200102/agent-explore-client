/**
 * API Client for Backend
 * Based on API_DOCUMENTATION.md
 */

// ============= Session Interfaces =============

export interface CreateSessionRequest {
  user_id?: string;
  metadata?: Record<string, unknown>;
}

export interface SessionResponse {
  session_id: string;
  status: string;
  created_at: string;
}

export interface Session {
  session_id: string;
  user_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  status: string;
}

export interface DeleteSessionResponse {
  session_id: string;
  status: string;
}

// ============= Message Interfaces =============

export interface SendMessageRequest {
  content: string;
  type?: string;
  metadata?: Record<string, unknown>;
}

export interface SendMessageResponse {
  user_message_id: string;
  assistant_message_id: string;
  session_id: string;
}

export interface Message {
  message_id: string;
  session_id: string;
  role: "user" | "assistant" | "system" | "agent" | "tool";
  text: string;
  content_blocks: ContentBlock[];
  pending_tasks: Record<string, unknown>;
  is_complete: boolean;
  parent_message_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface GetMessagesResponse {
  session_id: string;
  messages: Message[];
  count: number;
}

// ============= Content Block Interfaces =============

export interface ContentBlock {
  content_id: string;
  content_type: "image" | "video" | "audio" | "file";
  is_placeholder?: boolean;
  image?: ImageContent;
  video?: VideoContent;
  audio?: AudioContent;
  file?: FileContent;
}

export interface ImageContent {
  url?: string;
  data?: string; // base64
  caption?: string;
  alt?: string;
  format?: string;
  size?: number;
  width?: number;
  height?: number;
}

export interface VideoContent {
  url?: string;
  data?: string; // base64
  title?: string;
  format?: string;
  size?: number;
  duration?: number;
}

export interface AudioContent {
  url?: string;
  data?: string; // base64
  title?: string;
  format?: string;
  size?: number;
  duration?: number;
}

export interface FileContent {
  url?: string;
  data?: string; // base64
  name?: string;
  mime_type?: string;
  size?: number;
}

// ============= SSE Stream Interfaces =============

export interface StreamEvent {
  event_id: string;
  event_type: "text_delta" | "content_added" | "content_updated" | "task_started" | "task_progress" | "task_completed" | "task_failed" | "message_end";
  message_id: string;
  session_id: string;
  sequence: number;
  payload: Record<string, unknown>;
  timestamp: string;
}

// ============= Health Check Interface =============

export interface HealthResponse {
  status: string;
  redis: string;
  timestamp: string;
}

// ============= API Client =============

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // ============= Session Management =============

  /**
   * Create a new session
   * POST /api/v1/sessions
   */
  async createSession(request: CreateSessionRequest = {}): Promise<SessionResponse> {
    const response = await fetch(`${this.baseUrl}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to create session" }));
      throw new Error(error.detail || "Failed to create session");
    }
    return response.json();
  }

  /**
   * Get session information
   * GET /api/v1/sessions/{session_id}
   */
  async getSession(sessionId: string): Promise<Session> {
    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to get session" }));
      throw new Error(error.detail || "Failed to get session");
    }
    return response.json();
  }

  /**
   * Close a session
   * DELETE /api/v1/sessions/{session_id}
   */
  async deleteSession(sessionId: string): Promise<DeleteSessionResponse> {
    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to delete session" }));
      throw new Error(error.detail || "Failed to delete session");
    }
    return response.json();
  }

  // ============= Message Management =============

  /**
   * Send a message to a session
   * POST /api/v1/sessions/{session_id}/messages
   * Returns user_message_id and assistant_message_id
   */
  async sendMessage(sessionId: string, request: SendMessageRequest): Promise<SendMessageResponse> {
    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to send message" }));
      throw new Error(error.detail || "Failed to send message");
    }
    return response.json();
  }

  /**
   * Get messages in a session
   * GET /api/v1/sessions/{session_id}/messages
   * Returns { session_id, messages[], count }
   */
  async getSessionMessages(
    sessionId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    const response = await fetch(
      `${this.baseUrl}/sessions/${sessionId}/messages?limit=${limit}&offset=${offset}`
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to get messages" }));
      throw new Error(error.detail || "Failed to get messages");
    }
    const data: GetMessagesResponse = await response.json();
    return data.messages;
  }

  /**
   * Get a single message
   * GET /api/v1/messages/{message_id}
   */
  async getMessage(messageId: string): Promise<Message> {
    const response = await fetch(`${this.baseUrl}/messages/${messageId}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to get message" }));
      throw new Error(error.detail || "Failed to get message");
    }
    return response.json();
  }

  /**
   * Get content block details
   * This can be used to fetch full content data when events don't include it
   */
  async getContentBlock(messageId: string, contentId: string): Promise<ContentBlock> {
    const response = await fetch(`${this.baseUrl}/messages/${messageId}/content/${contentId}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to get content" }));
      throw new Error(error.detail || "Failed to get content");
    }
    return response.json();
  }

  // ============= SSE Stream =============

  /**
   * Subscribe to message stream via SSE with auto-reconnect
   * GET /api/v1/sessions/{session_id}/messages/{message_id}/stream
   * 
   * Events: text_delta, content_added, content_updated, task_started, 
   *         task_progress, task_completed, task_failed, message_end
   */
  subscribeToStream(
    sessionId: string,
    messageId: string,
    lastId: string = "0",
    onEvent: (event: StreamEvent) => void,
    onError?: (error: Error) => void,
    onReconnecting?: () => void
  ): () => void {
    let eventSource: EventSource | null = null;
    let messageEnded = false;
    let manualClose = false;
    let reconnectAttempts = 0;
    let lastEventId = lastId;
    const maxReconnectAttempts = 5;
    const baseReconnectDelay = 1000; // 1 second

    const connect = () => {
      const url = `${this.baseUrl}/sessions/${sessionId}/messages/${messageId}/stream?last_id=${lastEventId}`;
      console.log("Connecting to SSE stream:", url, `(attempt ${reconnectAttempts + 1})`);

      eventSource = new EventSource(url);

      // Handle different event types
      const eventTypes = [
        'text_delta',
        'content_added',
        'content_updated',
        'task_started',
        'task_progress',
        'task_completed',
        'task_failed',
        'message_end'
      ];

      const handleEvent = (event: MessageEvent) => {
        try {
          const data: StreamEvent = JSON.parse(event.data);
          
          // Update last event ID for reconnection
          if (data.event_id) {
            lastEventId = data.event_id;
          }
          
          // Reset reconnect attempts on successful event
          reconnectAttempts = 0;
          
          // Track message_end
          if (data.event_type === 'message_end') {
            messageEnded = true;
            console.log("Message completed, connection will close");
          }
          
          onEvent(data);
          
          // Close connection after message_end
          if (messageEnded && eventSource) {
            setTimeout(() => {
              console.log("Closing SSE connection after message_end");
              manualClose = true;
              eventSource?.close();
            }, 100);
          }
        } catch (error) {
          console.error(`Failed to parse event:`, error);
        }
      };

      // Register event listeners
      eventTypes.forEach(eventType => {
        eventSource?.addEventListener(eventType, handleEvent);
      });

      // Fallback for generic messages
      if (eventSource) {
        eventSource.onmessage = handleEvent;
      }

      // Handle errors and reconnection
      if (eventSource) {
        eventSource.onerror = (error) => {
          // If message ended or manually closed, don't reconnect
          if (messageEnded || manualClose) {
            console.log("SSE connection closed (expected)");
            eventSource?.close();
            return;
          }
          
          // Connection error - attempt to reconnect
          console.error("SSE connection error:", error);
          eventSource?.close();
          
          // Check if we should reconnect
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(baseReconnectDelay * Math.pow(2, reconnectAttempts - 1), 30000);
            
            console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})...`);
            
            if (onReconnecting) {
              onReconnecting();
            }
            
            setTimeout(() => {
              connect();
            }, delay);
          } else {
            console.error("Max reconnection attempts reached");
            if (onError) {
              onError(new Error("Connection failed after multiple attempts"));
            }
          }
        };

        eventSource.onopen = () => {
          console.log("SSE connection opened successfully");
          reconnectAttempts = 0; // Reset on successful connection
        };
      }
    };

    // Initial connection
    connect();

    // Return cleanup function
    return () => {
      console.log("Manually closing SSE connection");
      manualClose = true;
      messageEnded = true; // Prevent reconnection
      eventSource?.close();
    };
  }

  // ============= Health Check =============

  /**
   * Check service health
   * GET /api/v1/health
   */
  async checkHealth(): Promise<HealthResponse> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error("Health check failed");
    }
    return response.json();
  }
}

export const apiClient = new ApiClient();
