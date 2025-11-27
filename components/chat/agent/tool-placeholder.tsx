import { Loader2, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PendingTask } from "@/lib/api-client"

interface ToolPlaceholderProps {
  task: PendingTask
  className?: string
}

export function ToolPlaceholder({ task, className }: ToolPlaceholderProps) {
  return (
    <div className={cn(
      "flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800 animate-fade-in-up",
      className
    )}>
      <Loader2 className="h-3.5 w-3.5 text-primary animate-spin flex-shrink-0" />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground truncate">
            {task.display_text || task.tool_name || "Running tool..."}
          </span>
        </div>
        
        {task.tool_args && (
          <div className="mt-0.5 text-xs text-muted-foreground/60 font-mono truncate">
            {JSON.stringify(task.tool_args)}
          </div>
        )}
      </div>
    </div>
  )
}

