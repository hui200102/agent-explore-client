"use client"

import { X, File, Image as ImageIcon, Video, Music, FileText, Loader2, AlertCircle, RotateCw } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UploadedFile } from "@/hooks/use-file-upload"

interface FilePreviewProps {
  file: UploadedFile
  onRemove: (fileId: string) => void
  onRetry?: (fileId: string) => void
  compact?: boolean
}

export function FilePreview({ file, onRemove, onRetry, compact = false }: FilePreviewProps) {
  const getFileIcon = () => {
    if (file.type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />
    if (file.type.startsWith("video/")) return <Video className="h-4 w-4" />
    if (file.type.startsWith("audio/")) return <Music className="h-4 w-4" />
    if (file.type.includes("pdf") || file.type.includes("document")) return <FileText className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getStatusColor = () => {
    switch (file.uploadStatus) {
      case "success": return "border-green-500/50 bg-green-500/5"
      case "error": return "border-destructive/50 bg-destructive/5"
      case "uploading": return "border-primary/50 bg-primary/5"
      default: return "border-border/50 bg-muted/30"
    }
  }

  if (compact) {
    return (
      <div className={cn(
        "relative group flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200",
        getStatusColor()
      )}>
        {/* Preview or Icon */}
        <div className="flex-shrink-0">
          {file.preview ? (
            <div className="relative w-10 h-10 rounded overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={file.preview} 
                alt={file.name}
                className="w-full h-full object-cover"
              />
              {file.uploadStatus === "uploading" && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 text-white animate-spin" />
                </div>
              )}
            </div>
          ) : (
            <div className="w-10 h-10 rounded bg-muted/50 flex items-center justify-center text-muted-foreground">
              {file.uploadStatus === "uploading" ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : file.uploadStatus === "error" ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : (
                getFileIcon()
              )}
            </div>
          )}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{file.name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatSize(file.size)}</span>
            {file.uploadStatus === "uploading" && file.uploadProgress !== undefined && (
              <span className="text-primary font-medium">{file.uploadProgress}%</span>
            )}
            {file.uploadStatus === "error" && file.error && (
              <span className="text-destructive">{file.error}</span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {file.uploadStatus === "uploading" && file.uploadProgress !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${file.uploadProgress}%` }}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1">
          {file.uploadStatus === "error" && onRetry && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRetry(file.id)
              }}
              className="p-1 rounded hover:bg-primary/10 text-primary transition-colors"
              title="Retry upload"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove(file.id)
            }}
            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            title="Remove file"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    )
  }

  // Full size preview (for chat messages)
  return (
    <div className={cn(
      "relative group rounded-lg border overflow-hidden transition-all duration-200",
      getStatusColor()
    )}>
      {file.preview ? (
        <div className="relative aspect-video w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={file.preview} 
            alt={file.name}
            className="w-full h-full object-cover"
          />
          {file.uploadStatus === "uploading" && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-center text-white">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm font-medium">{file.uploadProgress}%</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded bg-muted/50 flex items-center justify-center text-muted-foreground">
            {getFileIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {file.uploadStatus === "uploading" && file.uploadProgress !== undefined && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${file.uploadProgress}%` }}
          />
        </div>
      )}

      {/* Remove Button */}
      <button
        onClick={() => onRemove(file.id)}
        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors opacity-0 group-hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Error State */}
      {file.uploadStatus === "error" && (
        <div className="absolute inset-0 bg-destructive/10 flex items-center justify-center">
          <div className="text-center px-4">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-sm font-medium text-destructive">{file.error || "Upload failed"}</p>
            {onRetry && (
              <button
                onClick={() => onRetry(file.id)}
                className="mt-2 px-3 py-1 rounded-full bg-destructive text-destructive-foreground text-xs font-medium hover:bg-destructive/90 transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface FilePreviewListProps {
  files: UploadedFile[]
  onRemove: (fileId: string) => void
  onRetry?: (fileId: string) => void
  compact?: boolean
  className?: string
}

export function FilePreviewList({ files, onRemove, onRetry, compact = false, className }: FilePreviewListProps) {
  if (files.length === 0) return null

  return (
    <div className={cn(
      "space-y-2",
      compact && "grid grid-cols-1 gap-2",
      className
    )}>
      {files.map((file) => (
        <FilePreview
          key={file.id}
          file={file}
          onRemove={onRemove}
          onRetry={onRetry}
          compact={compact}
        />
      ))}
    </div>
  )
}

