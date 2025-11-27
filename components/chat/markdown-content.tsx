"use client"

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { cn } from '@/lib/utils'

interface MarkdownContentProps {
  content: string
  className?: string
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      className={cn("prose prose-sm max-w-none", className)}
      components={{
        // 自定义代码块样式
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        code({ inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '')
          const lang = match ? match[1] : ''
          
          return !inline ? (
            <div className="relative group my-3">
              {lang && (
                <div className="absolute right-2 top-2 flex items-center gap-2">
                  <span className="px-2 py-0.5 text-xs bg-zinc-700/50 text-zinc-300 rounded">
                    {lang}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(String(children).replace(/\n$/, ''))
                    }}
                    className="px-2 py-0.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded transition-colors opacity-0 group-hover:opacity-100"
                  >
                    Copy
                  </button>
                </div>
              )}
              <pre
                className={cn(
                  "p-4 rounded-lg bg-zinc-900 dark:bg-zinc-950 border border-zinc-800 overflow-x-auto",
                  lang ? "pt-10" : ""
                )}
              >
                <code
                  className={cn(
                    "text-sm font-mono text-zinc-100",
                    className
                  )}
                  {...props}
                >
                  {children}
                </code>
              </pre>
            </div>
          ) : (
            <code
              className="px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-900 dark:text-red-300 text-[13px] font-mono"
              {...props}
            >
              {children}
            </code>
          )
        },
        // 自定义段落样式
        p({ children }) {
          return <p className="mb-4 last:mb-0 leading-7">{children}</p>
        },
        // 自定义列表样式
        ul({ children }) {
          return <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>
        },
        ol({ children }) {
          return <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>
        },
        // 自定义链接样式
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {children}
            </a>
          )
        },
        // 自定义标题样式
        h1({ children }) {
          return <h1 className="text-2xl font-bold mb-4 mt-6">{children}</h1>
        },
        h2({ children }) {
          return <h2 className="text-xl font-bold mb-3 mt-5">{children}</h2>
        },
        h3({ children }) {
          return <h3 className="text-lg font-bold mb-2 mt-4">{children}</h3>
        },
        // 自定义引用样式
        blockquote({ children }) {
          return (
            <blockquote className="border-l-4 border-zinc-300 dark:border-zinc-700 pl-4 italic my-4">
              {children}
            </blockquote>
          )
        },
        // 自定义表格样式
        table({ children }) {
          return (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                {children}
              </table>
            </div>
          )
        },
        thead({ children }) {
          return <thead className="bg-zinc-50 dark:bg-zinc-900">{children}</thead>
        },
        tbody({ children }) {
          return <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">{children}</tbody>
        },
        tr({ children }) {
          return <tr>{children}</tr>
        },
        th({ children }) {
          return (
            <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              {children}
            </th>
          )
        },
        td({ children }) {
          return <td className="px-4 py-2 text-sm">{children}</td>
        },
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

