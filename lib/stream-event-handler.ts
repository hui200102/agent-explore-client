/**
 * Stream Event Handler - OpenAI 风格 + 数据完整性保证
 * 
 * 核心特性：
 * 1. OpenAI 风格的统一事件处理
 * 2. 序列号校验和断点续传
 * 3. 数据完整性保证
 * 4. 不可变状态更新
 */

import type { 
  StreamEvent, 
  Message, 
  ContentBlock
} from "./api-client"

interface ToolCallState {
  toolName?: string
  status?: string
}

interface DataIntegrityState {
  expectedSequence: number  // 期望的下一个序列号
  totalTextLength: number   // 当前文本总长度
  missingSequences: number[] // 丢失的序列号
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
  private integrityState: Map<string, DataIntegrityState> = new Map()  // 每个消息的完整性状态

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
   * 获取或初始化消息的完整性状态
   */
  private getIntegrityState(messageId: string): DataIntegrityState {
    if (!this.integrityState.has(messageId)) {
      this.integrityState.set(messageId, {
        expectedSequence: 1,
        totalTextLength: 0,
        missingSequences: []
      })
    }
    return this.integrityState.get(messageId)!
  }

  /**
   * 校验序列号连续性
   */
  private checkSequence(messageId: string, sequence: number): boolean {
    const state = this.getIntegrityState(messageId)
    
    if (sequence === state.expectedSequence) {
      // 序列号正确
      state.expectedSequence = sequence + 1
      return true
    } else if (sequence > state.expectedSequence) {
      // 检测到丢失的序列号
      for (let i = state.expectedSequence; i < sequence; i++) {
        state.missingSequences.push(i)
      }
      console.warn(`[DataIntegrity] Missing sequences for ${messageId}:`, state.missingSequences)
      state.expectedSequence = sequence + 1
      return false
    } else {
      // 收到重复的序列号（可能是重连后的重放）
      console.log(`[DataIntegrity] Duplicate sequence ${sequence} for ${messageId}`)
      return false
    }
  }

  /**
   * 校验文本长度
   */
  private checkTextLength(messageId: string, expectedLength: number, actualLength: number): boolean {
    if (expectedLength !== actualLength) {
      console.error(`[DataIntegrity] Text length mismatch for ${messageId}:`, {
        expected: expectedLength,
        actual: actualLength,
        diff: expectedLength - actualLength
      })
      return false
    }
    return true
  }

  /**
   * 主事件处理入口 - OpenAI 风格 + 数据完整性
   */
  handle(event: StreamEvent): void {
    // 从 metadata 中获取 message_id（后端发送的格式）
    const messageId = event.metadata?.message_id as string | undefined
    const sequence = event.sequence
    
    console.log(`[StreamEvent] ${event.event_type}`, {
      message_id: messageId,
      session_id: event.metadata?.session_id,
      sequence: sequence,
      payload_keys: event.payload ? Object.keys(event.payload) : []
    })

    if (messageId && sequence !== undefined && sequence !== null) {
      const isValid = this.checkSequence(messageId, sequence)
      if (!isValid) {
        const state = this.getIntegrityState(messageId)
        if (state.missingSequences.length > 5) {
          console.error(`[DataIntegrity] Too many missing sequences, triggering reconnect`)
          this.triggerReconnect(messageId, state.expectedSequence - 1)
        }
      }
    }

    const handlers: Record<string, () => void> = {
      'message_delta': () => this.handleMessageDelta(event, messageId!),
      'message_stop': () => this.handleMessageStop(event, messageId!),
      'error': () => this.handleError(event, messageId!),
      
      'task_started': () => this.handleTaskStarted(event, messageId!),
      'task_progress': () => this.handleTaskProgress(event, messageId!),
      'task_completed': () => this.handleTaskCompleted(event, messageId!),
      'task_failed': () => this.handleTaskFailed(event, messageId!),
    }
    
    const handler = handlers[event.event_type]
    if (handler && messageId) {
      try {
        handler()
      } catch (error) {
        console.error(`[StreamEvent] Error handling ${event.event_type}:`, error)
      }
    } else if (!messageId) {
      console.warn(`[StreamEvent] No message_id found in event metadata`)
    } else {
      console.warn(`[StreamEvent] Unknown event type: ${event.event_type}`)
    }

    // 清除tool call状态（如果不是tool相关事件）
    if (!event.event_type.includes('tool') && !event.event_type.includes('task')) {
      this.setToolCallState(null)
    }
  }

  /**
   * 处理 task_started 事件
   */
  private handleTaskStarted(event: StreamEvent, messageId: string): void {
    if (!event.payload) return

    const taskData = event.payload as Record<string, unknown>
    const taskId = taskData.task_id as string
    
    console.log(`[TaskStarted] Task ${taskId} started`, taskData)
    
    this.updateMessage(messageId, (message) => ({
      ...message,
      pending_tasks: {
        ...message.pending_tasks,
        [taskId]: {
          task_id: taskId,
          task_type: taskData.task_type as string,
          status: taskData.status as string,
          progress: (taskData.progress as number) || 0,
          display_text: (taskData.display_text as string) || `Processing ${taskData.task_type}...`,
          started_at: taskData.started_at,
          // 保留其他字段
          ...taskData
        }
      }
    }))
  }

  /**
   * 处理 task_progress 事件
   */
  private handleTaskProgress(event: StreamEvent, messageId: string): void {
    if (!event.payload) return

    const taskData = event.payload as Record<string, unknown>
    const taskId = taskData.task_id as string
    
    this.updateMessage(messageId, (message) => {
      const existingTask = message.pending_tasks[taskId]
      if (!existingTask) return message

      return {
        ...message,
        pending_tasks: {
          ...message.pending_tasks,
          [taskId]: {
            ...existingTask,
            status: (taskData.status as string) || existingTask.status,
            progress: (taskData.progress as number) ?? existingTask.progress,
            updated_at: taskData.updated_at || new Date().toISOString()
          }
        }
      }
    })
  }

  /**
   * 处理 task_completed 事件
   */
  private handleTaskCompleted(event: StreamEvent, messageId: string): void {
    if (!event.payload) return

    const taskData = event.payload as Record<string, unknown>
    const taskId = taskData.task_id as string
    
    console.log(`[TaskCompleted] Task ${taskId} completed`, taskData)

    this.updateMessage(messageId, (message) => {
      const existingTask = message.pending_tasks[taskId]
      if (!existingTask) {
        return message
      }

      const completedTask = {
        ...existingTask,
        ...taskData,
        status: 'completed' as const, // 显式指定类型
        progress: 100,
        completed_at: new Date().toISOString()
      }

      // 移除 pending，添加到 completed
      const newPendingTasks = { ...message.pending_tasks }
      delete newPendingTasks[taskId]

      return {
        ...message,
        pending_tasks: newPendingTasks,
        completed_tasks: [
          ...(message.completed_tasks || []),
          completedTask
        ]
      }
    })
  }

  /**
   * 处理 task_failed 事件
   */
  private handleTaskFailed(event: StreamEvent, messageId: string): void {
    if (!event.payload) return

    const taskData = event.payload as Record<string, unknown>
    const taskId = taskData.task_id as string
    
    console.error(`[TaskFailed] Task ${taskId} failed`, taskData)

    this.updateMessage(messageId, (message) => {
      const existingTask = message.pending_tasks[taskId]
      if (!existingTask) return message

      // 构建失败的任务对象
      const failedTask = {
        ...existingTask,
        ...taskData,
        status: 'failed' as const, // 显式指定类型
        error: (taskData.error as string) || 'Task failed',
        completed_at: new Date().toISOString()
      }

      // 移除 pending，添加到 completed
      const newPendingTasks = { ...message.pending_tasks }
      delete newPendingTasks[taskId]

      return {
        ...message,
        pending_tasks: newPendingTasks,
        completed_tasks: [
          ...(message.completed_tasks || []),
          failedTask
        ]
      }
    })
  }

  /**
   * 触发重连（由外部组件实现）
   */
  private triggerReconnect(messageId: string, lastSequence: number): void {
    // 发送自定义事件，通知外部组件需要重连
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sse-reconnect', {
        detail: { messageId, lastSequence }
      }))
    }
  }

  /**
   * 处理 message_delta 事件（OpenAI 风格 + 数据完整性）
   * 统一的增量更新事件，支持：
   * 1. 文本增量 (content)
   * 2. 内容块增量 (content + index)
   * 3. 工具调用 (tool_calls) - OpenAI 风格
   */
  private handleMessageDelta(event: StreamEvent, messageId: string): void {
    if (!event.payload) return

    const delta = event.payload.delta as Record<string, unknown> | undefined
    if (!delta) return

    console.log('[MessageDelta] Processing delta:', {
      content_type: event.payload.content_type,
      has_content: !!delta.content,
      has_tool_calls: !!delta.tool_calls,
      has_checksum: !!event.payload.checksum
    })

    // ============ 1. 处理工具调用（OpenAI 风格） ============
    if (delta.tool_calls) {
      this.handleToolCallsInDelta(messageId, delta.tool_calls as Array<Record<string, unknown>>)
      return
    }

    // ============ 2. 数据完整性校验（针对文本） ============
    if (event.payload.content_type === 'text' && event.payload.checksum) {
      const checksum = event.payload.checksum as { total_length: number; delta_length: number }
      const state = this.getIntegrityState(messageId)
      
      // 校验增量长度
      const deltaContent = delta.content
      if (typeof deltaContent === 'string' && deltaContent.length !== checksum.delta_length) {
        console.error('[DataIntegrity] Delta length mismatch:', {
          expected: checksum.delta_length,
          actual: deltaContent.length
        })
      }
      
      if (typeof deltaContent === 'string') {
        // 更新预期的总长度
        state.totalTextLength += checksum.delta_length
        
        // 校验总长度（与后端一致）
        if (state.totalTextLength !== checksum.total_length) {
          console.warn('[DataIntegrity] Total length mismatch:', {
            frontend: state.totalTextLength,
            backend: checksum.total_length,
            diff: checksum.total_length - state.totalTextLength
          })
          // 同步到后端长度
          state.totalTextLength = checksum.total_length
        }
      }
    }

    // ============ 3. 判断是文本增量还是内容块增量 ============
    // 优先处理 Agent 内容块 (plan, execution_status, evaluation_result)
    const isAgentBlock = ['plan', 'execution_status', 'evaluation_result'].includes(event.payload.content_type as string)
    
    if (isAgentBlock) {
      // Agent 内容块通常以完整对象形式发送
      if (delta.content && typeof delta.content === 'object') {
        console.log(`[MessageDelta] Processing agent block: ${event.payload.content_type}`)
        this.handleContentDeltaContent(messageId, delta.content as Record<string, unknown>, delta.index as number)
        return
      }
    }

    if (event.payload.content_type === 'text' && typeof delta.content === 'string') {
      // 文本增量（批量发送的文本）
      this.handleTextDeltaContent(messageId, delta.content)
    } else if (delta.content && typeof delta.content === 'object') {
      // 内容块增量（图片、音频、视频等）
      this.handleContentDeltaContent(messageId, delta.content as Record<string, unknown>, delta.index as number)
    }
  }

  /**
   * 处理工具调用（OpenAI 风格）
   * 工具调用信息包含在 delta.tool_calls 中
   */
  private handleToolCallsInDelta(messageId: string, toolCalls: Array<Record<string, unknown>>): void {
    console.log('[ToolCalls] Processing tool calls in delta:', toolCalls)

    this.updateMessage(messageId, (message) => {
      // OpenAI 风格：tool_calls 是增量的，需要组装
      // 每个 tool_call 有一个 index，用于标识是哪个工具调用
      
      for (const toolCall of toolCalls) {
        const index = toolCall.index as number
        const id = toolCall.id as string | undefined
        const functionData = toolCall.function as Record<string, unknown> | undefined

        // 如果有 id，说明是新的工具调用
        if (id) {
          // 创建新的 pending task
          const taskId = id
          const task = {
            task_id: taskId,
            status: 'processing',
            progress: 0,
            task_type: 'tool_call',
            tool_name: functionData?.name as string,
            tool_args: {},
            display_text: `Calling ${functionData?.name}...`,
          }
          
          return {
            ...message,
            pending_tasks: { ...message.pending_tasks, [taskId]: task }
          }
        }

        // 否则是参数的增量更新
        if (functionData?.arguments) {
          // 找到对应的 task 并累积参数
          const tasks = Object.values(message.pending_tasks)
          const task = tasks[index]
          
          if (task) {
            const currentArgs = (task.tool_args as Record<string, string>).arguments || ''
            const newArgs = currentArgs + (functionData.arguments as string)
            
            return {
              ...message,
              pending_tasks: {
                ...message.pending_tasks,
                [task.task_id]: {
                  ...task,
                  tool_args: { ...task.tool_args, arguments: newArgs }
                }
              }
            }
          }
        }

        // 如果有状态（completed/failed），更新任务状态
        if (toolCall.status) {
          const tasks = Object.values(message.pending_tasks)
          const task = tasks[index]
          
          if (task) {
            if (toolCall.status === 'completed') {
              // 移除 pending_tasks，添加到 completed_tasks
              const newPendingTasks = { ...message.pending_tasks }
              delete newPendingTasks[task.task_id]
              
              return {
                ...message,
                pending_tasks: newPendingTasks,
                completed_tasks: [
                  ...message.completed_tasks || [],
                  { ...task, status: 'completed', completed_at: new Date().toISOString() }
                ]
              }
            }
          }
        }
      }

      return message
    })
  }

  /**
   * 处理 message_stop 事件（OpenAI 风格）
   * 消息结束
   */
  private handleMessageStop(event: StreamEvent, messageId: string): void {
    this.updateMessage(messageId, (message) => {
      // 如果后端发送了完整的最终消息对象
      if (event.payload?.message) {
        console.log('[MessageStop] Syncing final message state from backend')
        const finalMessage = event.payload.message as Message
        
        // 智能合并：保留本地消息的引用和部分状态，合并后端的权威数据
        // 这样可以避免 UI 彻底重绘导致的闪烁，同时保证数据最终一致性
        return {
          ...message,
          ...finalMessage,
          is_complete: true,
          pending_tasks: {}
        }
      }

      // 降级处理：仅标记完成
      if (message.is_complete) return message

      return {
        ...message,
        is_complete: true,
        pending_tasks: {}
      }
    }, () => {
      // 如果消息不存在但 payload 里有完整消息，直接创建
      if (event.payload?.message) {
        // 检查是否已存在对应的消息（可能ID不匹配，或者是临时ID）
        // 这里我们信任后端的ID
        console.log('[MessageStop] Message missing, creating from payload')
        const finalMessage = event.payload.message as Message
        return {
          ...finalMessage,
          is_complete: true,
          pending_tasks: {}
        }
      }
      return null
    })
  }

  /**
   * 处理文本增量内容（内部方法）
   */
  private handleTextDeltaContent(messageId: string, delta: string): void {
    if (!delta) return

    console.log('[TextDelta] Processing delta:', delta.substring(0, 50) + '...')

    this.updateMessage(messageId, (message) => {
      const lastTextIndex = findLastPureTextBlock(message.content_blocks)
      
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
        
        console.log(`[TextDelta] Created new text block ${newBlock.content_id}`)
        
        return {
          ...message,
          content_blocks: [...message.content_blocks, newBlock]
        }
      }
    }, () => {
      // 如果消息不存在，尝试创建临时消息
      // 注意：这里我们缺少 session_id 等信息，只能尽力而为
      // 实际上我们无法获取 event 对象里的 metadata，因为 handleTextDeltaContent 参数里没有
      // 但为了健壮性，我们可以依赖后续的 message_stop 来修正
      console.warn('[TextDelta] Message missing, skipping delta update')
      return null
    })
  }

  /**
   * 处理内容块增量（内部方法）
   */
  private handleContentDeltaContent(messageId: string, content: Record<string, unknown>, index?: number): void {
    console.log('[ContentDelta] Processing content:', {
      content_type: content.content_type,
      has_index: index !== undefined
    })

    this.updateMessage(messageId, (message) => {
      const newBlock = createContentBlockFromPayload(content)
      
      // 如果指定了索引，尝试更新该位置的块
      if (index !== undefined && index < message.content_blocks.length) {
        const updatedBlocks = [...message.content_blocks]
        updatedBlocks[index] = { ...updatedBlocks[index], ...newBlock }
        return { ...message, content_blocks: updatedBlocks }
      }
      
      // 否则添加新块
      const updatedBlocks = sortContentBlocks([...message.content_blocks, newBlock])
      return { ...message, content_blocks: updatedBlocks }
    })
  }

  // 向后兼容的事件处理方法已移除
  // 现在统一使用 handleMessageDelta 处理所有增量更新

  // task_started, task_progress, task_completed, task_failed 事件仍保留
  // 因为后端可能会发送这些独立的任务状态事件，这不属于“旧代码”，而是为了更细粒度的状态控制

  // tool_call 和 tool_result 事件已移除
  // 工具调用信息现在通过 message_delta 中的 tool_calls 字段传递（OpenAI 风格）
  // UI 状态（如显示"正在调用工具..."）可以从 pending_tasks 中读取

  /**
   * 处理 error 事件
   */
  private handleError(event: StreamEvent, messageId: string): void {
    if (!event.payload) return

    const errorMessage = typeof event.payload.error === 'string' 
      ? event.payload.error 
      : 'Message processing failed'

    console.error('[StreamEvent] Error:', errorMessage, event.payload.details)

    this.updateMessage(messageId, (message) => ({
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

  // message_end 事件已废弃，统一使用 message_stop

  /**
   * 更新指定消息的辅助函数
   */
  private updateMessage(
    messageId: string,
    updater: (message: Message) => Message,
    onNotFound?: () => Message | null
  ): void {
    this.setMessages((prevMessages) => {
      const messageIndex = prevMessages.findIndex(m => m.message_id === messageId)

      if (messageIndex === -1) {
        console.warn(`[StreamEvent] Message not found: ${messageId}`)
        
        // 如果提供了 onNotFound 处理函数，尝试创建新消息
        if (onNotFound) {
          const newMessage = onNotFound()
          if (newMessage) {
            console.log(`[StreamEvent] Created missing message: ${messageId}`)
            return [...prevMessages, newMessage]
          }
        }
        
        return prevMessages
      }

      const newMessages = [...prevMessages]
      const oldMessage = newMessages[messageIndex]
      const updatedMessage = updater({ ...oldMessage })
      
      // 只有真正改变时才更新
      if (JSON.stringify(oldMessage) !== JSON.stringify(updatedMessage)) {
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
