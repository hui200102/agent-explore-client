"use client"

import { useState } from "react"
import { Lightbulb, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface InsightBoxProps {
  summary: string
  fullText?: string
  className?: string
}

export function InsightBox({ summary, fullText, className }: InsightBoxProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className={cn("rounded-lg border border-purple-200 bg-purple-50/50 overflow-hidden", className)}>
      <div className="p-3 flex gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center border border-purple-200">
            <Lightbulb className="h-3.5 w-3.5 text-purple-600 fill-purple-600" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-purple-900 leading-relaxed">
              {summary}
            </p>
            {fullText && (
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex-shrink-0 p-1 hover:bg-purple-100 rounded-md text-purple-500 transition-colors"
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            )}
          </div>
          
          {isExpanded && fullText && (
            <div className="pt-2 mt-2 border-t border-purple-100 text-sm text-purple-800/80 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
              {fullText}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

