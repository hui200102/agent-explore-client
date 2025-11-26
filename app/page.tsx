"use client"

import { useState, useEffect } from "react"
import { ChatContainer } from "@/components/chat/chat-container"
import { SessionSidebar } from "@/components/chat/session-sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useSessionList } from "@/hooks/use-session-list"
import { apiClient } from "@/lib/api-client"
import { SessionStorage } from "@/lib/session-storage"
import { Sparkles, Loader2 } from "lucide-react"

export default function Home() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)

  const sessionList = useSessionList({
    userId: "user_default",
    autoLoad: true,
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    sessionList.updateSession(sessionId, { title })
  }

  const handleSessionReady = (sessionId: string) => {
    // Reload session list to stay in sync with server
    sessionList.loadSessions()
  }

  const handleMessageSent = (sessionId: string, messageText: string, messageCount: number) => {
    // Update session metadata with latest message info
    sessionList.updateSession(sessionId, {
      lastMessage: messageText.slice(0, 100), // Truncate long messages
      messageCount: messageCount,
    })
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
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-blue-950/30 dark:to-indigo-950/20 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <Card className="w-full h-full shadow-2xl border-0 backdrop-blur-sm bg-card/95 relative z-10 flex overflow-hidden rounded-none">
        {/* Session Sidebar */}
        <SessionSidebar
          sessions={sessionList.sessions}
          currentSessionId={currentSessionId}
          isLoading={sessionList.isLoading}
          isCollapsed={isSidebarCollapsed}
          onSelectSession={handleSelectSession}
          onCreateSession={handleCreateSession}
          onDeleteSession={handleDeleteSession}
          onUpdateSession={handleUpdateSession}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="border-b bg-gradient-to-r from-card via-primary/5 to-card backdrop-blur-sm shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                  <Sparkles className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    AI Chat Assistant
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Powered by Redis stateless architecture with real-time streaming
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <ChatContainer 
              sessionId={currentSessionId}
              onSessionReady={handleSessionReady}
              onMessageSent={handleMessageSent}
            />
          </CardContent>
        </div>
      </Card>
    </div>
  )
}
