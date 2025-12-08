"use client";

import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import { ContentBlockView } from "./content-block-view";
import type { ContentBlock } from "@/lib/message_type";
import { Bot, ChevronDown, ChevronRight, Sparkles } from "lucide-react";

// ============ History Message Props ============

interface HistoryMessageProps {
  content: string;
  contentBlocks?: ContentBlock[];
  className?: string;
}

// ============ History Message Component ============

export const HistoryMessage = memo(function HistoryMessage({
  content,
  contentBlocks,
  className,
}: HistoryMessageProps) {
  const [isProcessExpanded, setIsProcessExpanded] = useState(false);

  // If we have content blocks, separate them into process (thinking) and final output
  // Otherwise fall back to plain text content
  const hasContentBlocks = contentBlocks && contentBlocks.length > 0;

  // Filter blocks
  const processBlocks = contentBlocks?.filter(
    (block) =>
      block.task_id ||
      block.content_type === "thinking" ||
      block.content_type === "plan"
  );

  const finalBlocks = contentBlocks?.filter(
    (block) =>
      !block.task_id &&
      block.content_type !== "thinking" &&
      block.content_type !== "plan"
  );

  const hasProcess = processBlocks && processBlocks.length > 0;
  const hasFinal = finalBlocks && finalBlocks.length > 0;

  const isHiddenBlock = (block: ContentBlock) => {
    const isHideTypes = [
      "thinking",
      "plan",
      "execution_status",
      "evaluation_result",
      "tool_call",
      "tool_output",
    ].includes(block.content_type);

    if (isHideTypes || block.is_intermediate) {
      return true;
    }

    return false;
  }

  return (
    <div
      className={cn(
        "flex gap-4 px-4 py-6 hover:bg-muted/20 transition-colors",
        className
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-sm ring-1 ring-white/20">
        <Bot className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 max-w-3xl">
        {hasContentBlocks ? (
          <div className="space-y-4">
            {/* Process / Thinking Section (Collapsed by default) */}
            {hasProcess && (
              <div className="rounded-lg border bg-muted/30 overflow-hidden">
                <button
                  onClick={() => setIsProcessExpanded(!isProcessExpanded)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Thought Process</span>
                  <div className="ml-auto">
                    {isProcessExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </div>
                </button>

                {isProcessExpanded && (
                  <div className="p-3 pt-0 space-y-3 border-t border-border/50 mt-2">
                    {processBlocks.map((block) => (
                      <ContentBlockView
                        key={block.content_id}
                        block={block}
                        isStreaming={false}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Final Output */}
            {hasFinal ? (
              <div className="space-y-4">
                {finalBlocks.map((block) => {
                  if (
                    isHiddenBlock(block)
                  ) {
                    return null;
                  }
                  
                  return (
                    <ContentBlockView
                      key={block.content_id}
                      block={block}
                      isStreaming={false}
                    />
                  );
                })}
              </div>
            ) : (
              !hasProcess &&
              // Fallback if somehow we have blocks but no final blocks and no process blocks?
              // Or if we only have process blocks (and they are collapsed), we might want to show something?
              // If only process blocks exist, user might want to see them or see "No final output".
              // For now, if only process blocks exist, they are inside the collapsed section.
              // We can leave this empty or show a placeholder if needed.
              null
            )}
          </div>
        ) : (
          // Fallback: render plain text with markdown
          <ContentBlockView
            block={{
              content_id: "fallback",
              content_type: "text",
              sequence: 0,
              is_placeholder: false,
              text: content,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }}
            isStreaming={false}
          />
        )}
      </div>
    </div>
  );
});

export default HistoryMessage;
