/**
 * Session Storage Utility
 * Manages session_id persistence in localStorage
 */

const SESSION_KEY = "chat_session_id"
const SESSIONS_LIST_KEY = "chat_sessions_list"

export interface StoredSession {
  session_id: string
  user_id: string
  created_at: string
  updated_at: string
  metadata?: {
    title?: string
    lastMessage?: string
    messageCount?: number
    [key: string]: unknown
  }
}

export const SessionStorage = {
  /**
   * Get stored session ID
   */
  getSessionId(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem(SESSION_KEY)
  },

  /**
   * Store session ID
   */
  setSessionId(sessionId: string): void {
    if (typeof window === "undefined") return
    localStorage.setItem(SESSION_KEY, sessionId)
  },

  /**
   * Clear session ID
   */
  clearSessionId(): void {
    if (typeof window === "undefined") return
    localStorage.removeItem(SESSION_KEY)
  },

  /**
   * Check if session exists
   */
  hasSession(): boolean {
    return this.getSessionId() !== null
  },

  /**
   * Get all stored sessions
   */
  getSessions(): StoredSession[] {
    if (typeof window === "undefined") return []
    try {
      const data = localStorage.getItem(SESSIONS_LIST_KEY)
      if (!data) return []
      return JSON.parse(data) as StoredSession[]
    } catch (err) {
      console.error("Failed to load sessions:", err)
      return []
    }
  },

  /**
   * Add or update a session in the list
   */
  saveSession(session: StoredSession): void {
    if (typeof window === "undefined") return
    
    try {
      const sessions = this.getSessions()
      const existingIndex = sessions.findIndex(s => s.session_id === session.session_id)
      
      if (existingIndex >= 0) {
        // Update existing session
        sessions[existingIndex] = {
          ...sessions[existingIndex],
          ...session,
          updated_at: new Date().toISOString(),
        }
      } else {
        // Add new session to the beginning
        sessions.unshift(session)
      }

      // Keep only last 50 sessions
      const limitedSessions = sessions.slice(0, 50)
      
      localStorage.setItem(SESSIONS_LIST_KEY, JSON.stringify(limitedSessions))
    } catch (err) {
      console.error("Failed to save session:", err)
    }
  },

  /**
   * Remove a session from the list
   */
  removeSession(sessionId: string): void {
    if (typeof window === "undefined") return
    
    try {
      const sessions = this.getSessions()
      const filtered = sessions.filter(s => s.session_id !== sessionId)
      localStorage.setItem(SESSIONS_LIST_KEY, JSON.stringify(filtered))
      
      // If this was the current session, clear it
      if (this.getSessionId() === sessionId) {
        this.clearSessionId()
      }
    } catch (err) {
      console.error("Failed to remove session:", err)
    }
  },

  /**
   * Update session metadata
   */
  updateSessionMetadata(sessionId: string, metadata: Partial<StoredSession["metadata"]>): void {
    if (typeof window === "undefined") return
    
    try {
      const sessions = this.getSessions()
      const session = sessions.find(s => s.session_id === sessionId)
      
      if (session) {
        session.metadata = { ...session.metadata, ...metadata }
        session.updated_at = new Date().toISOString()
        localStorage.setItem(SESSIONS_LIST_KEY, JSON.stringify(sessions))
      }
    } catch (err) {
      console.error("Failed to update session metadata:", err)
    }
  },

  /**
   * Clear all sessions
   */
  clearAllSessions(): void {
    if (typeof window === "undefined") return
    localStorage.removeItem(SESSIONS_LIST_KEY)
  }
}

