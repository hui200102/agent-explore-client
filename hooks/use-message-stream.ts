/**
 * useMessageStream v2 - 使用全局 SSE 管理器
 * 
 * 优势：
 * - 简单可靠，无复杂依赖
 * - 全局单例自动防重复
 * - 无需手动管理连接生命周期
 */

import { useCallback, useEffect } from 'react';
import { useMessageStore } from '@/stores/message-store';
import { sseManager } from '@/lib/sse-manager';
import type { Message } from '@/lib/message_type';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';

interface UseMessageStreamOptions {
  sessionId: string;
}

interface UseMessageStreamReturn {
  isStreaming: boolean;
  error: string | null;
  sendMessage: (content: string, attachments?: MessageAttachment[], include_history?: boolean) => Promise<void>;
}

interface MessageAttachment {
  type: 'image' | 'file' | 'audio' | 'video';
  url: string;
  filename?: string;
  mime_type?: string;
  summary?: string;
}

interface SendMessageRequest {
  content_blocks: Array<{
    content_type: string;
    text?: string;
    image?: { url: string; summary?: string };
    file?: { url: string; filename?: string; mime_type?: string; summary?: string };
    audio?: { url: string; summary?: string };
    video?: { url: string; summary?: string };
  }>;
  include_history?: boolean;
}

interface SendMessageResponse {
  message_id: string;
  assistant_message_id?: string;
  session_id: string;
  task_id?: string;
}

export function useMessageStream({
  sessionId,
}: UseMessageStreamOptions): UseMessageStreamReturn {
  
  const isStreaming = useMessageStore((state) => state.isStreaming);
  const error = useMessageStore((state) => state.error);

  // Session 切换时清理连接
  useEffect(() => {
    return () => {
      console.log('[useMessageStream] Cleanup for session:', sessionId);
      sseManager.disconnectSession(sessionId);
    };
  }, [sessionId]);

  // 发送消息
  const sendMessage = useCallback(async (
    content: string,
    attachments?: MessageAttachment[],
    include_history?: boolean
  ): Promise<void> => {
    console.log('[sendMessage] Starting...');
    
    // 先断开当前 session 的所有连接
    sseManager.disconnectSession(sessionId);
    
    // 重置 store
    useMessageStore.getState().reset();
    useMessageStore.getState().setStreaming(true);
    
    // 构建请求
    const contentBlocks: SendMessageRequest['content_blocks'] = [];
    
    if (content.trim()) {
      contentBlocks.push({
        content_type: 'text',
        text: content,
      });
    }
    
    if (attachments) {
      for (const attachment of attachments) {
        switch (attachment.type) {
          case 'image':
            contentBlocks.push({
              content_type: 'image',
              image: { 
                url: attachment.url,
                summary: attachment.summary
              },
            });
            break;
          case 'file':
            contentBlocks.push({
              content_type: 'file',
              file: { 
                url: attachment.url,
                filename: attachment.filename,
                mime_type: attachment.mime_type,
                summary: attachment.summary
              },
            });
            break;
          case 'audio':
            contentBlocks.push({
              content_type: 'audio',
              audio: { 
                url: attachment.url,
                summary: attachment.summary
              },
            });
            break;
          case 'video':
            contentBlocks.push({
              content_type: 'video',
              video: { 
                url: attachment.url,
                summary: attachment.summary
              },
            });
            break;
        }
      }
    }

    try {
      const requestBody: SendMessageRequest = { content_blocks: contentBlocks };
      if (include_history !== undefined) {
        requestBody.include_history = include_history;
      }

      // 发送消息
      const response = await fetch(
        `${API_BASE_URL}/sessions/${sessionId}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to send message' }));
        throw new Error(errorData.detail || 'Failed to send message');
      }

      const result: SendMessageResponse = await response.json();
      console.log('[sendMessage] Response:', result);
      
      if (!result.assistant_message_id) {
        console.log('[sendMessage] No assistant response');
        useMessageStore.getState().setStreaming(false);
        return;
      }

      // 检查消息状态
      const statusResponse = await fetch(`${API_BASE_URL}/messages/${result.assistant_message_id}`);
      if (statusResponse.ok) {
        const message: Message = await statusResponse.json();
        console.log('[sendMessage] Message status:', message.status);
        
        if (message.status === 'completed' || message.status === 'failed') {
          // 已完成，直接处理
          useMessageStore.getState().handleMessageStop({
            stop_reason: message.status === 'failed' ? 'error' : 'complete',
            message,
          });
          useMessageStore.getState().setStreaming(false);
          return;
        }
      }

      // Pending/Processing，建立 SSE 连接
      console.log('[sendMessage] Connecting to SSE...');
      sseManager.connect(sessionId, result.assistant_message_id);
      useMessageStore.getState().setConnected(true);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      console.error('[sendMessage] Error:', errorMessage);
      useMessageStore.getState().handleError({ error: errorMessage });
      useMessageStore.getState().setStreaming(false);
      throw err;
    }
  }, [sessionId]);

  return {
    isStreaming,
    error,
    sendMessage,
  };
}

