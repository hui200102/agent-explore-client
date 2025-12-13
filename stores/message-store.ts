/**
 * Message Store - Zustand state management for SSE message streaming
 */

import { create } from 'zustand';
import type {
  Message,
  Task,
  ContentBlock,
  TaskStartedEvent,
  TaskProgressEvent,
  TaskCompletedEvent,
  TaskFailedEvent,
  MessageDeltaEvent,
  MessageStopEvent,
  ErrorEvent,
  SSEEventType,
} from '@/lib/message_type';

// ============ Store State Types ============

export interface MessageState {
  // Current message being processed
  currentMessage: Message | null;
  
  // Active tasks (keyed by task_id)
  activeTasks: Record<string, Task>;
  
  // Completed tasks history
  completedTasks: Task[];
  
  // Content blocks (keyed by content_id)
  contentBlocks: Record<string, ContentBlock>;
  
  // Content order (array of content_ids)
  contentOrder: string[];
  
  // Task to content mapping (task_id -> content_ids[])
  taskContents: Record<string, string[]>;
  
  // Current streaming content block ID (for incremental updates without content_id)
  currentStreamingBlockId: string | null;
  
  // Connection state
  isConnected: boolean;
  isStreaming: boolean;
  
  // Error state
  error: string | null;
  
  // Event sequence tracking
  lastSequence: number;
}

export interface MessageActions {
  // SSE Event Handlers
  handleTaskStarted: (event: TaskStartedEvent) => void;
  handleTaskProgress: (event: TaskProgressEvent) => void;
  handleTaskCompleted: (event: TaskCompletedEvent) => void;
  handleTaskFailed: (event: TaskFailedEvent) => void;
  handleMessageDelta: (event: MessageDeltaEvent) => void;
  handleMessageStop: (event: MessageStopEvent) => void;
  handleError: (event: ErrorEvent) => void;
  
  // Connection management
  setConnected: (connected: boolean) => void;
  setStreaming: (streaming: boolean) => void;
  
  // State management
  reset: () => void;
  clearError: () => void;
  
  // Utility
  getTaskOutputs: (taskId: string) => ContentBlock[];
  getFinalOutputs: () => ContentBlock[];
  getTextContent: () => string;
}

export type MessageStore = MessageState & MessageActions;

// ============ Initial State ============

const initialState: MessageState = {
  currentMessage: null,
  activeTasks: {},
  completedTasks: [],
  contentBlocks: {},
  contentOrder: [],
  taskContents: {},
  currentStreamingBlockId: null,
  isConnected: false,
  isStreaming: false,
  error: null,
  lastSequence: 0,
};

// ============ Store Implementation ============

export const useMessageStore = create<MessageStore>()((set, get) => ({
  ...initialState,

  // ============ Task Event Handlers ============

  handleTaskStarted: (event: TaskStartedEvent) => {
    set((state) => {
      const task: Task = {
        task_id: event.task_id,
        task_type: event.task_type,
        display_text: event.display_text,
        status: 'pending',
        progress: 0,
        started_at: event.started_at,
        tool_name: event.tool_name,
        tool_args: event.tool_args,
        steps: event.steps,
        metadata: event.metadata,
      };
      
      return {
        activeTasks: { ...state.activeTasks, [event.task_id]: task },
        taskContents: { ...state.taskContents, [event.task_id]: [] },
        isStreaming: true,
      };
    });
  },

  handleTaskProgress: (event: TaskProgressEvent) => {
    set((state) => {
      const task = state.activeTasks[event.task_id];
      if (!task) return state;
      
      const updatedTask: Task = {
        ...task,
        status: event.status,
        progress: event.progress,
        updated_at: event.updated_at,
        ...(event.display_text && { display_text: event.display_text }),
        ...(event.metadata && { metadata: { ...task.metadata, ...event.metadata } }),
      };
      
      return {
        activeTasks: { ...state.activeTasks, [event.task_id]: updatedTask },
      };
    });
  },

  handleTaskCompleted: (event: TaskCompletedEvent) => {
    set((state) => {
      const task = state.activeTasks[event.task_id];
      if (!task) return state;
      
      const completedTask: Task = {
        ...task,
        status: 'completed',
        progress: 1,
        completed_at: event.completed_at,
        updated_at: event.updated_at,
      };
      
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [event.task_id]: _removed, ...remainingTasks } = state.activeTasks;
      
      return {
        activeTasks: remainingTasks,
        completedTasks: [...state.completedTasks, completedTask],
      };
    });
  },

  handleTaskFailed: (event: TaskFailedEvent) => {
    set((state) => {
      const task = state.activeTasks[event.task_id];
      if (!task) return state;
      
      const failedTask: Task = {
        ...task,
        status: 'failed',
        progress: event.progress,
        error: event.error,
        completed_at: event.completed_at,
      };
      
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [event.task_id]: _removed, ...remainingTasks } = state.activeTasks;
      
      return {
        activeTasks: remainingTasks,
        completedTasks: [...state.completedTasks, failedTask],
      };
    });
  },

  // ============ Content Event Handlers ============

  handleMessageDelta: (event: MessageDeltaEvent) => {
    set((state) => {
      // Guard: ensure event and delta exist
      if (!event || !event.delta) {
        console.warn('Invalid message_delta event:', event);
        return state;
      }

      const deltaContent = event.delta.content;
      
      // Mode 1: New content block (delta.content is an object with content_id)
      if (event.delta && 'index' in event.delta && typeof deltaContent === 'object' && deltaContent !== null) {
        const newBlock = deltaContent as ContentBlock;
        const index = (event.delta as { index: number }).index;
        
        // Ensure the block has required fields
        if (!newBlock.content_id) {
          console.warn('Content block missing content_id:', newBlock);
          return state;
        }
        
        // Initialize text field if not present (for text blocks)
        const blockToSave: ContentBlock = {
          ...newBlock,
          text: newBlock.text || '',
        };
        
        // Update content order
        const newContentOrder = [...state.contentOrder];
        if (index >= newContentOrder.length) {
          newContentOrder.push(newBlock.content_id);
        } else {
          newContentOrder[index] = newBlock.content_id;
        }
        
        // Associate with task if applicable
        const taskId = event.task_id || newBlock.task_id;
        let newTaskContents = state.taskContents;
        
        if (taskId) {
          const existingContents = state.taskContents[taskId] || [];
          if (!existingContents.includes(newBlock.content_id)) {
            newTaskContents = {
              ...state.taskContents,
              [taskId]: [...existingContents, newBlock.content_id],
            };
          }
        }
        
        return {
          contentBlocks: { ...state.contentBlocks, [newBlock.content_id]: blockToSave },
          contentOrder: newContentOrder,
          taskContents: newTaskContents,
          currentStreamingBlockId: newBlock.content_id, // Track for incremental updates
        };
      }
      
      // Mode 2: Incremental text update (delta.content is a string)
      if (typeof deltaContent === 'string') {
        // Find the content block to append to
        // Priority: explicit content_id > currentStreamingBlockId > last text block
        let contentId: string | null = null;
        
        if ('content_id' in event) {
          contentId = (event as { content_id: string }).content_id;
        } else if (state.currentStreamingBlockId) {
          contentId = state.currentStreamingBlockId;
        } else if (state.contentOrder.length > 0) {
          // Fallback: find the last text block
          for (let i = state.contentOrder.length - 1; i >= 0; i--) {
            const block = state.contentBlocks[state.contentOrder[i]];
            if (block && block.content_type === 'text') {
              contentId = block.content_id;
              break;
            }
          }
        }
        
        if (!contentId) {
          console.warn('No content block to append text to:', deltaContent);
          return state;
        }
        
        const block = state.contentBlocks[contentId];
        // Allow incremental updates to any block type that supports text
        // (text, thinking, plan, tool_output, etc.)
        if (block && block.text !== undefined) {
          const updatedBlock: ContentBlock = {
            ...block,
            text: (block.text || '') + deltaContent,
            updated_at: new Date().toISOString(),
          };
          
          return {
            contentBlocks: { ...state.contentBlocks, [contentId]: updatedBlock },
          };
        }
        
        return state;
      }
      
      return state;
    });
  },

  handleMessageStop: (event: MessageStopEvent) => {
    set((state) => {
      // Sync content blocks from final message if needed
      let updatedContentBlocks = state.contentBlocks;
      if (event.message?.content_blocks) {
        updatedContentBlocks = { ...state.contentBlocks };
        for (const block of event.message.content_blocks) {
          updatedContentBlocks[block.content_id] = block;
        }
      }
      
      return {
        currentMessage: event.message,
        contentBlocks: updatedContentBlocks,
        currentStreamingBlockId: null, // Clear streaming block
        isStreaming: false,
      };
    });
  },

  handleError: (event: ErrorEvent) => {
    set({
      error: event.error,
      isStreaming: false,
    });
  },

  // ============ Connection Management ============

  setConnected: (connected: boolean) => {
    // NOTE:
    // - `isConnected` only reflects SSE transport connectivity.
    // - `isStreaming` reflects whether the current message is still in-progress.
    // A transient SSE disconnect should NOT flip `isStreaming` to false, otherwise:
    // - UI switches to "non-streaming" mode and hides many blocks mid-run
    // - auto-reconnect logic may stop because it thinks streaming ended
    set({
      isConnected: connected,
    });
  },

  setStreaming: (streaming: boolean) => {
    set({ isStreaming: streaming });
  },

  // ============ State Management ============

  reset: () => {
    set(initialState);
  },

  clearError: () => {
    set({ error: null });
  },

  // ============ Utility Methods ============

  getTaskOutputs: (taskId: string): ContentBlock[] => {
    const state = get();
    const contentIds = state.taskContents[taskId] || [];
    return contentIds
      .map((id) => state.contentBlocks[id])
      .filter((block): block is ContentBlock => block !== undefined);
  },

  getFinalOutputs: (): ContentBlock[] => {
    const state = get();
    return state.contentOrder
      .map((id) => state.contentBlocks[id])
      .filter(
        (block): block is ContentBlock =>
          block !== undefined && !block.task_id
      );
  },

  getTextContent: (): string => {
    const state = get();
    return state.contentOrder
      .map((id) => state.contentBlocks[id])
      .filter(
        (block): block is ContentBlock =>
          block !== undefined && block.content_type === 'text'
      )
      .map((block) => block.text || '')
      .join('');
  },
}));

// ============ SSE Event Dispatcher ============

export function dispatchSSEEvent(
  eventType: SSEEventType,
  data: unknown,
  store = useMessageStore.getState()
) {
  switch (eventType) {
    case 'task_started':
      store.handleTaskStarted(data as TaskStartedEvent);
      break;
    case 'task_progress':
      store.handleTaskProgress(data as TaskProgressEvent);
      break;
    case 'task_completed':
      store.handleTaskCompleted(data as TaskCompletedEvent);
      break;
    case 'task_failed':
      store.handleTaskFailed(data as TaskFailedEvent);
      break;
    case 'message_delta':
      store.handleMessageDelta(data as MessageDeltaEvent);
      break;
    case 'message_stop':
      store.handleMessageStop(data as MessageStopEvent);
      break;
    case 'error':
      store.handleError(data as ErrorEvent);
      break;
  }
}

// ============ Selectors ============
// Note: For selectors that return new references (arrays from Object.values, .map, etc.),
// use useShallow from 'zustand/react/shallow' in your components to prevent infinite loops.
// Example: useMessageStore(useShallow((state) => ({ activeTasks: Object.values(state.activeTasks) })))

// Stable selectors (return primitive values or stable references)
export const selectIsStreaming = (state: MessageStore) => 
  state.isStreaming;

export const selectError = (state: MessageStore) => 
  state.error;

export const selectIsConnected = (state: MessageStore) => 
  state.isConnected;
