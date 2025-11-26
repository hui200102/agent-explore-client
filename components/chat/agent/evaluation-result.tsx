import { CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface EvaluationResultProps {
  status: "pass" | "fail"
  text: string
  className?: string
}

export function EvaluationResult({ status, text, className }: EvaluationResultProps) {
  const isPass = status === "pass"

  return (
    <Alert 
      variant={isPass ? "default" : "destructive"}
      className={cn(
        "border-l-4",
        isPass ? "border-l-green-500 bg-green-50/50 border-green-200 text-green-900" : "border-l-red-500 bg-red-50/50",
        className
      )}
    >
      <div className="flex items-start gap-2">
        {isPass ? (
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
        ) : (
          <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
        )}
        <div className="space-y-1">
          <AlertTitle className={cn("font-semibold", isPass ? "text-green-700" : "")}>
            Evaluation: {isPass ? "PASSED" : "FAILED"}
          </AlertTitle>
          <AlertDescription className={cn("text-sm", isPass ? "text-green-800/90" : "")}>
            {text}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  )
}

