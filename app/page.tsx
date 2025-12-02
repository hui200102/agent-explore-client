"use client"

import { useState, useEffect } from "react"
import { SessionSidebar, ChatView } from "@/components/chat"
import { useSessionList } from "@/hooks/use-session-list"
import { apiClient } from "@/lib/api-client"
import { SessionStorage } from "@/lib/session-storage"
import { Loader2, BarChart3, Bot } from "lucide-react"
import Link from "next/link"

export default function Home() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)

  const sessionList = useSessionList({
    userId: "user_default",
    autoLoad: true,
    cacheEnabled: true,
    syncAcrossTabs: true,
  })

  // Initialize: Load existing session if available
  useEffect(() => {
    let mounted = true

    const initializeApp = async () => {
      try {
        const storedSessionId = SessionStorage.getSessionId()

        if (storedSessionId) {
          try {
            await apiClient.getSession(storedSessionId)
            if (mounted) {
              setCurrentSessionId(storedSessionId)
            }
          } catch (err) {
            console.warn("Stored session invalid, clearing it", err)
            SessionStorage.clearSessionId()
            if (mounted) {
              setCurrentSessionId(null)
            }
          }
        } else {
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
      setCurrentSessionId(null)
      SessionStorage.clearSessionId()
    }
  }

  const handleUpdateSession = (sessionId: string, title: string) => {
    sessionList.updateSession(sessionId, { title }, false)
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
          showFilter={false}
        />

        {/* Main Content Area */}
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

          {/* Session Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {currentSessionId ? (
              <ChatView sessionId={currentSessionId} className="flex-1" />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-muted/20 to-background">
                <div className="text-center space-y-6 max-w-md animate-fade-in-up px-6">
                  <div className="relative">
                    <div className="absolute inset-0 blur-2xl bg-primary/20 rounded-full animate-pulse"></div>
                    <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-2xl shadow-primary/30 relative">
                      <Bot className="h-10 w-10 text-primary-foreground" />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground mb-3">Welcome</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Select a session from the sidebar or create a new one to get started.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
