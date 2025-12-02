"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { cn } from "@/lib/utils";
import type { ContentBlock, ContentType } from "@/lib/message_type";
import {
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  Code2,
  FileJson,
  Globe,
  Loader2,
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
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Generating...</span>
      </div>
    ) : null;
  }

  return (
    <div className={cn("prose dark:prose-invert max-w-none", className)}>
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
                  className="px-1.5 py-0.5 bg-muted rounded text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <div className="relative group">
                <div className="absolute top-2 right-2 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded opacity-70">
                  {match[1]}
                </div>
                <pre className="!mt-0 !mb-0">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },
          // Custom link rendering
          a({ href, children, ...props }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
                {...props}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />
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
          maxWidth: image.width ? `${image.width}px` : undefined,
          maxHeight: image.height ? `${image.height}px` : "400px",
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
    <div className={cn("relative group", className)}>
      <div className="absolute top-2 right-2 flex items-center gap-2">
        {language && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
            {language}
          </span>
        )}
      </div>
      <pre className="p-4 bg-muted rounded-lg overflow-x-auto">
        <code className="text-sm font-mono">{text}</code>
      </pre>
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

    // Temporary content types (usually not displayed to users)
    case "thinking":
    case "plan":
    case "execution_status":
    case "evaluation_result":
      return (
        <div className={cn("text-sm text-muted-foreground italic", className)}>
          {block.text}
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

