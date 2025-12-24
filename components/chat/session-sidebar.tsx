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
  Search,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  RefreshCw,
  Loader2,
  Bot,
  MoreHorizontal,
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
}

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
}: SessionSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  
  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  // Memoized filtered sessions with debounced search
  const filteredSessions = useMemo(() => {
    let filtered = sessions

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
  }, [sessions, searchQuery])

  // Group sessions by date
  const groupedSessions = useMemo(() => {
    const groups: { title: string; sessions: SessionItem[] }[] = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);
    const last30Days = new Date(today);
    last30Days.setDate(last30Days.getDate() - 30);

    const todaySessions: SessionItem[] = [];
    const yesterdaySessions: SessionItem[] = [];
    const previous7DaysSessions: SessionItem[] = [];
    const previous30DaysSessions: SessionItem[] = [];
    const olderSessions: SessionItem[] = [];

    filteredSessions.forEach((session) => {
      const date = new Date(session.updated_at || session.created_at);
      if (date >= today) {
        todaySessions.push(session);
      } else if (date >= yesterday) {
        yesterdaySessions.push(session);
      } else if (date >= last7Days) {
        previous7DaysSessions.push(session);
      } else if (date >= last30Days) {
        previous30DaysSessions.push(session);
      } else {
        olderSessions.push(session);
      }
    });

    if (todaySessions.length > 0) groups.push({ title: "Today", sessions: todaySessions });
    if (yesterdaySessions.length > 0) groups.push({ title: "Yesterday", sessions: yesterdaySessions });
    if (previous7DaysSessions.length > 0) groups.push({ title: "Previous 7 Days", sessions: previous7DaysSessions });
    if (previous30DaysSessions.length > 0) groups.push({ title: "Previous 30 Days", sessions: previous30DaysSessions });
    if (olderSessions.length > 0) groups.push({ title: "Older", sessions: olderSessions });

    return groups;
  }, [filteredSessions]);

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
      <div className="w-12 bg-white dark:bg-[#0d0d0d] border-r border-border/20 flex flex-col items-center py-3 gap-3 z-30 transition-all duration-300">
        <Button
          variant="ghost"
          size="icon"
          onClick={onCreateSession}
          className="h-9 w-9 rounded-md hover:bg-muted/50 transition-colors"
          title="New chat"
        >
          <Edit2 className="h-4 w-4 text-muted-foreground/50" />
        </Button>

        <div className="w-6 h-px bg-border/30" />

        <div className="flex-1 flex flex-col gap-2 w-full px-1.5 overflow-y-auto scrollbar-none">
          {sessions.slice(0, 12).map((session) => (
            <button
              key={session.session_id}
              onClick={() => onSelectSession(session.session_id)}
              className={cn(
                "w-full aspect-square rounded-md flex items-center justify-center transition-all",
                currentSessionId === session.session_id
                  ? "bg-muted/80 text-foreground"
                  : "text-muted-foreground/40 hover:bg-muted/30 hover:text-foreground"
              )}
              title={session.metadata?.title || "Untitled"}
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-9 w-9 rounded-md hover:bg-muted/50 text-muted-foreground/50"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="w-[260px] bg-white dark:bg-[#0d0d0d] border-r border-border/20 flex flex-col h-full z-30 transition-all duration-300">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 space-y-3">
        <div className="flex items-center justify-between px-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-7 w-7 rounded-md hover:bg-muted/50 text-muted-foreground/40 hover:text-foreground transition-all"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onCreateSession}
            className="h-7 w-7 rounded-md hover:bg-muted/50 text-muted-foreground/40 hover:text-foreground transition-all"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/30" />
          <Input
            ref={searchInputRef}
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search..."
            className="pl-7 pr-2 h-7 bg-muted/30 border-none focus:bg-muted/50 focus:ring-0 transition-all rounded-md text-[12px] placeholder:text-muted-foreground/30 font-medium"
          />
        </div>
      </div>

      {/* Sessions List */}
      <ScrollArea className="flex-1">
        <div className="px-2 pb-2 space-y-8">
          {isLoading && sessions.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground/20" />
            </div>
          ) : groupedSessions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[11px] text-muted-foreground/30 font-medium">No conversations</p>
            </div>
          ) : (
            groupedSessions.map((group) => (
              <div key={group.title}>
                <h3 className="px-2 text-[9px] font-extrabold text-muted-foreground/25 uppercase tracking-[0.15em] mb-1.5">
                  {group.title}
                </h3>
                <div className="space-y-0.5">
                  {group.sessions.map((session) => {
                    const isActive = currentSessionId === session.session_id
                    const isEditing = editingSessionId === session.session_id
                    
                    // Smart title: Extract time or keep custom title
                    const rawTitle = session.metadata?.title || "New Chat";
                    let displayTitle = rawTitle;
                    
                    // If it's a default "New Chat YYYY/MM/DD HH:MM:SS" format, show simplified time
                    const timeMatch = rawTitle.match(/(\d{2}:\d{2}:\d{2})$/);
                    if (timeMatch && rawTitle.startsWith("New Chat")) {
                      const time = timeMatch[1].substring(0, 5); // HH:MM
                      displayTitle = time;
                    }

                    return (
                      <div
                        key={session.session_id}
                        className={cn(
                          "group relative rounded-md transition-all duration-200",
                          isActive
                            ? "bg-muted/70 text-foreground"
                            : "hover:bg-muted/30 text-muted-foreground/70 hover:text-foreground"
                        )}
                      >
                        {isEditing ? (
                          <div className="p-1">
                            <Input
                              ref={editInputRef}
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveEdit()
                                if (e.key === "Escape") handleCancelEdit()
                              }}
                              className="h-6 text-[12px] bg-background border-border/30 px-2 rounded"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div className="relative">
                            <button
                              onClick={() => onSelectSession(session.session_id)}
                              className="w-full px-2 py-1.5 text-left group/btn"
                            >
                              <span className="text-[13px] font-medium truncate block pr-8 tracking-tight">
                                {displayTitle}
                              </span>
                            </button>

                            {/* Actions */}
                            <div className={cn(
                              "absolute right-0.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 transition-opacity duration-150 bg-gradient-to-l from-inherit via-inherit to-transparent pl-6 pr-0.5",
                              isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            )}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEdit(session, e);
                                }}
                                className="p-1 hover:bg-muted rounded text-muted-foreground/30 hover:text-foreground transition-all"
                                title="Rename"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSession(session.session_id, e);
                                }}
                                className="p-1 hover:bg-destructive/10 rounded text-muted-foreground/30 hover:text-destructive transition-all"
                                title="Delete"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-border/10">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-muted/40 flex items-center justify-center border border-border/20">
              <Bot className="h-3.5 w-3.5 text-muted-foreground/40" />
            </div>
            <span className="text-[12px] font-semibold text-foreground/60 tracking-tight">Personal</span>
          </div>
          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshingProp || isLoading}
              className="h-7 w-7 rounded-md hover:bg-muted/50 text-muted-foreground/30 hover:text-foreground transition-all"
            >
              <RefreshCw className={cn("h-3 w-3", isRefreshingProp && "animate-spin")} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

