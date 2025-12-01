"use client"

/**
 * Content Block Renderers
 * 各种类型内容块的渲染组件
 */

import { cn } from "@/lib/utils"
import type { ContentBlock, PendingTask } from "@/lib/api-client"
import { Image as ImageIcon, Video, Music, FileText, Loader2, ClipboardList } from "lucide-react"
import { MarkdownContent } from "./markdown-content"
import { PlanCard } from "./agent/plan-card"
import { EvaluationResult } from "./agent/evaluation-result"
import { AgentProgressBar } from "./agent/progress-bar"

// ==================== 占位符 ====================

export function PlaceholderBlock({ block }: { block: ContentBlock }) {
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

// ==================== 文本块 ====================

export function TextBlock({ 
  block, 
  isAssistant, 
  isFirst 
}: { 
  block: ContentBlock
  isAssistant: boolean
  isFirst: boolean
}) {
  // 🔍 调试日志
  console.log(`[TextBlock] Rendering block ${block.content_id}:`, {
    has_text: !!block.text,
    text_length: block.text?.length || 0,
    text_preview: block.text?.substring(0, 100),
    isAssistant,
    isFirst
  })
  
  if (!block.text) {
    console.warn(`[TextBlock] Block ${block.content_id} has no text`)
    return null
  }

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

// ==================== 图片块 ====================

export function ImageBlock({ block }: { block: ContentBlock }) {
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

// ==================== 视频块 ====================

export function VideoBlock({ block }: { block: ContentBlock }) {
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
      {title && (
        <p className="text-xs text-muted-foreground/70 mt-2">{title}</p>
      )}
    </div>
  )
}

// ==================== 音频块 ====================

export function AudioBlock({ block }: { block: ContentBlock }) {
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

// ==================== Plan块 ====================

export function PlanBlock({ block, pendingTasks = {} }: { block: ContentBlock, pendingTasks?: Record<string, PendingTask> }) {
  const meta = block.metadata as Record<string, unknown> | undefined
  const steps = (meta?.steps as string[]) || []

  if (steps.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <ClipboardList className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Empty Plan</span>
      </div>
    )
  }

  // 转换PendingTask类型以匹配PlanCard的期望
  const formattedTasks: Record<string, {
    task_id: string
    status: string
    progress?: number
    step_index?: number
    total_steps?: number
    step_description?: string
    [key: string]: unknown
  }> = {}
  
  Object.entries(pendingTasks).forEach(([key, task]) => {
    formattedTasks[key] = {
      ...task,
      status: task.status || 'pending'
    }
  })

  return (
    <PlanCard 
      steps={steps}
      pendingTasks={formattedTasks}
      className="my-2"
    />
  )
}

// ==================== Execution Status Block ====================

export function ExecutionStatusBlock({ block }: { block: ContentBlock }) {
  const meta = block.metadata as Record<string, unknown> | undefined
  const step = (meta?.step as number) || 0
  const total = (meta?.total as number) || 1
  const text = block.text || "Processing..."

  return (
    <AgentProgressBar 
      current={step} 
      total={total} 
      text={text} 
    />
  )
}

// ==================== Evaluation Result Block ====================

export function EvaluationResultBlock({ block }: { block: ContentBlock }) {
  const meta = block.metadata as Record<string, unknown> | undefined
  const status = (meta?.status as "pass" | "fail") || "fail"
  
  return (
    <EvaluationResult
      status={status}
      text={block.text || ""}
    />
  )
}

// ==================== 文件块 ====================

export function FileBlock({ block }: { block: ContentBlock }) {
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
        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
          {name || "File"}
        </p>
        <p className="text-xs text-muted-foreground">
          {mime_type && <span>{mime_type}</span>}
          {size && <span className="ml-2">{formatSize(size)}</span>}
        </p>
      </div>
    </a>
  )
}

