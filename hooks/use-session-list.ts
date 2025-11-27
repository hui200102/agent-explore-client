import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { apiClient, type Session } from "@/lib/api-client"
import { SessionStorageManager } from "@/lib/session-storage"

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
  cacheEnabled?: boolean
  syncAcrossTabs?: boolean
}

// Cache for sessions with TTL
interface SessionCache {
  data: SessionItem[]
  total: number
  timestamp: number
  userId: string
  status?: string
}

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const sessionCacheMap = new Map<string, SessionCache>()

export function useSessionList(options: UseSessionListOptions = {}) {
  const { 
    userId = "user_default", 
    autoLoad = true, 
    status,
    cacheEnabled = true,
    syncAcrossTabs = true
  } = options

  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false) // 新增：区分刷新和初始加载
  const [error, setError] = useState<string | null>(null)
  
  // Track ongoing requests to prevent duplicates
  const loadingRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Track if this is the first load
  const isFirstLoadRef = useRef(true)

  /**
   * Get cache key for sessions
   */
  const getCacheKey = useCallback((userId: string, status?: string) => {
    return `${userId}_${status || 'all'}`
  }, [])

  /**
   * Get cached sessions if available and valid
   */
  const getCachedSessions = useCallback((): SessionCache | null => {
    if (!cacheEnabled) return null

    const cacheKey = getCacheKey(userId, status)
    const cached = sessionCacheMap.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("[useSessionList] Using cached sessions")
      return cached
    }

    return null
  }, [cacheEnabled, getCacheKey, userId, status])

  /**
   * Set sessions cache
   */
  const setCachedSessions = useCallback((data: SessionItem[], total: number) => {
    if (!cacheEnabled) return

    const cacheKey = getCacheKey(userId, status)
    sessionCacheMap.set(cacheKey, {
      data,
      total,
      timestamp: Date.now(),
      userId,
      status
    })
  }, [cacheEnabled, getCacheKey, userId, status])

  /**
   * Invalidate cache
   */
  const invalidateCache = useCallback(() => {
    const cacheKey = getCacheKey(userId, status)
    sessionCacheMap.delete(cacheKey)
    console.log("[useSessionList] Cache invalidated")
  }, [getCacheKey, userId, status])

  // Load sessions from API with caching and abort support
  const loadSessions = useCallback(async (
    limit: number = 50, 
    offset: number = 0,
    forceRefresh: boolean = false
  ) => {
    // Prevent concurrent requests
    if (loadingRef.current) {
      console.log("[useSessionList] Request already in progress, skipping")
      return
    }

    // Check cache first
    if (!forceRefresh) {
      const cached = getCachedSessions()
      if (cached) {
        setSessions(cached.data)
        setTotal(cached.total)
        isFirstLoadRef.current = false // 标记已完成首次加载
        return
      }
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    loadingRef.current = true
    
    // 区分首次加载和刷新
    const isFirstLoad = isFirstLoadRef.current && sessions.length === 0
    if (isFirstLoad) {
      setIsLoading(true)
    } else {
      setIsRefreshing(true)
    }
    
    setError(null)

    // Create new abort controller
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      console.log("[useSessionList] Loading sessions for user:", userId)
      
      // Use the API to get sessions
      const response = await apiClient.getUserSessions(userId, limit, offset)
      
      // Check if request was aborted
      if (abortController.signal.aborted) {
        console.log("[useSessionList] Request was aborted")
        return
      }
      
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
      
      const sessionItems = filteredSessions as SessionItem[]
      
      setSessions(sessionItems)
      setTotal(response.total)
      
      // Update cache
      setCachedSessions(sessionItems, response.total)
      
      // 标记已完成首次加载
      isFirstLoadRef.current = false
      
      console.log("[useSessionList] Loaded sessions:", sessionItems.length)

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log("[useSessionList] Request was aborted")
        return
      }
      
      const errorMessage = err instanceof Error ? err.message : "Failed to load sessions"
      setError(errorMessage)
      console.error("[useSessionList] Load error:", err)
    } finally {
      loadingRef.current = false
      setIsLoading(false)
      setIsRefreshing(false)
      abortControllerRef.current = null
    }
  }, [userId, status, getCachedSessions, setCachedSessions, sessions.length])

  // Create a new session with optimistic update
  const createSession = useCallback(async (title?: string) => {
    setError(null)

    // Generate optimistic session
    const optimisticId = `temp_${Date.now()}`
    const now = new Date().toISOString()
    const sessionTitle = title || `New Chat ${new Date().toLocaleString()}`
    
    const optimisticSession: SessionItem = {
      session_id: optimisticId,
      user_id: userId,
      status: "active",
      created_at: now,
      updated_at: now,
      metadata: {
        title: sessionTitle,
        source: "web",
        messageCount: 0,
      }
    }

    // Optimistic update
    setSessions(prev => [optimisticSession, ...prev])
    setTotal(prev => prev + 1)
    
    // Invalidate cache
    invalidateCache()

    try {
      console.log("[useSessionList] Creating new session")
      
      const response = await apiClient.createSession({
        user_id: userId,
        metadata: { 
          title: sessionTitle,
          source: "web",
          messageCount: 0,
        }
      })

      // Get the full session details from API
      const fullSession = await apiClient.getSession(response.session_id)
      
      // Replace optimistic session with real one
      setSessions(prev => 
        prev.map(s => s.session_id === optimisticId ? fullSession as SessionItem : s)
      )
      
      console.log("[useSessionList] Created session:", response.session_id)
      return response.session_id
    } catch (err) {
      // Rollback optimistic update
      setSessions(prev => prev.filter(s => s.session_id !== optimisticId))
      setTotal(prev => Math.max(0, prev - 1))
      
      const errorMessage = err instanceof Error ? err.message : "Failed to create session"
      setError(errorMessage)
      console.error("[useSessionList] Create error:", err)
      throw err
    }
  }, [userId, invalidateCache])

  // Close a session (mark as completed) with optimistic update
  const closeSession = useCallback(async (sessionId: string) => {
    setError(null)

    // Store old session for rollback
    const oldSession = sessions.find(s => s.session_id === sessionId)
    if (!oldSession) {
      console.warn("[useSessionList] Session not found:", sessionId)
      return false
    }

    // Optimistic update
    const now = new Date().toISOString()
    setSessions(prev => 
      prev.map(session => 
        session.session_id === sessionId
          ? { ...session, status: "completed" as const, updated_at: now }
          : session
      )
    )
    
    // Invalidate cache
    invalidateCache()

    try {
      console.log("[useSessionList] Closing session:", sessionId)
      await apiClient.closeSession(sessionId)
      return true
    } catch (err) {
      // Rollback on error
      setSessions(prev => 
        prev.map(session => 
          session.session_id === sessionId ? oldSession : session
        )
      )
      
      const errorMessage = err instanceof Error ? err.message : "Failed to close session"
      setError(errorMessage)
      console.error("[useSessionList] Close error:", err)
      return false
    }
  }, [sessions, invalidateCache])

  // Delete a session with optimistic update
  const deleteSession = useCallback(async (sessionId: string) => {
    setError(null)

    // Store deleted session for potential rollback
    const deletedSession = sessions.find(s => s.session_id === sessionId)
    if (!deletedSession) {
      console.warn("[useSessionList] Session not found:", sessionId)
      return false
    }

    // Optimistic update
    setSessions(prev => prev.filter(s => s.session_id !== sessionId))
    setTotal(prev => Math.max(0, prev - 1))
    
    // Invalidate cache
    invalidateCache()

    try {
      console.log("[useSessionList] Deleting session:", sessionId)
      await apiClient.deleteSession(sessionId)
      console.log("[useSessionList] Deleted session:", sessionId)
      return true
    } catch (err) {
      // Rollback on error
      setSessions(prev => {
        const index = prev.findIndex(s => 
          new Date(s.created_at).getTime() > new Date(deletedSession.created_at).getTime()
        )
        if (index === -1) {
          return [...prev, deletedSession]
        }
        return [...prev.slice(0, index), deletedSession, ...prev.slice(index)]
      })
      setTotal(prev => prev + 1)
      
      const errorMessage = err instanceof Error ? err.message : "Failed to delete session"
      setError(errorMessage)
      console.error("[useSessionList] Delete error:", err)
      return false
    }
  }, [sessions, invalidateCache])

  // Update session metadata with optimistic update and debouncing
  const updateSession = useCallback(async (
    sessionId: string, 
    updates: Partial<SessionItem["metadata"]>,
    debounce: boolean = false
  ) => {
    setError(null)

    // Get current session
    const currentSession = sessions.find(s => s.session_id === sessionId)
    if (!currentSession) {
      const error = new Error("Session not found")
      setError(error.message)
      throw error
    }

    // Merge metadata
    const newMetadata = { ...currentSession.metadata, ...updates }
    const now = new Date().toISOString()

    // Optimistic update
    setSessions(prev => 
      prev.map(session => 
        session.session_id === sessionId
          ? {
              ...session,
              metadata: newMetadata,
              updated_at: now,
            }
          : session
      )
    )
    
    // Invalidate cache
    invalidateCache()

    // Debounce if requested
    if (debounce) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      return new Promise<void>((resolve, reject) => {
        debounceTimerRef.current = setTimeout(async () => {
          try {
            console.log("[useSessionList] Updating session metadata (debounced):", sessionId)
            await apiClient.updateSessionMetadata(sessionId, newMetadata)
            console.log("[useSessionList] Updated session metadata")
            resolve()
          } catch (err) {
            // Rollback on error
            setSessions(prev => 
              prev.map(session => 
                session.session_id === sessionId ? currentSession : session
              )
            )
            
            const errorMessage = err instanceof Error ? err.message : "Failed to update session"
            setError(errorMessage)
            console.error("[useSessionList] Update error:", err)
            reject(err)
          }
        }, 500) // 500ms debounce
      })
    }

    // Immediate update
    try {
      console.log("[useSessionList] Updating session metadata:", sessionId)
      await apiClient.updateSessionMetadata(sessionId, newMetadata)
      console.log("[useSessionList] Updated session metadata")
    } catch (err) {
      // Rollback on error
      setSessions(prev => 
        prev.map(session => 
          session.session_id === sessionId ? currentSession : session
        )
      )
      
      const errorMessage = err instanceof Error ? err.message : "Failed to update session"
      setError(errorMessage)
      console.error("[useSessionList] Update error:", err)
      throw err
    }
  }, [sessions, invalidateCache])

  // Get session by ID (from local cache or API)
  const getSession = useCallback(async (
    sessionId: string, 
    forceRefresh: boolean = false
  ): Promise<SessionItem | null> => {
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
      
      // Invalidate cache
      invalidateCache()
      
      return session as SessionItem
    } catch (err) {
      console.error("[useSessionList] Failed to fetch session:", err)
      return null
    }
  }, [sessions, invalidateCache])

  // Refresh a single session
  const refreshSession = useCallback(async (sessionId: string) => {
    return await getSession(sessionId, true)
  }, [getSession])

  // Refresh all sessions
  const refreshAll = useCallback(async () => {
    console.log("[useSessionList] Refreshing all sessions")
    invalidateCache()
    await loadSessions(50, 0, true)
  }, [loadSessions, invalidateCache])

  // Batch update multiple sessions
  const batchUpdateSessions = useCallback(async (
    updates: Array<{ sessionId: string; metadata: Partial<SessionItem["metadata"]> }>
  ) => {
    console.log("[useSessionList] Batch updating sessions:", updates.length)
    
    const results = await Promise.allSettled(
      updates.map(({ sessionId, metadata }) => 
        updateSession(sessionId, metadata, false)
      )
    )
    
    const failed = results.filter(r => r.status === 'rejected').length
    if (failed > 0) {
      console.warn(`[useSessionList] ${failed} updates failed`)
    }
    
    return results
  }, [updateSession])

  // Auto-load on mount if enabled
  useEffect(() => {
    if (autoLoad) {
      loadSessions()
    }
  }, [autoLoad, loadSessions])

  // Cross-tab synchronization
  useEffect(() => {
    if (!syncAcrossTabs) return

    const unsubscribe = SessionStorageManager.addListener((key, newValue) => {
      if (key === "chat_session_id" && newValue) {
        console.log("[useSessionList] Session changed in another tab, refreshing")
        loadSessions(50, 0, true)
      }
    })

    return unsubscribe
  }, [syncAcrossTabs, loadSessions])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Computed values
  const activeSessions = useMemo(() => 
    sessions.filter(s => s.status === 'active'),
    [sessions]
  )

  const completedSessions = useMemo(() => 
    sessions.filter(s => s.status === 'completed'),
    [sessions]
  )

  const hasMore = useMemo(() => 
    sessions.length < total,
    [sessions.length, total]
  )

  return {
    // State
    sessions,
    activeSessions,
    completedSessions,
    total,
    isLoading,          // 首次加载/初始加载状态
    isRefreshing,       // 刷新状态（已有数据时重新加载）
    error,
    hasMore,
    
    // Actions
    loadSessions,
    createSession,
    closeSession,
    deleteSession,
    updateSession,
    getSession,
    refreshSession,
    refreshAll,
    batchUpdateSessions,
    invalidateCache,
  }
}

