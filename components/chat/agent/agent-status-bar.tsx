import { Target, Zap, Search, Brain, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type AgentPhase = "planning" | "execution" | "evaluation" | "reflection" | "success" | "error"

interface AgentStatusBarProps {
  phase: AgentPhase
  text: string
  className?: string
  animate?: boolean // Optional override
}

export function AgentStatusBar({ phase, text, className, animate }: AgentStatusBarProps) {
  const getPhaseConfig = (phase: AgentPhase) => {
    switch (phase) {
      case "planning":
        return {
          icon: Target,
          color: "text-zinc-600 dark:text-zinc-400",
          bg: "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800",
          animate: true
        }
      case "execution":
        return {
          icon: Zap,
          color: "text-blue-600 dark:text-blue-400",
          bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900",
          animate: true
        }
      case "evaluation":
        return {
          icon: Search,
          color: "text-amber-600 dark:text-amber-400",
          bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900",
          animate: true
        }
      case "reflection":
        return {
          icon: Brain,
          color: "text-purple-600 dark:text-purple-400",
          bg: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900",
          animate: true
        }
      case "success":
        return {
          icon: CheckCircle2,
          color: "text-green-600 dark:text-green-400",
          bg: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900",
          animate: false
        }
      case "error":
        return {
          icon: AlertCircle,
          color: "text-red-600 dark:text-red-400",
          bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900",
          animate: false
        }
    }
  }

  const config = getPhaseConfig(phase)
  const Icon = config.icon
  const shouldAnimate = animate !== undefined ? animate : config.animate

  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all shadow-sm",
      config.bg,
      config.color,
      className
    )}>
      {shouldAnimate ? (
        <Icon className="h-3.5 w-3.5 animate-pulse" />
      ) : (
        <Icon className="h-3.5 w-3.5" />
      )}
      <span>{text}</span>
    </div>
  )
}

