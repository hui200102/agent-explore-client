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
      "flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300",
      className
    )}>
      <div className="relative flex-shrink-0">
        <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
        <div className="relative bg-white p-1.5 rounded-full border border-slate-200">
          <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700 truncate">
            {task.display_text || task.tool_name || "Running tool..."}
          </span>
          <Wrench className="h-3 w-3 text-slate-400" />
        </div>
        
        {task.tool_args && (
          <div className="mt-1 text-xs text-slate-500 font-mono truncate max-w-[300px] opacity-70">
            {JSON.stringify(task.tool_args)}
          </div>
        )}
      </div>
    </div>
  )
}

