/**
 * Session Storage Utility
 * Enhanced with type safety, error handling, and cross-tab synchronization
 */

const SESSION_KEY = "chat_session_id"
const USER_ID_KEY = "chat_user_id"
const LAST_ACCESSED_KEY = "chat_last_accessed"
const SESSION_CACHE_KEY = "chat_session_cache"

// Storage event listener type
type StorageListener = (key: string, newValue: string | null, oldValue: string | null) => void

// Session cache structure
interface SessionCache {
  sessionId: string
  userId: string
  timestamp: number
  metadata?: Record<string, unknown>
}

export class SessionStorageManager {
  private static listeners: Set<StorageListener> = new Set()
  private static isInitialized = false

  /**
   * Initialize storage manager and set up cross-tab sync
   */
  static initialize(): void {
    if (this.isInitialized || typeof window === "undefined") return

    // Listen for storage changes from other tabs
    window.addEventListener("storage", (e) => {
      if (e.key && (e.key === SESSION_KEY || e.key === USER_ID_KEY)) {
        this.notifyListeners(e.key, e.newValue, e.oldValue)
      }
    })

    this.isInitialized = true
    console.log("[SessionStorage] Initialized with cross-tab sync")
  }

  /**
   * Add storage change listener
   */
  static addListener(listener: StorageListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Notify all listeners of storage changes
   */
  private static notifyListeners(key: string, newValue: string | null, oldValue: string | null): void {
    this.listeners.forEach(listener => {
      try {
        listener(key, newValue, oldValue)
      } catch (err) {
        console.error("[SessionStorage] Listener error:", err)
      }
    })
  }

  /**
   * Get stored session ID with validation
   */
  static getSessionId(): string | null {
    if (typeof window === "undefined") return null
    
    try {
      const sessionId = localStorage.getItem(SESSION_KEY)
      if (sessionId) {
        this.updateLastAccessed()
      }
      return sessionId
    } catch (err) {
      console.error("[SessionStorage] Failed to get session ID:", err)
      return null
    }
  }

  /**
   * Store session ID with validation
   */
  static setSessionId(sessionId: string): boolean {
    if (typeof window === "undefined" || !sessionId?.trim()) {
      console.warn("[SessionStorage] Invalid session ID")
      return false
    }

    try {
      const oldValue = localStorage.getItem(SESSION_KEY)
      localStorage.setItem(SESSION_KEY, sessionId)
      this.updateLastAccessed()
      this.notifyListeners(SESSION_KEY, sessionId, oldValue)
      console.log("[SessionStorage] Stored session ID:", sessionId)
      return true
    } catch (err) {
      console.error("[SessionStorage] Failed to store session ID:", err)
      return false
    }
  }

  /**
   * Clear session ID
   */
  static clearSessionId(): boolean {
    if (typeof window === "undefined") return false

    try {
      const oldValue = localStorage.getItem(SESSION_KEY)
      localStorage.removeItem(SESSION_KEY)
      this.notifyListeners(SESSION_KEY, null, oldValue)
      console.log("[SessionStorage] Cleared session ID")
      return true
    } catch (err) {
      console.error("[SessionStorage] Failed to clear session ID:", err)
      return false
    }
  }

  /**
   * Check if session exists and is valid
   */
  static hasSession(): boolean {
    const sessionId = this.getSessionId()
    return sessionId !== null && sessionId.trim().length > 0
  }

  /**
   * Get stored user ID
   */
  static getUserId(): string | null {
    if (typeof window === "undefined") return null

    try {
      return localStorage.getItem(USER_ID_KEY)
    } catch (err) {
      console.error("[SessionStorage] Failed to get user ID:", err)
      return null
    }
  }

  /**
   * Store user ID with validation
   */
  static setUserId(userId: string): boolean {
    if (typeof window === "undefined" || !userId?.trim()) {
      console.warn("[SessionStorage] Invalid user ID")
      return false
    }

    try {
      const oldValue = localStorage.getItem(USER_ID_KEY)
      localStorage.setItem(USER_ID_KEY, userId)
      this.notifyListeners(USER_ID_KEY, userId, oldValue)
      console.log("[SessionStorage] Stored user ID:", userId)
      return true
    } catch (err) {
      console.error("[SessionStorage] Failed to store user ID:", err)
      return false
    }
  }

  /**
   * Clear user ID
   */
  static clearUserId(): boolean {
    if (typeof window === "undefined") return false

    try {
      const oldValue = localStorage.getItem(USER_ID_KEY)
      localStorage.removeItem(USER_ID_KEY)
      this.notifyListeners(USER_ID_KEY, null, oldValue)
      console.log("[SessionStorage] Cleared user ID")
      return true
    } catch (err) {
      console.error("[SessionStorage] Failed to clear user ID:", err)
      return false
    }
  }

  /**
   * Get session cache
   */
  static getSessionCache(): SessionCache | null {
    if (typeof window === "undefined") return null

    try {
      const cached = localStorage.getItem(SESSION_CACHE_KEY)
      if (!cached) return null

      const cache = JSON.parse(cached) as SessionCache
      
      // Check if cache is still valid (24 hours)
      const isValid = Date.now() - cache.timestamp < 24 * 60 * 60 * 1000
      
      return isValid ? cache : null
    } catch (err) {
      console.error("[SessionStorage] Failed to get cache:", err)
      return null
    }
  }

  /**
   * Set session cache
   */
  static setSessionCache(cache: Omit<SessionCache, "timestamp">): boolean {
    if (typeof window === "undefined") return false

    try {
      const cacheData: SessionCache = {
        ...cache,
        timestamp: Date.now()
      }
      localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cacheData))
      return true
    } catch (err) {
      console.error("[SessionStorage] Failed to set cache:", err)
      return false
    }
  }

  /**
   * Clear session cache
   */
  static clearSessionCache(): boolean {
    if (typeof window === "undefined") return false

    try {
      localStorage.removeItem(SESSION_CACHE_KEY)
      return true
    } catch (err) {
      console.error("[SessionStorage] Failed to clear cache:", err)
      return false
    }
  }

  /**
   * Update last accessed timestamp
   */
  private static updateLastAccessed(): void {
    try {
      localStorage.setItem(LAST_ACCESSED_KEY, Date.now().toString())
    } catch (err) {
      // Non-critical, just log
      console.warn("[SessionStorage] Failed to update last accessed:", err)
    }
  }

  /**
   * Get last accessed timestamp
   */
  static getLastAccessed(): number | null {
    if (typeof window === "undefined") return null

    try {
      const timestamp = localStorage.getItem(LAST_ACCESSED_KEY)
      return timestamp ? parseInt(timestamp, 10) : null
    } catch (err) {
      console.error("[SessionStorage] Failed to get last accessed:", err)
      return null
    }
  }

  /**
   * Clear all stored data
   */
  static clearAll(): boolean {
    if (typeof window === "undefined") return false

    try {
      this.clearSessionId()
      this.clearUserId()
      this.clearSessionCache()
      localStorage.removeItem(LAST_ACCESSED_KEY)
      console.log("[SessionStorage] Cleared all data")
      return true
    } catch (err) {
      console.error("[SessionStorage] Failed to clear all:", err)
      return false
    }
  }

  /**
   * Get storage size estimation (in bytes)
   */
  static getStorageSize(): number {
    if (typeof window === "undefined") return 0

    try {
      let size = 0
      const keys = [SESSION_KEY, USER_ID_KEY, SESSION_CACHE_KEY, LAST_ACCESSED_KEY]
      
      keys.forEach(key => {
        const value = localStorage.getItem(key)
        if (value) {
          size += key.length + value.length
        }
      })
      
      return size
    } catch (err) {
      console.error("[SessionStorage] Failed to calculate size:", err)
      return 0
    }
  }
}

// Backward compatibility export
export const SessionStorage = SessionStorageManager

// Auto-initialize when module is imported
if (typeof window !== "undefined") {
  SessionStorageManager.initialize()
}

