"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { apiClient, type StreamEvent } from "@/lib/api-client"

interface UseSSEStreamOptions {
  onEvent: (event: StreamEvent) => void
  onError?: (error: Error) => void
}

interface UseSSEStreamReturn {
  subscribe: (sessionId: string, messageId: string, lastId?: string) => void
  unsubscribe: () => void
  isReconnecting: boolean
  error: string | null
  lastSequence: number  // 最后收到的序列号（用于断点续传）
}

/**
 * Custom hook for managing SSE stream connections
 * Handles automatic reconnection, cleanup, and resuming
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * -断点续传 (Resume from last sequence)
 * - Data integrity checks
 */
export function useSSEStream({ onEvent, onError }: UseSSEStreamOptions): UseSSEStreamReturn {
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSequence, setLastSequence] = useState(0)
  
  const cleanupRef = useRef<(() => void) | null>(null)
  const sessionIdRef = useRef<string>("")
  const messageIdRef = useRef<string>("")
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)

  // 监听来自 StreamEventHandler 的重连请求
  useEffect(() => {
    const handleReconnectRequest = (event: CustomEvent) => {
      const { messageId, lastSequence: seq } = event.detail
      console.log(`[useSSEStream] Reconnect requested for ${messageId} from sequence ${seq}`)
      
      if (messageId === messageIdRef.current) {
        // 触发重连
        reconnectWithBackoff(sessionIdRef.current, messageId, seq.toString())
      }
    }

    window.addEventListener('sse-reconnect', handleReconnectRequest as EventListener)
    return () => {
      window.removeEventListener('sse-reconnect', handleReconnectRequest as EventListener)
    }
  }, [])

  /**
   * 带指数退避的重连
   */
  const reconnectWithBackoff = useCallback((
    sessionId: string,
    messageId: string,
    lastId: string
  ) => {
    const attempt = reconnectAttemptsRef.current
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000) // 最多 30秒
    
    console.log(`[useSSEStream] Reconnecting in ${delay}ms (attempt ${attempt + 1})`)
    setIsReconnecting(true)
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current += 1
      subscribe(sessionId, messageId, lastId)
    }, delay)
  }, [])

  const subscribe = useCallback((
    sessionId: string,
    messageId: string,
    lastId: string = "0"
  ) => {
    // Cleanup existing connection
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }

    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    // Store refs for reconnect
    sessionIdRef.current = sessionId
    messageIdRef.current = messageId

    console.log(`[useSSEStream] Subscribing to message: ${messageId} from sequence: ${lastId}`)
    setError(null)
    setIsReconnecting(false)

    cleanupRef.current = apiClient.subscribeToStream(
      sessionId,
      messageId,
      lastId,
      (event: StreamEvent) => {
        console.log("[useSSEStream] Received event:", event.event_type, "seq:", event.sequence)
        
        // 更新最后收到的序列号
        if (event.sequence) {
          setLastSequence(event.sequence)
        }
        
        // 重置重连计数
        reconnectAttemptsRef.current = 0
        setIsReconnecting(false)
        setError(null)
        
        onEvent(event)
      },
      (err: Error) => {
        console.error("[useSSEStream] Stream error:", err)
        setError(err.message)
        
        if (onError) {
          onError(err)
        }
        
        // 自动重连
        if (reconnectAttemptsRef.current < 5) {
          reconnectWithBackoff(sessionId, messageId, lastSequence.toString())
        } else {
          console.error("[useSSEStream] Max reconnect attempts reached")
          setIsReconnecting(false)
        }
      },
      () => {
        // On reconnecting
        console.log("[useSSEStream] Connection lost, reconnecting...")
        setIsReconnecting(true)
        setError(null)
      }
    )
  }, [onEvent, onError, lastSequence, reconnectWithBackoff])

  const unsubscribe = useCallback(() => {
    console.log("[useSSEStream] Unsubscribing")
    
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    reconnectAttemptsRef.current = 0
    setIsReconnecting(false)
    setError(null)
    setLastSequence(0)
  }, [])

  return {
    subscribe,
    unsubscribe,
    isReconnecting,
    error,
    lastSequence,
  }
}

