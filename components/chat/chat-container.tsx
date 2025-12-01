"use client"

import { useEffect, useRef, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MessageBubble } from "./message-bubble"
import { ChatInput } from "./chat-input"
import { ToolCallIndicator } from "./tool-call-indicator"
import { SessionStorage } from "@/lib/session-storage"
import { useSSEStream } from "@/hooks/use-sse-stream"
import { useMessageHistory } from "@/hooks/use-message-history"
import { StreamEventHandler } from "@/lib/stream-event-handler"
import { apiClient, type Message } from "@/lib/api-client"
import { createContentBlocksFromUploadedFiles } from "@/lib/content-block-utils"
import type { UploadedFileInfo } from "./chat-input"
import { Loader2, AlertCircle, Bot } from "lucide-react"

interface ChatContainerProps {
  userId?: string
  sessionId: string | null
  onSessionReady?: (sessionId: string) => void
  onMessageSent?: (sessionId: string, messageText: string, messageCount: number) => void
}

interface ToolCallState {
  toolName?: string
  status?: string
}

export function ChatContainer({ 
  sessionId: externalSessionId,
  onSessionReady,
  onMessageSent,
}: ChatContainerProps) {
  const [sessionId, setSessionId] = useState<string | null>(externalSessionId)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [toolCallState, setToolCallState] = useState<ToolCallState | null>(null)
  
  const scrollRef = useRef<HTMLDivElement>(null)
  
  // Use message history hook
  const messageHistory = useMessageHistory()
  const { messages, setMessages } = messageHistory
  
  // Create event handler instance (only once)
  const eventHandlerRef = useRef<StreamEventHandler | null>(null)
  if (eventHandlerRef.current == null) {
    eventHandlerRef.current = new StreamEventHandler(messages, setMessages, setToolCallState)
  }
  
  // Update handler's messages reference when messages change
  useEffect(() => {
    eventHandlerRef.current?.updateMessages(messages)
  }, [messages])
  
  // Use SSE stream hook
  const sseStream = useSSEStream({
    onEvent: (event) => {
      console.log("Received event:", event.event_type, event)
      eventHandlerRef.current?.handle(event)
    },
    onError: (err) => {
      console.error("Stream error:", err)
      setError("Connection failed after multiple attempts. Please refresh the page.")
    },
  })

  // Sync with external sessionId and load messages
  useEffect(() => {
    let mounted = true

    const loadSession = async () => {
      if (!externalSessionId) {
        setSessionId(null)
        setMessages([])
        setIsConnected(false)
        return
      }

      try {
        if (!mounted) return
        
        setError(null)
        setSessionId(externalSessionId)

        // Verify session exists
        await apiClient.getSession(externalSessionId)
        
        if (!mounted) return

        // Load messages for this session
        await messageHistory.loadMessages(externalSessionId)
        
        if (mounted) {
          setIsConnected(true)
          SessionStorage.setSessionId(externalSessionId)
          onSessionReady?.(externalSessionId)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load session")
          console.error("Session load error:", err)
          setIsConnected(false)
        }
      }
    }

    loadSession()

    // Cleanup on unmount or session change
    return () => {
      mounted = false
      sseStream.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalSessionId]) // Reload when sessionId changes

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, toolCallState])

  // Subscribe to message stream
  const subscribeToMessage = (messageId: string) => {
    if (!sessionId) return
    sseStream.subscribe(sessionId, messageId, "0")
  }

  const handleSendMessage = async (content: string, files?: UploadedFileInfo[]) => {
    if (!sessionId) {
      setError("No active session")
      return
    }

    try {
      // Build content blocks using utility function (with URLs, not base64)
      const contentBlocks = createContentBlocksFromUploadedFiles(content, files)
      
      // Must have at least one content block
      if (contentBlocks.length === 0) {
        return
      }

      // Send message to backend with new format
      console.log("Sending message with content_blocks:", contentBlocks)
      const response = await apiClient.sendMessage(sessionId, {
        content_blocks: contentBlocks,
        role: "user",
      })

      console.log("Send message response:", response)

      // Add messages from response
      setMessages((prev) => {
        const newMessages: Message[] = [...prev]
        
        // Add user message from response (it includes the full content_blocks)
        newMessages.push(response.message)

        // Create assistant message placeholder (if assistant_message_id exists)
        if (response.assistant_message_id) {
          const assistantMessage: Message = {
            message_id: response.assistant_message_id,
            session_id: sessionId,
            role: "assistant",
            content_blocks: [],
            pending_tasks: {},
            completed_tasks: [],  // 新增：已完成任务列表
            is_complete: false,
            sequence_counter: 0,  // 新增：事件序列号
            content_sequence: 0,  // 新增：内容序列号
            parent_message_id: response.message_id,
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          newMessages.push(assistantMessage)
        }

        return newMessages
      })

      // Subscribe to assistant message stream (if exists)
      if (response.assistant_message_id) {
        subscribeToMessage(response.assistant_message_id)
      }

      // Notify parent about message sent (for updating session metadata)
      if (onMessageSent) {
        // Extract text from content blocks for display
        const displayText = response.message.content_blocks
          .filter(block => block.content_type === 'text')
          .map(block => block.text)
          .join(' ') || '[Message sent]'
        const messageCount = messages.length + (response.assistant_message_id ? 2 : 1)
        onMessageSent(sessionId, displayText, messageCount)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message")
      console.error("Send message error:", err)
      
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => !m.message_id.startsWith("temp_")))
    }
  }


  if (messageHistory.isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-muted/20 to-background">
        <div className="text-center space-y-4 animate-fade-in-up">
          <div className="relative">
            <div className="absolute inset-0 blur-xl bg-primary/20 rounded-full animate-pulse"></div>
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto relative" />
          </div>
          <p className="text-sm font-medium text-foreground">Loading session...</p>
        </div>
      </div>
    )
  }

  if (error && !isConnected) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-muted/20 to-background">
        <Card className="max-w-md shadow-xl border-destructive/20 animate-bounce-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Connection Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="w-full shadow-md hover:shadow-lg transition-shadow">
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show message when no session exists
  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-muted/20 to-background">
        <div className="text-center space-y-6 max-w-md animate-fade-in-up px-6">
          <div className="relative">
            <div className="absolute inset-0 blur-2xl bg-primary/20 rounded-full animate-pulse"></div>
            <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-2xl shadow-primary/30 relative">
              <Bot className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground mb-3">Welcome to AI Assistant</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              To get started, please create a new session by clicking the <span className="font-semibold text-primary">&quot;+ New Chat&quot;</span> button in the sidebar.
            </p>
          </div>
          <div className="pt-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
              <span className="text-xs font-medium text-primary">Ready to chat</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="h-full">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full px-6">
              <div className="text-center space-y-8 max-w-2xl animate-fade-in-up">
                <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center shadow-sm ring-1 ring-primary/10">
                  <Bot className="h-10 w-10 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-bold text-foreground tracking-tight">How can I help you today?</h3>
                  <p className="text-base text-muted-foreground max-w-md mx-auto">
                    I&apos;m here to assist with analysis, coding, writing, and more.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col pb-8">
              {messages.map((message) => (
                <MessageBubble key={message.message_id} message={message} />
              ))}
              
              {/* Tool call indicator - shows temporarily when tool is being called */}
              {toolCallState && (
                <div className="py-6 animate-fade-in-up max-w-4xl mx-auto px-6 w-full">
                  <div className="flex gap-6">
                    <div className="w-8 flex-shrink-0" />
                    <div className="flex-1">
                      <ToolCallIndicator 
                        toolName={toolCallState.toolName}
                        status={toolCallState.status}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-6 bg-gradient-to-t from-background via-background to-background/0 z-10">
        <div className="max-w-4xl mx-auto">
          <ChatInput 
            onSend={handleSendMessage} 
            disabled={!isConnected || sseStream.isReconnecting}
            placeholder={sseStream.isReconnecting ? "Reconnecting..." : "Ask me anything..."}
          />
        </div>
        <div className="text-center mt-2">
          <p className="text-[10px] text-muted-foreground/40">
            AI can make mistakes. Please verify important information.
          </p>
        </div>
      </div>

      {/* Reconnecting indicator */}
      {sseStream.isReconnecting && (
        <div className="px-4 py-2 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 text-xs border-t border-yellow-500/20 flex items-center justify-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Reconnecting...</span>
        </div>
      )}

      {/* Error message */}
      {(error || sseStream.error || messageHistory.error) && isConnected && !sseStream.isReconnecting && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-xs border-t border-destructive/20 flex items-center justify-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>{error || sseStream.error || messageHistory.error}</span>
        </div>
      )}
    </div>
  )
}

