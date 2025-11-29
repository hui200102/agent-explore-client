"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, ClipboardList, Check, Loader2, Circle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { TaskStatus } from "@/docs/types"

interface PlanCardProps {
  steps: string[]
  pendingTasks?: Record<string, {
    task_id: string
    status: string
    progress?: number
    step_index?: number
    total_steps?: number
    step_description?: string
    [key: string]: any
  }>
  className?: string
}

export function PlanCard({ steps, pendingTasks = {}, className }: PlanCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  // Helper function to get step status
  const getStepStatus = (index: number): TaskStatus => {
    const taskId = `step_${index}`
    const task = pendingTasks[taskId]
    if (!task) return "pending"
    return task.status as TaskStatus
  }

  // Count completed steps
  const completedCount = steps.filter((_, index) => {
    const status = getStepStatus(index)
    return status === "completed"
  }).length

  return (
    <div className={cn("rounded-xl border bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden my-3 transition-all hover:shadow-md hover:border-primary/20", className)}>
      <div 
        className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <ClipboardList className="h-4 w-4" />
          </div>
          <span className="font-medium text-sm text-foreground/90">
            Execution Plan 
            <span className="text-muted-foreground font-normal ml-1">
              ({completedCount}/{steps.length} steps)
            </span>
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
      
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-4 bg-muted/20">
          {steps.map((step, index) => {
            const status = getStepStatus(index)
            return (
              <StepItem 
                key={index} 
                index={index} 
                step={step} 
                status={status}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

interface StepItemProps {
  index: number
  step: string
  status: TaskStatus
}

function StepItem({ index, step, status }: StepItemProps) {
  return (
    <div className={cn(
      "flex items-start gap-3 text-sm group transition-all",
      status === "processing" && "animate-pulse-subtle"
    )}>
      <div className={cn(
        "flex-shrink-0 w-6 h-6 rounded-full border shadow-sm flex items-center justify-center text-[11px] font-medium mt-0.5 transition-all",
        status === "completed" && "bg-green-500 dark:bg-green-600 border-green-500 text-white",
        status === "processing" && "bg-blue-500 dark:bg-blue-600 border-blue-500 text-white animate-pulse",
        status === "pending" && "bg-background border-border text-muted-foreground",
        status === "failed" && "bg-red-500 dark:bg-red-600 border-red-500 text-white"
      )}>
        {status === "completed" && <Check className="h-3.5 w-3.5" />}
        {status === "processing" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {status === "pending" && <Circle className="h-2.5 w-2.5" />}
        {status === "failed" && "!"}
      </div>
      <span className={cn(
        "leading-relaxed pt-0.5 transition-colors",
        status === "completed" && "text-foreground/60 line-through",
        status === "processing" && "text-foreground font-medium",
        status === "pending" && "text-foreground/80",
        status === "failed" && "text-red-500 dark:text-red-400"
      )}>
        {step}
      </span>
    </div>
  )
}

