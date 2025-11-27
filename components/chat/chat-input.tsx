"use client"

import { useState, KeyboardEvent, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Loader2, Paperclip, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFileUpload, type FileAnalysis } from "@/hooks/use-file-upload"
import { FilePreviewList } from "./file-preview"

export interface UploadedFileInfo {
  url: string
  name: string
  type: string
  size: number
  analysis?: FileAnalysis
}

interface ChatInputProps {
  onSend: (message: string, files?: UploadedFileInfo[]) => Promise<void>
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ 
  onSend, 
  disabled = false, 
  placeholder = "Type your message..." 
}: ChatInputProps) {
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [message])

  const fileUpload = useFileUpload({
    maxFiles: 5,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    onUploadComplete: (file) => {
      console.log("File uploaded:", file)
    },
    onUploadError: (file, error) => {
      console.error("File upload error:", error)
    },
  })

  const handleSend = async () => {
    if ((!message.trim() && fileUpload.files.length === 0) || isSending) return

    // Check if any files have upload errors
    const hasFailedFiles = fileUpload.files.some(f => f.uploadStatus === "error")
    if (hasFailedFiles) {
      console.error("Cannot send: some files failed to upload")
      return
    }

    // Check if all files are uploaded successfully
    const hasUploadingFiles = fileUpload.files.some(f => f.uploadStatus === "uploading")
    if (hasUploadingFiles) {
      console.warn("Please wait for all files to finish uploading")
      return
    }

    // Check if any files are still being analyzed
    const hasAnalyzingFiles = fileUpload.files.some(f => 
      f.analysisStatus === "pending" || f.analysisStatus === "analyzing"
    )
    if (hasAnalyzingFiles) {
      console.warn("Please wait for file analysis to complete")
      return
    }

    setIsSending(true)
    try {
      // Get successfully uploaded files with their URLs and analysis
      const uploadedFiles: UploadedFileInfo[] = fileUpload.files
        .filter(f => f.uploadStatus === "success" && f.url)
        .map(f => ({
          url: f.url!,
          name: f.name,
          type: f.type,
          size: f.size,
          analysis: f.analysis,
        }))
      
      await onSend(message.trim(), uploadedFiles.length > 0 ? uploadedFiles : undefined)
      setMessage("")
      fileUpload.clearFiles()
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
        textareaRef.current.focus()
      }
    } catch (error) {
      console.error("Failed to send message:", error)
    } finally {
      setIsSending(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      fileUpload.addFiles(files)
    }
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handlePaperclipClick = () => {
    fileInputRef.current?.click()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const hasContent = message.trim() || fileUpload.files.length > 0
  const hasFailedFiles = fileUpload.files.some(f => f.uploadStatus === "error")
  const hasAnalyzingFiles = fileUpload.files.some(f => 
    f.analysisStatus === "pending" || f.analysisStatus === "analyzing"
  )
  const canSend = hasContent && !isSending && !fileUpload.isUploading && !hasFailedFiles && !hasAnalyzingFiles

  return (
    <div className="p-0">
        <div 
          className={cn(
            "flex flex-col gap-2 p-3 rounded-3xl bg-muted/30 border border-border/50 shadow-sm transition-all duration-300",
            isFocused 
              ? "bg-background ring-2 ring-primary/10 border-primary/20 shadow-xl" 
              : "hover:bg-muted/50 hover:border-border/80 hover:shadow-md"
          )}
        >
          {/* File Previews (Inside Input Box) */}
          {fileUpload.files.length > 0 && (
            <div className="px-1 pt-1">
              <FilePreviewList
                files={fileUpload.files}
                onRemove={fileUpload.removeFile}
                onRetry={fileUpload.retryUpload}
                compact
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2"
              />
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={fileUpload.acceptedTypes.join(",")}
            onChange={handleFileSelect}
            className="hidden"
          />

          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled || isSending}
            rows={1}
            className="flex-1 min-h-[48px] max-h-[200px] border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent px-3 py-3 text-[16px] placeholder:text-muted-foreground/40 resize-none"
          />

          <div className="flex items-center justify-between px-2 pb-1">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePaperclipClick}
                disabled={disabled || !fileUpload.canAddMore}
                className="rounded-full h-9 w-9 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title={fileUpload.canAddMore ? "Attach files" : "Maximum files reached"}
              >
                <Paperclip className="h-5 w-5" />
              </Button>
            </div>

            <Button
              onClick={handleSend}
              disabled={disabled || !canSend}
              size="icon"
              className={cn(
                "rounded-full h-9 w-9 transition-all duration-300 shadow-sm",
                canSend
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md hover:scale-105 active:scale-95" 
                  : "bg-muted/50 text-muted-foreground/50"
              )}
            >
              {isSending || fileUpload.isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-4 w-4 ml-0.5" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Status messages */}
        {(fileUpload.isUploading || hasAnalyzingFiles || hasFailedFiles) && (
          <div className="mt-2 px-2 animate-fade-in-up">
            {fileUpload.isUploading && (
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                Uploading files...
              </p>
            )}
            {hasAnalyzingFiles && (
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                Analyzing files...
              </p>
            )}
            {hasFailedFiles && (
              <p className="text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="h-3 w-3" />
                Upload failed - please retry or remove failed files
              </p>
            )}
          </div>
        )}
      </div>
  )
}

