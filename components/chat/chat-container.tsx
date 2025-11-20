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
import { Loader2, AlertCircle, RefreshCw } from "lucide-react"

interface ChatContainerProps {
  userId?: string
}

interface ToolCallState {
  toolName?: string
  status?: string
}

export function ChatContainer({ userId = "user_default" }: ChatContainerProps) {
  const [sessionId, setSessionId] = useState<string | null>(null)
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

  // Initialize session from localStorage or create new (only once on mount)
  useEffect(() => {
    let mounted = true

    const initSession = async () => {
      try {
        if (!mounted) return
        
        setError(null)

        // Try to get session from localStorage
        const storedSessionId = SessionStorage.getSessionId()
        
        if (storedSessionId) {
          console.log("Found stored session:", storedSessionId)
          try {
            // Verify session exists and load messages using history hook
            await apiClient.getSession(storedSessionId)
            
            if (!mounted) return
            setSessionId(storedSessionId)
            
            // Load messages after setting sessionId
            await messageHistory.loadMessages(storedSessionId)
          } catch (err) {
            // Session invalid, clear and create new
            console.warn("Stored session invalid, creating new session", err)
            SessionStorage.clearSessionId()
            await createNewSession()
          }
        } else {
          // No stored session, create new
          await createNewSession()
        }

        if (mounted) {
          setIsConnected(true)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to initialize session")
          console.error("Session initialization error:", err)
        }
      }
    }

    const createNewSession = async () => {
      const sessionResponse = await apiClient.createSession({
        user_id: userId,
        metadata: { source: "web", created_at: new Date().toISOString() }
      })
      console.log("Created new session:", sessionResponse)
      
      if (mounted) {
        setSessionId(sessionResponse.session_id)
        SessionStorage.setSessionId(sessionResponse.session_id)
      }
    }

    initSession()

    // Cleanup on unmount
    return () => {
      mounted = false
      sseStream.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

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

  const handleSendMessage = async (content: string) => {
    if (!sessionId) {
      setError("No active session")
      return
    }

    try {
      // Add user message optimistically
      const tempUserMessage: Message = {
        message_id: `temp_user_${Date.now()}`,
        session_id: sessionId,
        role: "user",
        text: content,
        content_blocks: [],
        pending_tasks: {},
        is_complete: true,
        parent_message_id: null,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, tempUserMessage])

      // Send message to backend
      console.log("Sending message:", content)
      const response = await apiClient.sendMessage(sessionId, {
        content,
        type: "text",
      })

      console.log("Send message response:", response)

      // Replace temp user message with real one and add assistant placeholder
      setMessages((prev) => {
        // Remove temp message
        const withoutTemp = prev.filter((m) => m.message_id !== tempUserMessage.message_id)
        
        // Create real user message
        const realUserMessage: Message = {
          message_id: response.user_message_id,
          session_id: sessionId,
          role: "user",
          text: content,
          content_blocks: [],
          pending_tasks: {},
          is_complete: true,
          parent_message_id: null,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        // Create assistant message placeholder
        const assistantMessage: Message = {
          message_id: response.assistant_message_id,
          session_id: sessionId,
          role: "assistant",
          text: "",
          content_blocks: [],
          pending_tasks: {},
          is_complete: false,
          parent_message_id: response.user_message_id,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        return [...withoutTemp, realUserMessage, assistantMessage]
      })

      // Subscribe to assistant message stream
      subscribeToMessage(response.assistant_message_id)

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message")
      console.error("Send message error:", err)
      
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => !m.message_id.startsWith("temp_")))
    }
  }

  // Clear session and start new
  const handleNewSession = () => {
    SessionStorage.clearSessionId()
    setSessionId(null)
    setMessages([])
    setToolCallState(null)
    window.location.reload()
  }

  if (messageHistory.isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Loading session...</p>
        </div>
      </div>
    )
  }

  if (error && !isConnected) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Connection Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Session info bar */}
      <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Session: {sessionId?.slice(0, 8)}...
        </span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleNewSession}
          className="h-7 text-xs"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          New Session
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">Start a conversation</p>
              <p className="text-sm">Send a message to begin chatting with the AI assistant</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message.message_id} message={message} />
            ))}
            
            {/* Tool call indicator - shows temporarily when tool is being called */}
            {toolCallState && (
              <ToolCallIndicator 
                toolName={toolCallState.toolName}
                status={toolCallState.status}
                className="ml-11"
              />
            )}
          </div>
        )}
      </ScrollArea>

      <ChatInput 
        onSend={handleSendMessage} 
        disabled={!isConnected || sseStream.isReconnecting}
        placeholder={sseStream.isReconnecting ? "Reconnecting..." : "Type your message..."}
      />

      {/* Reconnecting indicator */}
      {sseStream.isReconnecting && (
        <div className="px-4 py-2 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 text-sm border-t flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          Reconnecting to server...
        </div>
      )}

      {/* Error message */}
      {(error || sseStream.error || messageHistory.error) && isConnected && !sseStream.isReconnecting && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm border-t">
          {error || sseStream.error || messageHistory.error}
        </div>
      )}
    </div>
  )
}
