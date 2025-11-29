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
  user_id?: string | null;
  status: "active" | "inactive" | "completed";
  current_message_id?: string | null;  // 当前消息ID
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at?: string | null;
}

export interface ListSessionsResponse {
  sessions: Session[];
  total: number;
  limit: number;
  offset: number;
}

export interface UpdateSessionMetadataRequest {
  metadata: Record<string, unknown>;
}

export interface SessionStatistics {
  total: number;
  by_status: {
    active?: number;
    completed?: number;
    inactive?: number;
  };
  user_id?: string | null;
}

export interface CloseSessionResponse {
  session_id: string;
  status: string;
}

export interface DeleteSessionResponse {
  session_id: string;
  status: string;
}

// ============= Message Interfaces =============

// Content Block Types for sending messages
export type ContentBlockInput = 
  | TextBlockInput 
  | ImageBlockInput 
  | VideoBlockInput 
  | AudioBlockInput 
  | FileBlockInput;

export interface TextBlockInput {
  content_type: "text";
  text: string;
}

export interface ImageBlockInput {
  content_type: "image";
  image: {
    url?: string;
    data?: string; // Base64
    format?: string;
    alt?: string;
    caption?: string;
    summary?: string;
    width?: number;
    height?: number;
  };
}

export interface VideoBlockInput {
  content_type: "video";
  video: {
    url?: string;
    data?: string; // Base64
    format?: string;
    title?: string;
    summary?: string;
    duration?: number;
    width?: number;
    height?: number;
    thumbnail_url?: string;
  };
}

export interface AudioBlockInput {
  content_type: "audio";
  audio: {
    url?: string;
    data?: string; // Base64
    format?: string;
    title?: string;
    summary?: string;
    duration?: number;
    sample_rate?: number;
    channels?: number;
  };
}

export interface FileBlockInput {
  content_type: "file";
  file: {
    name: string; // Required
    url?: string;
    data?: string; // Base64
    size?: number;
    mime_type?: string;
    extension?: string;
    description?: string;
    summary?: string;
  };
}

export interface SendMessageRequest {
  content_blocks: ContentBlockInput[];
  role?: "user" | "assistant" | "system";
  parent_message_id?: string;
  include_history?: boolean;  // 是否包含历史消息，默认false
  max_history_messages?: number;  // 最大历史消息数，默认10
  metadata?: Record<string, unknown>;
}

export interface SendMessageResponse {
  message_id: string;
  session_id: string;
  assistant_message_id?: string;
  task_id?: string;  // 后台任务ID
  message: Message;
}

export interface Message {
  message_id: string;
  session_id: string;
  role: "user" | "assistant" | "system" | "agent" | "tool";
  content_blocks: ContentBlock[];
  pending_tasks: Record<string, PendingTask>;
  is_complete: boolean;
  sequence_counter: number;  // 事件序列号
  content_sequence: number;  // 内容序列号
  parent_message_id?: string | null;
  metadata?: Record<string, unknown>;
  summary?: string | null;  // 消息摘要
  created_at: string;
  updated_at: string;
}

export interface PendingTask {
  task_id: string;
  tool_name?: string;
  tool_args?: Record<string, unknown>;
  display_text?: string;
  status?: string;
  progress?: number;
  task_type?: string;
  [key: string]: unknown;
}

export interface GetMessagesResponse {
  session_id: string;
  messages: Message[];
  count: number;
}

export interface GetHistoryResponse {
  session_id: string;
  messages: Message[];
  count: number;
}

export interface SearchMessagesResponse {
  query: string;
  session_id?: string | null;
  messages: Message[];
  count: number;
}

export interface MessageStatistics {
  total: number;
  by_role: Record<string, number>;
  by_session?: Record<string, number>;
}

export interface DeleteMessagesResponse {
  session_id: string;
  deleted_count: number;
  status: string;
}

// ============= Content Block Interfaces =============

export interface ContentBlock {
  content_id: string;
  content_type: "text" | "image" | "video" | "audio" | "file" | "code" | "markdown" | "html" | "json" | "thinking" | "plan" | "execution_status" | "evaluation_result";
  sequence: number;
  is_placeholder: boolean;
  text?: string;
  image?: ImageContent;
  video?: VideoContent;
  audio?: AudioContent;
  file?: FileContent;
  task_id?: string;
  metadata?: ContentBlockMetadata;
  created_at: string;
  updated_at: string;
}

export type ContentBlockMetadata = 
  | PlanningMetadata
  | ExecutionMetadata
  | EvaluationMetadata
  | ReflectionMetadata
  | Record<string, unknown>;

export interface PlanningMetadata {
  phase: "planning";
  type: "status" | "plan";
  steps?: string[];
}

export interface ExecutionMetadata {
  phase: "execution";
  type: "status" | "step_progress";
  step?: number;
  total?: number;
}

export interface EvaluationMetadata {
  phase: "evaluation";
  type: "status" | "result";
  status?: "pass" | "fail";
}

export interface ReflectionMetadata {
  phase: "reflection";
  type: "status" | "insight" | "result";
  full_text?: string;
}

export interface ImageContent {
  url?: string;
  data?: string; // base64
  format?: string;
  width?: number;
  height?: number;
  alt?: string;
  caption?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}

export interface VideoContent {
  url?: string;
  data?: string; // base64
  format?: string;
  duration?: number;
  width?: number;
  height?: number;
  thumbnail_url?: string;
  title?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}

export interface AudioContent {
  url?: string;
  data?: string; // base64
  format?: string;
  duration?: number;
  sample_rate?: number;
  channels?: number;
  title?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}

export interface FileContent {
  name: string; // Required
  url?: string;
  data?: string; // base64
  size?: number;
  mime_type?: string;
  extension?: string;
  description?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}

// ============= SSE Stream Interfaces =============

export type StreamEventType =
  | "message_start"
  | "message_end"
  | "text_delta"
  | "text_complete"
  | "content_added"
  | "content_updated"
  | "content_removed"
  | "task_started"
  | "task_progress"
  | "task_completed"
  | "task_failed"
  | "tool_call"
  | "tool_result"
  | "error"
  | "ping";

export interface StreamEvent {
  event_id: string;
  event_type: StreamEventType;
  channel: string;  // 通道名称，如 "message:{message_id}"
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;  // 包含 message_id, session_id, sequence
  timestamp: string;
  sequence: number;  // 事件序列号
  
  // 便捷访问器（从 metadata 中提取）
  message_id?: string;  // 从 metadata.message_id 提取
  session_id?: string;  // 从 metadata.session_id 提取
}

// ============= Stream Event Payload Types =============

export interface TextDeltaPayload {
  delta: string;
}

export interface ContentAddedPayload {
  content_id: string;
  content_type: string;
  sequence: number;
  is_placeholder: boolean;
  placeholder?: string;
  task_id?: string;
  text?: string;
}

export interface ContentUpdatedPayload {
  content_id: string;
  content_type: string;
  sequence: number;
  task_id?: string;
  image?: ImageContent;
  video?: VideoContent;
  audio?: AudioContent;
  file?: FileContent;
  text?: string;
}

export interface TaskStartedPayload {
  task_id: string;
  task_type: string;
  status: string;
  progress: number;
  started_at: string;
}

export interface TaskProgressPayload {
  task_id: string;
  status: string;
  progress: number;
  updated_at: string;
}

export interface TaskCompletedPayload {
  task_id: string;
  status: string;
  progress: number;
  content_id?: string;
}

export interface TaskFailedPayload {
  task_id: string;
  status: string;
  error: string;
}

export interface ToolCallPayload {
  tool_call_id: string;
  tool_name: string;
  tool_args: Record<string, unknown>;
}

export interface ToolResultPayload {
  tool_name: string;
  result: unknown;
  success: boolean;
}

export interface ErrorPayload {
  error: string;
  details?: {
    type?: string;
    traceback?: string;
    [key: string]: unknown;
  };
}

// ============= Task Management Interfaces =============

export type BackgroundTaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled" | "timeout";

export interface TaskResult {
  task_id: string;
  status: BackgroundTaskStatus;
  result?: unknown;
  error?: string;
  started_at: string;
  completed_at?: string;
  duration?: number;  // 秒
}

export interface ListTasksResponse {
  tasks: Record<string, TaskResult>;
  count: number;
}

export interface CancelTaskResponse {
  task_id: string;
  status: string;
}

// ============= File Upload Interfaces =============

export interface UploadRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  folder?: string;
}

export interface PresignedUrlData {
  uploadUrl: string;
  fileUrl: string;
  key: string;
  expiresIn: number;
  method: 'PUT';
}

export interface UploadResponse {
  success: boolean;
  data: PresignedUrlData;
  error?: string;
  maxSize?: number;
  maxSizeMB?: number;
}

// ============= Asset Analysis Interfaces =============

export type AssetType = "image" | "video" | "audio" | "pdf" | "document" | "text" | "code" | "other";

export interface AnalyzeAssetsRequest {
  type: AssetType;
  url: string;
}

export interface AnalyzeAssetsResponse {
  dense_summary: string;  
  keywords: string;
}

// ============= Health Check Interface =============

export interface TaskStatistics {
  total_created: number;
  total_completed: number;
  total_failed: number;
  total_cancelled: number;
  active_tasks: number;
  avg_completion_time?: number;
}

export interface PushStatistics {
  total_connections: number;
  active_connections: number;
  by_channel_type?: Record<string, number>;
}

export interface HealthResponse {
  status: string;
  redis: string;
  mongodb?: string;
  components?: {
    event_bus?: {
      status: string;
    };
    task_manager?: {
      status: string;
      statistics?: TaskStatistics;
    };
    push_manager?: {
      status: string;
      statistics?: PushStatistics;
    };
  };
  timestamp: string;
}

export interface MetricsResponse {
  tasks: TaskStatistics;
  push: PushStatistics;
  timestamp: string;
}

// ============= API Client =============

const AGENT_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";
const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL || "/api";


export class ApiClient {
  private agentBaseUrl: string;
  private backendBaseUrl: string;

  constructor() {
    this.agentBaseUrl = AGENT_API_BASE_URL;
    this.backendBaseUrl = BACKEND_API_BASE_URL;
  }

  // ============= Session Management =============

  /**
   * Create a new session
   * POST /api/v1/sessions
   */
  async createSession(request: CreateSessionRequest = {}): Promise<SessionResponse> {
    const response = await fetch(`${this.agentBaseUrl}/sessions`, {
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
    const response = await fetch(`${this.agentBaseUrl}/sessions/${sessionId}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to get session" }));
      throw new Error(error.detail || "Failed to get session");
    }
    return response.json();
  }

  /**
   * List sessions with filters
   * GET /api/v1/sessions
   */
  async listSessions(params?: {
    user_id?: string;
    status?: "active" | "inactive" | "completed";
    limit?: number;
    offset?: number;
  }): Promise<ListSessionsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.user_id) queryParams.append("user_id", params.user_id);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.limit !== undefined) queryParams.append("limit", params.limit.toString());
    if (params?.offset !== undefined) queryParams.append("offset", params.offset.toString());

    const url = `${this.agentBaseUrl}/sessions${queryParams.toString() ? `?${queryParams}` : ""}`;
    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to list sessions" }));
      throw new Error(error.detail || "Failed to list sessions");
    }
    return response.json();
  }

  /**
   * Get user's sessions
   * GET /api/v1/users/{user_id}/sessions
   */
  async getUserSessions(userId: string, limit: number = 50, offset: number = 0): Promise<ListSessionsResponse> {
    const response = await fetch(
      `${this.agentBaseUrl}/users/${userId}/sessions?limit=${limit}&offset=${offset}`
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to get user sessions" }));
      throw new Error(error.detail || "Failed to get user sessions");
    }
    return response.json();
  }

  /**
   * Close a session
   * POST /api/v1/sessions/{session_id}/close
   */
  async closeSession(sessionId: string): Promise<CloseSessionResponse> {
    const response = await fetch(`${this.agentBaseUrl}/sessions/${sessionId}/close`, {
      method: "POST",
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to close session" }));
      throw new Error(error.detail || "Failed to close session");
    }
    return response.json();
  }

  /**
   * Delete a session
   * DELETE /api/v1/sessions/{session_id}
   */
  async deleteSession(sessionId: string): Promise<DeleteSessionResponse> {
    const response = await fetch(`${this.agentBaseUrl}/sessions/${sessionId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to delete session" }));
      throw new Error(error.detail || "Failed to delete session");
    }
    return response.json();
  }

  /**
   * Update session metadata
   * PATCH /api/v1/sessions/{session_id}/metadata
   */
  async updateSessionMetadata(
    sessionId: string,
    metadata: Record<string, unknown>
  ): Promise<{ session_id: string; status: string }> {
    const response = await fetch(`${this.agentBaseUrl}/sessions/${sessionId}/metadata`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metadata }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to update metadata" }));
      throw new Error(error.detail || "Failed to update metadata");
    }
    return response.json();
  }

  /**
   * Get session statistics
   * GET /api/v1/sessions/statistics
   */
  async getSessionStatistics(userId?: string): Promise<SessionStatistics> {
    const url = userId
      ? `${this.agentBaseUrl}/sessions/statistics?user_id=${userId}`
      : `${this.agentBaseUrl}/sessions/statistics`;
    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to get statistics" }));
      throw new Error(error.detail || "Failed to get statistics");
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
    const response = await fetch(`${this.agentBaseUrl}/sessions/${sessionId}/messages`, {
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
      `${this.agentBaseUrl}/sessions/${sessionId}/messages?limit=${limit}&offset=${offset}`
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
    const response = await fetch(`${this.agentBaseUrl}/messages/${messageId}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to get message" }));
      throw new Error(error.detail || "Failed to get message");
    }
    return response.json();
  }


  /**
   * Get conversation history
   * GET /api/v1/sessions/{session_id}/history
   */
  async getConversationHistory(
    sessionId: string,
    limit: number = 50,
    includeSystem: boolean = false
  ): Promise<GetHistoryResponse> {
    const response = await fetch(
      `${this.agentBaseUrl}/sessions/${sessionId}/history?limit=${limit}&include_system=${includeSystem}`
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to get history" }));
      throw new Error(error.detail || "Failed to get history");
    }
    return response.json();
  }

  /**
   * Search messages
   * GET /api/v1/messages/search
   */
  async searchMessages(
    query: string,
    sessionId?: string,
    limit: number = 20
  ): Promise<SearchMessagesResponse> {
    const params = new URLSearchParams({ query, limit: limit.toString() });
    if (sessionId) params.append("session_id", sessionId);

    const response = await fetch(`${this.agentBaseUrl}/messages/search?${params}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to search messages" }));
      throw new Error(error.detail || "Failed to search messages");
    }
    return response.json();
  }

  /**
   * Get message statistics
   * GET /api/v1/messages/statistics
   */
  async getMessageStatistics(sessionId?: string): Promise<MessageStatistics> {
    const url = sessionId
      ? `${this.agentBaseUrl}/messages/statistics?session_id=${sessionId}`
      : `${this.agentBaseUrl}/messages/statistics`;
    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to get statistics" }));
      throw new Error(error.detail || "Failed to get statistics");
    }
    return response.json();
  }

  /**
   * Delete all messages in a session
   * DELETE /api/v1/sessions/{session_id}/messages
   */
  async deleteSessionMessages(sessionId: string): Promise<DeleteMessagesResponse> {
    const response = await fetch(`${this.agentBaseUrl}/sessions/${sessionId}/messages`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to delete messages" }));
      throw new Error(error.detail || "Failed to delete messages");
    }
    return response.json();
  }

  // ============= Task Management =============

  /**
   * Get task status
   * GET /api/v1/tasks/{task_id}
   */
  async getTaskStatus(taskId: string): Promise<TaskResult> {
    const response = await fetch(`${this.agentBaseUrl}/tasks/${taskId}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to get task status" }));
      throw new Error(error.detail || "Failed to get task status");
    }
    return response.json();
  }

  /**
   * Cancel a task
   * POST /api/v1/tasks/{task_id}/cancel
   */
  async cancelTask(taskId: string): Promise<CancelTaskResponse> {
    const response = await fetch(`${this.agentBaseUrl}/tasks/${taskId}/cancel`, {
      method: "POST",
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to cancel task" }));
      throw new Error(error.detail || "Failed to cancel task");
    }
    return response.json();
  }

  /**
   * List all tasks
   * GET /api/v1/tasks
   */
  async listTasks(): Promise<ListTasksResponse> {
    const response = await fetch(`${this.agentBaseUrl}/tasks`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to list tasks" }));
      throw new Error(error.detail || "Failed to list tasks");
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
      const url = `${this.agentBaseUrl}/sessions/${sessionId}/messages/${messageId}/stream?last_id=${lastEventId}`;
      console.log("Connecting to SSE stream:", url, `(attempt ${reconnectAttempts + 1})`);

      eventSource = new EventSource(url);

      // Handle different event types
      const eventTypes = [
        'text_delta',
        'content_added',
        'content_updated',
        'tool_call',
        'tool_result',
        'task_started',
        'task_progress',
        'task_completed',
        'task_failed',
        'error',
        'message_end'
      ];

      const handleEvent = (event: MessageEvent) => {
        try {
          // Check if data exists and is not empty
          if (!event.data || event.data === '') {
            console.debug('Received event without data, ignoring');
            return;
          }
          
          // Handle ping/pong heartbeat (plain text, not JSON)
          if (event.data === 'ping' || event.data === 'pong') {
            return;
          }
          
          // Try to parse as JSON
          let data: StreamEvent;
          try {
            data = JSON.parse(event.data);
          } catch (parseError) {
            console.warn('Failed to parse event data as JSON:', event.data, parseError);
            return;
          }
          
          // Validate that we have a proper StreamEvent
          if (!data.event_type || !data.event_id) {
            console.warn('Invalid StreamEvent format:', data);
            return;
          }
          
          // Extract message_id and session_id from metadata for convenience
          if (data.metadata) {
            data.message_id = data.metadata.message_id as string;
            data.session_id = data.metadata.session_id as string;
          }
          
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
          console.error('Error in handleEvent:', error, 'event.data:', event.data);
        }
      };

      // Register event listeners
      eventTypes.forEach(eventType => {
        eventSource?.addEventListener(eventType, handleEvent);
      });

      // Note: We don't use onmessage because it would cause duplicate event processing
      // All events are handled by the specific addEventListener calls above

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

  // ============= File Upload =============

  /**
   * Get presigned upload URL from backend
   * POST /api/upload
   */
  async getPresignedUploadUrl(request: UploadRequest): Promise<PresignedUrlData> {
    const response = await fetch(`${this.backendBaseUrl}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const error: UploadResponse = await response.json().catch(() => ({ 
        success: false,
        data: {} as PresignedUrlData,
        error: "Failed to get upload URL" 
      }));
      
      // Handle specific error cases
      if (error.error) {
        throw new Error(error.error);
      }
      throw new Error("Failed to get upload URL");
    }
    
    const result: UploadResponse = await response.json();
    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to get upload URL");
    }
    
    return result.data;
  }

  /**
   * Upload file using resumable upload with progress tracking
   */
  async uploadFileWithProgress(
    file: File,
    uploadUrl: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded * 100) / event.total);
          onProgress(progress);
        }
      });

      // Handle successful upload
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (onProgress) onProgress(100);
          resolve();
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      // Handle network errors
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed due to network error'));
      });

      // Handle aborted uploads
      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was aborted'));
      });

      // Start upload
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.send(file);
    });
  }

  /**
   * Analyze uploaded asset (image, video, audio, etc.)
   * POST /api/v1/analyze-assets
   */
  async analyzeAsset(request: AnalyzeAssetsRequest): Promise<AnalyzeAssetsResponse> {
    const response = await fetch(`${this.agentBaseUrl}/analyze-assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to analyze asset" }));
      throw new Error(error.detail || "Failed to analyze asset");
    }

    return response.json();
  }

  // ============= Health Check & Metrics =============

  /**
   * Check service health
   * GET /api/v1/health
   */
  async checkHealth(): Promise<HealthResponse> {
    const response = await fetch(`${this.agentBaseUrl}/health`);
    if (!response.ok) {
      throw new Error("Health check failed");
    }
    return response.json();
  }

  /**
   * Get system metrics
   * GET /api/v1/metrics
   */
  async getMetrics(): Promise<MetricsResponse> {
    const response = await fetch(`${this.agentBaseUrl}/metrics`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to get metrics" }));
      throw new Error(error.detail || "Failed to get metrics");
    }
    return response.json();
  }

  /**
   * Get comprehensive statistics
   * GET /api/v1/statistics
   */
  async getStatistics(userId?: string): Promise<unknown> {
    const url = userId
      ? `${this.agentBaseUrl}/statistics?user_id=${userId}`
      : `${this.agentBaseUrl}/statistics`;
    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to get statistics" }));
      throw new Error(error.detail || "Failed to get statistics");
    }
    return response.json();
  }
}

export const apiClient = new ApiClient();
