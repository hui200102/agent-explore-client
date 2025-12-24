"use client";

import { memo, useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { cn } from "@/lib/utils";
import type { ContentBlock } from "@/lib/message_type";
import {
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  FileJson,
  Globe,
  Loader2,
  ChevronRight,
  Wrench,
  CheckCircle2,
} from "lucide-react";

// ============ Text Content ============

interface TextContentProps {
  text: string;
  isStreaming?: boolean;
  className?: string;
}

const TextContent = memo(function TextContent({
  text,
  isStreaming,
  className,
}: TextContentProps) {
  if (!text) {
    return isStreaming ? (
      <div className="flex items-center gap-2 text-muted-foreground py-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/75 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
        </span>
        <span className="text-sm font-medium animate-pulse">Thinking...</span>
      </div>
    ) : null;
  }

  return (
    <div className={cn(
      "prose prose-neutral dark:prose-invert max-w-none",
      "prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent",
      "prose-headings:font-semibold prose-headings:tracking-tight",
      "prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none",
      className
    )}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // Custom code block rendering
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const isInline = !match;

            if (isInline) {
              return (
                <code
                  className="font-mono text-[0.9em]"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <CodeContent
                text={String(children).replace(/\n$/, "")}
                language={match[1]}
                className="not-prose"
              />
            );
          },
          // Custom link rendering
          a({ href, children, ...props }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-medium hover:underline underline-offset-4 decoration-primary/30 hover:decoration-primary transition-colors"
                {...props}
              >
                {children}
              </a>
            );
          },
          // Custom image rendering
          img({ src, alt, ...props }) {
            return (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={src}
                alt={alt}
                className="max-w-full h-auto rounded-lg"
                style={{
                  maxWidth: "100%",
                  maxHeight: "400px",
                }}
                {...props}
              />
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-1 align-middle" />
      )}
    </div>
  );
});

// ============ Image Content ============

interface ImageContentProps {
  image: {
    url?: string;
    base64?: string;
    format?: string;
    width?: number;
    height?: number;
    summary?: string;
  };
  className?: string;
}

const ImageContent = memo(function ImageContent({
  image,
  className,
}: ImageContentProps) {
  const src = image.url || (image.base64 ? `data:image/${image.format || "png"};base64,${image.base64}` : null);

  if (!src) {
    return (
      <div className="flex items-center gap-2 p-4 bg-muted rounded-lg text-muted-foreground">
        <ImageIcon className="h-5 w-5" />
        <span>Image not available</span>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg overflow-hidden", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Content image"
        className="max-w-full h-auto rounded-lg"
        style={{
          maxWidth: "100%",
          maxHeight: "400px",
        }}
      />
    </div>
  );
});

// ============ Audio Content ============

interface AudioContentProps {
  audio: {
    url?: string;
    base64?: string;
    format?: string;
    duration?: number;
  };
  className?: string;
}

const AudioContent = memo(function AudioContent({
  audio,
  className,
}: AudioContentProps) {
  const src = audio.url || (audio.base64 ? `data:audio/${audio.format || "mp3"};base64,${audio.base64}` : null);

  if (!src) {
    return (
      <div className="flex items-center gap-2 p-4 bg-muted rounded-lg text-muted-foreground">
        <Music className="h-5 w-5" />
        <span>Audio not available</span>
      </div>
    );
  }

  return (
    <div className={cn("p-3 bg-muted/50 rounded-lg", className)}>
      <div className="flex items-center gap-3">
        <Music className="h-5 w-5 text-muted-foreground" />
        <audio controls className="flex-1 h-8">
          <source src={src} type={`audio/${audio.format || "mp3"}`} />
          Your browser does not support the audio element.
        </audio>
        {audio.duration && (
          <span className="text-xs text-muted-foreground">
            {Math.floor(audio.duration / 60)}:{String(Math.floor(audio.duration % 60)).padStart(2, "0")}
          </span>
        )}
      </div>
    </div>
  );
});

// ============ Video Content ============

interface VideoContentProps {
  video: {
    url?: string;
    format?: string;
    duration?: number;
    width?: number;
    height?: number;
  };
  className?: string;
}

const VideoContent = memo(function VideoContent({
  video,
  className,
}: VideoContentProps) {
  if (!video.url) {
    return (
      <div className="flex items-center gap-2 p-4 bg-muted rounded-lg text-muted-foreground">
        <Video className="h-5 w-5" />
        <span>Video not available</span>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg overflow-hidden", className)}>
      <video
        controls
        className="max-w-full h-auto rounded-lg"
        style={{
          maxWidth: video.width ? `${video.width}px` : undefined,
          maxHeight: video.height ? `${video.height}px` : "400px",
        }}
      >
        <source src={video.url} type={`video/${video.format || "mp4"}`} />
        Your browser does not support the video element.
      </video>
    </div>
  );
});

// ============ File Content ============

interface FileContentProps {
  file: {
    url?: string;
    filename?: string;
    mime_type?: string;
    size?: number;
  };
  className?: string;
}

const FileContent = memo(function FileContent({
  file,
  className,
}: FileContentProps) {
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors",
        className
      )}
    >
      <FileText className="h-8 w-8 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          {file.filename || "Download file"}
        </div>
        <div className="text-xs text-muted-foreground">
          {file.mime_type && <span>{file.mime_type}</span>}
          {file.size && <span> • {formatFileSize(file.size)}</span>}
        </div>
      </div>
    </a>
  );
});

// ============ Code Content ============

interface CodeContentProps {
  text: string;
  language?: string;
  className?: string;
}

const CodeContent = memo(function CodeContent({
  text,
  language,
  className,
}: CodeContentProps) {
  return (
    <div className={cn("relative group my-6 rounded-xl border border-border/40 bg-muted/20 overflow-hidden shadow-sm", className)}>
      <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b border-border/40">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/30" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/30" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/30" />
        </div>
        {language && (
          <span className="text-[10px] font-mono font-bold text-muted-foreground/60 uppercase tracking-widest">
            {language}
          </span>
        )}
      </div>
      <div className="p-4 overflow-x-auto scrollbar-none">
        <pre className="m-0">
          <code className="text-[13.5px] font-mono leading-relaxed block min-w-full text-foreground/90">
            {text}
          </code>
        </pre>
      </div>
    </div>
  );
});

// ============ JSON Content ============

interface JsonContentProps {
  text: string;
  className?: string;
}

const JsonContent = memo(function JsonContent({
  text,
  className,
}: JsonContentProps) {
  let formattedJson = text;
  try {
    const parsed = JSON.parse(text);
    formattedJson = JSON.stringify(parsed, null, 2);
  } catch {
    // Keep original text if not valid JSON
  }

  return (
    <div className={cn("relative group", className)}>
      <div className="absolute top-2 right-2 flex items-center gap-2">
        <FileJson className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
          JSON
        </span>
      </div>
      <pre className="p-4 bg-muted rounded-lg overflow-x-auto">
        <code className="text-sm font-mono text-foreground">{formattedJson}</code>
      </pre>
    </div>
  );
});

// ============ HTML Content ============

interface HtmlContentProps {
  text: string;
  className?: string;
}

const HtmlContent = memo(function HtmlContent({
  text,
  className,
}: HtmlContentProps) {
  return (
    <div className={cn("relative", className)}>
      <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
          HTML
        </span>
      </div>
      <div
        className="p-4 bg-white dark:bg-gray-900 rounded-lg border overflow-auto max-h-96"
        dangerouslySetInnerHTML={{ __html: text }}
      />
    </div>
  );
});

// ============ Placeholder Content ============

const PlaceholderContent = memo(function PlaceholderContent() {
  return (
    <div className="flex items-center gap-2 p-4 bg-muted/30 rounded-lg animate-pulse">
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Loading content...</span>
    </div>
  );
});

// ============ Thinking Content (Cursor Style) ============

interface ThinkingContentProps {
  text: string;
  isStreaming?: boolean;
  createdAt?: string;
  className?: string;
}

const ThinkingContent = memo(function ThinkingContent({
  text,
  isStreaming,
  createdAt,
  className,
}: ThinkingContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTimeRef = useRef<number>(0);
  
  // Initialize start time
  useEffect(() => {
    if (createdAt) {
      startTimeRef.current = new Date(createdAt).getTime();
    } else if (startTimeRef.current === 0) {
      startTimeRef.current = Date.now();
    }
  }, [createdAt]);
  
  // Track elapsed time while streaming
  useEffect(() => {
    if (!isStreaming) return;
    
    // Set initial elapsed time
    if (startTimeRef.current > 0) {
      setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }
    
    const timer = setInterval(() => {
      if (startTimeRef.current > 0) {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isStreaming]);

  // Format time display
  const timeDisplay = elapsedTime > 0 ? `${elapsedTime}s` : '';

  // If streaming with no content yet, show minimal Cursor-style indicator
  if (!text && isStreaming) {
    return (
      <div className={cn("my-4", className)}>
        <div className="inline-flex items-center gap-2 text-muted-foreground/50 text-[13px] font-medium tracking-tight bg-muted/30 px-3 py-1.5 rounded-full border border-border/20">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Thinking{timeDisplay ? ` (${timeDisplay})` : '...'}</span>
        </div>
      </div>
    );
  }

  if (!text) return null;

  return (
    <div className={cn("my-4", className)}>
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-2 cursor-pointer group select-none text-muted-foreground/50 hover:text-muted-foreground/80 transition-all bg-muted/20 hover:bg-muted/40 px-3 py-1.5 rounded-full border border-border/20 shadow-sm"
      >
        <div className="transition-transform duration-300 ease-in-out" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
        
        <span className="text-[13px] font-medium tracking-tight">
          {isStreaming ? (
            <>Thinking{timeDisplay ? ` (${timeDisplay})` : '...'}</>
          ) : (
            <>Thought{timeDisplay ? ` for ${timeDisplay}` : ''}</>
          )}
        </span>
      </div>

      {isExpanded && (
        <div className="mt-3 ml-2 animate-fade-in-up">
          <div className="text-[14px] text-muted-foreground/60 leading-relaxed whitespace-pre-wrap pl-4 border-l border-border/40 italic">
            {text}
            {isStreaming && <span className="inline-block w-1 h-3 bg-muted-foreground/30 animate-pulse ml-1 align-middle" />}
          </div>
        </div>
      )}
    </div>
  );
});

// ============ Tool Call Content (Cursor Style) ============

interface ToolCallContentProps {
  block: ContentBlock;
  className?: string;
}

const ToolCallContent = memo(function ToolCallContent({
  block,
  className,
}: ToolCallContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const toolName = block.metadata?.tool_name as string || "unknown_tool";
  const toolArgs = block.metadata?.tool_args || {};

  return (
    <div className={cn("my-3", className)}>
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-2 cursor-pointer group select-none text-muted-foreground/60 hover:text-foreground transition-all bg-muted/20 hover:bg-muted/40 px-3 py-1.5 rounded-full border border-border/20 shadow-sm"
      >
        <div className="transition-transform duration-300 ease-in-out" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
        
        <Wrench className="h-3.5 w-3.5 text-indigo-500/70" />
        
        <span className="text-[13px] font-medium tracking-tight">
          Calling <span className="font-bold text-foreground/80">{toolName}</span>
        </span>
      </div>

      {isExpanded && (
        <div className="mt-3 ml-2 animate-fade-in-up">
          <div className="bg-muted/30 backdrop-blur-sm rounded-xl p-4 text-[12px] font-mono border border-border/40 pl-4 border-l-2 border-l-indigo-500/30 max-h-[400px] overflow-y-auto scrollbar-none shadow-inner">
            <pre className="text-muted-foreground/80 leading-relaxed">
              {JSON.stringify(toolArgs, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
});

const ToolOutputContent = memo(function ToolOutputContent({
  block,
  className,
}: ToolOutputContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const toolName = block.metadata?.tool_name as string || "Tool";

  return (
    <div className={cn("my-3", className)}>
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-2 cursor-pointer group select-none text-muted-foreground/60 hover:text-foreground transition-all bg-muted/20 hover:bg-muted/40 px-3 py-1.5 rounded-full border border-border/20 shadow-sm"
      >
        <div className="transition-transform duration-300 ease-in-out" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
        
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500/70" />
        
        <span className="text-[13px] font-medium tracking-tight">
          Result from <span className="font-bold text-foreground/80">{toolName}</span>
        </span>
      </div>

      {isExpanded && (
        <div className="mt-3 ml-2 animate-fade-in-up">
          <div className="bg-muted/10 backdrop-blur-sm rounded-xl p-4 text-[12px] font-mono border border-border/40 pl-4 border-l-2 border-l-emerald-500/30 max-h-[400px] overflow-y-auto scrollbar-none shadow-inner">
            <pre className="text-muted-foreground/80 whitespace-pre-wrap break-words leading-relaxed">
              {block.text}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
});

// ============ Plan Content (Cursor Style - Collapsible) ============

interface PlanContentProps {
  block: ContentBlock;
  className?: string;
}

const PlanContent = memo(function PlanContent({
  block,
  className,
}: PlanContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const steps = (block.metadata?.steps as string[]) || [];
  
  return (
    <div className={cn("my-2", className)}>
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-1.5 cursor-pointer group select-none text-muted-foreground/60 hover:text-muted-foreground/80 transition-colors"
      >
        <div className="transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          <ChevronRight className="h-4 w-4" />
        </div>
        
        <span className="text-sm">
          Plan
          {steps.length > 0 && (
            <span className="text-muted-foreground/50 ml-1">({steps.length} steps)</span>
          )}
        </span>
      </div>

      {isExpanded && (
        <div className="mt-2 ml-5 animate-in slide-in-from-top-2 duration-200">
          {steps.length > 0 ? (
            <div className="space-y-1.5 pl-3 border-l-2 border-muted-foreground/10">
              {steps.map((step, index) => (
                <div key={index} className="flex items-start gap-2 text-sm text-muted-foreground/70">
                  <span className="text-muted-foreground/40 font-mono text-xs mt-0.5">{index + 1}.</span>
                  <span className="leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground/70 pl-3 border-l-2 border-muted-foreground/10">
              {block.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// ============ Main Content Block View ============

interface ContentBlockViewProps {
  block: ContentBlock;
  isStreaming?: boolean;
  className?: string;
}

export const ContentBlockView = memo(function ContentBlockView({
  block,
  isStreaming,
  className,
}: ContentBlockViewProps) {
  // Placeholder handling
  if (block.is_placeholder) {
    return <PlaceholderContent />;
  }

  // Render based on content type
  switch (block.content_type) {
    case "text":
    case "markdown":
      return (
        <TextContent
          text={block.text || ""}
          isStreaming={isStreaming}
          className={className}
        />
      );

    case "image":
      if (block.is_intermediate) {
        return block.image ? (
          <div className={cn("flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm max-w-full overflow-hidden", className)}>
            <ImageIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <a 
              href={block.image.url} 
              target="_blank" 
              rel="noreferrer" 
              className="text-primary hover:underline font-medium truncate"
            >
              Generated Image
            </a>
            {block.image.summary && (
              <span className="text-muted-foreground truncate border-l pl-2 ml-2 text-xs flex-1">
                {block.image.summary}
              </span>
            )}
          </div>
        ) : null;
      }

      return block.image ? (
        <ImageContent image={block.image} className={className} />
      ) : null;

    case "audio":
      return block.audio ? (
        <AudioContent audio={block.audio} className={className} />
      ) : null;

    case "video":
      return block.video ? (
        <VideoContent video={block.video} className={className} />
      ) : null;

    case "file":
      return block.file ? (
        <FileContent file={block.file} className={className} />
      ) : null;

    case "code":
      return (
        <CodeContent
          text={block.text || ""}
          language={block.metadata?.language as string}
          className={className}
        />
      );

    case "json":
      return <JsonContent text={block.text || ""} className={className} />;

    case "html":
      return <HtmlContent text={block.text || ""} className={className} />;

    // Special distinct styles for agent internal states (Cursor-style)
    case "thinking":
      return (
        <ThinkingContent 
          text={block.text || ""} 
          isStreaming={isStreaming} 
          createdAt={block.created_at}
          className={className} 
        />
      );

    case "plan":
      return <PlanContent block={block} className={className} />;

    case "tool_call":
      return <ToolCallContent block={block} className={className} />;

    case "tool_output":
      return <ToolOutputContent block={block} className={className} />;
    
    case "execution_status":
    case "evaluation_result":
      return (
        <div className={cn(
          "text-xs font-mono bg-muted/30 px-3 py-2 rounded-md border border-muted/50 text-muted-foreground my-2", 
          className
        )}>
          <div className="flex items-center gap-2 mb-1 opacity-70 text-[10px] uppercase tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-current" />
            {block.content_type.replace('_', ' ')}
          </div>
          <div className="whitespace-pre-wrap font-medium">
            {block.text}
          </div>
        </div>
      );

    default:
      // Fallback: treat as text
      return block.text ? (
        <TextContent text={block.text} isStreaming={isStreaming} className={className} />
      ) : null;
  }
});

export default ContentBlockView;

