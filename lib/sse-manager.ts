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
  
  /**
   * 连接到消息流
   * 如果已经连接到同一消息，直接返回现有连接
   * 如果连接到不同消息，先关闭旧连接
   */
  connect(sessionId: string, messageId: string): EventSource {
    console.log('[SSEManager] connect:', messageId);
    
    // 检查是否已连接到这个消息
    const existing = this.connections.get(messageId);
    if (existing) {
      console.log('[SSEManager] Reusing existing connection for:', messageId);
      return existing.eventSource;
    }
    
    // 关闭同一 session 的其他连接
    this.disconnectSession(sessionId);
    
    // 创建新连接
    const url = `${API_BASE_URL}/sessions/${sessionId}/messages/${messageId}/stream`;
    const eventSource = new EventSource(url);
    
    // 保存连接
    this.connections.set(messageId, {
      messageId,
      sessionId,
      eventSource,
      createdAt: Date.now(),
    });
    
    // 注册基础事件
    eventSource.onopen = () => {
      console.log('[SSEManager] Connection opened:', messageId);
      useMessageStore.getState().setConnected(true);
    };
    
    eventSource.onerror = () => {
      console.log('[SSEManager] Connection error:', messageId);
      // 检查是否正常关闭
      const isStreaming = useMessageStore.getState().isStreaming;
      if (!isStreaming) {
        console.log('[SSEManager] Normal close (message completed)');
        this.disconnect(messageId);
        return;
      }
      
      // 错误关闭，标记未连接
      useMessageStore.getState().setConnected(false);
      
      // 3秒后重连（如果还在streaming且还是同一消息）
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
    
    // 注册通用消息监听器（捕获所有事件）
    eventSource.onmessage = (event: MessageEvent) => {
      console.log('[SSEManager] onmessage (generic):', event.type, event.data);
    };
    
    // 注册所有事件类型
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
          console.log(`[SSEManager] Received ${eventType} event`);
          const rawData = JSON.parse(event.data);
          const data = rawData.payload || rawData;
          
          if (rawData.metadata) {
            data.metadata = { ...data.metadata, ...rawData.metadata };
          }
          
          console.log(`[SSEManager] ${eventType} data:`, data);
          
          // 分发事件到 store
          dispatchSSEEvent(eventType, data);
          
          // message_stop 后自动断开
          if (eventType === 'message_stop') {
            this.disconnect(messageId);
          }
        } catch (err) {
          console.error(`[SSEManager] Failed to parse ${eventType}:`, err);
        }
      });
    });
    
    console.log('[SSEManager] Connection created:', messageId, 'Total:', this.connections.size);
    return eventSource;
  }
  
  /**
   * 断开指定消息的连接
   */
  disconnect(messageId: string): void {
    const conn = this.connections.get(messageId);
    if (conn) {
      console.log('[SSEManager] Disconnecting:', messageId);
      conn.eventSource.close();
      this.connections.delete(messageId);
      
      // 如果没有其他连接了，更新 store 状态
      if (this.connections.size === 0) {
        useMessageStore.getState().setConnected(false);
      }
      
      console.log('[SSEManager] Remaining connections:', this.connections.size);
    }
  }
  
  /**
   * 断开指定 session 的所有连接
   */
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
  
  /**
   * 断开所有连接
   */
  disconnectAll(): void {
    console.log('[SSEManager] Disconnecting all connections:', this.connections.size);
    this.connections.forEach((conn) => {
      conn.eventSource.close();
    });
    this.connections.clear();
  }
  
  /**
   * 检查是否已连接
   */
  isConnected(messageId: string): boolean {
    return this.connections.has(messageId);
  }
  
  /**
   * 获取所有连接的消息ID
   */
  getConnectedMessageIds(): string[] {
    return Array.from(this.connections.keys());
  }
  
  /**
   * 获取连接统计
   */
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

// 全局单例
export const sseManager = new SSEManager();

// 清理：页面卸载时断开所有连接
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    sseManager.disconnectAll();
  });
}

