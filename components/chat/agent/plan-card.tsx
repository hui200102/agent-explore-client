"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface PlanCardProps {
  steps: string[]
  className?: string
}

export function PlanCard({ steps, className }: PlanCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)

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
          <span className="font-medium text-sm text-foreground/90">Execution Plan <span className="text-muted-foreground font-normal ml-1">({steps.length} steps)</span></span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
      
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-4 bg-muted/20">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start gap-3 text-sm group">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-background border shadow-sm text-muted-foreground flex items-center justify-center text-[11px] font-medium mt-0.5 group-hover:border-primary/50 group-hover:text-primary transition-colors">
                {index + 1}
              </div>
              <span className="text-foreground/80 leading-relaxed pt-0.5">{step}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

