/**
 * SSE Connection Manager - 全局单例管理所有 SSE 连接
 * 
 * 核心优势：
 * 1. 全局唯一管理器，确保每个 message 只有一个连接
 * 2. 自动清理和防重复
 * 3. 简单的 API，易于使用
 */

import { dispatchSSEEvent, useMessageStore } from '@/stores/message-store';
import type { SSEEventType } from '@/lib/message_type';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';

interface SSEConnection {
  messageId: string;
  sessionId: string;
  eventSource: EventSource;
  createdAt: number;
}

class SSEManager {
  private connections: Map<string, SSEConnection> = new Map();
  
  connect(sessionId: string, messageId: string): EventSource {
    console.log('[SSEManager] connect:', messageId);
    
    const existing = this.connections.get(messageId);
    if (existing) {
      console.log('[SSEManager] Reusing existing connection for:', messageId);
      return existing.eventSource;
    }
    
    this.disconnectSession(sessionId);
    
    const url = `${API_BASE_URL}/sessions/${sessionId}/messages/${messageId}/stream`;
    const eventSource = new EventSource(url);
    
    this.connections.set(messageId, {
      messageId,
      sessionId,
      eventSource,
      createdAt: Date.now(),
    });
    
    eventSource.onopen = () => {
      console.log('[SSEManager] Connection opened:', messageId);
      useMessageStore.getState().setConnected(true);
    };
    
    eventSource.onerror = () => {
      console.log('[SSEManager] Connection error:', messageId);
      const isStreaming = useMessageStore.getState().isStreaming;
      if (!isStreaming) {
        console.log('[SSEManager] Normal close (message completed)');
        this.disconnect(messageId);
        return;
      }
      
      useMessageStore.getState().setConnected(false);
      
      setTimeout(() => {
        const stillStreaming = useMessageStore.getState().isStreaming;
        const stillConnected = this.connections.has(messageId);
        if (stillStreaming && stillConnected) {
          console.log('[SSEManager] Auto reconnecting:', messageId);
          this.disconnect(messageId);
          this.connect(sessionId, messageId);
        }
      }, 3000);
    };
    
    
    const eventTypes: SSEEventType[] = [
      'task_started',
      'task_progress', 
      'task_completed',
      'task_failed',
      'message_delta',
      'message_stop',
      'error',
    ];

    eventTypes.forEach((eventType) => {
      eventSource.addEventListener(eventType, (event: MessageEvent) => {
        try {
          if (event.type === 'ping' || event.type === 'pong' || !event.data) {
            return;
          }
          dispatchSSEEvent(eventType, event.data);
        } catch (err) {
          console.error(`[SSEManager] Failed to parse ${eventType}:`, err);
        }
      });
    });
    
    console.log('[SSEManager] Connection created:', messageId, 'Total:', this.connections.size);
    return eventSource;
  }
  
  disconnect(messageId: string): void {
    const conn = this.connections.get(messageId);
    if (conn) {
      console.log('[SSEManager] Disconnecting:', messageId);
      conn.eventSource.close();
      this.connections.delete(messageId);
      
      if (this.connections.size === 0) {
        useMessageStore.getState().setConnected(false);
      }
      
      console.log('[SSEManager] Remaining connections:', this.connections.size);
    }
  }
  
  disconnectSession(sessionId: string): void {
    const toDisconnect: string[] = [];
    
    this.connections.forEach((conn, messageId) => {
      if (conn.sessionId === sessionId) {
        toDisconnect.push(messageId);
      }
    });
    
    toDisconnect.forEach((messageId) => {
      this.disconnect(messageId);
    });
    
    if (toDisconnect.length > 0) {
      console.log('[SSEManager] Disconnected', toDisconnect.length, 'connections from session:', sessionId);
    }
  }
  
  disconnectAll(): void {
    console.log('[SSEManager] Disconnecting all connections:', this.connections.size);
    this.connections.forEach((conn) => {
      conn.eventSource.close();
    });
    this.connections.clear();
  }
  
  isConnected(messageId: string): boolean {
    return this.connections.has(messageId);
  }
  
  getConnectedMessageIds(): string[] {
    return Array.from(this.connections.keys());
  }
  
  getStats() {
    return {
      total: this.connections.size,
      messages: Array.from(this.connections.values()).map((conn) => ({
        messageId: conn.messageId,
        sessionId: conn.sessionId,
        age: Date.now() - conn.createdAt,
      })),
    };
  }
}

export const sseManager = new SSEManager();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    sseManager.disconnectAll();
  });
}

