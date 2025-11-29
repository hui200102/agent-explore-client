"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { StatCard } from "@/components/stats/stat-card"
import { ProgressRing } from "@/components/stats/progress-ring"
import { apiClient } from "@/lib/api-client"
import { Loader2, Activity, MessageSquare, CheckCircle, XCircle, Clock, Users, BarChart3, Zap } from "lucide-react"
import Link from "next/link"

interface Statistics {
  sessions: {
    total: number
    by_status: Record<string, number>
    user_id?: string
  }
  messages: {
    total: number
    completed: number
    by_role: Record<string, { count: number; completed: number }>
    session_id?: string
  }
  tasks: {
    local?: {
      total: number
      by_status: Record<string, number>
    }
    global?: {
      total: number
      by_status: Record<string, number>
    }
    storage: string
  }
  push: {
    active_connections: number
    total_pushes: number
  }
  timestamp: string
}

export default function StatsPage() {
  const [stats, setStats] = useState<Statistics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchStatistics = async () => {
    try {
      setError(null)
      const data = await apiClient.getStatistics()
      setStats(data)
    } catch (err) {
      console.error("Failed to fetch statistics:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStatistics()

    if (autoRefresh) {
      const interval = setInterval(fetchStatistics, 5000) // 每5秒刷新
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-blue-950/30 dark:to-indigo-950/20">
        <div className="text-center space-y-4 animate-fade-in-up">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-sm font-medium text-foreground">Loading statistics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
        <Card className="p-6 max-w-md">
          <div className="flex items-center gap-3 text-red-600">
            <XCircle className="h-6 w-6" />
            <div>
              <h3 className="font-semibold">Error loading statistics</h3>
              <p className="text-sm text-gray-600">{error}</p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  const taskStats = stats.tasks.global || stats.tasks.local
  const messageCompletionRate = stats.messages.total > 0 
    ? (stats.messages.completed / stats.messages.total) * 100 
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-blue-950/30 dark:to-indigo-950/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary" />
              System Statistics
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Last updated: {new Date(stats.timestamp).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                autoRefresh
                  ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-300"
              }`}
            >
              {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
            </button>
            <button
              onClick={fetchStatistics}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200 transition-colors dark:bg-blue-900 dark:text-blue-300"
            >
              Refresh Now
            </button>
            <Link
              href="/"
              className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Back to Chat
            </Link>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Sessions"
            value={stats.sessions.total}
            icon={Users}
            color="blue"
            details={Object.entries(stats.sessions.by_status).map(([status, count]) => ({
              label: status.charAt(0).toUpperCase() + status.slice(1),
              value: count,
            }))}
          />

          <StatCard
            title="Total Messages"
            value={stats.messages.total}
            icon={MessageSquare}
            color="green"
            details={[
              { label: "Completed", value: stats.messages.completed },
              { label: "In Progress", value: stats.messages.total - stats.messages.completed },
            ]}
          />

          <StatCard
            title="Tasks"
            value={taskStats?.total || 0}
            icon={Activity}
            color="purple"
            details={
              taskStats?.by_status
                ? Object.entries(taskStats.by_status).map(([status, count]) => ({
                    label: status.charAt(0).toUpperCase() + status.slice(1),
                    value: count,
                  }))
                : []
            }
          />

          <StatCard
            title="Active Connections"
            value={stats.push.active_connections}
            icon={Zap}
            color="orange"
            details={[{ label: "Total Pushes", value: stats.push.total_pushes }]}
          />
        </div>

        {/* Completion Rate & Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Message Completion Rate */}
          <Card className="p-6 bg-white dark:bg-zinc-900 flex flex-col items-center justify-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Message Completion Rate
            </h3>
            <ProgressRing
              progress={messageCompletionRate}
              size={150}
              strokeWidth={10}
              color="#10b981"
              label="Complete"
            />
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {stats.messages.completed} of {stats.messages.total} messages
              </p>
            </div>
          </Card>

          {/* Messages by Role */}
          <Card className="p-6 bg-white dark:bg-zinc-900 lg:col-span-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Messages by Role
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(stats.messages.by_role).map(([role, data]) => (
                <Card key={role} className="p-4 bg-gray-50 dark:bg-zinc-800">
                  <h3 className="font-semibold text-gray-900 dark:text-white capitalize mb-2">
                    {role}
                  </h3>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Total:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{data.count}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Completed:</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {data.completed}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Rate:</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {data.count > 0 ? ((data.completed / data.count) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </div>

        {/* Task Details */}
        {taskStats && (
          <Card className="p-6 bg-white dark:bg-zinc-900">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Task Status Distribution
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Object.entries(taskStats.by_status).map(([status, count]) => {
                const percentage = taskStats.total > 0 ? (count / taskStats.total) * 100 : 0
                return (
                  <div key={status} className="text-center">
                    <div className="mb-2">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{count}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                        {status}
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Storage: <span className="font-medium">{stats.tasks.storage}</span>
            </div>
          </Card>
        )}

        {/* System Health */}
        <Card className="p-6 bg-white dark:bg-zinc-900">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Backend Status</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">All systems operational</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Uptime</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Last refresh: {new Date(stats.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
