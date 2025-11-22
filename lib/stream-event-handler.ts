/**
 * Stream Event Handler
 * Manages all SSE event processing logic
 */

import type { 
  StreamEvent, 
  Message, 
  ContentBlock, 
  ImageContent, 
  VideoContent, 
  AudioContent, 
  FileContent,
  ToolCallPayload,
  ToolResultPayload,
  ErrorPayload
} from "./api-client"

interface ToolCallState {
  toolName?: string
  status?: string
}

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
   * Main event handler - routes events to specific handlers
   */
  handle(event: StreamEvent): void {
    console.log(`[StreamEventHandler] Processing ${event.event_type}`)

    // Check if this is a tool-related event
    if (this.isToolEvent(event.event_type)) {
      this.handleToolEvent(event)
      return
    }

    // Clear tool call indicator when non-tool event arrives
    this.setToolCallState(null)

    // Route to specific handler based on event type
    switch (event.event_type) {
      case "text_delta":
        this.handleTextDelta(event)
        break

      case "content_added":
        this.handleContentAdded(event)
        break

      case "content_updated":
        this.handleContentUpdated(event)
        break

      case "task_started":
        this.handleTaskStarted(event)
        break

      case "task_progress":
        this.handleTaskProgress(event)
        break

      case "task_completed":
      case "task_failed":
        this.handleTaskCompleted(event)
        break

      case "error":
        this.handleError(event)
        break

      case "message_end":
        this.handleMessageEnd(event)
        break

      default:
        console.warn(`[StreamEventHandler] Unknown event type: ${event.event_type}`)
    }
  }

  /**
   * Handle text delta events (streaming text)
   * Appends to the last text content block
   */
  private handleTextDelta(event: StreamEvent): void {
    this.updateMessage(event.message_id, (message) => {
      const delta = (event.payload?.delta as string) || ""
      
      // Find the index of the last text content block
      let lastTextBlockIndex = -1
      for (let i = message.content_blocks.length - 1; i >= 0; i--) {
        if (message.content_blocks[i].content_type === "text") {
          lastTextBlockIndex = i
          break
        }
      }
      
      if (lastTextBlockIndex !== -1) {
        // Append to existing text block - create new array and new block object
        const updatedBlocks = [...message.content_blocks]
        updatedBlocks[lastTextBlockIndex] = {
          ...updatedBlocks[lastTextBlockIndex],
          text: (updatedBlocks[lastTextBlockIndex].text || "") + delta
        }
        message.content_blocks = updatedBlocks
        console.log(`[TextDelta] Appended to text block ${updatedBlocks[lastTextBlockIndex].content_id}:`, delta)
      } else {
        // Create a new text block if none exists
        const now = new Date().toISOString()
        const newTextBlock: ContentBlock = {
          content_id: `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          content_type: "text",
          text: delta,
          sequence: message.content_blocks.length + 1,
          is_placeholder: false,
          created_at: now,
          updated_at: now,
        }
        message.content_blocks = [...message.content_blocks, newTextBlock]
        console.log(`[TextDelta] Created new text block:`, newTextBlock.content_id)
      }
      
      return message
    })
  }

  /**
   * Handle content added events (text, images, videos, etc.)
   */
  private handleContentAdded(event: StreamEvent): void {
    console.log("[ContentAdded] Adding content:", event.payload)

    this.updateMessage(event.message_id, (message) => {
      if (!event.payload) return message
      
      const contentType = event.payload.content_type as "text" | "image" | "video" | "audio" | "file"
      const now = new Date().toISOString()

      // Use is_placeholder from payload if provided, otherwise determine from data presence
      const hasData = event.payload.text || event.payload.image || event.payload.video || event.payload.audio || event.payload.file
      const isPlaceholder = event.payload.is_placeholder !== undefined 
        ? (event.payload.is_placeholder as boolean)
        : !hasData

      const newBlock: ContentBlock = {
        content_id: event.payload.content_id as string,
        content_type: contentType,
        sequence: event.payload.sequence as number ?? message.content_blocks.length + 1,
        is_placeholder: isPlaceholder,
        created_at: now,
        updated_at: now,
      }

      // Add type-specific data if available
      if (event.payload.text !== undefined) {
        newBlock.text = event.payload.text as string
      }
      if (event.payload.image) {
        newBlock.image = event.payload.image as ImageContent
      }
      if (event.payload.video) {
        newBlock.video = event.payload.video as VideoContent
      }
      if (event.payload.audio) {
        newBlock.audio = event.payload.audio as AudioContent
      }
      if (event.payload.file) {
        newBlock.file = event.payload.file as FileContent
      }

      // If placeholder, store the placeholder text for display
      if (isPlaceholder && event.payload.placeholder) {
        newBlock.text = event.payload.placeholder as string
      }

      // Add the new block
      message.content_blocks = [...message.content_blocks, newBlock]
      
      // Sort content blocks by sequence to maintain correct order
      message.content_blocks = this.sortContentBlocks(message.content_blocks)
      
      console.log("[ContentAdded] Content block added and sorted:", newBlock, "Total blocks:", message.content_blocks.length)
      
      return message
    })
  }

  /**
   * Handle content updated events
   */
  private handleContentUpdated(event: StreamEvent): void {
    console.log("[ContentUpdated] Updating content:", event.payload)

    this.updateMessage(event.message_id, (message) => {
      if (!event.payload) return message
      
      const contentId = event.payload.content_id as string
      const contentType = event.payload.content_type as string
      
      let blockIndex = message.content_blocks.findIndex(
        (b) => b.content_id === contentId
      )

      // If exact content_id not found, try to find placeholder of same type
      if (blockIndex === -1) {
        console.warn("[ContentUpdated] Exact content_id not found, looking for placeholder:", contentId)
        blockIndex = message.content_blocks.findIndex(
          (b) => b.is_placeholder && b.content_type === contentType
        )
        
        if (blockIndex !== -1) {
          console.log("[ContentUpdated] Found placeholder to update:", message.content_blocks[blockIndex].content_id)
        }
      }

      if (blockIndex !== -1) {
        const updatedBlock = {
          ...message.content_blocks[blockIndex],
          content_id: contentId,  // Update to new content_id
          is_placeholder: false,
        }

        // Update sequence if provided
        if (event.payload.sequence !== undefined) {
          updatedBlock.sequence = event.payload.sequence as number
        }

        // Add content type-specific data if provided
        if (event.payload.text !== undefined) {
          updatedBlock.text = event.payload.text as string
          console.log("[ContentUpdated] Updated text data:", event.payload.text)
        }
        if (event.payload.image) {
          updatedBlock.image = event.payload.image as typeof updatedBlock.image
          console.log("[ContentUpdated] Updated image data:", event.payload.image)
        }
        if (event.payload.video) {
          updatedBlock.video = event.payload.video as typeof updatedBlock.video
          console.log("[ContentUpdated] Updated video data:", event.payload.video)
        }
        if (event.payload.audio) {
          updatedBlock.audio = event.payload.audio as typeof updatedBlock.audio
          console.log("[ContentUpdated] Updated audio data:", event.payload.audio)
        }
        if (event.payload.file) {
          updatedBlock.file = event.payload.file as typeof updatedBlock.file
          console.log("[ContentUpdated] Updated file data:", event.payload.file)
        }

        // Warn if no data provided
        if (!event.payload.text && !event.payload.image && !event.payload.video && !event.payload.audio && !event.payload.file) {
          console.warn("[ContentUpdated] No actual content data provided, content_id:", contentId)
        }

        message.content_blocks[blockIndex] = updatedBlock
        
        // Sort content blocks by sequence after update
        message.content_blocks = this.sortContentBlocks(message.content_blocks)
        
        console.log("[ContentUpdated] Content block updated and sorted:", updatedBlock)
      } else {
        console.warn("[ContentUpdated] No matching content block found for:", contentId, contentType)
      }

      return message
    })
  }

  /**
   * Handle task started events
   */
  private handleTaskStarted(event: StreamEvent): void {
    console.log("[TaskStarted] Task started:", event.payload)

    this.updateMessage(event.message_id, (message) => {
      if (!event.payload) return message
      
      message.pending_tasks = {
        ...message.pending_tasks,
        [event.payload.task_id as string]: {
          status: event.payload.status,
          progress: event.payload.progress,
          task_type: event.payload.task_type,
        }
      }
      return message
    })
  }

  /**
   * Handle task progress events
   */
  private handleTaskProgress(event: StreamEvent): void {
    console.log("[TaskProgress] Task progress:", event.payload)

    this.updateMessage(event.message_id, (message) => {
      if (!event.payload) return message
      
      const taskId = event.payload.task_id as string
      if (message.pending_tasks[taskId]) {
        message.pending_tasks = {
          ...message.pending_tasks,
          [taskId]: {
            ...message.pending_tasks[taskId],
            progress: event.payload.progress,
            status: event.payload.status,
          }
        }
      }
      return message
    })
  }

  /**
   * Handle task completed/failed events
   */
  private handleTaskCompleted(event: StreamEvent): void {
    console.log("[TaskCompleted] Task completed/failed:", event.payload)

    this.updateMessage(event.message_id, (message) => {
      if (!event.payload) return message
      
      const completedTaskId = event.payload.task_id as string
      const newPendingTasks = { ...message.pending_tasks }
      delete newPendingTasks[completedTaskId]
      message.pending_tasks = newPendingTasks
      
      // Note: We don't remove placeholders here because content_updated 
      // event will handle updating the placeholder to actual content
      // This ensures proper replacement without content loss
      
      return message
    })
  }

  /**
   * Handle error events
   * This only marks the specific message as failed, not the entire session
   */
  private handleError(event: StreamEvent): void {
    console.error("[Error] Message processing failed for message:", event.message_id)
    console.error("[Error] Payload:", event.payload)

    if (!event.payload) return

    const payload = event.payload as unknown as ErrorPayload
    
    // Ensure errorMessage is always a string
    let errorMessage: string
    if (typeof payload.error === 'string') {
      errorMessage = payload.error
    } else if (payload.error && typeof payload.error === 'object') {
      // If error is an object, try to extract message
      errorMessage = (payload.error as any).message || JSON.stringify(payload.error)
    } else {
      errorMessage = "Message processing failed"
    }
    
    const errorDetails = payload.details

    // Log error details for debugging
    console.error("[Error] Error message:", errorMessage)
    if (errorDetails) {
      console.error("[Error] Error details:", errorDetails)
      if (errorDetails.traceback) {
        console.error("[Error] Traceback:", errorDetails.traceback)
      }
    }

    // Update only this specific message to mark as failed
    this.updateMessage(event.message_id, (message) => {
      message.is_complete = true
      message.pending_tasks = {}
      
      // Add error information to message metadata
      message.metadata = {
        ...message.metadata,
        error: errorMessage,
        error_details: errorDetails,
        failed_at: new Date().toISOString(),
      }
      
      return message
    })

    // Note: We don't set global error state here because this is just 
    // a single message failure, not a system-wide error
  }

  /**
   * Handle message end events
   */
  private handleMessageEnd(event: StreamEvent): void {
    console.log("[MessageEnd] Message ended")

    this.updateMessage(event.message_id, (message) => {
      // Only update if not already complete (avoid duplicate processing)
      if (!message.is_complete) {
        message.is_complete = true
        message.pending_tasks = {}
      }
      return message
    })
  }

  /**
   * Handle tool-related events
   */
  private handleToolEvent(event: StreamEvent): void {
    console.log("[ToolEvent] Tool event:", event.event_type, event.payload)

    if (!event.payload) return
    
    let toolName: string
    let status: string
    
    if (event.event_type === "tool_call") {
      const payload = event.payload as unknown as ToolCallPayload
      toolName = payload.tool_name
      status = "calling"
      console.log(`[ToolCall] Calling tool: ${toolName} with args:`, payload.tool_args)
    } else if (event.event_type === "tool_result") {
      const payload = event.payload as unknown as ToolResultPayload
      toolName = payload.tool_name
      status = payload.success ? "success" : "failed"
      console.log(`[ToolResult] Tool ${toolName} ${status}:`, payload.result)
    } else {
      // Fallback for other tool-related events
      toolName = (event.payload.tool_name || event.payload.tool || event.payload.name) as string
      status = (event.payload.status || event.event_type) as string
    }

    this.setToolCallState({
      toolName,
      status
    })
  }

  /**
   * Check if event is tool-related
   */
  private isToolEvent(eventType: string): boolean {
    const lowerType = eventType.toLowerCase()
    return lowerType.includes("tool") || lowerType.includes("agent")
  }

  /**
   * Helper method to update a specific message
   */
  private updateMessage(messageId: string, updater: (message: Message) => Message): void {
    this.setMessages((prev) => {
      const messageIndex = prev.findIndex((m) => m.message_id === messageId)

      if (messageIndex === -1) {
        console.warn(`[StreamEventHandler] Message not found: ${messageId}`)
        return prev
      }

      const updatedMessages = [...prev]
      const message = { ...updatedMessages[messageIndex] }
      const updatedMessage = updater(message)
      updatedMessages[messageIndex] = updatedMessage

      return updatedMessages
    })
  }

  /**
   * Update the messages reference (for new handler instance)
   */
  updateMessages(messages: Message[]): void {
    this.messages = messages
  }

  /**
   * Sort content blocks by sequence number
   * Blocks without sequence are placed at the end
   */
  private sortContentBlocks(blocks: ContentBlock[]): ContentBlock[] {
    return [...blocks].sort((a, b) => {
      // If both have sequence, sort by sequence
      if (a.sequence !== undefined && b.sequence !== undefined) {
        return a.sequence - b.sequence
      }
      // If only a has sequence, a comes first
      if (a.sequence !== undefined) {
        return -1
      }
      // If only b has sequence, b comes first
      if (b.sequence !== undefined) {
        return 1
      }
      // If neither has sequence, maintain relative order (stable sort)
      return 0
    })
  }
}

