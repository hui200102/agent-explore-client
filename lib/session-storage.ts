/**
 * Session Storage Utility
 * Simplified to only store the current session ID in localStorage
 * All session data is now fetched from the server API
 */

const SESSION_KEY = "chat_session_id"
const USER_ID_KEY = "chat_user_id"

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
    console.log("[SessionStorage] Stored session ID:", sessionId)
  },

  /**
   * Clear session ID
   */
  clearSessionId(): void {
    if (typeof window === "undefined") return
    localStorage.removeItem(SESSION_KEY)
    console.log("[SessionStorage] Cleared session ID")
  },

  /**
   * Check if session exists
   */
  hasSession(): boolean {
    return this.getSessionId() !== null
  },

  /**
   * Get stored user ID
   */
  getUserId(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem(USER_ID_KEY)
  },

  /**
   * Store user ID
   */
  setUserId(userId: string): void {
    if (typeof window === "undefined") return
    localStorage.setItem(USER_ID_KEY, userId)
    console.log("[SessionStorage] Stored user ID:", userId)
  },

  /**
   * Clear user ID
   */
  clearUserId(): void {
    if (typeof window === "undefined") return
    localStorage.removeItem(USER_ID_KEY)
    console.log("[SessionStorage] Cleared user ID")
  },

  /**
   * Clear all stored data
   */
  clearAll(): void {
    if (typeof window === "undefined") return
    this.clearSessionId()
    this.clearUserId()
    console.log("[SessionStorage] Cleared all data")
  }
}

