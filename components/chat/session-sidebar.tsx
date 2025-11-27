"use client"

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
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
  RefreshCw,
} from "lucide-react"
import type { SessionItem } from "@/hooks/use-session-list"

interface SessionSidebarProps {
  sessions: SessionItem[]
  currentSessionId: string | null
  isLoading?: boolean          // 首次加载状态
  isRefreshing?: boolean       // 刷新状态
  isCollapsed?: boolean
  onSelectSession: (sessionId: string) => void
  onCreateSession: () => void
  onDeleteSession: (sessionId: string) => void
  onUpdateSession?: (sessionId: string, title: string) => void
  onToggleCollapse?: () => void
  onRefresh?: () => void
  showFilter?: boolean
}

type FilterType = "all" | "active" | "completed"

export function SessionSidebar({
  sessions,
  currentSessionId,
  isLoading = false,
  isRefreshing: isRefreshingProp = false,
  isCollapsed = false,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onUpdateSession,
  onToggleCollapse,
  onRefresh,
  showFilter = false,
}: SessionSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [filter, setFilter] = useState<FilterType>("all")
  
  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  // Memoized filtered sessions with debounced search
  const filteredSessions = useMemo(() => {
    let filtered = sessions

    // Apply status filter
    if (filter !== "all") {
      filtered = filtered.filter(session => session.status === filter)
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((session) => {
        const title = session.metadata?.title || "Untitled"
        const lastMessage = session.metadata?.lastMessage || ""
        return (
          title.toLowerCase().includes(query) || 
          lastMessage.toLowerCase().includes(query) ||
          session.session_id.toLowerCase().includes(query)
        )
      })
    }

    return filtered
  }, [sessions, searchQuery, filter])

  // Callbacks
  const handleStartEdit = useCallback((session: SessionItem, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setEditingSessionId(session.session_id)
    setEditingTitle(session.metadata?.title || "")
    setTimeout(() => editInputRef.current?.focus(), 0)
  }, [])

  const handleSaveEdit = useCallback(() => {
    if (editingSessionId && onUpdateSession && editingTitle.trim()) {
      onUpdateSession(editingSessionId, editingTitle.trim())
      setEditingSessionId(null)
      setEditingTitle("")
    }
  }, [editingSessionId, editingTitle, onUpdateSession])

  const handleCancelEdit = useCallback(() => {
    setEditingSessionId(null)
    setEditingTitle("")
  }, [])

  const handleDeleteSession = useCallback((sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    const session = sessions.find(s => s.session_id === sessionId)
    const title = session?.metadata?.title || "this conversation"
    
    if (confirm(`Delete ${title}? This action cannot be undone.`)) {
      onDeleteSession(sessionId)
    }
  }, [sessions, onDeleteSession])

  const handleRefresh = useCallback(async () => {
    if (!onRefresh || isRefreshingProp) return
    await onRefresh()
  }, [onRefresh, isRefreshingProp])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }, [])

  const clearSearch = useCallback(() => {
    setSearchQuery("")
    searchInputRef.current?.focus()
  }, [])

  // Memoized date formatter
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMinutes = diffInMs / (1000 * 60)
    const diffInHours = diffInMs / (1000 * 60 * 60)
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24)

    if (diffInMinutes < 1) {
      return "Just now"
    } else if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)}m ago`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else if (diffInDays < 7) {
      return `${Math.floor(diffInDays)}d ago`
    } else {
      return date.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
      })
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      
      // Escape to clear search or cancel edit
      if (e.key === 'Escape') {
        if (editingSessionId) {
          handleCancelEdit()
        } else if (searchQuery) {
          clearSearch()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editingSessionId, searchQuery, handleCancelEdit, clearSearch])

  if (isCollapsed) {
    return (
      <div className="w-16 border-r bg-muted/30 flex flex-col items-center py-4 gap-3 transition-all duration-300 ease-in-out">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
          title="Expand sidebar"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onCreateSession}
          className="rounded-xl bg-primary/5 hover:bg-primary/10 text-primary shadow-sm hover:shadow-md transition-all"
          title="New chat"
        >
          <MessageSquarePlus className="h-5 w-5" />
        </Button>

        <div className="flex-1 flex flex-col gap-2 w-full px-2 overflow-y-auto scrollbar-hide">
          {sessions.slice(0, 5).map((session) => (
            <button
              key={session.session_id}
              onClick={() => onSelectSession(session.session_id)}
              className={cn(
                "w-full aspect-square rounded-xl flex items-center justify-center transition-all",
                currentSessionId === session.session_id
                  ? "bg-primary text-primary-foreground shadow-md scale-105"
                  : "hover:bg-muted text-muted-foreground"
              )}
              title={session.metadata?.title || "Untitled"}
            >
              <MessageSquare className="h-5 w-5" />
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 border-r bg-card/50 flex flex-col h-full transition-all duration-300 ease-in-out">
      {/* Header */}
      <div className="p-4 border-b bg-background/50 backdrop-blur-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Conversations</h2>
          <div className="flex items-center gap-1">
            {onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshingProp || isLoading}
                className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Refresh sessions"
              >
                <RefreshCw className={cn(
                  "h-4 w-4",
                  isRefreshingProp && "animate-spin"
                )} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onCreateSession}
              disabled={isLoading}
              className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors"
              title="New conversation (Ctrl+N)"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
            {onToggleCollapse && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
                className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            ref={searchInputRef}
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search... (Ctrl+K)"
            className="pl-9 pr-9 h-9 bg-muted/50 border-transparent focus:bg-background focus:border-input transition-all"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        {showFilter && (
          <div className="flex items-center gap-2 text-sm p-1 bg-muted/30 rounded-lg">
            {(['all', 'active', 'completed'] as const).map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={cn(
                  "flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize",
                  filter === filterType
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {filterType}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sessions List */}
      <ScrollArea className="flex-1">
        {/* 刷新时在顶部显示加载指示器 */}
        {isRefreshingProp && sessions.length > 0 && (
          <div className="px-4 py-2 border-b bg-primary/5 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-xs text-primary font-medium">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Updating conversations...</span>
            </div>
          </div>
        )}

        {/* 首次加载且无数据时显示完整加载状态 */}
        {isLoading && sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary/20" />
            <p className="text-xs text-muted-foreground">Loading history...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <MessageSquare className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {searchQuery ? "No matches found" : "No conversations yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {searchQuery ? "Try a different search term" : "Start a new chat to get going"}
            </p>
            {!searchQuery && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCreateSession}
                className="mt-4"
              >
                Start New Chat
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
                    "group relative rounded-xl transition-all duration-200 border",
                    isActive
                      ? "bg-primary/5 border-primary/10 shadow-sm"
                      : "hover:bg-muted/40 border-transparent hover:border-border/50"
                  )}
                >
                  {isEditing ? (
                    <div className="p-3 flex items-center gap-2 animate-in zoom-in-95">
                      <Input
                        ref={editInputRef}
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit()
                          if (e.key === "Escape") handleCancelEdit()
                        }}
                        className="h-8 text-sm bg-background"
                        placeholder="Enter title..."
                        maxLength={100}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleSaveEdit}
                        disabled={!editingTitle.trim()}
                        className="h-8 w-8 shrink-0 hover:bg-green-500/10 hover:text-green-600"
                        title="Save (Enter)"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCancelEdit}
                        className="h-8 w-8 shrink-0 hover:bg-destructive/10 hover:text-destructive"
                        title="Cancel (Esc)"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => onSelectSession(session.session_id)}
                        className="w-full p-3 text-left transition-colors overflow-hidden"
                      >
                        {/* 标题行 */}
                        <div className="flex items-start gap-2 mb-1.5 min-w-0">
                          <h3
                            className={cn(
                              "text-sm font-medium line-clamp-2 flex-1 min-w-0 break-words transition-colors leading-snug",
                              isActive ? "text-primary" : "text-foreground group-hover:text-foreground/90"
                            )}
                            title={session.metadata?.title || "Untitled Conversation"}
                          >
                            {session.metadata?.title || "Untitled Conversation"}
                          </h3>
                          <div className="flex items-center gap-1 shrink-0 mt-0.5">
                            {session.status === 'completed' && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-green-500/10 text-green-600 rounded-full font-medium">
                                Done
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 最后消息 */}
                        {session.metadata?.lastMessage && (
                          <p 
                            className="text-xs text-muted-foreground/70 line-clamp-1 mb-2 min-w-0 break-all"
                            title={session.metadata.lastMessage}
                          >
                            {session.metadata.lastMessage}
                          </p>
                        )}

                        {/* 时间和消息数 */}
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 min-w-0">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span className="truncate">{formatDate(session.updated_at || session.created_at)}</span>
                          </div>
                          {session.metadata?.messageCount !== undefined && session.metadata.messageCount > 0 && (
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-medium transition-colors",
                              isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                            )}>
                              {session.metadata.messageCount} msgs
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Hover Actions */}
                      <div className={cn(
                        "absolute top-2 right-2 transition-all duration-200 flex gap-0.5 bg-background/95 backdrop-blur-sm rounded-lg p-0.5 shadow-sm border border-border/50",
                        isActive ? "opacity-0 group-hover:opacity-100" : "opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0"
                      )}>
                        {onUpdateSession && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleStartEdit(session, e)}
                            className="h-6 w-6 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary"
                            title="Edit title"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDeleteSession(session.session_id, e)}
                          className="h-6 w-6 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          title="Delete conversation"
                        >
                          <Trash2 className="h-3 w-3" />
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
      <div className="p-3 border-t bg-background/50 backdrop-blur-sm">
        <div className="text-[10px] text-muted-foreground/60 text-center space-y-1 font-medium uppercase tracking-wider">
          <p>
            {filteredSessions.length === sessions.length ? (
              <>{sessions.length} conversation{sessions.length !== 1 ? "s" : ""}</>
            ) : (
              <>
                {filteredSessions.length} / {sessions.length}
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

