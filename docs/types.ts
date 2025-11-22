/**
 * API 类型定义
 * 
 * 注意：每次更新后端 API 时，必须同步更新此文件和 API.md 文档
 */

// ============================================================================
// 基础类型
// ============================================================================

export type MessageRole = "user" | "assistant" | "system" | "agent" | "tool";

export type SessionStatus = "active" | "inactive" | "completed";

export type ContentType = "text" | "image" | "video" | "audio" | "file" | "code" | "markdown" | "html" | "json" | "thinking";

export type TaskStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

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

// ============================================================================
// Content Block 类型
// ============================================================================

export interface ImageContent {
  url?: string;
  data?: string;          // Base64
  format?: string;        // png, jpg, etc. 默认png
  width?: number;
  height?: number;
  alt?: string;
  caption?: string;
  summary?: string;       // AI生成或用户提供的图片内容描述
  metadata?: Record<string, any>;
}

export interface VideoContent {
  url?: string;
  data?: string;          // Base64
  format?: string;        // mp4, webm, etc. 默认mp4
  duration?: number;      // 秒
  width?: number;
  height?: number;
  thumbnail_url?: string;
  title?: string;
  summary?: string;       // AI生成或用户提供的视频内容描述
  metadata?: Record<string, any>;
}

export interface AudioContent {
  url?: string;
  data?: string;          // Base64
  format?: string;        // mp3, wav, etc. 默认mp3
  duration?: number;      // 秒
  sample_rate?: number;
  channels?: number;
  title?: string;
  summary?: string;       // AI生成或用户提供的音频内容描述
  metadata?: Record<string, any>;
}

export interface FileContent {
  name: string;           // 必需
  url?: string;
  data?: string;          // Base64
  size?: number;          // 字节
  mime_type?: string;
  extension?: string;
  description?: string;
  summary?: string;       // AI生成或用户提供的文件内容总结
  metadata?: Record<string, any>;
}

export interface ContentBlock {
  content_id: string;
  content_type: ContentType;
  sequence: number;       // 显示顺序，从1开始
  is_placeholder: boolean;
  
  // 根据 content_type 使用对应字段
  text?: string;
  image?: ImageContent;
  video?: VideoContent;
  audio?: AudioContent;
  file?: FileContent;
  
  task_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// 消息类型
// ============================================================================

export interface Message {
  message_id: string;
  session_id: string;
  role: MessageRole;
  content_blocks: ContentBlock[];
  pending_tasks: Record<string, any>;
  is_complete: boolean;
  parent_message_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// 会话类型
// ============================================================================

export interface Session {
  session_id: string;
  user_id?: string;
  status: SessionStatus;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// API 请求/响应类型 - 会话管理
// ============================================================================

// --- 创建会话 ---
export interface CreateSessionRequest {
  user_id?: string;
  metadata?: Record<string, any>;
}

export interface CreateSessionResponse {
  session_id: string;
  status: string;
  created_at: string;
}

// --- 列出会话 ---
export interface ListSessionsRequest {
  user_id?: string;
  status?: SessionStatus;
  limit?: number;  // 默认50，范围1-200
  offset?: number; // 默认0
}

export interface SessionListResponse {
  sessions: Session[];
  total: number;
  limit: number;
  offset: number;
}

// --- 获取用户会话 ---
export interface GetUserSessionsResponse {
  user_id: string;
  sessions: Session[];
  total: number;
  limit: number;
  offset: number;
}

// --- 更新会话元数据 ---
export interface UpdateSessionMetadataRequest {
  metadata: Record<string, any>;
}

export interface UpdateSessionMetadataResponse {
  session_id: string;
  status: string;
}

// --- 会话统计 ---
export interface SessionStatisticsResponse {
  total: number;
  by_status: Record<string, number>;
  user_id?: string;
}

// --- 关闭会话 ---
export interface CloseSessionResponse {
  session_id: string;
  status: string;
}

// --- 删除会话 ---
export interface DeleteSessionResponse {
  session_id: string;
  status: string;
}

// ============================================================================
// API 请求/响应类型 - 消息管理
// ============================================================================

// --- 发送消息 ---
export interface SendMessageRequest {
  content_blocks: Array<{
    content_type: ContentType;
    text?: string;
    image?: Partial<ImageContent>;
    video?: Partial<VideoContent>;
    audio?: Partial<AudioContent>;
    file?: Partial<FileContent>;
  }>;
  role?: MessageRole;        // 默认user
  parent_message_id?: string;
  metadata?: Record<string, any>;
}

export interface SendMessageResponse {
  message_id: string;
  session_id: string;
  assistant_message_id?: string;  // 仅当role=user时存在
  message: Message;
}

// --- 获取消息列表 ---
export interface GetMessagesRequest {
  limit?: number;   // 默认50，范围1-100
  offset?: number;  // 默认0
}

export interface GetMessagesResponse {
  session_id: string;
  messages: Message[];
  count: number;
}

// --- 获取会话历史 ---
export interface GetConversationHistoryRequest {
  limit?: number;          // 默认50，范围1-200
  include_system?: boolean; // 默认false
}

export interface GetConversationHistoryResponse {
  session_id: string;
  messages: Message[];
  count: number;
}

// --- 搜索消息 ---
export interface SearchMessagesRequest {
  query: string;           // 必需
  session_id?: string;
  limit?: number;          // 默认20，范围1-100
}

export interface SearchMessagesResponse {
  query: string;
  session_id?: string;
  messages: Message[];
  count: number;
}

// --- 消息统计 ---
export interface MessageStatisticsResponse {
  total: number;
  by_role: Record<string, number>;
  by_session?: Record<string, number>;
}

// --- 删除会话消息 ---
export interface DeleteSessionMessagesResponse {
  session_id: string;
  deleted_count: number;
  status: string;
}

// ============================================================================
// 流式事件类型
// ============================================================================

export interface StreamEvent {
  event_id: string;
  event_type: StreamEventType;
  message_id: string;
  session_id: string;
  sequence: number;
  payload?: Record<string, any>;
  metadata?: Record<string, any>;
  timestamp: string;
}

// 各种事件的 payload 类型
export interface TextDeltaPayload {
  delta: string;
}

export interface ContentAddedPayload {
  content_id: string;
  content_type: ContentType;
  sequence: number;
  is_placeholder: boolean;
  placeholder?: string;
  task_id?: string;
}

export interface ContentUpdatedPayload {
  content_id: string;
  content_type: ContentType;
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
  status: TaskStatus;
  progress: number;
  started_at: string;
}

export interface TaskProgressPayload {
  task_id: string;
  status: TaskStatus;
  progress: number;
  updated_at: string;
}

export interface TaskCompletedPayload {
  task_id: string;
  status: TaskStatus;
  progress: number;
  content_id?: string;
}

export interface TaskFailedPayload {
  task_id: string;
  status: TaskStatus;
  error: string;
}

// ============================================================================
// 系统接口类型
// ============================================================================

export interface HealthCheckResponse {
  status: string;
  redis: string;
  mongodb?: string;
  timestamp: string;
}

// ============================================================================
// 错误类型
// ============================================================================

export interface ApiError {
  detail: string;
}

// ============================================================================
// 辅助类型
// ============================================================================

// SSE 连接选项
export interface SSEOptions {
  onTextDelta?: (payload: TextDeltaPayload) => void;
  onContentAdded?: (payload: ContentAddedPayload) => void;
  onContentUpdated?: (payload: ContentUpdatedPayload) => void;
  onTaskStarted?: (payload: TaskStartedPayload) => void;
  onTaskProgress?: (payload: TaskProgressPayload) => void;
  onTaskCompleted?: (payload: TaskCompletedPayload) => void;
  onTaskFailed?: (payload: TaskFailedPayload) => void;
  onMessageEnd?: () => void;
  onError?: (error: any) => void;
}
