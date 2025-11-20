"use client"

import { Loader2, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"

interface ToolCallIndicatorProps {
  toolName?: string
  status?: string
  className?: string
}

export function ToolCallIndicator({ toolName, status, className }: ToolCallIndicatorProps) {
  return (
    <div 
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-muted/50 rounded-md animate-in fade-in slide-in-from-bottom-2 duration-300",
        className
      )}
    >
      <Wrench className="h-4 w-4 flex-shrink-0" />
      <span className="flex items-center gap-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        {toolName ? `Calling tool: ${toolName}` : "Processing"}
        {status && ` (${status})`}
      </span>
    </div>
  )
}

