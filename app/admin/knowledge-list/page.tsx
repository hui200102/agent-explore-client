"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { apiClient, type KnowledgeResponse, type KnowledgeType, type KnowledgePriority } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  BookOpen, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  AlertTriangle, 
  CheckCircle2,
  ArrowLeft,
  Search
} from "lucide-react"

const KNOWLEDGE_TYPES: { value: KnowledgeType; label: string }[] = [
  { value: "workflow", label: "Workflow" },
  { value: "best_practice", label: "Best Practice" },
  { value: "rule", label: "Rule" },
  { value: "solution", label: "Solution" },
  { value: "architecture", label: "Architecture" },
  { value: "coding_style", label: "Coding Style" },
]

const KNOWLEDGE_PRIORITIES: { value: KnowledgePriority; label: string; color: string }[] = [
  { value: "critical", label: "Critical", color: "text-red-600" },
  { value: "high", label: "High", color: "text-orange-600" },
  { value: "medium", label: "Medium", color: "text-blue-600" },
  { value: "low", label: "Low", color: "text-gray-600" },
]

interface EditingKnowledge {
  knowledge_id: string
  title: string
  content: string
  type: KnowledgeType
  priority: KnowledgePriority
  tags: string
  applies_to: string
  category: string
  source: string
  author: string
}

export default function KnowledgeListPage() {
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeResponse[]>([])
  const [filteredList, setFilteredList] = useState<KnowledgeResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditingKnowledge | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterPriority, setFilterPriority] = useState<string>("all")

  const loadKnowledge = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiClient.listKnowledge({ limit: 1000 })
      setKnowledgeList(result.items)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load knowledge")
    } finally {
      setLoading(false)
    }
  }

  const filterKnowledge = useCallback(() => {
    let filtered = [...knowledgeList]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (k) =>
          k.title.toLowerCase().includes(query) ||
          k.content.toLowerCase().includes(query) ||
          k.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    if (filterType !== "all") {
      filtered = filtered.filter((k) => k.type === filterType)
    }

    if (filterPriority !== "all") {
      filtered = filtered.filter((k) => k.priority === filterPriority)
    }

    setFilteredList(filtered)
  }, [searchQuery, filterType, filterPriority, knowledgeList])

  useEffect(() => {
    loadKnowledge()
  }, [])

  useEffect(() => {
    filterKnowledge()
  }, [filterKnowledge])

  const handleEdit = (knowledge: KnowledgeResponse) => {
    setEditingId(knowledge.knowledge_id)
    setEditForm({
      knowledge_id: knowledge.knowledge_id,
      title: knowledge.title,
      content: knowledge.content,
      type: knowledge.type as KnowledgeType,
      priority: knowledge.priority as KnowledgePriority,
      tags: knowledge.tags.join(", "),
      applies_to: knowledge.applies_to.join(", "),
      category: knowledge.category || "",
      source: "",
      author: "",
    })
    setSuccessMessage(null)
    setError(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm(null)
    setError(null)
  }

  const handleSaveEdit = async () => {
    if (!editForm) return

    try {
      setIsSaving(true)
      setError(null)

      await apiClient.updateKnowledge(editForm.knowledge_id, {
        title: editForm.title,
        content: editForm.content,
        type: editForm.type,
        priority: editForm.priority,
        tags: editForm.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        applies_to: editForm.applies_to
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        category: editForm.category || undefined,
        source: editForm.source || undefined,
        author: editForm.author || undefined,
      })

      setSuccessMessage("Knowledge updated successfully")
      setEditingId(null)
      setEditForm(null)
      await loadKnowledge()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update knowledge")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (knowledgeId: string) => {
    if (!confirm("Are you sure you want to delete this knowledge item?")) {
      return
    }

    try {
      setError(null)
      await apiClient.deleteKnowledge(knowledgeId)
      setSuccessMessage("Knowledge deleted successfully")
      await loadKnowledge()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete knowledge")
    }
  }

  const getPriorityColor = (priority: string) => {
    return KNOWLEDGE_PRIORITIES.find((p) => p.value === priority)?.color || "text-gray-600"
  }

  const getTypeLabel = (type: string) => {
    return KNOWLEDGE_TYPES.find((t) => t.value === type)?.label || type
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="container mx-auto p-4 max-w-7xl flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          <span className="text-sm text-gray-500">({filteredList.length} items)</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/knowledge" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Knowledge
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/memories" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
      </div>

      {successMessage && (
        <Alert className="mb-4 flex-shrink-0">
          <CheckCircle2 className="h-4 w-4" />
          <div>
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </div>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4 flex-shrink-0">
          <AlertTriangle className="h-4 w-4" />
          <div>
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </div>
        </Alert>
      )}

      <Card className="mb-4 flex-shrink-0">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search
              </label>
              <Input
                placeholder="Search title, content, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <select
                className="w-full border rounded-md px-3 py-2 bg-background"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All Types</option>
                {KNOWLEDGE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <select
                className="w-full border rounded-md px-3 py-2 bg-background"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
              >
                <option value="all">All Priorities</option>
                {KNOWLEDGE_PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading knowledge...</div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {knowledgeList.length === 0 ? "No knowledge items found. Create one to get started." : "No items match your filters."}
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            {filteredList.map((knowledge) => (
            <Card key={knowledge.knowledge_id}>
              {editingId === knowledge.knowledge_id && editForm ? (
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">Edit Knowledge</h3>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={isSaving}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          {isSaving ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Title</label>
                      <Input
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Content</label>
                      <Textarea
                        rows={6}
                        value={editForm.content}
                        onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Type</label>
                        <select
                          className="w-full border rounded-md px-3 py-2 bg-background"
                          value={editForm.type}
                          onChange={(e) =>
                            setEditForm({ ...editForm, type: e.target.value as KnowledgeType })
                          }
                        >
                          {KNOWLEDGE_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Priority</label>
                        <select
                          className="w-full border rounded-md px-3 py-2 bg-background"
                          value={editForm.priority}
                          onChange={(e) =>
                            setEditForm({ ...editForm, priority: e.target.value as KnowledgePriority })
                          }
                        >
                          {KNOWLEDGE_PRIORITIES.map((p) => (
                            <option key={p.value} value={p.value}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Tags (comma separated)</label>
                        <Input
                          value={editForm.tags}
                          onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Applies To (comma separated)</label>
                        <Input
                          value={editForm.applies_to}
                          onChange={(e) => setEditForm({ ...editForm, applies_to: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Category (optional)</label>
                      <Input
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              ) : (
                <>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">{knowledge.title}</CardTitle>
                          <span className={`text-xs font-semibold ${getPriorityColor(knowledge.priority)}`}>
                            {knowledge.priority.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {getTypeLabel(knowledge.type)}
                          </span>
                          <span>Used: {knowledge.usage_count} times</span>
                          {knowledge.created_at && (
                            <span>Created: {new Date(knowledge.created_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(knowledge)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(knowledge.knowledge_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{knowledge.content}</p>
                      </div>

                      {knowledge.tags.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-gray-500">Tags:</span>
                          {knowledge.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {knowledge.applies_to.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-gray-500">Applies to:</span>
                          {knowledge.applies_to.map((apply, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded"
                            >
                              {apply}
                            </span>
                          ))}
                        </div>
                      )}

                      {knowledge.category && (
                        <div className="text-xs text-gray-500">
                          Category: <span className="font-medium">{knowledge.category}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </>
              )}
            </Card>
          ))}
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
