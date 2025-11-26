"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, ClipboardList } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface PlanCardProps {
  steps: string[]
  className?: string
}

export function PlanCard({ steps, className }: PlanCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <Card className={cn("overflow-hidden border-l-4 border-l-gray-400", className)}>
      <div 
        className="flex items-center justify-between p-3 bg-gray-50/50 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-gray-500" />
          <span className="font-medium text-sm text-gray-700">Planned Steps ({steps.length})</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
      
      {isExpanded && (
        <div className="p-3 pt-0 space-y-2">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start gap-3 text-sm group">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-medium mt-0.5 group-hover:bg-gray-200 transition-colors">
                {index + 1}
              </div>
              <span className="text-gray-600 leading-relaxed">{step}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

