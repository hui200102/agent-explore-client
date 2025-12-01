"use client"

import { useState, useCallback } from "react"
import { MessageHistory, type IMessageStorage } from "@/lib/message-history"
import type { Message } from "@/lib/api-client"

interface UseMessageHistoryOptions {
  storage?: IMessageStorage
}

interface UseMessageHistoryReturn {
  messages: Message[]
  isLoading: boolean
  error: string | null
  loadMessages: (sessionId: string, limit?: number, offset?: number) => Promise<void>
  addMessage: (message: Message) => Promise<void>
  updateMessage: (message: Message) => Promise<void>
  deleteMessage: (sessionId: string, messageId: string) => Promise<void>
  clearSession: (sessionId: string) => Promise<void>
  searchMessages: (sessionId: string, query: string) => Promise<Message[]>
  getStatistics: (sessionId?: string) => Promise<{
    total: number;
    completed: number;
    by_role: Record<string, { count: number; completed: number }>;
  }>
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  getMessage: (messageId: string) => Message | undefined
}

/**
 * Custom hook for managing message history
 * Supports different storage backends
 */
export function useMessageHistory(options?: UseMessageHistoryOptions): UseMessageHistoryReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Create history instance with optional custom storage
  const [history] = useState(() => new MessageHistory(options?.storage))

  /**
   * Load messages for a session
   */
  const loadMessages = useCallback(async (
    sessionId: string,
    limit: number = 50,
    offset: number = 0
  ) => {
    try {
      setIsLoading(true)
      setError(null)
      console.log("[useMessageHistory] Loading messages for session:", sessionId)
      
      const loadedMessages = await history.getMessages(sessionId, limit, offset)
      setMessages(loadedMessages)
      
      console.log("[useMessageHistory] Loaded messages:", loadedMessages.length)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load messages"
      setError(errorMsg)
      console.error("[useMessageHistory] Load error:", err)
    } finally {
      setIsLoading(false)
    }
  }, [history])

  /**
   * Add a new message
   */
  const addMessage = useCallback(async (message: Message) => {
    try {
      console.log("[useMessageHistory] Adding message:", message.message_id)
      
      // Optimistically add to local state
      setMessages((prev) => [...prev, message])
      
      // Save to storage (async, non-blocking)
      await history.addMessage(message)
    } catch (err) {
      console.error("[useMessageHistory] Add error:", err)
      // Rollback on error
      setMessages((prev) => prev.filter(m => m.message_id !== message.message_id))
      throw err
    }
  }, [history])

  /**
   * Update an existing message
   */
  const updateMessage = useCallback(async (message: Message) => {
    try {
      console.log("[useMessageHistory] Updating message:", message.message_id)
      
      // Optimistically update local state
      setMessages((prev) => {
        const nextMessages = prev.map(m => m.message_id === message.message_id ? message : m)
        // 如果是 message_end 触发的完全替换（通常内容变短了，因为去除了中间过程），
        // React 的 reconciliation 有时可能如果不强制刷新，会复用组件状态。
        // 但只要 message 对象引用变了，MessageBubble 就会重渲染。
        // 注意：如果 message_id 相同，我们在这里直接替换整个消息对象
        return nextMessages
      })
      
      // Update storage (async, non-blocking)
      await history.updateMessage(message)
    } catch (err) {
      console.error("[useMessageHistory] Update error:", err)
      // Could rollback here if needed
      throw err
    }
  }, [history])

  /**
   * Find a message by ID
   */
  const getMessage = useCallback((messageId: string): Message | undefined => {
    return messages.find(m => m.message_id === messageId)
  }, [messages])

  /**
   * Delete a message
   */
  const deleteMessage = useCallback(async (sessionId: string, messageId: string) => {
    try {
      console.log("[useMessageHistory] Deleting message:", messageId)
      
      // Optimistically remove from local state
      setMessages((prev) => prev.filter(m => m.message_id !== messageId))
      
      // Delete from storage
      await history.deleteMessage(sessionId, messageId)
    } catch (err) {
      console.error("[useMessageHistory] Delete error:", err)
      throw err
    }
  }, [history])

  /**
   * Clear all messages in a session
   */
  const clearSession = useCallback(async (sessionId: string) => {
    try {
      console.log("[useMessageHistory] Clearing session:", sessionId)
      
      // Clear local state
      setMessages([])
      
      // Clear storage
      await history.clearSession(sessionId)
    } catch (err) {
      console.error("[useMessageHistory] Clear error:", err)
      throw err
    }
  }, [history])

  /**
   * Search messages
   */
  const searchMessages = useCallback(async (sessionId: string, query: string): Promise<Message[]> => {
    try {
      console.log("[useMessageHistory] Searching:", query)
      return await history.searchMessages(sessionId, query)
    } catch (err) {
      console.error("[useMessageHistory] Search error:", err)
      return []
    }
  }, [history])

  /**
   * Get message statistics
   */
  const getStatistics = useCallback(async (sessionId?: string) => {
    try {
      console.log("[useMessageHistory] Getting statistics:", sessionId)
      return await history.getStatistics(sessionId)
    } catch (err) {
      console.error("[useMessageHistory] Statistics error:", err)
      return {
        total: 0,
        completed: 0,
        by_role: {},
      }
    }
  }, [history])

  return {
    messages,
    isLoading,
    error,
    loadMessages,
    addMessage,
    updateMessage,
    deleteMessage,
    clearSession,
    searchMessages,
    getStatistics,
    setMessages,
    getMessage,
  }
}

