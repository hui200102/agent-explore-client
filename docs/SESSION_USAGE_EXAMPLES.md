# Session Management 使用示例

本文档提供 session 管理功能的实用示例代码。

## 📚 目录

- [基础使用](#基础使用)
- [高级功能](#高级功能)
- [最佳实践](#最佳实践)
- [常见场景](#常见场景)

---

## 基础使用

### 1. 初始化 Session Hook

```tsx
import { useSessionList } from "@/hooks/use-session-list"

function MyComponent() {
  const sessionList = useSessionList({
    userId: "user_123",
    autoLoad: true,           // 自动加载会话列表
    cacheEnabled: true,       // 启用缓存
    syncAcrossTabs: true,     // 跨标签页同步
  })

  return (
    <div>
      {sessionList.isLoading && <Loader />}
      {sessionList.error && <Error message={sessionList.error} />}
      <SessionList sessions={sessionList.sessions} />
    </div>
  )
}
```

### 2. 创建新会话

```tsx
async function handleCreateSession() {
  try {
    const sessionId = await sessionList.createSession("My New Chat")
    console.log("Created session:", sessionId)
    
    // 会话会立即显示在列表中（乐观更新）
  } catch (error) {
    console.error("Failed to create session:", error)
    // UI 会自动回滚
  }
}
```

### 3. 更新会话

```tsx
// 立即更新（无防抖）
async function handleUpdateTitle(sessionId: string, newTitle: string) {
  try {
    await sessionList.updateSession(sessionId, { title: newTitle }, false)
  } catch (error) {
    console.error("Update failed:", error)
  }
}

// 带防抖更新（适合频繁更新）
async function handleUpdateMetadata(sessionId: string, data: any) {
  await sessionList.updateSession(sessionId, data, true)
  // 500ms 内的多次调用会被合并
}
```

### 4. 删除会话

```tsx
async function handleDeleteSession(sessionId: string) {
  const confirmed = confirm("确定要删除这个会话吗？")
  if (!confirmed) return

  const success = await sessionList.deleteSession(sessionId)
  if (success) {
    console.log("Session deleted")
    // 会话会立即从列表中移除（乐观更新）
  }
}
```

---

## 高级功能

### 1. 批量更新会话

```tsx
async function handleBatchUpdate() {
  const updates = [
    { sessionId: "sess_1", metadata: { title: "Updated 1" } },
    { sessionId: "sess_2", metadata: { title: "Updated 2" } },
    { sessionId: "sess_3", metadata: { title: "Updated 3" } },
  ]

  const results = await sessionList.batchUpdateSessions(updates)
  
  // 检查结果
  const failed = results.filter(r => r.status === 'rejected')
  console.log(`成功: ${results.length - failed.length}, 失败: ${failed.length}`)
}
```

### 2. 强制刷新

```tsx
async function handleRefresh() {
  // 刷新所有会话（跳过缓存）
  await sessionList.refreshAll()
  
  // 或者刷新单个会话
  const session = await sessionList.refreshSession(sessionId)
}
```

### 3. 缓存管理

```tsx
function CacheManager() {
  const sessionList = useSessionList({ cacheEnabled: true })

  const handleInvalidateCache = () => {
    // 手动使缓存失效
    sessionList.invalidateCache()
    console.log("Cache cleared")
  }

  const handleReload = async () => {
    // 清除缓存并重新加载
    sessionList.invalidateCache()
    await sessionList.loadSessions(50, 0, true) // forceRefresh = true
  }

  return (
    <div>
      <button onClick={handleInvalidateCache}>Clear Cache</button>
      <button onClick={handleReload}>Reload Fresh</button>
    </div>
  )
}
```

### 4. 计算属性使用

```tsx
function SessionStats() {
  const sessionList = useSessionList()

  return (
    <div>
      <p>总会话数: {sessionList.total}</p>
      <p>活跃会话: {sessionList.activeSessions.length}</p>
      <p>已完成会话: {sessionList.completedSessions.length}</p>
      <p>还有更多: {sessionList.hasMore ? "是" : "否"}</p>
    </div>
  )
}
```

### 5. 跨标签页同步

```tsx
import { SessionStorageManager } from "@/lib/session-storage"

function CrossTabSync() {
  useEffect(() => {
    // 监听其他标签页的变化
    const unsubscribe = SessionStorageManager.addListener((key, newValue, oldValue) => {
      if (key === "chat_session_id") {
        console.log("Session changed in another tab:", newValue)
        // 自动刷新会话列表
      }
    })

    return unsubscribe
  }, [])

  return <div>跨标签页同步已启用</div>
}
```

---

## 最佳实践

### 1. 错误处理

```tsx
function ErrorHandling() {
  const sessionList = useSessionList()
  const [localError, setLocalError] = useState<string | null>(null)

  const handleCreateWithErrorHandling = async () => {
    setLocalError(null)
    
    try {
      const sessionId = await sessionList.createSession()
      
      // 成功后的操作
      router.push(`/chat/${sessionId}`)
      
    } catch (error) {
      // Hook 已经设置了 sessionList.error
      // 但你也可以添加自定义错误处理
      setLocalError("创建会话失败，请重试")
      
      // 显示通知
      toast.error("无法创建会话")
    }
  }

  return (
    <div>
      {(sessionList.error || localError) && (
        <Alert variant="destructive">
          {sessionList.error || localError}
        </Alert>
      )}
      <button onClick={handleCreateWithErrorHandling}>Create</button>
    </div>
  )
}
```

### 2. 加载状态处理

```tsx
function LoadingStates() {
  const sessionList = useSessionList()
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async () => {
    setIsCreating(true)
    try {
      await sessionList.createSession()
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div>
      {/* 首次加载状态 */}
      {sessionList.isLoading && sessionList.sessions.length === 0 && (
        <div className="flex items-center justify-center h-32">
          <Spinner />
          <span>Loading sessions...</span>
        </div>
      )}
      
      {/* 刷新状态（列表顶部） */}
      {sessionList.isRefreshing && (
        <div className="border-b bg-primary/5 px-4 py-2">
          <div className="flex items-center gap-2 text-sm">
            <Spinner className="h-3 w-3" />
            <span>Refreshing...</span>
          </div>
        </div>
      )}
      
      {/* 会话列表 - 刷新时保持显示 */}
      <SessionList sessions={sessionList.sessions} />
      
      {/* 创建按钮加载状态 */}
      <button disabled={isCreating || sessionList.isLoading}>
        {isCreating ? "创建中..." : "新建会话"}
      </button>
    </div>
  )
}
```

### 3. 乐观更新最佳实践

```tsx
function OptimisticUpdate() {
  const sessionList = useSessionList()
  const [optimisticTitle, setOptimisticTitle] = useState("")

  const handleTitleChange = async (sessionId: string, newTitle: string) => {
    // 设置本地乐观状态
    setOptimisticTitle(newTitle)
    
    try {
      // Hook 会自动处理 UI 更新
      await sessionList.updateSession(sessionId, { title: newTitle })
      
      // 清除本地状态
      setOptimisticTitle("")
      
    } catch (error) {
      // Hook 会自动回滚
      setOptimisticTitle("") // 清除本地状态
      toast.error("更新失败")
    }
  }

  return <div>{/* 你的 UI */}</div>
}
```

### 4. 分页加载

```tsx
function InfiniteScroll() {
  const sessionList = useSessionList({ autoLoad: false })
  const [page, setPage] = useState(0)
  const pageSize = 20

  useEffect(() => {
    sessionList.loadSessions(pageSize, page * pageSize)
  }, [page])

  const handleLoadMore = () => {
    if (sessionList.hasMore && !sessionList.isLoading) {
      setPage(p => p + 1)
    }
  }

  return (
    <div>
      <SessionList sessions={sessionList.sessions} />
      
      {sessionList.hasMore && (
        <button 
          onClick={handleLoadMore}
          disabled={sessionList.isLoading}
        >
          {sessionList.isLoading ? "加载中..." : "加载更多"}
        </button>
      )}
    </div>
  )
}
```

---

## 常见场景

### 1. 聊天应用主界面

```tsx
function ChatApp() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  
  const sessionList = useSessionList({
    userId: "user_123",
    autoLoad: true,
    cacheEnabled: true,
    syncAcrossTabs: true,
  })

  // 初始化：从 localStorage 恢复会话
  useEffect(() => {
    const savedSessionId = SessionStorageManager.getSessionId()
    if (savedSessionId) {
      setCurrentSessionId(savedSessionId)
    }
  }, [])

  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId)
    SessionStorageManager.setSessionId(sessionId)
  }

  const handleCreateSession = async () => {
    const sessionId = await sessionList.createSession()
    if (sessionId) {
      handleSelectSession(sessionId)
    }
  }

  return (
    <div className="flex h-screen">
      <SessionSidebar
        sessions={sessionList.sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onCreateSession={handleCreateSession}
        onRefresh={sessionList.refreshAll}
      />
      <ChatPanel sessionId={currentSessionId} />
    </div>
  )
}
```

### 2. 会话搜索和过滤

```tsx
function SessionSearch() {
  const sessionList = useSessionList()
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all")

  const filteredSessions = useMemo(() => {
    let sessions = filter === "all" 
      ? sessionList.sessions
      : filter === "active"
      ? sessionList.activeSessions
      : sessionList.completedSessions

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      sessions = sessions.filter(s => 
        s.metadata?.title?.toLowerCase().includes(query)
      )
    }

    return sessions
  }, [sessionList.sessions, sessionList.activeSessions, sessionList.completedSessions, searchQuery, filter])

  return (
    <div>
      <input
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        placeholder="搜索会话..."
      />
      
      <div>
        <button onClick={() => setFilter("all")}>全部</button>
        <button onClick={() => setFilter("active")}>活跃</button>
        <button onClick={() => setFilter("completed")}>已完成</button>
      </div>

      <SessionList sessions={filteredSessions} />
    </div>
  )
}
```

### 3. 自动保存标题

```tsx
function AutoSaveTitle({ sessionId }: { sessionId: string }) {
  const sessionList = useSessionList()
  const [title, setTitle] = useState("")

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    
    // 使用防抖自动保存
    sessionList.updateSession(sessionId, { title: newTitle }, true)
  }

  return (
    <input
      value={title}
      onChange={e => handleTitleChange(e.target.value)}
      placeholder="输入标题..."
    />
  )
}
```

### 4. 消息计数实时更新

```tsx
function MessageCounter({ sessionId }: { sessionId: string }) {
  const sessionList = useSessionList()

  const handleNewMessage = useCallback((messageText: string) => {
    const session = sessionList.sessions.find(s => s.session_id === sessionId)
    const currentCount = session?.metadata?.messageCount || 0

    // 使用防抖更新，避免频繁 API 调用
    sessionList.updateSession(sessionId, {
      messageCount: currentCount + 1,
      lastMessage: messageText.slice(0, 100),
    }, true)
  }, [sessionList, sessionId])

  return <MessageInput onSend={handleNewMessage} />
}
```

### 5. 会话归档

```tsx
function SessionArchive() {
  const sessionList = useSessionList()

  const handleArchiveSession = async (sessionId: string) => {
    // 关闭会话（标记为 completed）
    await sessionList.closeSession(sessionId)
    
    toast.success("会话已归档")
  }

  const handleRestoreSession = async (sessionId: string) => {
    // 重新激活会话
    await sessionList.updateSession(sessionId, {}, false)
    await sessionList.refreshSession(sessionId)
    
    toast.success("会话已恢复")
  }

  return (
    <div>
      <h3>活跃会话</h3>
      {sessionList.activeSessions.map(session => (
        <div key={session.session_id}>
          {session.metadata?.title}
          <button onClick={() => handleArchiveSession(session.session_id)}>
            归档
          </button>
        </div>
      ))}

      <h3>已归档会话</h3>
      {sessionList.completedSessions.map(session => (
        <div key={session.session_id}>
          {session.metadata?.title}
          <button onClick={() => handleRestoreSession(session.session_id)}>
            恢复
          </button>
        </div>
      ))}
    </div>
  )
}
```

### 6. 会话统计面板

```tsx
function SessionStats() {
  const sessionList = useSessionList()

  const stats = useMemo(() => {
    const total = sessionList.total
    const active = sessionList.activeSessions.length
    const completed = sessionList.completedSessions.length
    
    const totalMessages = sessionList.sessions.reduce(
      (sum, s) => sum + (s.metadata?.messageCount || 0), 
      0
    )
    
    const avgMessages = total > 0 ? Math.round(totalMessages / total) : 0

    return { total, active, completed, totalMessages, avgMessages }
  }, [sessionList])

  return (
    <div className="grid grid-cols-2 gap-4">
      <StatCard title="总会话数" value={stats.total} />
      <StatCard title="活跃会话" value={stats.active} />
      <StatCard title="已完成" value={stats.completed} />
      <StatCard title="总消息数" value={stats.totalMessages} />
      <StatCard title="平均消息数" value={stats.avgMessages} />
    </div>
  )
}
```

### 7. 离线支持（基础）

```tsx
function OfflineSupport() {
  const sessionList = useSessionList({ cacheEnabled: true })
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // 重新同步
      sessionList.refreshAll()
    }

    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [sessionList])

  return (
    <div>
      {!isOnline && (
        <Alert>
          <AlertCircle />
          <span>离线模式 - 显示缓存数据</span>
        </Alert>
      )}
      <SessionList sessions={sessionList.sessions} />
    </div>
  )
}
```

---

## 🎯 性能优化技巧

### 1. 合理使用缓存

```tsx
// ✅ 好的做法 - 启用缓存用于频繁访问的数据
const sessionList = useSessionList({ 
  cacheEnabled: true,
  autoLoad: true 
})

// ❌ 避免 - 对于需要实时数据的场景
const sessionList = useSessionList({ 
  cacheEnabled: false  // 每次都重新加载
})
```

### 2. 智能防抖

```tsx
// ✅ 好的做法 - 频繁更新使用防抖
function handleFrequentUpdate(data: any) {
  sessionList.updateSession(sessionId, data, true) // debounce = true
}

// ✅ 好的做法 - 用户主动操作不用防抖
function handleUserAction(title: string) {
  sessionList.updateSession(sessionId, { title }, false)
}
```

### 3. 避免不必要的重新渲染

```tsx
// ✅ 使用 memo 优化组件
const SessionItem = memo(({ session, onSelect }: Props) => {
  return <div onClick={() => onSelect(session.session_id)}>...</div>
})

// ✅ 使用 useCallback 稳定回调
const handleSelect = useCallback((sessionId: string) => {
  setCurrentSessionId(sessionId)
}, [])
```

---

## 🐛 常见问题

### Q: 为什么我的更新没有立即显示？

A: 检查是否启用了防抖。如果 `debounce = true`，更新会延迟 500ms。

### Q: 跨标签页同步不工作？

A: 确保：
1. `syncAcrossTabs: true` 已设置
2. 使用 `SessionStorageManager.setSessionId()` 而不是直接操作 localStorage
3. 浏览器支持 `storage` 事件

### Q: 缓存什么时候失效？

A: 缓存在以下情况失效：
- 5分钟后自动失效
- 调用 `invalidateCache()`
- 执行创建/更新/删除操作

### Q: 如何调试会话管理？

A: 打开浏览器控制台，搜索 `[useSessionList]` 或 `[SessionStorage]` 前缀的日志。

---

## 📚 更多资源

- [Session Optimization 文档](./SESSION_OPTIMIZATION.md)
- [API 文档](./API.md)
- [Troubleshooting 指南](../TROUBLESHOOTING.md)

