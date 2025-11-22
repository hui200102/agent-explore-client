"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  MessageSquarePlus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Clock,
  Loader2,
} from "lucide-react"
import type { SessionItem } from "@/hooks/use-session-list"

interface SessionSidebarProps {
  sessions: SessionItem[]
  currentSessionId: string | null
  isLoading?: boolean
  isCollapsed?: boolean
  onSelectSession: (sessionId: string) => void
  onCreateSession: () => void
  onDeleteSession: (sessionId: string) => void
  onUpdateSession?: (sessionId: string, title: string) => void
  onToggleCollapse?: () => void
}

export function SessionSidebar({
  sessions,
  currentSessionId,
  isLoading = false,
  isCollapsed = false,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onUpdateSession,
  onToggleCollapse,
}: SessionSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")

  const filteredSessions = sessions.filter((session) => {
    const title = session.metadata?.title || "Untitled"
    const lastMessage = session.metadata?.lastMessage || ""
    const query = searchQuery.toLowerCase()
    return title.toLowerCase().includes(query) || lastMessage.toLowerCase().includes(query)
  })

  const handleStartEdit = (session: SessionItem) => {
    setEditingSessionId(session.session_id)
    setEditingTitle(session.metadata?.title || "")
  }

  const handleSaveEdit = () => {
    if (editingSessionId && onUpdateSession) {
      onUpdateSession(editingSessionId, editingTitle)
      setEditingSessionId(null)
      setEditingTitle("")
    }
  }

  const handleCancelEdit = () => {
    setEditingSessionId(null)
    setEditingTitle("")
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInHours = diffInMs / (1000 * 60 * 60)
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24)

    if (diffInHours < 1) {
      return "Just now"
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else if (diffInDays < 7) {
      return `${Math.floor(diffInDays)}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  if (isCollapsed) {
    return (
      <div className="w-16 border-r bg-muted/30 flex flex-col items-center py-4 gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="rounded-full hover:bg-primary/10"
          title="Expand sidebar"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onCreateSession}
          className="rounded-full hover:bg-primary/10 hover:text-primary"
          title="New chat"
        >
          <MessageSquarePlus className="h-5 w-5" />
        </Button>

        <div className="flex-1 flex flex-col gap-2 w-full px-2 overflow-y-auto">
          {sessions.slice(0, 5).map((session) => (
            <button
              key={session.session_id}
              onClick={() => onSelectSession(session.session_id)}
              className={cn(
                "w-full h-10 rounded-full flex items-center justify-center transition-colors",
                currentSessionId === session.session_id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
              title={session.metadata?.title || "Untitled"}
            >
              <MessageSquare className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 border-r bg-gradient-to-b from-muted/20 to-background flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onCreateSession}
              className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
              title="New conversation"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
            {onToggleCollapse && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
                className="h-8 w-8 rounded-full hover:bg-muted"
                title="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="pl-9 h-9 bg-background"
          />
        </div>
      </div>

      {/* Sessions List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <MessageSquare className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "No conversations found" : "No conversations yet"}
            </p>
            {!searchQuery && (
              <Button
                variant="link"
                onClick={onCreateSession}
                className="mt-2 text-primary"
              >
                Start a new chat
              </Button>
            )}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredSessions.map((session) => {
              const isActive = currentSessionId === session.session_id
              const isEditing = editingSessionId === session.session_id

              return (
                <div
                  key={session.session_id}
                  className={cn(
                    "group relative rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/50 border border-transparent"
                  )}
                >
                  {isEditing ? (
                    <div className="p-3 flex items-center gap-2">
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit()
                          if (e.key === "Escape") handleCancelEdit()
                        }}
                        className="h-8 text-sm"
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleSaveEdit}
                        className="h-8 w-8 shrink-0"
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCancelEdit}
                        className="h-8 w-8 shrink-0"
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => onSelectSession(session.session_id)}
                        className="w-full p-3 text-left"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3
                            className={cn(
                              "text-sm font-medium truncate flex-1",
                              isActive ? "text-primary" : "text-foreground"
                            )}
                          >
                            {session.metadata?.title || "Untitled Conversation"}
                          </h3>
                          {isActive && (
                            <span className="shrink-0 w-2 h-2 rounded-full bg-primary animate-pulse" />
                          )}
                        </div>

                        {session.metadata?.lastMessage && (
                          <p className="text-xs text-muted-foreground truncate mb-2">
                            {session.metadata.lastMessage}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatDate(session.updated_at || session.created_at)}</span>
                          </div>
                          {session.metadata?.messageCount !== undefined && (
                            <span>{session.metadata.messageCount} messages</span>
                          )}
                        </div>
                      </button>

                      {/* Hover Actions - Outside button to avoid nesting */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        {onUpdateSession && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStartEdit(session)
                            }}
                            className="h-7 w-7 rounded-full hover:bg-primary/10"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm("Delete this conversation?")) {
                              onDeleteSession(session.session_id)
                            }
                          }}
                          className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t bg-card/50 backdrop-blur-sm">
        <p className="text-xs text-muted-foreground text-center">
          {sessions.length} conversation{sessions.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  )
}

