"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/lib/message_type";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Wrench,
  ListTodo,
  Sparkles,
  Search,
  Brain,
} from "lucide-react";

// ============ Task Icon ============

const TaskIcon = ({ taskType, status }: { taskType: string; status: TaskStatus }) => {
  const iconClass = "h-4 w-4";
  
  // Status-based icons for completed/failed
  if (status === "completed") {
    return <CheckCircle2 className={cn(iconClass, "text-emerald-500")} />;
  }
  if (status === "failed") {
    return <XCircle className={cn(iconClass, "text-red-500")} />;
  }
  
  // Task type icons
  switch (taskType) {
    case "planning":
      return <ListTodo className={cn(iconClass, "text-blue-500")} />;
    case "execution_step":
      return <Sparkles className={cn(iconClass, "text-amber-500")} />;
    case "tool_execution":
      return <Wrench className={cn(iconClass, "text-violet-500")} />;
    case "evaluation":
      return <Search className={cn(iconClass, "text-cyan-500")} />;
    case "reflection":
      return <Brain className={cn(iconClass, "text-pink-500")} />;
    default:
      return <Clock className={cn(iconClass, "text-gray-500")} />;
  }
};

// ============ Progress Bar ============

const ProgressBar = ({ progress, status }: { progress: number; status: TaskStatus }) => {
  const percentage = Math.round(progress * 100);
  
  return (
    <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
      <div
        className={cn(
          "h-full transition-all duration-300 ease-out rounded-full",
          status === "completed" && "bg-emerald-500",
          status === "failed" && "bg-red-500",
          status === "processing" && "bg-blue-500",
          status === "pending" && "bg-gray-400"
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

// ============ Status Badge ============

const StatusBadge = ({ status }: { status: TaskStatus }) => {
  const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
    pending: {
      label: "Pending",
      className: "bg-muted text-muted-foreground",
    },
    processing: {
      label: "Running",
      className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20",
    },
    completed: {
      label: "Done",
      className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20",
    },
    failed: {
      label: "Failed",
      className: "bg-red-500/10 text-red-600 dark:text-red-400 ring-1 ring-red-500/20",
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-orange-500/10 text-orange-600 dark:text-orange-400 ring-1 ring-orange-500/20",
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "px-2 py-0.5 text-xs font-medium rounded-full",
        config.className
      )}
    >
      {config.label}
    </span>
  );
};

// ============ Tool Args Display ============

const ToolArgsDisplay = ({ toolName, toolArgs }: { toolName?: string; toolArgs?: Record<string, unknown> }) => {
  if (!toolName) return null;

  return (
    <div className="mt-2 p-2 bg-muted/50 rounded-md text-xs font-mono">
      <div className="text-muted-foreground mb-1">
        <span className="text-violet-600 dark:text-violet-400">{toolName}</span>
        {toolArgs && Object.keys(toolArgs).length > 0 && (
          <span className="text-muted-foreground">(</span>
        )}
      </div>
      {toolArgs && Object.keys(toolArgs).length > 0 && (
        <div className="pl-2 space-y-0.5">
          {Object.entries(toolArgs).map(([key, value]) => (
            <div key={key} className="truncate">
              <span className="text-blue-600 dark:text-blue-400">{key}</span>
              <span className="text-muted-foreground">: </span>
              <span className="text-foreground">
                {typeof value === "string"
                  ? `"${value.length > 50 ? value.slice(0, 50) + "..." : value}"`
                  : JSON.stringify(value)}
              </span>
            </div>
          ))}
          <span className="text-muted-foreground">)</span>
        </div>
      )}
    </div>
  );
};

// ============ Task Card Props ============

interface TaskCardProps {
  task: Task;
  isExpanded?: boolean;
  onToggle?: () => void;
  children?: React.ReactNode;
  className?: string;
}

// ============ Task Card Component ============

export const TaskCard = memo(function TaskCard({
  task,
  isExpanded = false,
  onToggle,
  children,
  className,
}: TaskCardProps) {
  const isActive = task.status === "pending" || task.status === "processing";
  const hasContent = !!children;

  return (
    <div
      className={cn(
        "rounded-lg border transition-all duration-200 shadow-sm",
        isActive
          ? "border-blue-200 bg-blue-50/30 dark:border-blue-800/50 dark:bg-blue-950/10"
          : task.status === "failed"
          ? "border-red-200 bg-red-50/30 dark:border-red-800/50 dark:bg-red-950/10"
          : "border-border bg-card/50 hover:bg-card",
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-2.5",
          hasContent && "cursor-pointer hover:bg-muted/50"
        )}
        onClick={hasContent ? onToggle : undefined}
      >
        {/* Icon & Loading Indicator */}
        <div className="flex-shrink-0">
          {isActive ? (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          ) : (
            <TaskIcon taskType={task.task_type} status={task.status} />
          )}
        </div>

        {/* Title & Progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">
              {task.display_text}
            </span>
            <StatusBadge status={task.status} />
          </div>
          
          {/* Progress bar for active tasks */}
          {isActive && task.progress > 0 && (
            <div className="mt-1.5">
              <ProgressBar progress={task.progress} status={task.status} />
            </div>
          )}
        </div>

        {/* Expand Toggle */}
        {hasContent && (
          <div className="flex-shrink-0 text-muted-foreground">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </div>
        )}
      </div>

      {/* Tool Args (for tool_execution tasks) */}
      {task.task_type === "tool_execution" && task.tool_name && (
        <div className="px-3 pb-2">
          <ToolArgsDisplay toolName={task.tool_name} toolArgs={task.tool_args} />
        </div>
      )}

      {/* Error Message */}
      {task.status === "failed" && task.error && (
        <div className="px-3 pb-2">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-md text-xs text-red-700 dark:text-red-400">
            {task.error}
          </div>
        </div>
      )}

      {/* Content (expanded) */}
      {hasContent && isExpanded && (
        <div className="px-3 pb-3 border-t border-border/50 mt-1 pt-2">
          {children}
        </div>
      )}
    </div>
  );
});

// ============ Compact Task Card ============

interface CompactTaskCardProps {
  task: Task;
  className?: string;
}

export const CompactTaskCard = memo(function CompactTaskCard({
  task,
  className,
}: CompactTaskCardProps) {
  const isActive = task.status === "pending" || task.status === "processing";

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs",
        task.status === "completed" && "text-muted-foreground",
        task.status === "failed" && "text-red-600 dark:text-red-400",
        isActive && "bg-blue-50 dark:bg-blue-950/30",
        className
      )}
    >
      {isActive ? (
        <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
      ) : (
        <TaskIcon taskType={task.task_type} status={task.status} />
      )}
      <span className="truncate">{task.display_text}</span>
      {isActive && task.progress > 0 && (
        <span className="text-muted-foreground ml-auto">
          {Math.round(task.progress * 100)}%
        </span>
      )}
    </div>
  );
});

export default TaskCard;

