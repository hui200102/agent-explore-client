import { Loader2, Target, Zap, Search, Brain, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type AgentPhase = "planning" | "execution" | "evaluation" | "reflection" | "success" | "error"

interface AgentStatusBarProps {
  phase: AgentPhase
  text: string
  className?: string
}

export function AgentStatusBar({ phase, text, className }: AgentStatusBarProps) {
  const getPhaseConfig = (phase: AgentPhase) => {
    switch (phase) {
      case "planning":
        return {
          icon: Target,
          color: "text-gray-500",
          bg: "bg-gray-50 border-gray-200",
          animate: true
        }
      case "execution":
        return {
          icon: Zap,
          color: "text-blue-500",
          bg: "bg-blue-50 border-blue-200",
          animate: true
        }
      case "evaluation":
        return {
          icon: Search,
          color: "text-amber-500",
          bg: "bg-amber-50 border-amber-200",
          animate: true
        }
      case "reflection":
        return {
          icon: Brain,
          color: "text-purple-500",
          bg: "bg-purple-50 border-purple-200",
          animate: true
        }
      case "success":
        return {
          icon: CheckCircle2,
          color: "text-green-500",
          bg: "bg-green-50 border-green-200",
          animate: false
        }
      case "error":
        return {
          icon: AlertCircle,
          color: "text-red-500",
          bg: "bg-red-50 border-red-200",
          animate: false
        }
    }
  }

  const config = getPhaseConfig(phase)
  const Icon = config.icon

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-all",
      config.bg,
      config.color,
      className
    )}>
      {config.animate ? (
        <div className="relative flex items-center justify-center">
          <Icon className="h-4 w-4 animate-pulse" />
          <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-current" />
        </div>
      ) : (
        <Icon className="h-4 w-4" />
      )}
      <span>{text}</span>
    </div>
  )
}

