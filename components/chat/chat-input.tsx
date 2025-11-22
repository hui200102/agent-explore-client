"use client"

import { useState, KeyboardEvent, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Loader2, Paperclip, X, AlertCircle } from "lucide-react"
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
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      inputRef.current?.focus()
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

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
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
    <div className="border-t bg-gradient-to-b from-background to-muted/20">
      {/* File Previews */}
      {fileUpload.files.length > 0 && (
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Attached files ({fileUpload.files.length})
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={fileUpload.clearFiles}
              className="h-6 text-xs hover:text-destructive"
            >
              <X className="h-3 w-3 mr-1" />
              Clear all
            </Button>
          </div>
          <FilePreviewList
            files={fileUpload.files}
            onRemove={fileUpload.removeFile}
            onRetry={fileUpload.retryUpload}
            compact
          />
        </div>
      )}

      {/* Input Area */}
      <div className="p-4">
        <div 
          className={cn(
            "flex gap-3 p-2 border-2 rounded-2xl bg-background transition-all duration-200 shadow-sm",
            isFocused ? "border-primary shadow-md" : "border-border/50"
          )}
        >
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={fileUpload.acceptedTypes.join(",")}
            onChange={handleFileSelect}
            className="hidden"
          />

          <Button
            variant="ghost"
            size="icon"
            onClick={handlePaperclipClick}
            disabled={disabled || !fileUpload.canAddMore}
            className="rounded-full shrink-0 hover:bg-primary/10 hover:text-primary transition-colors"
            title={fileUpload.canAddMore ? "Attach files" : "Maximum files reached"}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled || isSending}
            className="flex-1 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent px-2 text-base"
          />

          <Button
            onClick={handleSend}
            disabled={disabled || !canSend}
            size="icon"
            className={cn(
              "rounded-full shrink-0 transition-all duration-200",
              canSend
                ? "bg-gradient-to-r from-primary to-primary/90 hover:shadow-lg hover:scale-105" 
                : ""
            )}
          >
            {isSending || fileUpload.isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        
        <div className="flex items-center justify-between mt-2 px-2">
          <p className="text-xs text-muted-foreground">
            Press Enter to send{fileUpload.canAddMore && ", or attach files"}
          </p>
          {fileUpload.isUploading && (
            <p className="text-xs text-primary font-medium animate-pulse">
              Uploading files...
            </p>
          )}
          {hasAnalyzingFiles && (
            <p className="text-xs text-blue-500 font-medium animate-pulse">
              Analyzing files...
            </p>
          )}
          {hasFailedFiles && (
            <p className="text-xs text-destructive font-medium flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Upload failed - please retry or remove failed files
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

