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
        <div className="flex-1 flex flex-col overflow-hidden bg-background/50 relative">
          {/* Top Navigation Bar */}
          <header className="flex items-center justify-between px-6 h-14 z-20 border-b border-border/40 bg-background/30 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground/80 tracking-tight">AI Workspace</span>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-6">
                <Link
                  href="/admin/knowledge"
                  className="text-[13px] font-medium text-muted-foreground/70 hover:text-foreground transition-colors"
                >
                  Knowledge
                </Link>
                <Link
                  href="/stats"
                  className="text-[13px] font-medium text-muted-foreground/70 hover:text-foreground transition-colors"
                >
                  Stats
                </Link>
              </div>
              
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 flex items-center justify-center border border-indigo-500/20 shadow-sm">
                <Bot className="h-4 w-4 text-indigo-500/70" />
              </div>
            </div>
          </header>

          {/* Session Content */}
          <main className="flex-1 flex flex-col overflow-hidden relative">
            {currentSessionId ? (
              <ChatView sessionId={currentSessionId} className="flex-1" />
            ) : (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center space-y-8 max-w-lg animate-slide-up">
                  <div className="space-y-4">
                    <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-6">
                      <Bot className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
                      How can I help you today?
                    </h1>
                    <p className="text-muted-foreground text-lg">
                      I can help you with tasks, analysis, and creative work.
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button 
                      onClick={handleCreateSession}
                      className="rounded-xl h-12 px-8 bg-foreground text-background hover:opacity-90 transition-all shadow-md font-medium text-base"
                    >
                      <Plus className="mr-2 h-5 w-5" />
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
