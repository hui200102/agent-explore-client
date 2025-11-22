import { useState, useCallback, useEffect } from "react"
import { apiClient, type Session } from "@/lib/api-client"

// Session item with metadata for UI
export interface SessionItem extends Session {
  metadata?: {
    title?: string
    lastMessage?: string
    messageCount?: number
    [key: string]: unknown
  }
}

export interface UseSessionListOptions {
  userId?: string
  autoLoad?: boolean
  status?: "active" | "inactive" | "completed"
}

export function useSessionList(options: UseSessionListOptions = {}) {
  const { userId = "user_default", autoLoad = true, status } = options

  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load sessions from API
  const loadSessions = useCallback(async (limit: number = 50, offset: number = 0) => {
    setIsLoading(true)
    setError(null)

    try {
      console.log("[useSessionList] Loading sessions for user:", userId)
      
      // Use the API to get sessions
      const response = await apiClient.getUserSessions(userId, limit, offset)
      
      // Filter by status if specified
      let filteredSessions = response.sessions
      if (status) {
        filteredSessions = filteredSessions.filter(s => s.status === status)
      }
      
      // Sort by updated_at or created_at (most recent first)
      filteredSessions.sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at).getTime()
        const dateB = new Date(b.updated_at || b.created_at).getTime()
        return dateB - dateA
      })
      
      setSessions(filteredSessions as SessionItem[])
      setTotal(response.total)
      
      console.log("[useSessionList] Loaded sessions:", filteredSessions.length)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load sessions"
      setError(errorMessage)
      console.error("Load sessions error:", err)
    } finally {
      setIsLoading(false)
    }
  }, [userId, status])

  // Create a new session
  const createSession = useCallback(async (title?: string) => {
    setError(null)

    try {
      console.log("[useSessionList] Creating new session")
      
      const response = await apiClient.createSession({
        user_id: userId,
        metadata: { 
          title: title || `New Chat ${new Date().toLocaleString()}`,
          source: "web",
          messageCount: 0,
        }
      })

      // Get the full session details from API
      const fullSession = await apiClient.getSession(response.session_id)
      
      // Add to local state
      setSessions(prev => [fullSession as SessionItem, ...prev])
      setTotal(prev => prev + 1)
      
      console.log("[useSessionList] Created session:", response.session_id)
      return response.session_id
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create session"
      setError(errorMessage)
      console.error("Create session error:", err)
      throw err
    }
  }, [userId])

  // Close a session (mark as completed)
  const closeSession = useCallback(async (sessionId: string) => {
    setError(null)

    try {
      console.log("[useSessionList] Closing session:", sessionId)
      await apiClient.closeSession(sessionId)
      
      // Update in local state
      setSessions(prev => 
        prev.map(session => 
          session.session_id === sessionId
            ? { ...session, status: "completed" as const, updated_at: new Date().toISOString() }
            : session
        )
      )

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to close session"
      setError(errorMessage)
      console.error("Close session error:", err)
      return false
    }
  }, [])

  // Delete a session
  const deleteSession = useCallback(async (sessionId: string) => {
    setError(null)

    try {
      console.log("[useSessionList] Deleting session:", sessionId)
      await apiClient.deleteSession(sessionId)
      
      // Remove from state
      setSessions(prev => prev.filter(s => s.session_id !== sessionId))
      setTotal(prev => Math.max(0, prev - 1))

      console.log("[useSessionList] Deleted session:", sessionId)
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete session"
      setError(errorMessage)
      console.error("Delete session error:", err)
      return false
    }
  }, [])

  // Update session metadata (e.g., title)
  const updateSession = useCallback(async (
    sessionId: string, 
    updates: Partial<SessionItem["metadata"]>
  ) => {
    setError(null)

    try {
      console.log("[useSessionList] Updating session metadata:", sessionId)
      
      // Get current session
      const currentSession = sessions.find(s => s.session_id === sessionId)
      if (!currentSession) {
        throw new Error("Session not found")
      }

      // Merge metadata
      const newMetadata = { ...currentSession.metadata, ...updates }
      
      // Update on server
      await apiClient.updateSessionMetadata(sessionId, newMetadata)
      
      // Update in local state
      setSessions(prev => 
        prev.map(session => 
          session.session_id === sessionId
            ? {
                ...session,
                metadata: newMetadata,
                updated_at: new Date().toISOString(),
              }
            : session
        )
      )

      console.log("[useSessionList] Updated session metadata")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update session"
      setError(errorMessage)
      console.error("Update session error:", err)
      throw err
    }
  }, [sessions])

  // Get session by ID (from local cache or API)
  const getSession = useCallback(async (sessionId: string, forceRefresh: boolean = false) => {
    // Check local cache first
    const cachedSession = sessions.find(s => s.session_id === sessionId)
    if (cachedSession && !forceRefresh) {
      return cachedSession
    }

    // Fetch from API
    try {
      console.log("[useSessionList] Fetching session from API:", sessionId)
      const session = await apiClient.getSession(sessionId)
      
      // Update in cache
      setSessions(prev => {
        const exists = prev.some(s => s.session_id === sessionId)
        if (exists) {
          return prev.map(s => s.session_id === sessionId ? session as SessionItem : s)
        } else {
          return [session as SessionItem, ...prev]
        }
      })
      
      return session as SessionItem
    } catch (err) {
      console.error("[useSessionList] Failed to fetch session:", err)
      return null
    }
  }, [sessions])

  // Refresh a single session
  const refreshSession = useCallback(async (sessionId: string) => {
    return await getSession(sessionId, true)
  }, [getSession])

  // Auto-load on mount if enabled
  useEffect(() => {
    if (autoLoad) {
      loadSessions()
    }
  }, [autoLoad, loadSessions])

  return {
    sessions,
    total,
    isLoading,
    error,
    loadSessions,
    createSession,
    closeSession,
    deleteSession,
    updateSession,
    getSession,
    refreshSession,
  }
}

