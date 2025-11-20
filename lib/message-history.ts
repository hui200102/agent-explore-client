/**
 * Message History Manager
 * Manages message storage and retrieval
 * Supports different storage backends (API, IndexedDB, LocalStorage, etc.)
 */

import { apiClient, type Message } from "./api-client"

/**
 * Storage backend interface
 * Implement this to add new storage types
 */
export interface IMessageStorage {
  getMessages(sessionId: string, limit?: number, offset?: number): Promise<Message[]>
  getMessage(messageId: string): Promise<Message | null>
  saveMessage(message: Message): Promise<void>
  updateMessage(message: Message): Promise<void>
  deleteMessage(messageId: string): Promise<void>
  clearSession(sessionId: string): Promise<void>
  searchMessages(sessionId: string, query: string): Promise<Message[]>
}

/**
 * API-based storage (current implementation)
 */
export class ApiMessageStorage implements IMessageStorage {
  async getMessages(sessionId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    return await apiClient.getSessionMessages(sessionId, limit, offset)
  }

  async getMessage(messageId: string): Promise<Message | null> {
    try {
      return await apiClient.getMessage(messageId)
    } catch {
      return null
    }
  }

  async saveMessage(message: Message): Promise<void> {
    // API handles saving automatically
    console.log("[ApiStorage] Message auto-saved to backend:", message.message_id)
  }

  async updateMessage(message: Message): Promise<void> {
    // API handles updates automatically
    console.log("[ApiStorage] Message auto-updated on backend:", message.message_id)
  }

  async deleteMessage(messageId: string): Promise<void> {
    // Not implemented in backend yet
    console.warn("[ApiStorage] Delete not supported")
  }

  async clearSession(sessionId: string): Promise<void> {
    await apiClient.deleteSession(sessionId)
  }

  async searchMessages(sessionId: string, query: string): Promise<Message[]> {
    // Get all messages and filter locally for now
    const messages = await this.getMessages(sessionId, 1000, 0)
    return messages.filter(m => 
      m.text.toLowerCase().includes(query.toLowerCase())
    )
  }
}

/**
 * IndexedDB-based storage (future implementation)
 */
export class IndexedDBMessageStorage implements IMessageStorage {
  private dbName = "chat_messages"
  private version = 1

  async getMessages(sessionId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    // TODO: Implement IndexedDB query
    console.log("[IndexedDB] Getting messages:", sessionId, limit, offset)
    return []
  }

  async getMessage(messageId: string): Promise<Message | null> {
    // TODO: Implement IndexedDB get
    console.log("[IndexedDB] Getting message:", messageId)
    return null
  }

  async saveMessage(message: Message): Promise<void> {
    // TODO: Implement IndexedDB save
    console.log("[IndexedDB] Saving message:", message.message_id)
  }

  async updateMessage(message: Message): Promise<void> {
    // TODO: Implement IndexedDB update
    console.log("[IndexedDB] Updating message:", message.message_id)
  }

  async deleteMessage(messageId: string): Promise<void> {
    // TODO: Implement IndexedDB delete
    console.log("[IndexedDB] Deleting message:", messageId)
  }

  async clearSession(sessionId: string): Promise<void> {
    // TODO: Implement IndexedDB clear
    console.log("[IndexedDB] Clearing session:", sessionId)
  }

  async searchMessages(sessionId: string, query: string): Promise<Message[]> {
    // TODO: Implement IndexedDB search
    console.log("[IndexedDB] Searching messages:", sessionId, query)
    return []
  }
}

/**
 * Message History Manager
 * Provides unified interface for message operations
 */
export class MessageHistory {
  private storage: IMessageStorage
  private cache: Map<string, Message[]> = new Map()
  private cacheTimeout: number = 5 * 60 * 1000 // 5 minutes

  constructor(storage?: IMessageStorage) {
    // Default to API storage
    this.storage = storage || new ApiMessageStorage()
  }

  /**
   * Get messages for a session
   */
  async getMessages(
    sessionId: string, 
    limit: number = 50, 
    offset: number = 0,
    useCache: boolean = true
  ): Promise<Message[]> {
    // Check cache first
    if (useCache && offset === 0) {
      const cached = this.getFromCache(sessionId)
      if (cached) {
        console.log("[MessageHistory] Returning cached messages:", cached.length)
        return cached.slice(0, limit)
      }
    }

    // Fetch from storage
    console.log("[MessageHistory] Fetching messages from storage")
    const messages = await this.storage.getMessages(sessionId, limit, offset)
    
    // Update cache
    if (offset === 0) {
      this.setCache(sessionId, messages)
    }
    
    return messages
  }

  /**
   * Get a single message
   */
  async getMessage(messageId: string): Promise<Message | null> {
    console.log("[MessageHistory] Getting message:", messageId)
    return await this.storage.getMessage(messageId)
  }

  /**
   * Add a new message to history
   */
  async addMessage(message: Message): Promise<void> {
    console.log("[MessageHistory] Adding message:", message.message_id)
    
    // Save to storage
    await this.storage.saveMessage(message)
    
    // Update cache
    const cached = this.getFromCache(message.session_id)
    if (cached) {
      this.setCache(message.session_id, [...cached, message])
    }
  }

  /**
   * Update an existing message
   */
  async updateMessage(message: Message): Promise<void> {
    console.log("[MessageHistory] Updating message:", message.message_id)
    
    // Update storage
    await this.storage.updateMessage(message)
    
    // Update cache
    const cached = this.getFromCache(message.session_id)
    if (cached) {
      const index = cached.findIndex(m => m.message_id === message.message_id)
      if (index !== -1) {
        cached[index] = message
        this.setCache(message.session_id, [...cached])
      }
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(sessionId: string, messageId: string): Promise<void> {
    console.log("[MessageHistory] Deleting message:", messageId)
    
    // Delete from storage
    await this.storage.deleteMessage(messageId)
    
    // Remove from cache
    const cached = this.getFromCache(sessionId)
    if (cached) {
      this.setCache(
        sessionId,
        cached.filter(m => m.message_id !== messageId)
      )
    }
  }

  /**
   * Clear all messages in a session
   */
  async clearSession(sessionId: string): Promise<void> {
    console.log("[MessageHistory] Clearing session:", sessionId)
    
    await this.storage.clearSession(sessionId)
    this.cache.delete(sessionId)
  }

  /**
   * Search messages
   */
  async searchMessages(sessionId: string, query: string): Promise<Message[]> {
    console.log("[MessageHistory] Searching messages:", query)
    return await this.storage.searchMessages(sessionId, query)
  }

  /**
   * Switch storage backend
   */
  switchStorage(storage: IMessageStorage): void {
    console.log("[MessageHistory] Switching storage backend")
    this.storage = storage
    this.clearCache()
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    console.log("[MessageHistory] Clearing cache")
    this.cache.clear()
  }

  /**
   * Invalidate cache for a session
   */
  invalidateSession(sessionId: string): void {
    console.log("[MessageHistory] Invalidating cache for session:", sessionId)
    this.cache.delete(sessionId)
  }

  // Cache management
  private getFromCache(sessionId: string): Message[] | null {
    return this.cache.get(sessionId) || null
  }

  private setCache(sessionId: string, messages: Message[]): void {
    this.cache.set(sessionId, messages)
    
    // Auto-invalidate after timeout
    setTimeout(() => {
      this.cache.delete(sessionId)
    }, this.cacheTimeout)
  }
}

// Export singleton instance
export const messageHistory = new MessageHistory()

// Export storage implementations for easy switching
export const storageBackends = {
  api: new ApiMessageStorage(),
  indexedDB: new IndexedDBMessageStorage(),
}

