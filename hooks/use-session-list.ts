import { useState, useCallback, useEffect } from "react"
import { apiClient } from "@/lib/api-client"
import { SessionStorage, type StoredSession } from "@/lib/session-storage"

export type SessionItem = StoredSession

export interface UseSessionListOptions {
  userId?: string
  autoLoad?: boolean
}

export function useSessionList(options: UseSessionListOptions = {}) {
  const { userId = "user_default", autoLoad = true } = options

  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load sessions from localStorage
  const loadSessions = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // TODO: Replace with actual API call when backend supports listing sessions
      // const response = await apiClient.getUserSessions(userId)
      // setSessions(response.sessions)

      // For now, load from localStorage
      const storedSessions = SessionStorage.getSessions()
      
      // Filter by user if needed
      const userSessions = storedSessions.filter(s => s.user_id === userId)
      
      setSessions(userSessions)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load sessions"
      setError(errorMessage)
      console.error("Load sessions error:", err)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Create a new session
  const createSession = useCallback(async (title?: string) => {
    setError(null)

    try {
      const response = await apiClient.createSession({
        user_id: userId,
        metadata: { 
          title: title || `New Chat ${new Date().toLocaleString()}`,
          source: "web",
          created_at: new Date().toISOString() 
        }
      })

      const newSession: SessionItem = {
        session_id: response.session_id,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          title: title || `New Chat ${new Date().toLocaleString()}`,
          messageCount: 0,
        },
      }

      // Save to localStorage
      SessionStorage.saveSession(newSession)
      
      // Update state
      setSessions(prev => [newSession, ...prev])
      
      return response.session_id
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create session"
      setError(errorMessage)
      console.error("Create session error:", err)
      throw err
    }
  }, [userId])

  // Delete a session
  const deleteSession = useCallback(async (sessionId: string) => {
    setError(null)

    try {
      // TODO: Implement actual delete when backend supports it
      // await apiClient.deleteSession(sessionId)
      
      // Remove from localStorage
      SessionStorage.removeSession(sessionId)
      
      // Remove from state
      setSessions(prev => prev.filter(s => s.session_id !== sessionId))

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete session"
      setError(errorMessage)
      console.error("Delete session error:", err)
      return false
    }
  }, [])

  // Update session metadata (e.g., title)
  const updateSession = useCallback((sessionId: string, updates: Partial<SessionItem["metadata"]>) => {
    // Update in localStorage
    SessionStorage.updateSessionMetadata(sessionId, updates)
    
    // Update in state
    setSessions(prev => 
      prev.map(session => 
        session.session_id === sessionId
          ? {
              ...session,
              metadata: { ...session.metadata, ...updates },
              updated_at: new Date().toISOString(),
            }
          : session
      )
    )
  }, [])

  // Get session by ID
  const getSession = useCallback((sessionId: string) => {
    return sessions.find(s => s.session_id === sessionId)
  }, [sessions])

  // Auto-load on mount if enabled
  useEffect(() => {
    if (autoLoad) {
      loadSessions()
    }
  }, [autoLoad, loadSessions])

  return {
    sessions,
    isLoading,
    error,
    loadSessions,
    createSession,
    deleteSession,
    updateSession,
    getSession,
  }
}

