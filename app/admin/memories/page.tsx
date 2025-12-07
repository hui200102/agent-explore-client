"use client"

import { useState, useEffect } from "react"
import { useInView } from "react-intersection-observer"
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  Loader2, 
  Trash2, 
  Search, 
  Save, 
  Plus, 
  Globe, 
  RefreshCw,
  AlertTriangle,
  Hash,
  Star,
  Activity,
  FileText,
  Layers,
  Info,
  Clock,
  MessageSquare,
  Image as ImageIcon
} from "lucide-react"

// Types
type ViewMode = "list" | "create" | "edit"

export default function MemoryAdminPage() {
  const queryClient = useQueryClient()
  
  // ==================== State ====================
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [scopeFilter, setScopeFilter] = useState<string>("all")
  
  // Forms
  const [formData, setFormData] = useState<{
    summary: string
    scope: "session" | "global"
    session_id: string
    tags: string
  }>({
    summary: "",
    scope: "global",
    session_id: "global",
    tags: ""
  })

  // Infinite Scroll Hook
  const { ref: scrollRef, inView } = useInView()

  // ==================== Queries ====================

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch
  } = useInfiniteQuery({
    queryKey: ['memories', searchQuery, scopeFilter],
    queryFn: async ({ pageParam }) => {
      console.log(`Fetching memories with cursor: ${pageParam}`)
      return apiClient.queryMemories({
        query: searchQuery,
        scope: scopeFilter === "all" ? undefined : scopeFilter,
        include_global: true,
        limit: 20,
        offset: pageParam
      })
    },
    initialPageParam: undefined as string | number | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor || undefined,
  })

  // Load more when scrolling into view
  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, fetchNextPage])

  // ==================== Mutations ====================

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteMemory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories'] })
    },
    onError: (err) => {
      console.error(err)
      alert("Failed to delete memory")
    }
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiClient.createMemory({
      summary: data.summary,
      scope: data.scope,
      session_id: data.session_id,
      tags: data.tags.split(",").map(t => t.trim()).filter(Boolean)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories'] })
      setViewMode("list")
      setFormData({
        summary: "",
        scope: "global",
        session_id: "global",
        tags: ""
      })
    },
    onError: (err) => {
      console.error(err)
      alert("Failed to create memory")
    }
  })

  // ==================== Handlers ====================

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this memory?")) return
    deleteMutation.mutate(id)
  }

  const handleSave = async () => {
    if (!formData.summary.trim()) {
      alert("Summary is required")
      return
    }

    if (viewMode === "create") {
      createMutation.mutate(formData)
    } else {
      alert("Update functionality requires backend implementation")
    }
  }

  const startCreate = () => {
    setFormData({
      summary: "",
      scope: "global",
      session_id: "global",
      tags: ""
    })
    setViewMode("create")
  }

  // Flatten pages for rendering and deduplicate
  const allMemories = data?.pages.flatMap(page => page.results) || []
  const uniqueMemoryIds = new Set()
  const memories = allMemories.filter(item => {
    if (uniqueMemoryIds.has(item.memory.memory_id)) {
      return false
    }
    uniqueMemoryIds.add(item.memory.memory_id)
    return true
  })

  // ==================== Render ====================

  return (
    <div className="container mx-auto p-4 max-w-5xl h-screen flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="h-6 w-6 text-blue-500" />
          Memory Manager
          {memories.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-2">
              {memories.length} loaded
            </span>
          )}
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading || isFetchingNextPage}>
            <RefreshCw className={`h-4 w-4 mr-2 ${(isLoading || isFetchingNextPage) ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={startCreate} disabled={viewMode !== "list"}>
            <Plus className="h-4 w-4 mr-2" />
            New Memory
          </Button>
        </div>
      </div>

      {viewMode === "list" && (
        <>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search memories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <select
              className="border rounded-md px-3 py-2 bg-background"
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
            >
              <option value="all">All Scopes</option>
              <option value="global">Global</option>
              <option value="session">Session</option>
            </select>
          </div>

          {/* Error Banner */}
          {isError && (
            <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <p>{error instanceof Error ? error.message : "Failed to load memories"}</p>
              <Button variant="ghost" size="sm" onClick={() => refetch()} className="ml-auto">
                Retry
              </Button>
            </div>
          )}

          {/* List */}
          <div className="flex-1 overflow-auto space-y-4 pr-2 pb-4">
            {memories.length === 0 && !isLoading && !isError ? (
              <div className="text-center text-muted-foreground py-10">
                No memories found.
              </div>
            ) : (
              memories.map((item) => (
                <Card key={item.memory.memory_id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          item.memory.scope === 'global' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {item.memory.scope}
                        </span>
                        <span 
                          className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded cursor-pointer hover:bg-muted/80"
                          title={item.memory.memory_id}
                          onClick={() => {
                            navigator.clipboard.writeText(item.memory.memory_id)
                            // Optional: add toast notification here
                          }}
                        >
                          {item.memory.memory_id.length > 12 
                            ? `${item.memory.memory_id.substring(0, 6)}...${item.memory.memory_id.substring(item.memory.memory_id.length - 4)}` 
                            : item.memory.memory_id}
                        </span>
                        
                        {/* Status Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${
                          item.memory.status === 'raw' ? 'border-yellow-200 bg-yellow-50 text-yellow-700' :
                          item.memory.status === 'consolidated' ? 'border-green-200 bg-green-50 text-green-700' :
                          item.memory.status === 'archived' ? 'border-gray-200 bg-gray-50 text-gray-600' :
                          'border-gray-100 bg-gray-50 text-gray-500'
                        }`}>
                          {item.memory.status}
                        </span>

                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(item.memory.created_at || '').toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:text-red-700" 
                          onClick={() => handleDelete(item.memory.memory_id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <p className="whitespace-pre-wrap text-sm">{item.memory.summary}</p>
                    </div>

                    {/* Meta Info Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded-md">
                      <div className="flex items-center gap-2" title="Importance Score">
                        <Activity className="h-3 w-3 text-blue-500" />
                        <span>Importance: {item.memory.importance_score?.toFixed(2) || 'N/A'}</span>
                      </div>
                      
                      <div className="flex items-center gap-2" title="Type">
                        <FileText className="h-3 w-3 text-orange-500" />
                        <span className="capitalize">Type: {item.memory.type}</span>
                      </div>

                      <div className="flex items-center gap-2" title="Category">
                        <Layers className="h-3 w-3 text-purple-500" />
                        <span>Category: {item.memory.category || 'Uncategorized'}</span>
                      </div>

                      {item.memory.session_id && item.memory.scope === 'session' && (
                        <div className="flex items-center gap-2" title="Session ID">
                          <MessageSquare className="h-3 w-3 text-green-500" />
                          <span className="font-mono truncate max-w-[150px]">Session: {item.memory.session_id}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Resources (if any in metadata) */}
                    {item.memory.metadata && (item.memory.metadata as any).resources && (item.memory.metadata as any).resources.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1 border-t border-dashed">
                        <span className="text-xs font-medium text-muted-foreground flex items-center">
                          <ImageIcon className="h-3 w-3 mr-1" />
                          Resources:
                        </span>
                        {(item.memory.metadata as any).resources.map((res: any, idx: number) => (
                          <span key={idx} className="text-xs bg-slate-100 px-1.5 py-0.5 rounded border flex items-center gap-1" title={JSON.stringify(res)}>
                             {res.type}
                             {res.url && <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Link</a>}
                          </span>
                        ))}
                      </div>
                    )}

                    {item.memory.tags && item.memory.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {item.memory.tags.map(tag => (
                          <span key={tag} className="text-xs bg-secondary px-2 py-1 rounded-full flex items-center">
                            <Hash className="h-3 w-3 mr-1 opacity-50" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
            
            {/* Loading / Infinite Scroll Sentinel */}
            <div ref={scrollRef} className="py-4 text-center">
              {(isLoading || isFetchingNextPage) && (
                <div className="flex justify-center items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading more...
                </div>
              )}
              {!hasNextPage && memories.length > 0 && (
                <span className="text-xs text-muted-foreground">End of list</span>
              )}
            </div>
          </div>
        </>
      )}

      {/* Create/Edit Form */}
      {(viewMode === "create" || viewMode === "edit") && (
        <div className="max-w-2xl mx-auto w-full mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{viewMode === "create" ? "Create Memory" : "Edit Memory"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Summary / Content</label>
                <Textarea 
                  rows={5}
                  value={formData.summary} 
                  onChange={e => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="Enter memory content..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Scope</label>
                  <select 
                    className="w-full border rounded-md px-3 py-2"
                    value={formData.scope}
                    onChange={e => setFormData(prev => ({ ...prev, scope: e.target.value as "session" | "global" }))}
                  >
                    <option value="session">Session</option>
                    <option value="global">Global</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Session ID</label>
                  <Input 
                    value={formData.session_id} 
                    onChange={e => setFormData(prev => ({ ...prev, session_id: e.target.value }))}
                    placeholder="session_id (or global)"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tags (comma separated)</label>
                <Input 
                  value={formData.tags} 
                  onChange={e => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="e.g. user_profile, preference, important"
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setViewMode("list")}>Cancel</Button>
              <Button onClick={handleSave} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Save Memory
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  )
}
