import { CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface EvaluationResultProps {
  status: "pass" | "fail"
  text: string
  className?: string
}

export function EvaluationResult({ status, text, className }: EvaluationResultProps) {
  const isPass = status === "pass"

  return (
    <div 
      className={cn(
        "rounded-lg border p-3 my-2",
        isPass 
          ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900" 
          : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900",
        className
      )}
    >
      <div className="flex items-start gap-2.5">
        {isPass ? (
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
        )}
        <div className="space-y-1 flex-1 min-w-0">
          <div className={cn("text-sm font-semibold", isPass ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300")}>
            {isPass ? "✓ Passed" : "✗ Failed"}
          </div>
          <div className={cn("text-sm", isPass ? "text-green-700/90 dark:text-green-400/90" : "text-red-700/90 dark:text-red-400/90")}>
            {text}
          </div>
        </div>
      </div>
    </div>
  )
}

