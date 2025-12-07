"use client";

import { useState, useCallback, useRef, useEffect, memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useMessageStream } from "@/hooks/use-message-stream";
import { useMessageStore } from "@/stores/message-store";
import { MessageContainer, UserMessage } from "./message-container";
import { HistoryMessage } from "./history-message";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiClient, Message as ApiMessage } from "@/lib/api-client";
import { useFileUpload, type UploadedFile } from "@/hooks/use-file-upload";
import {
  Send,
  Loader2,
  ImagePlus,
  Paperclip,
  X,
  Wifi,
  WifiOff,
  AlertCircle,
  FileText,
} from "lucide-react";

// ============ Types ============

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
  timestamp: Date;
  // For assistant messages from history
  contentBlocks?: ApiMessage["content_blocks"];
}

interface Attachment {
  type: "image" | "file" | "audio" | "video";
  url: string;
  filename?: string;
  mime_type?: string;
  preview?: string;
  summary?: string;
}

// ============ Message Input ============

interface MessageInputProps {
  onSend: (content: string) => void;
  files: UploadedFile[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (fileId: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const MessageInput = memo(function MessageInput({
  onSend,
  files,
  onAddFiles,
  onRemoveFile,
  disabled,
  placeholder = "Type your message...",
  className,
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [content]);

  const isUploading = files.some(f => f.uploadStatus === "uploading" || f.analysisStatus === "analyzing");

  const handleSubmit = useCallback(() => {
    if (!content.trim() && files.length === 0) return;
    if (disabled || isUploading) return;

    onSend(content.trim());
    setContent("");
  }, [content, files, disabled, isUploading, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (!selectedFiles) return;

      onAddFiles(Array.from(selectedFiles));

      // Reset input
      e.target.value = "";
    },
    [onAddFiles]
  );

  return (
    <div className={cn("border-t bg-background", className)}>
      {/* Attachments Preview */}
      {files.length > 0 && (
        <div className="px-4 pt-3 flex flex-wrap gap-2">
          {files.map((file) => (
            <div
              key={file.id}
              className={cn(
                "relative group flex items-center gap-2 bg-muted rounded-lg px-3 py-2 border",
                file.uploadStatus === "error" || file.analysisStatus === "error" ? "border-destructive/50 bg-destructive/10" : "border-transparent"
              )}
            >
              {file.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={file.preview}
                  alt={file.name}
                  className="w-10 h-10 object-cover rounded"
                />
              ) : (
                <div className="w-10 h-10 bg-muted-foreground/20 rounded flex items-center justify-center">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              
              <div className="flex flex-col min-w-[100px] max-w-[200px]">
                <span className="text-xs text-muted-foreground truncate font-medium">
                  {file.name}
                </span>
                
                {/* Status Indicator */}
                <div className="flex items-center gap-1.5 mt-1">
                  {file.uploadStatus === "uploading" && (
                    <div className="flex items-center gap-1 text-[10px] text-blue-500">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Uploading {file.uploadProgress}%</span>
                    </div>
                  )}
                  {file.uploadStatus === "success" && file.analysisStatus === "analyzing" && (
                    <div className="flex items-center gap-1 text-[10px] text-amber-500">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Analyzing...</span>
                    </div>
                  )}
                  {file.uploadStatus === "success" && file.analysisStatus === "complete" && (
                    <div className="flex items-center gap-1 text-[10px] text-emerald-500">
                      <FileText className="h-3 w-3" />
                      <span>Analyzed</span>
                    </div>
                  )}
                  {(file.uploadStatus === "error" || file.analysisStatus === "error") && (
                    <div className="flex items-center gap-1 text-[10px] text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      <span>{file.error || file.analysisError || "Failed"}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => onRemoveFile(file.id)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="p-4">
        <div
          className={cn(
            "flex items-end gap-2 rounded-2xl border bg-background p-2 transition-shadow",
            isFocused && "ring-2 ring-ring ring-offset-2"
          )}
        >
          {/* File Upload Button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
          >
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
          </Button>
          
          {/* Textarea */}
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 min-h-[40px] max-h-[200px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-2"
            rows={1}
          />

          {/* Send Button */}
          <Button
            type="button"
            size="icon"
            className="h-9 w-9 rounded-full flex-shrink-0"
            onClick={handleSubmit}
            disabled={disabled || (!content.trim() && files.length === 0) || isUploading}
          >
            {disabled || isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Helper text */}
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
});

// ============ Connection Status ============

interface ConnectionStatusProps {
  isConnected: boolean;
  className?: string;
}

const ConnectionStatus = memo(function ConnectionStatus({
  isConnected,
  className,
}: ConnectionStatusProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs",
        isConnected ? "text-emerald-600" : "text-muted-foreground",
        className
      )}
    >
      {isConnected ? (
        <>
          <Wifi className="h-3 w-3" />
          <span>Connected</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          <span>Disconnected</span>
        </>
      )}
    </div>
  );
});

// ============ Chat View Props ============

interface ChatViewProps {
  sessionId: string;
  className?: string;
}

// ============ Main Chat View ============

export function ChatView({ sessionId, className }: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset when sessionId changes
  if (sessionId !== currentSessionId) {
    setCurrentSessionId(sessionId);
    setMessages([]);
    useMessageStore.getState().reset();
  }

  // Load history messages when session changes
  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      if (!sessionId) return;
      
      setIsLoadingHistory(true);
      try {
        const response = await apiClient.getSessionMessages(sessionId, 50, 0);
        
        if (cancelled) return;

        // Convert API messages to ChatMessage format
        // Backend API already filters out incomplete messages by default
        const historyMessages: ChatMessage[] = response.messages.map((msg) => {
            // Extract text content from content_blocks
            const textContent = msg.content_blocks
              ?.filter((block) => block.content_type === "text")
              .map((block) => block.text || "")
              .join("\n") || "";

            // Extract attachments for user messages from content_blocks
            let attachments: Attachment[] | undefined;
            if (msg.role === "user" && msg.content_blocks) {
              const extractedAttachments = msg.content_blocks
                .filter((block) => block.content_type !== "text")
                .map((block): Attachment | null => {
                  if (block.content_type === "image" && block.image?.url) {
                    return {
                      type: "image",
                      url: block.image.url,
                      summary: block.image.summary
                    };
                  } else if (block.content_type === "file" && block.file?.url) {
                    return {
                      type: "file",
                      url: block.file.url,
                      filename: block.file.filename || block.file.url.split('/').pop(),
                      mime_type: block.file.mime_type
                    };
                  } else if (block.content_type === "audio" && block.audio?.url) {
                    return {
                      type: "audio",
                      url: block.audio.url,
                      mime_type: "audio/mpeg" // Default or extract if available
                    };
                  } else if (block.content_type === "video" && block.video?.url) {
                    return {
                      type: "video",
                      url: block.video.url,
                      mime_type: "video/mp4" // Default or extract if available
                    };
                  }
                  return null;
                })
                .filter((item): item is Attachment => item !== null);
              
              if (extractedAttachments.length > 0) {
                attachments = extractedAttachments;
              }
            }

            return {
              id: msg.message_id,
              role: msg.role as "user" | "assistant",
              content: textContent,
              attachments: attachments,
              timestamp: new Date(msg.created_at),
              contentBlocks: msg.role === "assistant" ? msg.content_blocks : undefined,
            };
          });

        setMessages(historyMessages);
      } catch (error) {
        console.error("Failed to load history:", error);
      } finally {
        if (!cancelled) {
          setIsLoadingHistory(false);
        }
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Message stream hook (v2 - 使用全局管理器)
  const { isStreaming, sendMessage } = useMessageStream({
    sessionId,
  });
  
  // File upload hook
  const { 
    files, 
    addFiles, 
    removeFile, 
    clearFiles 
  } = useFileUpload({
    onUploadError: (file, error) => {
      console.error(`Upload failed for ${file.name}:`, error);
    }
  });

  const isConnected = useMessageStore((state) => state.isConnected);

  // Watch for completed message (message_stop) and move to history
  const currentMessage = useMessageStore((state) => state.currentMessage);
  const prevMessageIdRef = useRef<string | null>(null);
  const [completedMessageIds, setCompletedMessageIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // When a new complete message arrives, add it to history
    if (currentMessage && 
        currentMessage.is_complete && 
        currentMessage.message_id !== prevMessageIdRef.current) {
      
      prevMessageIdRef.current = currentMessage.message_id;

      // Extract text content
      const textContent = currentMessage.content_blocks
        ?.filter((block) => block.content_type === "text")
        .map((block) => block.text || "")
        .join("\n") || "";

      const assistantMessage: ChatMessage = {
        id: currentMessage.message_id,
        role: "assistant",
        content: textContent,
        timestamp: new Date(currentMessage.created_at),
        contentBlocks: currentMessage.content_blocks,
      };

      // Mark as completed and add to history
      setCompletedMessageIds((prev) => new Set(prev).add(currentMessage.message_id));
      setMessages((prev) => [...prev, assistantMessage]);

      // Clear the store immediately to avoid duplicate display
      useMessageStore.getState().reset();
    }
  }, [currentMessage]);

  // Handle send message
  const handleSendMessage = useCallback(
    async (content: string) => {
      // Helper to identify images robustly (including extension check for cases where type is missing)
      const isImageFile = (file: UploadedFile) => {
        return file.type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(file.name);
      };

      // Prepare attachments from uploaded files
      const attachments: Attachment[] = files
        .filter(f => f.uploadStatus === "success" && f.url)
        .map(f => ({
          type: isImageFile(f) ? "image" : 
                f.type.startsWith("audio/") ? "audio" : 
                f.type.startsWith("video/") ? "video" : "file",
          url: f.url!,
          filename: f.name,
          mime_type: f.type,
          preview: f.preview,
          summary: f.analysis?.dense_summary
        }));

      // Add user message to history
      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        role: "user",
        content: content,
        attachments: attachments.length > 0 ? attachments : undefined,
        timestamp: new Date(),
        // Add contentBlocks for user message to support structural image rendering
        contentBlocks: attachments.length > 0 ? attachments.map((att, index) => {
          if (att.type === 'image') {
            return {
              content_id: `img_${index}_${Date.now()}`,
              content_type: 'image',
              sequence: index,
              is_placeholder: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              image: { url: att.url }
            };
          }
          return {
            content_id: `file_${index}_${Date.now()}`,
            content_type: 'file',
            sequence: index,
            is_placeholder: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            file: { url: att.url, filename: att.filename, mime_type: att.mime_type }
          };
        }) : undefined
      };
      setMessages((prev) => [...prev, userMessage]);

      // Clear files after preparing message
      clearFiles();

      // Send to backend
      try {
        await sendMessage(
          content,
          attachments.length > 0 ? attachments.map((a) => ({
            type: a.type,
            url: a.url,
            filename: a.filename,
            mime_type: a.mime_type,
            summary: a.summary
          })) : undefined
        );
      } catch (error) {
        console.error("Failed to send message:", error);
      }
    },
    [sendMessage, files, clearFiles]
  );

  // Track content blocks to know if we have streaming content
  const contentBlocks = useMessageStore((state) => state.contentBlocks);
  const hasStreamingContent = Object.keys(contentBlocks).length > 0;

  // Check if should show streaming MessageContainer
  const shouldShowStreamingContainer = useMemo(() => {
    // Show when actively streaming OR when we have content to display
    if (isStreaming || hasStreamingContent) {
      const currentMsgId = currentMessage?.message_id;
      
      // If we have a message ID, check if it's not in history
      if (currentMsgId) {
        const isInHistory = messages.some((msg) => msg.id === currentMsgId);
        const isCompleted = completedMessageIds.has(currentMsgId);
        return !isInHistory && !isCompleted;
      }
      
      // If streaming/has content but no message ID yet, still show
      return true;
    }
    
    return false;
  }, [isStreaming, hasStreamingContent, currentMessage?.message_id, messages, completedMessageIds]);

  // Debug: Log display state
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.group('[Chat Display]');
      console.log('isStreaming:', isStreaming);
      console.log('hasStreamingContent:', hasStreamingContent);
      console.log('currentMessage:', currentMessage?.message_id);
      console.log('messages count:', messages.length);
      console.log('shouldShowStreamingContainer:', shouldShowStreamingContainer);
      console.groupEnd();
    }
  }, [isStreaming, hasStreamingContent, currentMessage, messages.length, shouldShowStreamingContainer]);

  // Auto scroll when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <h2 className="text-sm font-medium">Chat</h2>
        <ConnectionStatus isConnected={isConnected} />
      </div>

      {/* Messages Area */}
      <ScrollArea ref={scrollRef} className="flex-1">
        <div className="min-h-full py-4">
          {/* Loading History */}
          {isLoadingHistory && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading history...</span>
            </div>
          )}

          {/* History Messages */}
          {!isLoadingHistory && messages.map((message) => (
            message.role === "user" ? (
              <UserMessage
                key={message.id}
                content={message.content}
                attachments={message.attachments}
              />
            ) : (
              <HistoryMessage
                key={message.id}
                content={message.content}
                contentBlocks={message.contentBlocks}
              />
            )
          ))}

          {/* Assistant Response (streaming) - hide if message already in history */}
          {shouldShowStreamingContainer && <MessageContainer autoScroll />}

          {/* Empty state */}
          {!isLoadingHistory && messages.length === 0 && !isStreaming && (
            <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground">
              <p className="text-sm">Start a conversation...</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <MessageInput
        onSend={handleSendMessage}
        files={files}
        onAddFiles={addFiles}
        onRemoveFile={removeFile}
        disabled={isStreaming || isLoadingHistory}
        placeholder="Type your message..."
      />
    </div>
  );
}

export default ChatView;

