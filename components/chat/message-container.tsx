"use client";

import { memo, useState, useCallback, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useMessageStore } from "@/stores/message-store";
import { TaskCard, CompactTaskCard } from "./task-card";
import { ContentBlockView } from "./content-block-view";
import type { Task, ContentBlock } from "@/lib/message_type";
import {
  Bot,
  User,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
} from "lucide-react";
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
        {isUser ? (
          <User className="h-5 w-5" />
        ) : (
          <Bot className="h-5 w-5" />
        )}
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

// ============ Active Tasks Section ============

interface ActiveTasksSectionProps {
  tasks: Task[];
  taskContents: Record<string, string[]>;
  contentBlocks: Record<string, ContentBlock>;
  isStreaming: boolean;
}

const ActiveTasksSection = memo(function ActiveTasksSection({
  tasks,
  taskContents,
  contentBlocks,
  isStreaming,
}: ActiveTasksSectionProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const toggleTask = useCallback((taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  if (tasks.length === 0) return null;

  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const taskContentIds = taskContents[task.task_id] || [];
        const taskBlocks = taskContentIds
          .map((id) => contentBlocks[id])
          .filter(Boolean);
        const hasContent = taskBlocks.length > 0;
        const isExpanded = expandedTasks.has(task.task_id);

        return (
          <TaskCard
            key={task.task_id}
            task={task}
            isExpanded={isExpanded}
            onToggle={() => toggleTask(task.task_id)}
          >
            {hasContent && (
              <div className="space-y-2">
                {taskBlocks.map((block, index) => (
                  <ContentBlockView
                    key={block.content_id}
                    block={block}
                    isStreaming={
                      isStreaming && index === taskBlocks.length - 1
                    }
                  />
                ))}
              </div>
            )}
          </TaskCard>
        );
      })}
    </div>
  );
});

// ============ Completed Tasks Section ============

interface CompletedTasksSectionProps {
  tasks: Task[];
  maxVisible?: number;
}

const CompletedTasksSection = memo(function CompletedTasksSection({
  tasks,
  maxVisible = 3,
}: CompletedTasksSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (tasks.length === 0) return null;

  const visibleTasks = isExpanded ? tasks : tasks.slice(-maxVisible);
  const hiddenCount = tasks.length - maxVisible;

  return (
    <div className="space-y-1">
      {/* Show more button */}
      {hiddenCount > 0 && !isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
        >
          <ChevronUp className="h-3 w-3" />
          Show {hiddenCount} more tasks
        </button>
      )}

      {/* Task list */}
      <div className="space-y-1">
        {visibleTasks.map((task) => (
          <CompactTaskCard key={task.task_id} task={task} />
        ))}
      </div>

      {/* Collapse button */}
      {isExpanded && hiddenCount > 0 && (
        <button
          onClick={() => setIsExpanded(false)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
        >
          <ChevronDown className="h-3 w-3" />
          Show less
        </button>
      )}
    </div>
  );
});

// ============ Final Output Section ============

interface FinalOutputSectionProps {
  contentOrder: string[];
  contentBlocks: Record<string, ContentBlock>;
  taskContents: Record<string, string[]>;
  isStreaming: boolean;
}

const FinalOutputSection = memo(function FinalOutputSection({
  contentOrder,
  contentBlocks,
  taskContents,
  isStreaming,
}: FinalOutputSectionProps) {
  // Get all content IDs that belong to tasks
  const taskContentIds = new Set(
    Object.values(taskContents).flat()
  );

  // Filter content blocks that don't belong to any task (final outputs)
  const finalBlocks = contentOrder
    .map((id) => contentBlocks[id])
    .filter((block) => block && !taskContentIds.has(block.content_id));

  if (finalBlocks.length === 0) return null;

  return (
    <div className="space-y-4 mt-4">
      {finalBlocks.map((block, index) => (
        <ContentBlockView
          key={block.content_id}
          block={block}
          isStreaming={isStreaming && index === finalBlocks.length - 1}
        />
      ))}
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
  const taskContents = useMessageStore((state) => state.taskContents);
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

  // Show container if:
  // 1. Currently streaming
  // 2. Has content (tasks or content blocks)
  // 3. Has error to display
  // This ensures completed messages stay visible until added to history
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
              {/* Completed Tasks (collapsed) */}
              <CompletedTasksSection tasks={completedTasks} />

              {/* Active Tasks */}
              <ActiveTasksSection
                tasks={activeTasks}
                taskContents={taskContents}
                contentBlocks={contentBlocks}
                isStreaming={isStreaming}
              />

              {/* Streaming indicator when no active tasks */}
              {isStreaming && activeTasks.length === 0 && contentOrder.length === 0 && (
                <StreamingIndicator />
              )}

              {/* Final Output */}
              <FinalOutputSection
                contentOrder={contentOrder}
                contentBlocks={contentBlocks}
                taskContents={taskContents}
                isStreaming={isStreaming}
              />

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
      <div className="bg-primary/90 text-primary-foreground rounded-2xl rounded-tr-sm px-5 py-3.5 shadow-sm max-w-[90%]">
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{content}</p>
        
        {/* Attachments */}
        {attachments && attachments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {attachments.map((attachment, index) => (
              <div
                key={index}
                className="text-xs bg-primary-foreground/15 px-2.5 py-1 rounded-md font-medium backdrop-blur-sm"
              >
                {attachment.filename || attachment.type}
              </div>
            ))}
          </div>
        )}
      </div>
    </MessageBubble>
  );
});

export default MessageContainer;

