import { Zap } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProgressBarProps {
  current: number
  total: number
  text: string
  className?: string
}

export function AgentProgressBar({ current, total, text, className }: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (current / total) * 100))

  // Clean up text: remove "⚡ **Step X/Y**: " prefix if present to avoid duplication
  // Regex matches: ⚡ (optional space) **Step (digit)/(digit)**: (space)
  const cleanText = text.replace(/^⚡\s*\*\*Step\s*\d+\/\d+\*\*:\s*/i, "").trim()

  return (
    <div className={cn(
      "rounded-lg border bg-card p-3 shadow-sm my-2",
      className
    )}>
      {/* Header with Icon and Progress info */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-primary">
          <div className="p-1.5 bg-primary/10 rounded-full">
            <Zap className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-medium">
            Executing Step {current} of {total}
          </span>
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          {Math.round(percentage)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mb-2">
        <div 
          className="h-full bg-primary transition-all duration-500 ease-out rounded-full relative overflow-hidden"
          style={{ width: `${percentage}%` }}
        >
          <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
        </div>
      </div>

      {/* Description Text */}
      {cleanText && (
        <div className="text-xs text-muted-foreground leading-relaxed break-words border-t pt-2 mt-1">
          {cleanText}
        </div>
      )}
    </div>
  )
}

