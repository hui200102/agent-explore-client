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
        "flex items-center gap-2 px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg animate-fade-in-up",
        className
      )}
    >
      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary flex-shrink-0" />
      <span className="text-muted-foreground">
        {toolName ? (
          <>
            <span className="text-foreground font-medium">{toolName}</span>
            {status && <span className="ml-1 text-muted-foreground/60">· {status}</span>}
          </>
        ) : (
          "Processing..."
        )}
      </span>
    </div>
  )
}

// Typing indicator component for when assistant is typing
export function TypingIndicator({ className }: { className?: string }) {
  return (
    <div 
      className={cn(
        "flex items-start gap-4 py-4 animate-fade-in-up",
        className
      )}
    >
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/90 to-primary flex items-center justify-center shadow-sm">
        <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" />
      </div>
      <div className="flex items-center gap-1.5 py-2">
        <span 
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-typing-dot"
          style={{ animationDelay: '0s' }}
        />
        <span 
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-typing-dot"
          style={{ animationDelay: '0.2s' }}
        />
        <span 
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-typing-dot"
          style={{ animationDelay: '0.4s' }}
        />
      </div>
    </div>
  )
}

