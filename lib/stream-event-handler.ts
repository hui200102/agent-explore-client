/**
 * Stream Event Handler - 重新设计的事件处理系统
 * 
 * 设计原则：
 * 1. 清晰的事件分类和处理
 * 2. 不可变状态更新
 * 3. 完整的错误处理
 * 4. 详细的日志记录
 */

import type { 
  StreamEvent, 
  Message, 
  ContentBlock,
  PendingTask
} from "./api-client"

interface ToolCallState {
  toolName?: string
  status?: string
}

// ==================== 工具函数 ====================

/**
 * 创建新的内容块ID
 */
function generateContentId(): string {
  return `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 按sequence排序内容块
 */
function sortContentBlocks(blocks: ContentBlock[]): ContentBlock[] {
  return [...blocks].sort((a, b) => {
    const seqA = a.sequence ?? Infinity
    const seqB = b.sequence ?? Infinity
    return seqA - seqB
  })
}

/**
 * 查找最后一个纯文本块（用于追加text_delta）
 */
function findLastPureTextBlock(blocks: ContentBlock[]): number {
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i]
    // 纯文本块：content_type是text，没有metadata.phase，不是占位符
    if (
      block.content_type === "text" && 
      !block.metadata?.phase && 
      !block.is_placeholder
    ) {
      return i
    }
  }
  return -1
}

/**
 * 从payload创建ContentBlock
 */
function createContentBlockFromPayload(payload: Record<string, unknown>): ContentBlock {
  const now = new Date().toISOString()
  
  const block: ContentBlock = {
    content_id: (payload.content_id as string) || generateContentId(),
    content_type: (payload.content_type as ContentBlock['content_type']) || 'text',
    sequence: (payload.sequence as number) ?? 0,
    is_placeholder: (payload.is_placeholder as boolean) ?? false,
    created_at: now,
    updated_at: now,
  }

  // 添加可选字段
  if (payload.task_id) block.task_id = payload.task_id as string
  if (payload.metadata) block.metadata = payload.metadata as Record<string, unknown>
  if (payload.text !== undefined) block.text = payload.text as string
  if (payload.image) block.image = payload.image as ContentBlock['image']
  if (payload.video) block.video = payload.video as ContentBlock['video']
  if (payload.audio) block.audio = payload.audio as ContentBlock['audio']
  if (payload.file) block.file = payload.file as ContentBlock['file']

  return block
}

// ==================== 事件处理器类 ====================

export class StreamEventHandler {
  private messages: Message[]
  private setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void
  private setToolCallState: (state: ToolCallState | null) => void

  constructor(
    messages: Message[],
    setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void,
    setToolCallState: (state: ToolCallState | null) => void
  ) {
    this.messages = messages
    this.setMessages = setMessages
    this.setToolCallState = setToolCallState
  }

  /**
   * 主事件处理入口
   */
  handle(event: StreamEvent): void {
    console.log(`[StreamEvent] ${event.event_type}`, {
      message_id: event.message_id,
      session_id: event.session_id,
      sequence: event.sequence,
      payload_keys: event.payload ? Object.keys(event.payload) : []
    })

    // 路由到具体的处理函数
    const handlers: Record<string, () => void> = {
      'text_delta': () => this.handleTextDelta(event),
      'content_added': () => this.handleContentAdded(event),
      'content_updated': () => this.handleContentUpdated(event),
      'task_started': () => this.handleTaskStarted(event),
      'task_progress': () => this.handleTaskProgress(event),
      'task_completed': () => this.handleTaskCompleted(event),
      'task_failed': () => this.handleTaskFailed(event),
      'tool_call': () => this.handleToolCall(event),
      'tool_result': () => this.handleToolResult(event),
      'error': () => this.handleError(event),
      'message_end': () => this.handleMessageEnd(event),
    }

    const handler = handlers[event.event_type]
    if (handler) {
      try {
        handler()
      } catch (error) {
        console.error(`[StreamEvent] Error handling ${event.event_type}:`, error)
      }
    } else {
      console.warn(`[StreamEvent] Unknown event type: ${event.event_type}`)
    }

    // 清除tool call状态（如果不是tool相关事件）
    if (!event.event_type.includes('tool')) {
      this.setToolCallState(null)
    }
  }

  /**
   * 处理 text_delta 事件
   * 追加文本到最后一个纯文本块
   */
  private handleTextDelta(event: StreamEvent): void {
    const delta = event.payload?.delta as string
    if (!delta) return

    console.log('[TextDelta] Processing delta:', delta.substring(0, 50) + '...')

    this.updateMessage(event.message_id!, (message) => {
      console.log('[TextDelta] Current blocks:', message.content_blocks.map(b => ({
        id: b.content_id,
        type: b.content_type,
        has_phase: !!b.metadata?.phase,
        has_type: !!(b.metadata as Record<string, unknown> | undefined)?.type,
        is_placeholder: b.is_placeholder
      })))
      
      const lastTextIndex = findLastPureTextBlock(message.content_blocks)
      console.log('[TextDelta] Last pure text block index:', lastTextIndex)
      
      if (lastTextIndex !== -1) {
        // 追加到现有文本块
        const updatedBlocks = [...message.content_blocks]
        const block = { ...updatedBlocks[lastTextIndex] }
        const oldLength = block.text?.length || 0
        block.text = (block.text || '') + delta
        block.updated_at = new Date().toISOString()
        updatedBlocks[lastTextIndex] = block
        
        console.log(`[TextDelta] Appended to block ${block.content_id}, length: ${oldLength} -> ${block.text.length}`)
        
        return { ...message, content_blocks: updatedBlocks }
      } else {
        // 创建新的纯文本块
        const newBlock: ContentBlock = {
          content_id: generateContentId(),
          content_type: 'text',
          text: delta,
          sequence: message.content_blocks.length,
          is_placeholder: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        
        console.log(`[TextDelta] Created new text block ${newBlock.content_id}, sequence: ${newBlock.sequence}`)
        console.log('[TextDelta] New block has NO metadata (pure text)')
        
        return {
          ...message,
          content_blocks: [...message.content_blocks, newBlock]
        }
      }
    })
  }

  /**
   * 处理 content_added 事件
   * 添加新的内容块
   */
  private handleContentAdded(event: StreamEvent): void {
    if (!event.payload) return

    console.log('[ContentAdded] Payload:', {
      content_type: event.payload.content_type,
      has_metadata: !!event.payload.metadata,
      metadata: event.payload.metadata
    })

    this.updateMessage(event.message_id!, (message) => {
      const newBlock = createContentBlockFromPayload(event.payload!)
      
      // 如果是占位符且有placeholder文本，设置到text字段
      if (newBlock.is_placeholder && event.payload!.placeholder) {
        newBlock.text = event.payload!.placeholder as string
      }

      // 添加并排序
      const updatedBlocks = sortContentBlocks([...message.content_blocks, newBlock])

      return { ...message, content_blocks: updatedBlocks }
    })
  }

  /**
   * 处理 content_updated 事件
   * 更新现有内容块
   */
  private handleContentUpdated(event: StreamEvent): void {
    if (!event.payload) return

    const contentId = event.payload.content_id as string
    if (!contentId) return

    this.updateMessage(event.message_id!, (message) => {
      const blockIndex = message.content_blocks.findIndex(b => b.content_id === contentId)
      
      if (blockIndex === -1) {
        console.warn(`[ContentUpdated] Block not found: ${contentId}`)
        return message
      }

      const updatedBlocks = [...message.content_blocks]
      const updatedBlock = { ...updatedBlocks[blockIndex] }

      // 更新字段
      updatedBlock.is_placeholder = false
      updatedBlock.updated_at = new Date().toISOString()
      
      if (event.payload.sequence !== undefined) {
        updatedBlock.sequence = event.payload.sequence as number
      }
      if (event.payload.task_id) {
        updatedBlock.task_id = event.payload.task_id as string
      }
      if (event.payload.metadata) {
        updatedBlock.metadata = {
          ...updatedBlock.metadata,
          ...(event.payload.metadata as Record<string, unknown>)
        }
      }
      if (event.payload.text !== undefined) {
        updatedBlock.text = event.payload.text as string
      }
      if (event.payload.image) {
        updatedBlock.image = event.payload.image as ContentBlock['image']
      }
      if (event.payload.video) {
        updatedBlock.video = event.payload.video as ContentBlock['video']
      }
      if (event.payload.audio) {
        updatedBlock.audio = event.payload.audio as ContentBlock['audio']
      }
      if (event.payload.file) {
        updatedBlock.file = event.payload.file as ContentBlock['file']
      }

      updatedBlocks[blockIndex] = updatedBlock

      // 重新排序
      const sortedBlocks = sortContentBlocks(updatedBlocks)

      return { ...message, content_blocks: sortedBlocks }
    })
  }

  /**
   * 处理 task_started 事件
   */
  private handleTaskStarted(event: StreamEvent): void {
    if (!event.payload) return

    this.updateMessage(event.message_id!, (message) => {
      const taskId = event.payload!.task_id as string
      const task: PendingTask = {
        task_id: taskId,
        status: (event.payload!.status as string) || 'pending',
        progress: (event.payload!.progress as number) || 0,
        task_type: event.payload!.task_type as string,
        tool_name: event.payload!.tool_name as string,
        tool_args: event.payload!.tool_args as Record<string, unknown>,
        display_text: event.payload!.display_text as string,
      }

      return {
        ...message,
        pending_tasks: { ...message.pending_tasks, [taskId]: task }
      }
    })
  }

  /**
   * 处理 task_progress 事件
   */
  private handleTaskProgress(event: StreamEvent): void {
    if (!event.payload) return

    const taskId = event.payload.task_id as string
    if (!taskId) return

    this.updateMessage(event.message_id!, (message) => {
      const task = message.pending_tasks[taskId]
      if (!task) return message

      const updatedTask = { ...task }
      if (event.payload!.progress !== undefined) {
        updatedTask.progress = event.payload!.progress as number
      }
      if (event.payload!.status) {
        updatedTask.status = event.payload!.status as string
      }

      return {
        ...message,
        pending_tasks: { ...message.pending_tasks, [taskId]: updatedTask }
      }
    })
  }

  /**
   * 处理 task_completed 事件
   */
  private handleTaskCompleted(event: StreamEvent): void {
    if (!event.payload) return

    const taskId = event.payload.task_id as string
    if (!taskId) return

    this.updateMessage(event.message_id!, (message) => {
      const newPendingTasks = { ...message.pending_tasks }
      delete newPendingTasks[taskId]

      return {
        ...message,
        pending_tasks: newPendingTasks
      }
    })
  }

  /**
   * 处理 task_failed 事件
   */
  private handleTaskFailed(event: StreamEvent): void {
    if (!event.payload) return

    const taskId = event.payload.task_id as string
    if (!taskId) return

    this.updateMessage(event.message_id!, (message) => {
      const newPendingTasks = { ...message.pending_tasks }
      delete newPendingTasks[taskId]

      return {
        ...message,
        pending_tasks: newPendingTasks
      }
    })
  }

  /**
   * 处理 tool_call 事件
   */
  private handleToolCall(event: StreamEvent): void {
    if (!event.payload) return

    const toolName = event.payload.tool_name as string
    this.setToolCallState({
      toolName,
      status: 'calling'
    })
  }

  /**
   * 处理 tool_result 事件
   */
  private handleToolResult(event: StreamEvent): void {
    if (!event.payload) return

    const toolName = event.payload.tool_name as string
    const success = event.payload.success as boolean

    this.setToolCallState({
      toolName,
      status: success ? 'success' : 'failed'
    })

    // 清除状态
    setTimeout(() => this.setToolCallState(null), 2000)
  }

  /**
   * 处理 error 事件
   */
  private handleError(event: StreamEvent): void {
    if (!event.payload) return

    const errorMessage = typeof event.payload.error === 'string' 
      ? event.payload.error 
      : 'Message processing failed'

    console.error('[StreamEvent] Error:', errorMessage, event.payload.details)

    this.updateMessage(event.message_id!, (message) => ({
      ...message,
      is_complete: true,
      pending_tasks: {},
      metadata: {
        ...message.metadata,
        error: errorMessage,
        error_details: event.payload!.details,
        failed_at: new Date().toISOString(),
      }
    }))
  }

  /**
   * 处理 message_end 事件
   * 接收后端发送的最终清洗后的消息状态，完全替换本地状态
   */
  private handleMessageEnd(event: StreamEvent): void {
    this.updateMessage(event.message_id!, (message) => {
      // 如果后端发送了完整的最终消息对象（包含清洗后的 content_blocks）
      if (event.payload?.message) {
        console.log('[StreamEvent] Syncing final message state from backend')
        const finalMessage = event.payload.message as Message
        return {
          ...finalMessage,
          // 确保前端状态标记为完成
          is_complete: true,
          pending_tasks: {} 
        }
      }

      // 降级处理：仅标记完成并清理任务
      if (message.is_complete) return message

      return {
        ...message,
        is_complete: true,
        pending_tasks: {}
      }
    })
  }

  /**
   * 更新指定消息的辅助函数
   */
  private updateMessage(
    messageId: string,
    updater: (message: Message) => Message
  ): void {
    this.setMessages((prevMessages) => {
      const messageIndex = prevMessages.findIndex(m => m.message_id === messageId)

      if (messageIndex === -1) {
        console.warn(`[StreamEvent] Message not found: ${messageId}`)
        return prevMessages
      }

      const newMessages = [...prevMessages]
      const oldMessage = newMessages[messageIndex]
      const updatedMessage = updater({ ...oldMessage })
      
      // 只有真正改变时才更新
      if (oldMessage !== updatedMessage) {
        newMessages[messageIndex] = updatedMessage
        return newMessages
      }

      return prevMessages
    })
  }

  /**
   * 更新messages引用（用于新实例）
   */
  updateMessages(messages: Message[]): void {
    this.messages = messages
  }
}
