"use client"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import type { Message, ContentBlock } from "@/lib/api-client"
import { User, Image as ImageIcon, Video, Music, FileText, Loader2, Sparkles, AlertCircle } from "lucide-react"

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
  
  // Debug: Log message structure
  console.log("[MessageBubble] Rendering message:", {
    message_id: message.message_id,
    role: message.role,
    content_blocks_count: message.content_blocks.length,
    pending_tasks_count: Object.keys(message.pending_tasks).length,
    is_complete: message.is_complete
  });
  
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

  return (
    <div
      className={cn(
        "flex gap-3 mb-6 items-start animate-fade-in-up",
        isAssistant ? "justify-start" : "justify-end"
      )}
    >
      {isAssistant && (
        <Avatar className="h-10 w-10 border-2 border-primary/10 shadow-sm">
          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn("flex flex-col gap-2 max-w-[90%] min-w-[200px]", isAssistant ? "items-start" : "items-end")}>
        <Card
          className={cn(
            "px-4 py-3 min-w-0 shadow-sm border transition-all duration-200 hover:shadow-md",
            hasError
              ? "bg-destructive/5 border-destructive/30"
              : isAssistant
              ? "bg-card border-border/50"
              : "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground border-primary/20"
          )}
        >
          {sortedBlocks.length > 0 ? (
            <div className="space-y-3">
              {sortedBlocks.map((block, index) => (
                <ContentBlockRenderer 
                  key={block.content_id} 
                  block={block}
                  isAssistant={isAssistant}
                  isFirst={index === 0}
                />
              ))}
            </div>
          ) : !message.is_complete ? (
            <div className="flex items-center gap-2 py-1">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className={cn(
                "text-sm",
                isAssistant ? "text-muted-foreground" : "text-primary-foreground/70"
              )}>
                {isAssistant ? "Thinking..." : "Sending..."}
              </span>
            </div>
          ) : (
            <div className={cn(
              "text-sm text-muted-foreground italic",
              isAssistant ? "text-muted-foreground" : "text-primary-foreground/70"
            )}>
              No content
            </div>
          )}

          {/* Error display */}
          {hasError && errorMessage && (
            <div className="mt-3 pt-3 border-t border-destructive/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-destructive">
                    Message processing failed
                  </p>
                  <p className="text-xs text-destructive/80 mt-1">
                    {errorMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pending tasks (Tool placeholders) */}
          {!message.is_complete && hasPendingTasks && (
            <div className="mt-3 space-y-2 pt-2 border-t border-border/50">
              {Object.values(message.pending_tasks).map((task) => {
                console.log("[MessageBubble] Rendering ToolPlaceholder for task:", task);
                return <ToolPlaceholder key={task.task_id} task={task} />
              })}
            </div>
          )}
        </Card>

        <span className="text-xs text-muted-foreground px-1 font-medium">
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {!isAssistant && (
        <Avatar className="h-10 w-10 border-2 border-muted shadow-sm">
          <AvatarFallback className="bg-gradient-to-br from-secondary to-muted">
            <User className="h-5 w-5 text-secondary-foreground" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}

function ContentBlockRenderer({ 
  block, 
  isAssistant, 
  isFirst 
}: { 
  block: ContentBlock
  isAssistant: boolean
  isFirst: boolean
}) {
  // Handle placeholder
  if (block.is_placeholder) {
    const placeholderMessage = block.text || `Generating ${block.content_type}...`
    return (
      <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border border-border/50 animate-pulse">
        <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
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
        return <AgentStatusBar phase="planning" text={block.text || "Planning..."} />
      }
      if (meta.type === "plan" && "steps" in meta && Array.isArray(meta.steps)) {
        return <PlanCard steps={meta.steps} />
      }
    }

    // Execution Phase
    if (phase === "execution" && "type" in meta) {
      if (meta.type === "status") {
        const isComplete = block.text?.includes("Complete") || false;
        return <AgentStatusBar phase={isComplete ? "success" : "execution"} text={block.text || "Executing..."} />
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
        return <AgentStatusBar phase="evaluation" text={block.text || "Evaluating..."} />
      }
      if (meta.type === "result") {
        const status = "status" in meta && (meta.status === "pass" || meta.status === "fail") ? meta.status : "fail";
        return <EvaluationResult status={status} text={block.text || ""} />
      }
    }

    // Reflection Phase
    if (phase === "reflection" && "type" in meta) {
      if (meta.type === "status") {
        return <AgentStatusBar phase="reflection" text={block.text || "Reflecting..."} />
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
      "text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere leading-relaxed",
      isAssistant ? "text-foreground" : "text-primary-foreground",
      !isFirst && "mt-3"
    )}>
      {block.text}
    </div>
  )
}

function ImageBlock({ block }: { block: ContentBlock }) {
  if (!block.image) return null

  const { url, data, caption, alt } = block.image
  const imageSrc = url || (data ? `data:image/jpeg;base64,${data}` : null)

  if (!imageSrc) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
        <ImageIcon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Image (no data)</span>
      </div>
    )
  }

  return (
    <div className="relative group">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt={alt || caption || "Image"}
        className="rounded-lg max-w-full h-auto border border-border/50 shadow-sm transition-all duration-200 group-hover:shadow-md"
        style={{
          maxHeight: "400px",
          objectFit: "contain",
        }}
      />
      {caption && (
        <p className="text-xs text-muted-foreground mt-2 px-1">
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
      <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
        <Video className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Video (no data)</span>
      </div>
    )
  }

  return (
    <div className="relative">
      <video
        src={videoSrc}
        controls
        className="rounded-lg max-w-full h-auto border border-border/50 shadow-sm"
        style={{ maxHeight: "400px" }}
      >
        <track kind="captions" />
      </video>
      {title && <p className="text-xs text-muted-foreground mt-2 px-1">{title}</p>}
    </div>
  )
}

function AudioBlock({ block }: { block: ContentBlock }) {
  if (!block.audio) return null

  const { url, data, title } = block.audio
  const audioSrc = url || (data ? `data:audio/mp3;base64,${data}` : null)

  if (!audioSrc) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
        <Music className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Audio (no data)</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
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
      className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 hover:border-primary/30 transition-all duration-200 hover:shadow-sm group"
    >
      <div className="p-2 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
        <FileText className="h-5 w-5 text-primary flex-shrink-0" />
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
