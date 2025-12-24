"use client";

import { memo, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useMessageStore } from "@/stores/message-store";
import { ContentBlockView } from "./content-block-view";
import type { ContentBlock } from "@/lib/message_type";
import { Bot, User, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

// ============ Message Bubble ============

interface MessageBubbleProps {
  role: "user" | "assistant";
  children: React.ReactNode;
  className?: string;
}

const MessageBubble = memo(function MessageBubble({
  role,
  children,
  className,
}: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex gap-4 px-4 py-6 hover:bg-muted/20 transition-colors",
        isUser ? "flex-row-reverse" : "flex-row",
        className
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white ring-1 ring-white/20"
        )}
      >
        {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </div>

      {/* Content */}
      <div
        className={cn(
          "flex-1 min-w-0 max-w-3xl space-y-2",
          isUser ? "flex flex-col items-end" : ""
        )}
      >
        {children}
      </div>
    </div>
  );
});

// ============ Message Content Stream ============

interface MessageContentStreamProps {
  contentOrder: string[];
  contentBlocks: Record<string, ContentBlock>;
  isStreaming: boolean;
}

const ToolBlocksContainer = memo(function ToolBlocksContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [children]);

  return (
    <div
      ref={scrollRef}
      className="max-h-[260px] overflow-y-auto border border-indigo-500/10 rounded-xl bg-indigo-50/5 dark:bg-indigo-950/10 p-2 space-y-1 scroll-smooth scrollbar-thin scrollbar-thumb-indigo-500/20"
    >
      {children}
    </div>
  );
});

const MessageContentStream = memo(function MessageContentStream({
  contentOrder,
  contentBlocks,
  isStreaming,
}: MessageContentStreamProps) {
  const isGroupedBlock = (block: ContentBlock) => {
    return ["tool_call", "tool_output"].includes(block.content_type);
  };

  // Group blocks: consecutive tool blocks go together
  const renderGroups = useMemo(() => {
    const groups: { type: "single" | "tools"; ids: string[] }[] = [];
    let currentGroup: { type: "single" | "tools"; ids: string[] } | null = null;

    contentOrder.forEach((id) => {
      const block = contentBlocks[id];
      const grouped = isGroupedBlock(block);

      if (grouped) {
        if (currentGroup?.type === "tools") {
          currentGroup.ids.push(id);
        } else {
          currentGroup = { type: "tools", ids: [id] };
          groups.push(currentGroup);
        }
      } else {
        currentGroup = { type: "single", ids: [id] };
        groups.push(currentGroup);
      }
    });

    return groups;
  }, [contentOrder, contentBlocks]);

  if (contentOrder.length === 0) return null;

  return (
    <div className="space-y-2">
      {renderGroups.map((group, groupIndex) => {
        if (group.type === "tools") {
          return (
            <ToolBlocksContainer key={`group-${groupIndex}`}>
              {group.ids.map((id) => (
                <ContentBlockView
                  key={id}
                  block={contentBlocks[id]}
                  isStreaming={isStreaming && id === contentOrder[contentOrder.length - 1]}
                />
              ))}
            </ToolBlocksContainer>
          );
        }

        // Single block
        const id = group.ids[0];
        const block = contentBlocks[id];

        return (
          <ContentBlockView
            key={id}
            block={block}
            isStreaming={isStreaming && id === contentOrder[contentOrder.length - 1]}
          />
        );
      })}
    </div>
  );
});

// ============ Error Display ============

interface ErrorDisplayProps {
  error: string;
  onDismiss?: () => void;
}

const ErrorDisplay = memo(function ErrorDisplay({
  error,
  onDismiss,
}: ErrorDisplayProps) {
  return (
    <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
      <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-500 hover:text-red-700 text-sm"
        >
          Dismiss
        </button>
      )}
    </div>
  );
});

// ============ Streaming Indicator ============

const StreamingIndicator = memo(function StreamingIndicator() {
  return (
    <div className="flex items-center gap-2.5 text-muted-foreground p-2 animate-fade-in-up">
      <div className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
      </div>
      <span className="text-sm font-medium">Agent is working...</span>
    </div>
  );
});

// ============ Main Message Container ============

interface MessageContainerProps {
  className?: string;
  autoScroll?: boolean;
}

export const MessageContainer = memo(function MessageContainer({
  className,
  autoScroll = true,
}: MessageContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Select stable references from store (objects/primitives that don't change reference)
  const activeTasksMap = useMessageStore((state) => state.activeTasks);
  const completedTasks = useMessageStore((state) => state.completedTasks);
  const contentBlocks = useMessageStore((state) => state.contentBlocks);
  const contentOrder = useMessageStore((state) => state.contentOrder);
  const isStreaming = useMessageStore((state) => state.isStreaming);
  const error = useMessageStore((state) => state.error);
  const clearError = useMessageStore((state) => state.clearError);

  // Derive array from object using useMemo to maintain stable reference
  const activeTasks = useMemo(
    () => Object.values(activeTasksMap),
    [activeTasksMap]
  );

  // Auto scroll to bottom when new content arrives
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [autoScroll, contentOrder.length, activeTasks.length]);

  const hasContent =
    activeTasks.length > 0 ||
    completedTasks.length > 0 ||
    contentOrder.length > 0;

  if (!isStreaming && !hasContent && !error) {
    return null;
  }

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      <ScrollArea ref={scrollRef} className="flex-1">
        <div className="py-6 space-y-2">
          {/* Assistant Message Bubble */}
          <MessageBubble role="assistant">
            <div className="space-y-5">
              {/* Main Content Stream (Thoughts, Plans, Tools, Text) */}
              <MessageContentStream
                contentOrder={contentOrder}
                contentBlocks={contentBlocks}
                isStreaming={isStreaming}
              />

              {/* Streaming indicator when no content yet */}
              {isStreaming && contentOrder.length === 0 && (
                <StreamingIndicator />
              )}

              {/* Error */}
              {error && <ErrorDisplay error={error} onDismiss={clearError} />}
            </div>
          </MessageBubble>
        </div>
      </ScrollArea>
    </div>
  );
});

// ============ User Message Component ============

interface UserMessageProps {
  content: string;
  attachments?: Array<{
    type: "image" | "file" | "audio" | "video";
    url: string;
    filename?: string;
  }>;
  className?: string;
}

export const UserMessage = memo(function UserMessage({
  content,
  attachments,
  className,
}: UserMessageProps) {
  return (
    <MessageBubble role="user" className={className}>
      <div className="flex flex-col items-end gap-2 max-w-[90%]">
        {/* Attachments (Images) */}
        {attachments && attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-end">
            {attachments.map((attachment, index) => {
              if (attachment.type === "image") {
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={index}
                    src={attachment.url}
                    alt={attachment.filename || "Image attachment"}
                    className="max-w-[200px] max-h-[200px] rounded-lg border shadow-sm object-cover bg-background"
                  />
                );
              }
              // Other attachments rendered as chips
              return (
                <div
                  key={index}
                  className="text-xs bg-muted px-2.5 py-1 rounded-md font-medium border"
                >
                  {attachment.filename || attachment.type}
                </div>
              );
            })}
          </div>
        )}

        {/* Text Content */}
        {content && (
          <div className="bg-primary/90 text-primary-foreground rounded-2xl rounded-tr-sm px-5 py-3.5 shadow-sm">
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
              {content}
            </p>
          </div>
        )}
      </div>
    </MessageBubble>
  );
});

export default MessageContainer;
