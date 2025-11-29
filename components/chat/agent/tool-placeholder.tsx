import { Loader2, Wrench, CheckCircle2, XCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PendingTask } from "@/lib/api-client"
import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

interface ToolPlaceholderProps {
  task: PendingTask
  className?: string
}

export function ToolPlaceholder({ task, className }: ToolPlaceholderProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const status = task.status || "running"
  const toolName = task.tool_name || task.display_text || "Unknown Task"
  
  const isCompleted = status === "completed" || status === "success"
  const isFailed = status === "failed"
  const isRunning = status === "running" || status === "processing" || status === "pending"

  return (
    <div className={cn(
      "flex flex-col gap-2 p-3 rounded-lg border animate-fade-in-up transition-all duration-200",
      isCompleted ? "bg-green-50/50 border-green-100 dark:bg-green-900/10 dark:border-green-900/30" :
      isFailed ? "bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30" :
      "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800",
      className
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex items-center justify-center w-6 h-6 rounded-full",
          isCompleted ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" :
          isFailed ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
          "bg-primary/10 text-primary"
        )}>
          {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> :
           isFailed ? <XCircle className="h-3.5 w-3.5" /> :
           <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        </div>
        
        <div className="flex-1 min-w-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-foreground/90">
              {toolName}
            </span>
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded-md font-medium uppercase tracking-wider",
              isCompleted ? "bg-green-100/50 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
              isFailed ? "bg-red-100/50 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
              "bg-blue-100/50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            )}>
              {status}
            </span>
          </div>
          
          {task.tool_args && (
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </button>
          )}
        </div>
      </div>
      
      {isExpanded && task.tool_args && (
        <div className="mt-1 pl-9">
          <div className="text-xs font-mono bg-black/5 dark:bg-white/5 rounded p-2 overflow-x-auto">
            <pre className="whitespace-pre-wrap break-all text-muted-foreground">
              {JSON.stringify(task.tool_args, null, 2)}
            </pre>
          </div>
        </div>
      )}
      
      {!isExpanded && task.tool_args && (
        <div className="pl-9 text-xs text-muted-foreground/60 font-mono truncate">
           Args: {JSON.stringify(task.tool_args)}
        </div>
      )}
    </div>
  )
}

