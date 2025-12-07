/**
 * Frontend TypeScript Types for Agent SSE Events
 * 
 * 本文件定义了所有后端 SSE 事件的 TypeScript 类型
 * 可直接复制到前端项目使用
 */

// ============ 基础类型 ============

export type MessageRole = 'user' | 'assistant' | 'system' | 'agent' | 'tool';

export type MessageStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type TaskType = 
  | 'planning'           // 规划任务
  | 'execution_step'     // 执行步骤
  | 'tool_execution'     // 工具执行
  | 'evaluation'         // 评估任务
  | 'reflection';        // 反思任务

export type ContentType = 
  | 'text'               // 文本内容
  | 'image'              // 图片
  | 'audio'              // 音频
  | 'video'              // 视频
  | 'file'               // 文件
  | 'code'               // 代码块
  | 'markdown'           // Markdown 内容
  | 'html'               // HTML 内容
  | 'json'               // JSON 数据
  | 'thinking'           // 思考过程
  | 'plan'               // 计划
  | 'tool_call'          // 工具调用
  | 'tool_output'        // 工具输出
  | 'execution_status'   // 执行状态
  | 'evaluation_result'; // 评估结果

// ============ 内容块 ============

export interface ImageContent {
  url?: string;
  base64?: string;
  format?: string;
  width?: number;
  height?: number;
  size?: number;
}

export interface AudioContent {
  url?: string;
  base64?: string;
  format?: string;
  duration?: number;
  size?: number;
}

export interface VideoContent {
  url?: string;
  format?: string;
  duration?: number;
  width?: number;
  height?: number;
  size?: number;
}

export interface FileContent {
  url?: string;
  filename?: string;
  mime_type?: string;
  size?: number;
}

// ============ 元数据类型 ============

/**
 * 内容块元数据
 */
export interface ContentBlockMetadata {
  phase?: string;           // 阶段（planning, execution, evaluation, reflection）
  type?: string;            // 类型（status, plan, result 等）
  step_index?: number;      // 步骤索引
  tool_call_id?: string;    // 工具调用 ID
  [key: string]: unknown;   // 其他扩展字段
}

/**
 * 工具参数值类型
 */
export type ToolArgValue = 
  | string 
  | number 
  | boolean 
  | null 
  | ToolArgValue[] 
  | { [key: string]: ToolArgValue };

/**
 * 工具参数
 */
export type ToolArgs = Record<string, ToolArgValue>;

export interface ContentBlock {
  content_id: string;
  content_type: ContentType;
  sequence: number;
  is_placeholder: boolean;
  task_id?: string;          // 关联的任务 ID
  created_at: string;
  updated_at: string;
  
  // 内容（根据 content_type）
  text?: string;
  image?: ImageContent;
  audio?: AudioContent;
  video?: VideoContent;
  file?: FileContent;
  
  // 元数据
  metadata?: ContentBlockMetadata;
}

// ============ 任务 ============

/**
 * 任务额外元数据
 */
export interface TaskMetadata {
  step_index?: number;      // 步骤索引
  total_steps?: number;     // 总步骤数
  description?: string;     // 任务描述
  [key: string]: unknown;   // 其他扩展字段
}

export interface Task {
  task_id: string;
  task_type: TaskType;
  display_text: string;
  status: TaskStatus;
  progress: number;          // 0.0 - 1.0
  started_at: string;
  updated_at?: string;
  completed_at?: string;
  error?: string;
  
  // 工具执行任务特有
  tool_name?: string;
  tool_args?: ToolArgs;
  
  // 规划任务特有
  steps?: string[];
  
  // 其他元数据
  metadata?: TaskMetadata;
}

// ============ 消息 ============

/**
 * 消息元数据
 */
export interface MessageMetadata {
  model?: string;           // 使用的模型
  temperature?: number;     // 温度参数
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  error?: {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
  };
  [key: string]: unknown;   // 其他扩展字段
}

export interface Message {
  message_id: string;
  session_id: string;
  role: MessageRole;
  status: MessageStatus;
  is_complete: boolean;
  
  // 内容
  content_blocks: ContentBlock[];
  
  // 任务
  pending_tasks: Record<string, Task>;    // 活跃任务
  completed_tasks: Task[];                 // 已完成任务
  
  // 元数据
  parent_message_id?: string;
  metadata?: MessageMetadata;
  summary?: string;
  
  // 时间戳
  created_at: string;
  updated_at: string;
}

// ============ SSE 事件 ============

export type SSEEventType = 
  | 'task_started'
  | 'task_progress'
  | 'task_completed'
  | 'task_failed'
  | 'message_delta'
  | 'message_stop'
  | 'error';

export interface SSEEventMetadata {
  message_id: string;
  session_id: string;
  sequence: number;          // 事件序列号，确保顺序
}

export interface SSEEvent<T = unknown> {
  event: SSEEventType;
  data: T;
  metadata: SSEEventMetadata;
}

// ============ 任务事件 ============

export interface TaskStartedEvent {
  task_id: string;
  task_type: TaskType;
  display_text: string;
  status: 'pending';
  progress: 0.0;
  started_at: string;
  
  // 可选字段
  tool_name?: string;
  tool_args?: ToolArgs;
  steps?: string[];
  metadata?: TaskMetadata;
}

export interface TaskProgressEvent {
  task_id: string;
  task_type: TaskType;
  status: 'pending' | 'processing';
  progress: number;
  updated_at: string;
  display_text?: string;
  metadata?: TaskMetadata;
}

export interface TaskCompletedEvent {
  task_id: string;
  task_type: TaskType;
  status: 'completed';
  progress: 1.0;
  started_at: string;
  completed_at: string;
  updated_at: string;
  metadata?: TaskMetadata;
}

export interface TaskFailedEvent {
  task_id: string;
  task_type: TaskType;
  status: 'failed';
  progress: number;
  error: string;
  started_at: string;
  completed_at: string;
  metadata?: TaskMetadata;
}

// ============ 内容事件 ============

export interface MessageDeltaNewContent {
  delta: {
    content: ContentBlock;   // 完整内容块
    index: number;           // 内容块索引位置
  };
  content_type: string;
  task_id?: string;          // 关联的任务 ID（如果有）
}

export interface MessageDeltaIncremental {
  delta: {
    content: string;         // 只有增量文本！
  };
  content_type: 'text';
  task_id?: string;
  content_id: string;        // 要追加到哪个块
  checksum?: {
    total_length: number;    // 当前总长度（用于校验）
    delta_length: number;    // 本次增量长度
  };
}

export type MessageDeltaEvent = MessageDeltaNewContent | MessageDeltaIncremental;

export interface MessageStopEvent {
  stop_reason: 'complete' | 'error' | 'cancelled';
  message: Message;          // 完整的消息对象
}

/**
 * 错误详情
 */
export interface ErrorDetails {
  code?: string;            // 错误代码
  type?: string;            // 错误类型
  stack?: string;           // 错误堆栈
  timestamp?: string;       // 错误时间
  [key: string]: unknown;   // 其他扩展字段
}

export interface ErrorEvent {
  error: string;
  details?: ErrorDetails;
}

// ============ 辅助类型守卫 ============

export function isIncrementalDelta(
  event: MessageDeltaEvent
): event is MessageDeltaIncremental {
  return 'content_id' in event;
}

export function isNewContentDelta(
  event: MessageDeltaEvent
): event is MessageDeltaNewContent {
  return 'index' in event.delta;
}

// ============ 任务 ID 常量 ============

export const TASK_IDS = {
  PLANNING: 'planning',
  EVALUATION: 'evaluation',
  REFLECTION: 'reflection',
  
  // 动态生成的 ID 格式
  STEP: (index: number) => `step_${index}`,
  TOOL: (callId: string) => `tool_${callId}`,
} as const;

// ============ 事件处理器类型 ============

export type SSEEventHandler<T = unknown> = (event: SSEEvent<T>) => void;

export interface SSEEventHandlers {
  onTaskStarted?: SSEEventHandler<TaskStartedEvent>;
  onTaskProgress?: SSEEventHandler<TaskProgressEvent>;
  onTaskCompleted?: SSEEventHandler<TaskCompletedEvent>;
  onTaskFailed?: SSEEventHandler<TaskFailedEvent>;
  onMessageDelta?: SSEEventHandler<MessageDeltaEvent>;
  onMessageStop?: SSEEventHandler<MessageStopEvent>;
  onError?: SSEEventHandler<ErrorEvent>;
}

// ============ 前端状态管理 ============

export interface MessageUIState {
  messageId: string;
  sessionId: string;
  
  // 任务管理
  activeTasks: Map<string, Task>;         // 正在执行的任务
  completedTasks: Task[];                 // 已完成任务历史
  
  // 内容管理
  contentBlocks: Map<string, ContentBlock>;  // content_id → ContentBlock
  contentOrder: string[];                    // 内容块顺序（按 index）
  
  // 任务-内容关联
  taskContents: Map<string, string[]>;    // task_id → content_ids[]
  
  // 状态
  isComplete: boolean;
  hasError: boolean;
  errorMessage?: string;
}

// ============ 工具函数 ============

/**
 * 获取任务的所有输出内容
 */
export function getTaskOutputs(
  state: MessageUIState,
  taskId: string
): ContentBlock[] {
  const contentIds = state.taskContents.get(taskId) || [];
  return contentIds
    .map(id => state.contentBlocks.get(id))
    .filter((block): block is ContentBlock => block !== undefined);
}

/**
 * 获取最终输出（无 task_id 的内容）
 */
export function getFinalOutputs(
  state: MessageUIState
): ContentBlock[] {
  return state.contentOrder
    .map(id => state.contentBlocks.get(id))
    .filter((block): block is ContentBlock => 
      block !== undefined && !block.task_id
    );
}

/**
 * 获取纯文本输出
 */
export function getTextContent(
  state: MessageUIState
): string {
  return getFinalOutputs(state)
    .filter(block => block.content_type === 'text')
    .map(block => block.text || '')
    .join('');
}

