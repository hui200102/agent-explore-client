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
        "flex items-center gap-3 px-4 py-3 text-sm bg-primary/5 border border-primary/10 rounded-xl shadow-sm animate-fade-in-up backdrop-blur-sm",
        className
      )}
    >
      <div className="p-1.5 rounded-lg bg-primary/10">
        <Wrench className="h-4 w-4 text-primary flex-shrink-0" />
      </div>
      <span className="flex items-center gap-2 text-foreground font-medium">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        {toolName ? (
          <>
            Calling tool: <span className="text-primary font-semibold">{toolName}</span>
          </>
        ) : (
          "Processing"
        )}
        {status && <span className="text-muted-foreground font-normal">({status})</span>}
      </span>
    </div>
  )
}

// Typing indicator component for when assistant is typing
export function TypingIndicator({ className }: { className?: string }) {
  return (
    <div 
      className={cn(
        "flex items-start gap-3 mb-6 animate-fade-in-up",
        className
      )}
    >
      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center border-2 border-primary/10 shadow-sm">
        <Loader2 className="h-5 w-5 text-primary-foreground animate-spin" />
      </div>
      <div className="flex items-center gap-2 px-4 py-3 bg-card border border-border/50 rounded-2xl shadow-sm">
        <div className="flex gap-1">
          <span 
            className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-typing-dot"
            style={{ animationDelay: '0s' }}
          />
          <span 
            className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-typing-dot"
            style={{ animationDelay: '0.2s' }}
          />
          <span 
            className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-typing-dot"
            style={{ animationDelay: '0.4s' }}
          />
        </div>
      </div>
    </div>
  )
}

