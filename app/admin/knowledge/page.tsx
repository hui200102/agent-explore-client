"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { apiClient, type KnowledgeType, type KnowledgePriority } from "@/lib/api-client"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, AlertTriangle, BookPlus, ArrowLeft } from "lucide-react"

const KNOWLEDGE_TYPES: { value: KnowledgeType; label: string }[] = [
  { value: "workflow", label: "Workflow" },
  { value: "best_practice", label: "Best Practice" },
  { value: "rule", label: "Rule" },
  { value: "solution", label: "Solution" },
  { value: "architecture", label: "Architecture" },
  { value: "coding_style", label: "Coding Style" },
]

const KNOWLEDGE_PRIORITIES: { value: KnowledgePriority; label: string }[] = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
]

export default function KnowledgeAdminPage() {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [type, setType] = useState<KnowledgeType>("workflow")
  const [priority, setPriority] = useState<KnowledgePriority>("medium")
  const [tags, setTags] = useState("")
  const [appliesTo, setAppliesTo] = useState("")
  const [category, setCategory] = useState("")
  const [source, setSource] = useState("")
  const [author, setAuthor] = useState("")
  const [metadataJson, setMetadataJson] = useState("")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const parsedMetadata = useMemo(() => {
    if (!metadataJson.trim()) return undefined
    return JSON.parse(metadataJson)
  }, [metadataJson])

  const onSubmit = async () => {
    setSuccessMessage(null)
    setErrorMessage(null)

    if (!title.trim()) {
      setErrorMessage("Title is required.")
      return
    }
    if (!content.trim()) {
      setErrorMessage("Content is required.")
      return
    }

    try {
      setIsSubmitting(true)

      const result = await apiClient.createKnowledge({
        title: title.trim(),
        content: content.trim(),
        type,
        priority,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        applies_to: appliesTo
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        category: category.trim() || undefined,
        source: source.trim() || undefined,
        author: author.trim() || undefined,
        metadata: parsedMetadata,
      })

      setSuccessMessage(`Created knowledge: ${result.knowledge_id}`)
      setTitle("")
      setContent("")
      setTags("")
      setAppliesTo("")
      setCategory("")
      setSource("")
      setAuthor("")
      setMetadataJson("")
      setType("workflow")
      setPriority("medium")
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Failed to create knowledge.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl h-screen flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookPlus className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold">Add Knowledge</h1>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/memories" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Memories
          </Link>
        </Button>
      </div>

      {successMessage && (
        <Alert className="mb-4">
          <CheckCircle2 className="h-4 w-4" />
          <div>
            <AlertTitle>Saved</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </div>
        </Alert>
      )}

      {errorMessage && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <div>
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </div>
        </Alert>
      )}

      <Card className="flex-1 overflow-auto">
        <CardHeader>
          <CardTitle>Knowledge Item</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short, searchable title" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Content</label>
            <Textarea
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Markdown supported. Keep it concise and actionable."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <select
                className="w-full border rounded-md px-3 py-2 bg-background"
                value={type}
                onChange={(e) => setType(e.target.value as KnowledgeType)}
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
                value={priority}
                onChange={(e) => setPriority(e.target.value as KnowledgePriority)}
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
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. video, workflow" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Applies To (comma separated)</label>
              <Input value={appliesTo} onChange={(e) => setAppliesTo(e.target.value)} placeholder="e.g. 视频生成, API开发" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category (optional)</label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Source (optional)</label>
              <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. internal, docs, rules" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Author (optional)</label>
              <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Author" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Metadata JSON (optional)</label>
              <Textarea
                rows={3}
                value={metadataJson}
                onChange={(e) => setMetadataJson(e.target.value)}
                placeholder='e.g. {"lang":"en","version":"1"}'
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => {
            setTitle("")
            setContent("")
            setTags("")
            setAppliesTo("")
            setCategory("")
            setSource("")
            setAuthor("")
            setMetadataJson("")
            setType("workflow")
            setPriority("medium")
            setSuccessMessage(null)
            setErrorMessage(null)
          }}>
            Reset
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Create Knowledge"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}


