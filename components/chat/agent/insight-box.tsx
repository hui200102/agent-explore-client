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
    <div className={cn("rounded-xl border border-purple-200/60 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 shadow-sm my-3 overflow-hidden", className)}>
      <div className="p-4 flex gap-3">
        <div className="flex-shrink-0 mt-0.5 p-1.5 bg-purple-100 dark:bg-purple-900/40 rounded-lg text-purple-600 dark:text-purple-400">
          <Lightbulb className="h-4 w-4" />
        </div>
        
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-purple-900 dark:text-purple-100 leading-relaxed">
              {summary}
            </p>
            {fullText && (
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex-shrink-0 p-1 hover:bg-purple-200/50 dark:hover:bg-purple-900/50 rounded-lg text-purple-500 dark:text-purple-400 transition-all"
                title={isExpanded ? "Show less" : "Show details"}
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            )}
          </div>
          
          {isExpanded && fullText && (
            <div className="pt-3 mt-2 border-t border-purple-200/60 dark:border-purple-800/60 text-sm text-purple-800/90 dark:text-purple-300/90 leading-relaxed animate-fade-in-up bg-purple-50/30 dark:bg-transparent">
              {fullText}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

