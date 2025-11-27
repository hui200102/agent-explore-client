"use client"

import { cn } from "@/lib/utils"
import type { Message, ContentBlock } from "@/lib/api-client"
import { User, Image as ImageIcon, Video, Music, FileText, Loader2, Bot, AlertCircle } from "lucide-react"
import { MarkdownContent } from "./markdown-content"

// Agent Components
import { AgentStatusBar } from "@/components/chat/agent/agent-status-bar"
import { PlanCard } from "@/components/chat/agent/plan-card"
import { AgentProgressBar } from "@/components/chat/agent/progress-bar"
import { ToolPlaceholder } from "@/components/chat/agent/tool-placeholder"
import { EvaluationResult } from "@/components/chat/agent/evaluation-result"
import { InsightBox } from "@/components/chat/agent/insight-box"

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isAssistant = message.role === "assistant"
  const hasPendingTasks = Object.keys(message.pending_tasks).length > 0
  
  // Extract error information
  const errorData = message.metadata?.error
  const hasError = Boolean(errorData)
  const errorMessage = typeof errorData === 'string' 
    ? errorData 
    : typeof errorData === 'object' && errorData !== null
    ? (errorData as { message?: string }).message || 'Unknown error'
    : undefined

  // Sort content blocks by sequence
  const sortedBlocks = [...message.content_blocks]
    .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))

  // Separate thinking/agent blocks from content blocks
  const thinkingBlocks = sortedBlocks.filter(b => b.metadata?.phase)
  const contentBlocks = sortedBlocks.filter(b => !b.metadata?.phase)

  return (
    <div className={cn(
      "group w-full py-6 animate-fade-in-up border-b border-border/5 last:border-0",
      isAssistant ? "bg-background" : "bg-muted/20"
    )}>
      <div className="max-w-4xl mx-auto px-4 md:px-6 flex gap-6">
        {/* Avatar Column */}
        <div className="flex-shrink-0 mt-1">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ring-1 ring-border/50",
            isAssistant 
              ? "bg-primary text-primary-foreground shadow-primary/20" 
              : "bg-background text-muted-foreground"
          )}>
            {isAssistant ? (
              <Bot className="h-5 w-5" />
            ) : (
              <User className="h-5 w-5" />
            )}
          </div>
        </div>

        {/* Content Column */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Header with Role & Time */}
          <div className="flex items-center gap-3 select-none">
            <span className="font-semibold text-sm text-foreground">
              {isAssistant ? "AI Assistant" : "You"}
            </span>
            <span className="text-xs text-muted-foreground/50">
              {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Agent Thinking Process (if any) */}
          {thinkingBlocks.length > 0 && (
            <div className="space-y-3 mb-4">
              {thinkingBlocks.map((block, index) => (
                <ContentBlockRenderer 
                  key={block.content_id} 
                  block={block}
                  isAssistant={isAssistant}
                  isFirst={index === 0}
                  messageIsComplete={message.is_complete}
                  isLastBlock={index === thinkingBlocks.length - 1}
                />
              ))}
            </div>
          )}

          {/* Main Content */}
          <div className={cn(
            "prose prose-zinc dark:prose-invert max-w-none prose-p:leading-7 prose-pre:p-0 prose-pre:rounded-xl",
            !isAssistant && "text-foreground"
          )}>
            {contentBlocks.length > 0 ? (
              contentBlocks.map((block, index) => (
                <ContentBlockRenderer 
                  key={block.content_id} 
                  block={block}
                  isAssistant={isAssistant}
                  isFirst={index === 0}
                  messageIsComplete={message.is_complete}
                />
              ))
            ) : !message.is_complete && thinkingBlocks.length === 0 ? (
               <div className="flex items-center gap-2 text-muted-foreground py-2">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"></div>
                </div>
                <span className="text-sm font-medium">Thinking...</span>
              </div>
            ) : contentBlocks.length === 0 && thinkingBlocks.length === 0 ? (
              <div className="text-sm text-muted-foreground/50 italic">Empty message</div>
            ) : null}
          </div>

          {/* Error State */}
          {hasError && errorMessage && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Pending Tasks / Tools */}
          {!message.is_complete && hasPendingTasks && (
            <div className="pt-2 space-y-2">
              {Object.values(message.pending_tasks).map((task) => (
                <ToolPlaceholder key={task.task_id} task={task} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ContentBlockRenderer({ 
  block, 
  isAssistant, 
  isFirst,
  messageIsComplete,
  isLastBlock
}: { 
  block: ContentBlock
  isAssistant: boolean
  isFirst: boolean
  messageIsComplete?: boolean
  isLastBlock?: boolean
}) {
  // Handle placeholder
  if (block.is_placeholder) {
    const placeholderMessage = block.text || `Generating ${block.content_type}...`
    return (
      <div className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-900/50 rounded-md border border-zinc-200 dark:border-zinc-800 animate-pulse">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary flex-shrink-0" />
        <span className="text-xs text-muted-foreground">
          {placeholderMessage}
        </span>
      </div>
    )
  }

  // 1. Check metadata for Agent-specific rendering
  const meta = block.metadata;
  
  // Debug: Log block info to help diagnose issues
  if (meta) {
    console.log("[ContentBlockRenderer] Block with metadata:", {
      content_id: block.content_id,
      content_type: block.content_type,
      metadata: meta,
      text: block.text?.substring(0, 50)
    });
  }
  
  if (meta && "phase" in meta) {
    const phase = meta.phase;
    console.log("[ContentBlockRenderer] Detected Agent phase:", phase, "type:", meta.type);

    // Planning Phase
    if (phase === "planning" && "type" in meta) {
      if (meta.type === "status") {
        return <AgentStatusBar phase="planning" text={block.text || "Planning..."} animate={!messageIsComplete && isLastBlock} />
      }
      if (meta.type === "plan" && "steps" in meta && Array.isArray(meta.steps)) {
        return <PlanCard steps={meta.steps} />
      }
    }

    // Execution Phase
    if (phase === "execution" && "type" in meta) {
      if (meta.type === "status") {
        const isComplete = block.text?.includes("Complete") || false;
        // Logic:
        // 1. If message is complete OR block says complete -> Success (Green check, no animate)
        // 2. If NOT last block -> Success (Green check, no animate) - assumes past steps are done
        // 3. Else -> Execution (Blue zap, animate)
        
        const shouldBeSuccess = messageIsComplete || isComplete || !isLastBlock;
        const finalPhase = shouldBeSuccess ? "success" : "execution";
        const shouldAnimate = !shouldBeSuccess; // Animate only if executing and is last block

        return <AgentStatusBar phase={finalPhase} text={block.text || "Executing..."} animate={shouldAnimate} />
      }
      if (meta.type === "step_progress") {
        const step = "step" in meta && typeof meta.step === "number" ? meta.step : 0;
        const total = "total" in meta && typeof meta.total === "number" ? meta.total : 1;
        return <AgentProgressBar current={step} total={total} text={block.text || "Processing..."} />
      }
    }

    // Evaluation Phase
    if (phase === "evaluation" && "type" in meta) {
      if (meta.type === "status") {
        return <AgentStatusBar phase="evaluation" text={block.text || "Evaluating..."} animate={!messageIsComplete && isLastBlock} />
      }
      if (meta.type === "result") {
        const status = "status" in meta && (meta.status === "pass" || meta.status === "fail") ? meta.status : "fail";
        return <EvaluationResult status={status} text={block.text || ""} />
      }
    }

    // Reflection Phase
    if (phase === "reflection" && "type" in meta) {
      if (meta.type === "status") {
        return <AgentStatusBar phase="reflection" text={block.text || "Reflecting..."} animate={!messageIsComplete && isLastBlock} />
      }
      if (meta.type === "insight") {
        const fullText = "full_text" in meta && typeof meta.full_text === "string" ? meta.full_text : undefined;
        return <InsightBox summary={block.text || ""} fullText={fullText} />
      }
    }
  }

  // 2. Fallback to standard content type rendering
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
    default:
      return (
        <div className="text-xs text-muted-foreground px-1">
          Unknown content type: {block.content_type}
        </div>
      )
  }
}

function TextBlock({ 
  block, 
  isAssistant, 
  isFirst 
}: { 
  block: ContentBlock
  isAssistant: boolean
  isFirst: boolean
}) {
  if (!block.text) return null

  return (
    <div className={cn(
      "leading-7 text-[15px]",
      isAssistant ? "text-foreground" : "text-foreground",
      !isFirst && "mt-3"
    )}>
      {isAssistant ? (
        <MarkdownContent content={block.text} />
      ) : (
        <div className="whitespace-pre-wrap break-words">
          {block.text}
        </div>
      )}
    </div>
  )
}

function ImageBlock({ block }: { block: ContentBlock }) {
  if (!block.image) return null

  const { url, data, caption, alt } = block.image
  const imageSrc = url || (data ? `data:image/jpeg;base64,${data}` : null)

  if (!imageSrc) {
    return (
      <div className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <ImageIcon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Image (no data)</span>
      </div>
    )
  }

  return (
    <div className="relative group my-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt={alt || caption || "Image"}
        className="rounded-lg max-w-full h-auto border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all duration-200 hover:shadow-md"
        style={{
          maxHeight: "500px",
          objectFit: "contain",
        }}
      />
      {caption && (
        <p className="text-xs text-muted-foreground/70 mt-2">
          {caption}
        </p>
      )}
    </div>
  )
}

function VideoBlock({ block }: { block: ContentBlock }) {
  if (!block.video) return null

  const { url, data, title } = block.video
  const videoSrc = url || (data ? `data:video/mp4;base64,${data}` : null)

  if (!videoSrc) {
    return (
      <div className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <Video className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Video (no data)</span>
      </div>
    )
  }

  return (
    <div className="relative my-2">
      <video
        src={videoSrc}
        controls
        className="rounded-lg max-w-full h-auto border border-zinc-200 dark:border-zinc-800 shadow-sm"
        style={{ maxHeight: "500px" }}
      >
        <track kind="captions" />
      </video>
      {title && <p className="text-xs text-muted-foreground/70 mt-2">{title}</p>}
    </div>
  )
}

function AudioBlock({ block }: { block: ContentBlock }) {
  if (!block.audio) return null

  const { url, data, title } = block.audio
  const audioSrc = url || (data ? `data:audio/mp3;base64,${data}` : null)

  if (!audioSrc) {
    return (
      <div className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <Music className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Audio (no data)</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 my-2">
      <div className="flex items-center gap-2">
        <Music className="h-4 w-4 text-primary" />
        {title && <span className="text-sm font-medium">{title}</span>}
      </div>
      <audio src={audioSrc} controls className="w-full">
        <track kind="captions" />
      </audio>
    </div>
  )
}

function FileBlock({ block }: { block: ContentBlock }) {
  if (!block.file) return null

  const { url, name, mime_type, size } = block.file

  const formatSize = (bytes?: number) => {
    if (!bytes) return ""
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-primary/40 transition-all duration-200 hover:shadow-sm group my-2"
    >
      <div className="p-2 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
        <FileText className="h-4 w-4 text-primary flex-shrink-0" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{name || "File"}</p>
        <p className="text-xs text-muted-foreground">
          {mime_type && <span>{mime_type}</span>}
          {size && <span className="ml-2">{formatSize(size)}</span>}
        </p>
      </div>
    </a>
  )
}
