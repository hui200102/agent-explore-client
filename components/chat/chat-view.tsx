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
import {
  Send,
  Loader2,
  ImagePlus,
  Paperclip,
  X,
  Wifi,
  WifiOff,
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
}

// ============ Message Input ============

interface MessageInputProps {
  onSend: (content: string, attachments?: Attachment[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const MessageInput = memo(function MessageInput({
  onSend,
  disabled,
  placeholder = "Type your message...",
  className,
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
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

  const handleSubmit = useCallback(() => {
    if (!content.trim() && attachments.length === 0) return;
    if (disabled) return;

    onSend(content.trim(), attachments.length > 0 ? attachments : undefined);
    setContent("");
    setAttachments([]);
  }, [content, attachments, disabled, onSend]);

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
      const files = e.target.files;
      if (!files) return;

      Array.from(files).forEach((file) => {
        const isImage = file.type.startsWith("image/");
        const isAudio = file.type.startsWith("audio/");
        const isVideo = file.type.startsWith("video/");

        // Create preview for images
        if (isImage) {
          const reader = new FileReader();
          reader.onload = (e) => {
            setAttachments((prev) => [
              ...prev,
              {
                type: "image",
                url: "", // Will be set after upload
                filename: file.name,
                mime_type: file.type,
                preview: e.target?.result as string,
              },
            ]);
          };
          reader.readAsDataURL(file);
        } else {
          setAttachments((prev) => [
            ...prev,
            {
              type: isAudio ? "audio" : isVideo ? "video" : "file",
              url: "", // Will be set after upload
              filename: file.name,
              mime_type: file.type,
            },
          ]);
        }
      });

      // Reset input
      e.target.value = "";
    },
    []
  );

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <div className={cn("border-t bg-background", className)}>
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="px-4 pt-3 flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="relative group flex items-center gap-2 bg-muted rounded-lg px-3 py-2"
            >
              {attachment.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={attachment.preview}
                  alt={attachment.filename}
                  className="w-10 h-10 object-cover rounded"
                />
              ) : (
                <div className="w-10 h-10 bg-muted-foreground/20 rounded flex items-center justify-center">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <span className="text-xs text-muted-foreground max-w-[100px] truncate">
                {attachment.filename}
              </span>
              <button
                onClick={() => removeAttachment(index)}
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
            disabled={disabled}
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
            disabled={disabled || (!content.trim() && attachments.length === 0)}
          >
            {disabled ? (
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

            return {
              id: msg.message_id,
              role: msg.role as "user" | "assistant",
              content: textContent,
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
    async (content: string, attachments?: Attachment[]) => {
      // Add user message to history
      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        role: "user",
        content,
        attachments,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Send to backend
      try {
        await sendMessage(
          content,
          attachments?.map((a) => ({
            type: a.type,
            url: a.url,
            filename: a.filename,
            mime_type: a.mime_type,
          }))
        );
      } catch (error) {
        console.error("Failed to send message:", error);
      }
    },
    [sendMessage]
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
        disabled={isStreaming || isLoadingHistory}
        placeholder="Type your message..."
      />
    </div>
  );
}

export default ChatView;

