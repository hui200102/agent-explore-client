"use client"

import { useCallback, useRef, useState } from "react"
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
}

/**
 * Custom hook for managing SSE stream connections
 * Handles automatic reconnection and cleanup
 */
export function useSSEStream({ onEvent, onError }: UseSSEStreamOptions): UseSSEStreamReturn {
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

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

    console.log(`[useSSEStream] Subscribing to message: ${messageId}`)
    setError(null)
    setIsReconnecting(false)

    cleanupRef.current = apiClient.subscribeToStream(
      sessionId,
      messageId,
      lastId,
      (event: StreamEvent) => {
        console.log("[useSSEStream] Received event:", event.event_type)
        setIsReconnecting(false) // Clear reconnecting state on successful event
        setError(null)
        onEvent(event)
      },
      (err: Error) => {
        console.error("[useSSEStream] Stream error:", err)
        setIsReconnecting(false)
        setError(err.message)
        if (onError) {
          onError(err)
        }
      },
      () => {
        // On reconnecting
        console.log("[useSSEStream] Reconnecting...")
        setIsReconnecting(true)
        setError(null)
      }
    )
  }, [onEvent, onError])

  const unsubscribe = useCallback(() => {
    console.log("[useSSEStream] Unsubscribing")
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }
    setIsReconnecting(false)
    setError(null)
  }, [])

  return {
    subscribe,
    unsubscribe,
    isReconnecting,
    error,
  }
}

