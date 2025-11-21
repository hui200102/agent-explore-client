"use client"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import type { Message, ContentBlock } from "@/lib/api-client"
import { User, Image as ImageIcon, Video, Music, FileText, Loader2, Sparkles } from "lucide-react"

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isAssistant = message.role === "assistant"
  const hasPendingTasks = Object.keys(message.pending_tasks).length > 0

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

      <div className={cn("flex flex-col gap-2 max-w-[75%] min-w-[200px]", isAssistant ? "items-start" : "items-end")}>
        <Card
          className={cn(
            "px-4 py-3 min-w-0 shadow-sm border transition-all duration-200 hover:shadow-md",
            isAssistant
              ? "bg-card border-border/50"
              : "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground border-primary/20"
          )}
        >
          {message.text && (
            <div className={cn(
              "text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere leading-relaxed",
              isAssistant ? "text-foreground" : "text-primary-foreground"
            )}>
              {message.text}
            </div>
          )}

          {message.content_blocks && message.content_blocks.length > 0 && (
            <div className="mt-3 space-y-3">
              {message.content_blocks.map((block) => (
                <ContentBlockRenderer key={block.content_id} block={block} />
              ))}
            </div>
          )}

          {!message.is_complete && hasPendingTasks && (
            <div className="mt-3 space-y-2 pt-2 border-t border-border/50">
              {Object.entries(message.pending_tasks).map(([taskId, task]) => {
                const taskData = task as { task_type?: string; progress?: number; status?: string }
                return (
                  <div key={taskId} className={cn(
                    "flex items-center gap-2 text-xs",
                    isAssistant ? "text-muted-foreground" : "text-primary-foreground/80"
                  )}>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>
                      {taskData.task_type || "Processing"}...{" "}
                      {taskData.progress !== undefined && 
                        `${Math.round(taskData.progress * 100)}%`
                      }
                    </span>
                  </div>
                )
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

function ContentBlockRenderer({ block }: { block: ContentBlock }) {
  // Handle placeholder
  if (block.is_placeholder) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">
          Loading {block.content_type}...
        </span>
      </div>
    )
  }

  // Render based on content type
  switch (block.content_type) {
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

function ImageBlock({ block }: { block: ContentBlock }) {
  if (!block.image) return null

  const { url, data, caption, alt } = block.image

  // Use URL or base64 data
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

  // Use URL or base64 data
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
        style={{
          maxHeight: "400px",
        }}
      >
        <track kind="captions" />
      </video>
      {title && (
        <p className="text-xs text-muted-foreground mt-2 px-1">
          {title}
        </p>
      )}
    </div>
  )
}

function AudioBlock({ block }: { block: ContentBlock }) {
  if (!block.audio) return null

  const { url, data, title } = block.audio

  // Use URL or base64 data
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
