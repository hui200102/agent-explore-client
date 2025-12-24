"use client"

import { useState, useEffect } from "react"
import { SessionSidebar, ChatView } from "@/components/chat"
import { useSessionList } from "@/hooks/use-session-list"
import { apiClient } from "@/lib/api-client"
import { SessionStorage } from "@/lib/session-storage"
import { Loader2, Bot, Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

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
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary/5">
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
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background relative">
          {/* Top Navigation Bar */}
          <header className="flex items-center justify-between px-6 h-14 z-20">
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold text-foreground/80 px-2">AI Agent</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4">
                <Link
                  href="/admin/knowledge"
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Knowledge
                </Link>
                <Link
                  href="/stats"
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Stats
                </Link>
              </div>
              
              <div className="h-7 w-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 border border-border/50">
                <Bot className="h-4 w-4" />
              </div>
            </div>
          </header>

          {/* Session Content */}
          <main className="flex-1 flex flex-col overflow-hidden relative">
            {currentSessionId ? (
              <ChatView sessionId={currentSessionId} className="flex-1" />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-6 max-w-lg animate-slide-up px-6">
                  <h1 className="text-4xl font-medium tracking-tight text-foreground">
                    How can I help you today?
                  </h1>
                  
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button 
                      onClick={handleCreateSession}
                      className="rounded-2xl h-11 px-6 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-all shadow-sm font-medium"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Start a new chat
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
