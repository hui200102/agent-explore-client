"use client"

import { useState, useEffect } from "react"
import { ChatContainer } from "@/components/chat/chat-container"
import { SessionSidebar } from "@/components/chat/session-sidebar"
import { useSessionList } from "@/hooks/use-session-list"
import { apiClient } from "@/lib/api-client"
import { SessionStorage } from "@/lib/session-storage"
import { Loader2, BarChart3 } from "lucide-react"
import Link from "next/link"

export default function Home() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)

  const sessionList = useSessionList({
    userId: "user_default",
    autoLoad: true,
    cacheEnabled: true,      // 启用缓存
    syncAcrossTabs: true,    // 启用跨标签页同步
  })

  // Initialize: Load existing session if available (don't auto-create)
  useEffect(() => {
    let mounted = true

    const initializeApp = async () => {
      try {
        // Try to get session from localStorage
        const storedSessionId = SessionStorage.getSessionId()

        if (storedSessionId) {
          try {
            // Verify session exists
            await apiClient.getSession(storedSessionId)
            if (mounted) {
              setCurrentSessionId(storedSessionId)
            }
          } catch (err) {
            console.warn("Stored session invalid, clearing it", err)
            SessionStorage.clearSessionId()
            // Don't auto-create, let user create manually
            if (mounted) {
              setCurrentSessionId(null)
            }
          }
        } else {
          // No stored session, don't auto-create
          if (mounted) {
            setCurrentSessionId(null)
          }
        }
      } catch (err) {
        console.error("Failed to initialize app:", err)
      } finally {
        if (mounted) {
          setIsInitializing(false)
        }
      }
    }

    initializeApp()

    return () => {
      mounted = false
    }
  }, [])

  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId)
    SessionStorage.setSessionId(sessionId)
  }

  const handleCreateSession = async () => {
    try {
      const sessionId = await sessionList.createSession()
      if (sessionId) {
        setCurrentSessionId(sessionId)
        SessionStorage.setSessionId(sessionId)
      }
    } catch (err) {
      console.error("Failed to create session:", err)
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    const success = await sessionList.deleteSession(sessionId)
    if (success && sessionId === currentSessionId) {
      // If we deleted the current session, clear it (don't auto-create)
      setCurrentSessionId(null)
      SessionStorage.clearSessionId()
    }
  }

  const handleUpdateSession = (sessionId: string, title: string) => {
    // 使用防抖优化标题更新（手动编辑时）
    sessionList.updateSession(sessionId, { title }, false)
  }

  const handleSessionReady = (sessionId: string) => {
    // 只在需要时刷新特定 session 信息，不需要刷新整个列表
    // 选择已存在的 session 不需要刷新列表
    // 只有创建新 session 或发送消息时才会更新列表
    console.log("Session ready:", sessionId)
  }

  const handleMessageSent = (sessionId: string, messageText: string, messageCount: number) => {
    // Update session metadata with latest message info
    // 使用防抖避免频繁更新
    sessionList.updateSession(sessionId, {
      lastMessage: messageText.slice(0, 100), // Truncate long messages
      messageCount: messageCount,
    }, true) // 启用防抖
  }

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-blue-950/30 dark:to-indigo-950/20">
        <div className="text-center space-y-4 animate-fade-in-up">
          <div className="relative">
            <div className="absolute inset-0 blur-xl bg-primary/20 rounded-full animate-pulse"></div>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto relative" />
          </div>
          <p className="text-sm font-medium text-foreground">Initializing...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950">
      <div className="w-full h-full flex overflow-hidden">
        {/* Session Sidebar */}
        <SessionSidebar
          sessions={sessionList.sessions}
          currentSessionId={currentSessionId}
          isLoading={sessionList.isLoading}
          isRefreshing={sessionList.isRefreshing}
          isCollapsed={isSidebarCollapsed}
          onSelectSession={handleSelectSession}
          onCreateSession={handleCreateSession}
          onDeleteSession={handleDeleteSession}
          onUpdateSession={handleUpdateSession}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onRefresh={sessionList.refreshAll}
          showFilter={false}  // 可以根据需要启用过滤器
        />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden border-l border-zinc-200 dark:border-zinc-800">
          {/* Top Navigation Bar */}
          <div className="flex items-center justify-end px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <Link
              href="/stats"
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
            >
              <BarChart3 className="h-4 w-4" />
              Statistics
            </Link>
          </div>

          <ChatContainer 
            sessionId={currentSessionId}
            onSessionReady={handleSessionReady}
            onMessageSent={handleMessageSent}
          />
        </div>
      </div>
    </div>
  )
}
