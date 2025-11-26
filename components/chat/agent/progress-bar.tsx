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

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-blue-600 font-medium">
          <Zap className="h-4 w-4 fill-blue-600 text-blue-600" />
          <span>{text}</span>
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          Step {current} of {total}
        </span>
      </div>
      <div className="h-2 w-full bg-blue-100 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-500 transition-all duration-500 ease-out rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

