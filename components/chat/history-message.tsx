"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { ContentBlockView } from "./content-block-view";
import type { ContentBlock } from "@/lib/message_type";
import { Bot } from "lucide-react";

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
  // If we have content blocks, render them
  // Otherwise fall back to plain text content
  const hasContentBlocks = contentBlocks && contentBlocks.length > 0;

  return (
    <div className={cn("flex gap-4 px-4 py-6 hover:bg-muted/20 transition-colors", className)}>
      {/* Avatar */}
      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-sm ring-1 ring-white/20">
        <Bot className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 max-w-3xl">
        {hasContentBlocks ? (
          <div className="space-y-4">
            {contentBlocks.map((block) => (
              <ContentBlockView
                key={block.content_id}
                block={block}
                isStreaming={false}
              />
            ))}
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

