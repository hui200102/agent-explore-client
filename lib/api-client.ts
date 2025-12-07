/**
 * API Client for Backend
 * Session Management & File Upload
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
  current_message_id?: string | null;
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

// ============= Message Interfaces =============

export interface SessionMessagesResponse {
  session_id: string;
  messages: Message[];
  count: number;
}

export interface Message {
  message_id: string;
  session_id: string;
  role: "user" | "assistant" | "system" | "tool";
  status: "pending" | "processing" | "completed" | "failed";
  is_complete: boolean;
  content_blocks: ContentBlock[];
  pending_tasks: Record<string, Task>;
  completed_tasks: Task[];
  parent_message_id?: string;
  metadata?: Record<string, unknown>;
  summary?: string;
  created_at: string;
  updated_at: string;
}

export type ApiContentType = 
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'file'
  | 'code'
  | 'markdown'
  | 'html'
  | 'json'
  | 'thinking'
  | 'plan'
  | 'tool_call'
  | 'tool_output'
  | 'execution_status'
  | 'evaluation_result';

export interface ContentBlock {
  content_id: string;
  content_type: ApiContentType;
  sequence: number;
  is_placeholder: boolean;
  task_id?: string;
  created_at: string;
  updated_at: string;
  text?: string;
  image?: { url?: string; base64?: string; format?: string; summary?: string; caption?: string };
  audio?: { url?: string; base64?: string; format?: string; summary?: string };
  video?: { url?: string; format?: string; summary?: string };
  file?: { url?: string; filename?: string; mime_type?: string; summary?: string };
  metadata?: Record<string, unknown>;
}

export interface Task {
  task_id: string;
  task_type: string;
  display_text: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  progress: number;
  started_at: string;
  updated_at?: string;
  completed_at?: string;
  error?: string;
  tool_name?: string;
  tool_args?: Record<string, unknown>;
  steps?: string[];
  metadata?: Record<string, unknown>;
}

export interface DeleteSessionResponse {
  session_id: string;
  status: string;
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

// ============= Memory Interfaces =============

export interface Memory {
  memory_id: string;
  session_id: string;
  summary: string;
  type: string;
  category?: string;
  metadata?: Record<string, unknown>;
  importance_score: number;
  tags: string[];
  status: string;
  scope: string;
  created_at: string;
  updated_at: string;
  has_resources: boolean;
}

export interface MemoryQueryRequest {
  query?: string;
  session_id?: string;
  scope?: string;
  type?: string;
  tags?: string[];
  limit?: number;
  offset?: number | string;
  min_score?: number;
  include_global?: boolean;
}

export interface MemorySearchResult {
  memory: Memory;
  score: number;
}

export interface MemoryQueryResponse {
  results: MemorySearchResult[];
  count: number;
  next_cursor?: string;
  has_more?: boolean;
}

export interface UpdateMemoryRequest {
  summary?: string;
  category?: string;
  tags?: string[];
  scope?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateMemoryRequest {
  summary: string;
  scope: string;
  session_id: string;
  type?: string;
  category?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
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
   * Get session messages (history)
   * GET /api/v1/sessions/{session_id}/messages
   */
  async getSessionMessages(
    sessionId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<SessionMessagesResponse> {
    const response = await fetch(
      `${this.agentBaseUrl}/sessions/${sessionId}/messages?limit=${limit}&offset=${offset}`
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to get messages" }));
      throw new Error(error.detail || "Failed to get messages");
    }
    return response.json();
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

  // ============= Memory Management =============

  /**
   * Create a new memory
   * POST /api/v1/memories
   */
  async createMemory(request: CreateMemoryRequest): Promise<{ status: string; memory_id: string }> {
    const response = await fetch(`${this.agentBaseUrl}/memories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to create memory" }));
      throw new Error(error.detail || "Failed to create memory");
    }
    return response.json();
  }

  /**
   * Query memories
   * POST /api/v1/memories/query
   */
  async queryMemories(request: MemoryQueryRequest): Promise<MemoryQueryResponse> {
    const response = await fetch(`${this.agentBaseUrl}/memories/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to query memories" }));
      throw new Error(error.detail || "Failed to query memories");
    }
    return response.json();
  }

  /**
   * Get a single memory
   * GET /api/v1/memories/{memory_id}
   */
  async getMemory(memoryId: string): Promise<Memory> {
    const response = await fetch(`${this.agentBaseUrl}/memories/${memoryId}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to get memory" }));
      throw new Error(error.detail || "Failed to get memory");
    }
    return response.json();
  }

  /**
   * Update a memory
   * PATCH /api/v1/memories/{memory_id}
   */
  async updateMemory(
    memoryId: string,
    updates: UpdateMemoryRequest
  ): Promise<{ status: string; memory_id: string }> {
    const response = await fetch(`${this.agentBaseUrl}/memories/${memoryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to update memory" }));
      throw new Error(error.detail || "Failed to update memory");
    }
    return response.json();
  }

  /**
   * Delete a memory
   * DELETE /api/v1/memories/{memory_id}
   */
  async deleteMemory(memoryId: string): Promise<{ status: string; memory_id: string }> {
    const response = await fetch(`${this.agentBaseUrl}/memories/${memoryId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to delete memory" }));
      throw new Error(error.detail || "Failed to delete memory");
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

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded * 100) / event.total);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (onProgress) onProgress(100);
          resolve();
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed due to network error'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was aborted'));
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.send(file);
    });
  }

  // ============= Asset Analysis =============

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
}

export const apiClient = new ApiClient();
