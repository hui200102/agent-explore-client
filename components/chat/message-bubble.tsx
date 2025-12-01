"use client"

/**
 * Message Bubble - 重新设计的消息渲染组件
 * 
 * 设计原则：
 * 1. 清晰的内容块分类
 * 2. 简单的渲染逻辑
 * 3. 易于维护和扩展
 */

import { cn } from "@/lib/utils"
import type { Message, ContentBlock, PendingTask } from "@/lib/api-client"
import { User, Bot, AlertCircle } from "lucide-react"

// Agent Components
import { ToolPlaceholder } from "@/components/chat/agent/tool-placeholder"

// Content renderers
import { 
  PlaceholderBlock,
  TextBlock,
  ImageBlock,
  VideoBlock,
  AudioBlock,
  FileBlock,
  PlanBlock,
  ExecutionStatusBlock,
  EvaluationResultBlock
} from "./content-blocks"

interface MessageBubbleProps {
  message: Message
}

// ==================== 工具函数 ====================

/**
 * 分类内容块
 * 
 * 规则：
 * 1. 有 metadata.phase 且有 metadata.type 的是agent内部处理块（如planning status、plan等）
 * 2. 只有 metadata.phase 但没有 metadata.type 的，可能是最终输出文本，应该显示
 * 3. 没有 metadata.phase 的是普通内容块
 */
function categorizeBlocks(blocks: ContentBlock[]): {
  agentBlocks: ContentBlock[]
  contentBlocks: ContentBlock[]
} {
  const agentBlocks: ContentBlock[] = []
  const contentBlocks: ContentBlock[] = []

  for (const block of blocks) {
    // 新的分类逻辑：基于 ContentType
    // 1. 明确的Agent类型
    const isExplicitAgentBlock = [
      "plan",
      "execution_status",
      "evaluation_result",
      "thinking"
    ].includes(block.content_type)

    // 2. 旧的分类逻辑（已移除）
    const isLegacyAgentBlock = false
    
    if (isExplicitAgentBlock || isLegacyAgentBlock) {
      // Agent内部处理块
      agentBlocks.push(block)
    } else {
      // 用户可见内容块（包括最终输出的文本）
      contentBlocks.push(block)
    }
  }

  return { agentBlocks, contentBlocks }
}

/**
 * 提取错误信息
 */
function extractError(message: Message): { hasError: boolean; errorMessage?: string } {
  const errorData = message.metadata?.error
  
  if (!errorData) {
    return { hasError: false }
  }

  let errorMessage: string
  if (typeof errorData === 'string') {
    errorMessage = errorData
  } else if (typeof errorData === 'object' && errorData !== null) {
    errorMessage = (errorData as { message?: string }).message || 'Unknown error'
  } else {
    errorMessage = 'Unknown error'
  }

  return { hasError: true, errorMessage }
}

// ==================== 主组件 ====================

export function MessageBubble({ message }: MessageBubbleProps) {
  const isAssistant = message.role === "assistant"
  const hasPendingTasks = Object.keys(message.pending_tasks).length > 0
  console.log('message', message)
  // 提取错误
  const { hasError, errorMessage } = extractError(message)


  // 排序并分类内容块
  const sortedBlocks = [...message.content_blocks].sort((a, b) => 
    (a.sequence || 0) - (b.sequence || 0)
  )
  console.log('sortedBlocks', sortedBlocks)
  const { agentBlocks, contentBlocks } = categorizeBlocks(sortedBlocks)

  console.log('agentBlocks', agentBlocks)
  console.log('contentBlocks', contentBlocks)
  
  // 🔍 调试日志 - 检查文本块分类
  if (isAssistant && message.content_blocks.length > 0) {
    console.log(`[MessageBubble] Message ${message.message_id}:`, {
      total_blocks: sortedBlocks.length,
      agent_blocks: agentBlocks.length,
      content_blocks: contentBlocks.length,
      // ... details
    })
  }

  return (
    <div className={cn(
      "group w-full py-6 animate-fade-in-up border-b border-border/5 last:border-0",
      isAssistant ? "bg-background" : "bg-muted/20"
    )}>
      <div className="max-w-4xl mx-auto px-4 md:px-6 flex gap-6">
        {/* Avatar */}
        <div className="flex-shrink-0 mt-1">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ring-1 ring-border/50",
            isAssistant 
              ? "bg-primary text-primary-foreground shadow-primary/20" 
              : "bg-background text-muted-foreground"
          )}>
            {isAssistant ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3 select-none">
            <span className="font-semibold text-sm text-foreground">
              {isAssistant ? "AI Assistant" : "You"}
            </span>
            <span className="text-xs text-muted-foreground/50">
              {new Date(message.created_at).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>

          {/* Agent Process (thinking blocks) - only show when message is incomplete */}
          {agentBlocks.length > 0 && !message.is_complete && (
            <div className="space-y-3">
              {agentBlocks.map((block, index) => (
                <AgentContentRenderer 
                  key={block.content_id}
                  block={block}
                  isLastBlock={index === agentBlocks.length - 1}
                  messageIsComplete={message.is_complete}
                  pendingTasks={message.pending_tasks}
                />
              ))}
            </div>
          )}

          {/* Main Content */}
          <div className={cn(
            "prose prose-zinc dark:prose-invert max-w-none",
            "prose-p:leading-7 prose-pre:p-0 prose-pre:rounded-xl",
            !isAssistant && "text-foreground"
          )}>
            {contentBlocks.length > 0 ? (
              contentBlocks.map((block, index) => (
                  <ContentRenderer 
                  key={block.content_id}
                  block={block}
                  isAssistant={isAssistant}
                  isFirst={index === 0}
                  pendingTasks={message.pending_tasks}
                />
              ))
            ) : !message.is_complete && agentBlocks.length === 0 ? (
              // 正在思考中
              <ThinkingIndicator />
            ) : contentBlocks.length === 0 && agentBlocks.length === 0 ? (
              // 空消息
              <EmptyMessage />
            ) : null}
          </div>

          {/* Error */}
          {hasError && errorMessage && (
            <ErrorDisplay message={errorMessage} />
          )}

          {/* Pending Tasks */}
          {!message.is_complete && hasPendingTasks && (
            <div className="pt-2 space-y-2">
              {Object.values(message.pending_tasks)
                .filter(task => task.task_type !== 'execution_step')
                .map((task) => (
                  <ToolPlaceholder key={task.task_id} task={task} />
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ==================== Agent内容渲染器 ====================

function AgentContentRenderer({ 
  block, 
  pendingTasks 
}: { 
  block: ContentBlock
  isLastBlock?: boolean
  messageIsComplete?: boolean
  pendingTasks: Record<string, PendingTask>
}) {
  // 优先使用 ContentType 渲染
  if (block.content_type === "plan") {
    return <PlanBlock block={block} pendingTasks={pendingTasks} />
  }
  if (block.content_type === "execution_status") {
    return <ExecutionStatusBlock block={block} />
  }
  if (block.content_type === "evaluation_result") {
    return <EvaluationResultBlock block={block} />
  }

  // 兼容旧的 metadata 渲染逻辑 (已废弃)
  // const meta = block.metadata as Record<string, unknown> | undefined
  // if (!meta || !('phase' in meta)) return null

  // const phase = meta.phase as string
  // const type = meta.type as string

  // Planning阶段 - 旧逻辑已移除
  // Execution阶段 - 旧逻辑已移除
  // Evaluation阶段 - 旧逻辑已移除
  // Reflection阶段 - 旧逻辑已移除

  // 未知的agent块类型，不渲染
  return null
}

// ==================== 普通内容渲染器 ====================

function ContentRenderer({ 
  block, 
  isAssistant, 
  isFirst,
  pendingTasks
}: { 
  block: ContentBlock
  isAssistant: boolean
  isFirst: boolean
  pendingTasks?: Record<string, PendingTask>
}) {
  // 占位符
  if (block.is_placeholder) {
    return <PlaceholderBlock block={block} />
  }

  // 按类型渲染
  switch (block.content_type) {
    case "text":
      return <TextBlock block={block} isAssistant={isAssistant} isFirst={isFirst} />
    case "image":
      return <ImageBlock block={block} />
    case "video":
      return <VideoBlock block={block} />
    case "audio":
      return <AudioBlock block={block} />
    case "file":
      return <FileBlock block={block} />
    case "plan":
      return <PlanBlock block={block} pendingTasks={pendingTasks} />
    case "execution_status":
      return <ExecutionStatusBlock block={block} />
    case "evaluation_result":
      return <EvaluationResultBlock block={block} />
    default:
      return (
        <div className="text-xs text-muted-foreground px-1">
          Unknown content type: {block.content_type}
        </div>
      )
  }
}

// ==================== UI组件 ====================

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2 text-muted-foreground py-2">
      <div className="flex space-x-1">
        <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"></div>
      </div>
      <span className="text-sm font-medium">Thinking...</span>
    </div>
  )
}

function EmptyMessage() {
  return (
    <div className="text-sm text-muted-foreground/50 italic">
      Empty message
    </div>
  )
}

function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-destructive text-sm">
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  )
}
