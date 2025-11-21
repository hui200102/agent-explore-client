# Session 管理面板使用指南

## 概述

Session 管理功能允许用户查看、切换和管理所有对话会话。每个 session 代表一个独立的对话历史。

## 功能特性

### ✅ 已实现

1. **Session 列表显示**
   - 显示所有对话会话
   - 会话标题
   - 最后一条消息预览
   - 消息数量统计
   - 时间显示（智能格式化）

2. **Session 切换**
   - 点击任意 session 即可切换
   - 自动加载对应的消息历史
   - 保持当前 session 状态

3. **创建新 Session**
   - 点击 "+" 按钮创建新对话
   - 自动切换到新创建的 session

4. **删除 Session**
   - 悬停显示删除按钮
   - 确认对话框防止误删
   - 删除当前 session 会自动创建新的

5. **编辑 Session 标题**
   - 悬停显示编辑按钮
   - 内联编辑标题
   - Enter 保存，Escape 取消

6. **搜索功能**
   - 实时搜索会话标题和消息内容
   - 高亮匹配结果

7. **侧边栏折叠**
   - 点击折叠/展开按钮
   - 折叠模式显示简化图标
   - 保存屏幕空间

## 文件结构

```
hooks/
  └── use-session-list.ts          # Session 列表管理 Hook
components/chat/
  ├── session-sidebar.tsx          # Session 侧边栏组件
  └── chat-container.tsx           # 聊天容器（已更新）
app/
  └── page.tsx                      # 主页面（集成侧边栏）
```

## 核心功能详解

### 1. `useSessionList` Hook

位置: `hooks/use-session-list.ts`

#### API:

```typescript
const sessionList = useSessionList({
  userId: "user_default",    // 用户ID
  autoLoad: true,            // 自动加载会话列表
})

// 返回值
{
  sessions: SessionItem[],          // 会话列表
  isLoading: boolean,               // 加载状态
  error: string | null,             // 错误信息
  loadSessions: () => Promise<void>,    // 重新加载会话
  createSession: (title?: string) => Promise<string>,  // 创建新会话
  deleteSession: (sessionId: string) => Promise<boolean>,  // 删除会话
  updateSession: (sessionId: string, updates: Partial<SessionItem["metadata"]>) => void,  // 更新会话
  getSession: (sessionId: string) => SessionItem | undefined,  // 获取单个会话
}
```

#### SessionItem 接口:

```typescript
interface SessionItem {
  session_id: string
  user_id: string
  created_at: string
  updated_at: string
  metadata?: {
    title?: string           // 会话标题
    lastMessage?: string     // 最后一条消息
    messageCount?: number    // 消息数量
    [key: string]: unknown
  }
}
```

### 2. SessionSidebar 组件

位置: `components/chat/session-sidebar.tsx`

#### Props:

```typescript
interface SessionSidebarProps {
  sessions: SessionItem[]              // 会话列表
  currentSessionId: string | null      // 当前会话ID
  isLoading?: boolean                  // 加载状态
  isCollapsed?: boolean                // 是否折叠
  onSelectSession: (sessionId: string) => void      // 选择会话回调
  onCreateSession: () => void          // 创建会话回调
  onDeleteSession: (sessionId: string) => void      // 删除会话回调
  onUpdateSession?: (sessionId: string, title: string) => void  // 更新标题回调
  onToggleCollapse?: () => void        // 切换折叠状态回调
}
```

#### 功能:
- 📋 显示所有会话列表
- 🔍 搜索过滤
- ✏️ 内联编辑标题
- 🗑️ 删除会话（带确认）
- ➕ 创建新会话
- 🎯 高亮当前会话
- 📱 响应式设计
- 🎨 精美动画效果

### 3. 更新的 ChatContainer

位置: `components/chat/chat-container.tsx`

#### 新增 Props:

```typescript
interface ChatContainerProps {
  userId?: string
  sessionId: string | null           // 外部传入的 sessionId
  onSessionReady?: (sessionId: string) => void  // session 准备就绪回调
}
```

#### 主要改动:
- 接受外部 `sessionId` 而非自己创建
- 当 `sessionId` 变化时自动加载对应消息
- 移除了内部的 session 创建逻辑
- 保留消息发送和 SSE 流功能

### 4. 主页面集成

位置: `app/page.tsx`

#### 工作流程:

1. **初始化**
   - 尝试从 localStorage 加载已有 session
   - 如果没有或无效，创建新 session
   - 加载 session 列表

2. **Session 切换**
   - 用户在侧边栏点击 session
   - 更新 `currentSessionId`
   - `ChatContainer` 自动加载新的消息历史

3. **创建新 Session**
   - 用户点击 "+" 按钮
   - 调用 `sessionList.createSession()`
   - 自动切换到新 session

4. **删除 Session**
   - 用户点击删除按钮并确认
   - 调用 `sessionList.deleteSession()`
   - 如果删除的是当前 session，自动创建新的

## UI 设计特点

### 侧边栏设计
- 🎨 现代化卡片设计
- 📊 清晰的视觉层次
- 🌈 渐变背景
- ⚡ 流畅动画
- 🎯 当前会话高亮（带脉冲动画）
- 👀 悬停显示操作按钮
- 📱 响应式布局

### 折叠模式
- 极简图标视图
- 仅显示前 5 个会话
- 保持核心功能可访问
- 节省屏幕空间

### 时间格式化
- "Just now" - 1小时内
- "Xh ago" - 24小时内
- "Xd ago" - 7天内
- 完整日期 - 7天以上

## 使用示例

### 基础使用

```tsx
import { useSessionList } from "@/hooks/use-session-list"
import { SessionSidebar } from "@/components/chat/session-sidebar"

function MyApp() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  
  const sessionList = useSessionList({
    userId: "user_123",
    autoLoad: true,
  })

  return (
    <div className="flex">
      <SessionSidebar
        sessions={sessionList.sessions}
        currentSessionId={currentSessionId}
        isLoading={sessionList.isLoading}
        onSelectSession={setCurrentSessionId}
        onCreateSession={sessionList.createSession}
        onDeleteSession={sessionList.deleteSession}
        onUpdateSession={sessionList.updateSession}
      />
      <ChatContainer sessionId={currentSessionId} />
    </div>
  )
}
```

### 高级功能

#### 自定义会话标题

```typescript
// 创建带标题的会话
const sessionId = await sessionList.createSession("技术问题讨论")

// 更新会话标题
sessionList.updateSession(sessionId, { 
  title: "新标题",
  lastMessage: "最后一条消息内容",
  messageCount: 42
})
```

#### 批量操作

```typescript
// 删除旧会话
const oldSessions = sessionList.sessions.filter(s => {
  const age = Date.now() - new Date(s.created_at).getTime()
  return age > 30 * 24 * 60 * 60 * 1000 // 30天
})

for (const session of oldSessions) {
  await sessionList.deleteSession(session.session_id)
}
```

## 注意事项

### 当前限制

1. **后端 API 限制**
   - 目前 `loadSessions` 只能从 localStorage 获取当前 session
   - 需要后端提供 `getUserSessions` API 来获取完整列表
   - `deleteSession` 暂时只是前端删除，需要后端 API

2. **数据持久化**
   - Session 元数据（标题、消息数等）只存储在前端状态
   - 刷新页面后会丢失自定义标题
   - 需要后端支持 session 元数据存储

### 待实现功能

1. **后端集成**
   ```typescript
   // 在 use-session-list.ts 中替换 TODO 标记的代码
   const response = await apiClient.getUserSessions(userId)
   setSessions(response.sessions)
   ```

2. **Session 元数据自动更新**
   - 当发送新消息时自动更新 `lastMessage` 和 `messageCount`
   - 可以在 `ChatContainer` 的 `handleSendMessage` 中实现

3. **分页加载**
   - 当 session 数量很多时，实现分页或虚拟滚动

4. **搜索优化**
   - 后端搜索支持
   - 搜索结果高亮
   - 搜索历史

## 键盘快捷键建议

可以添加以下键盘快捷键（需要实现）：

- `Ctrl/Cmd + N` - 新建会话
- `Ctrl/Cmd + K` - 快速搜索会话
- `Ctrl/Cmd + [` / `]` - 切换上/下一个会话
- `Ctrl/Cmd + W` - 删除当前会话
- `Ctrl/Cmd + E` - 编辑当前会话标题

## 性能优化建议

1. **虚拟滚动** - 当 session 数量 > 100 时使用
2. **防抖搜索** - 搜索输入添加防抖
3. **缓存策略** - 缓存 session 列表，减少 API 调用
4. **懒加载** - 延迟加载旧会话的详细信息

## 样式自定义

侧边栏宽度可以在 `session-sidebar.tsx` 中调整：

```tsx
// 展开状态宽度
<div className="w-80 ...">  // 修改 w-80 为其他值

// 折叠状态宽度
<div className="w-16 ...">  // 修改 w-16 为其他值
```

## 测试建议

1. 创建多个会话并切换
2. 编辑会话标题
3. 删除会话（包括当前会话）
4. 搜索功能
5. 折叠/展开侧边栏
6. 刷新页面后状态保持
7. 长标题截断显示
8. 空状态显示

## 常见问题

### Q: 为什么刷新后只显示当前会话？
A: 因为后端暂时没有提供获取用户所有会话的 API。需要实现 `apiClient.getUserSessions()` 接口。

### Q: 如何自动更新会话的最后消息？
A: 在 `page.tsx` 的 `handleSessionReady` 回调中，可以监听消息变化并更新 session 元数据。

### Q: 删除会话后消息还在吗？
A: 前端删除只是移除了引用，后端数据（如果有）不会被删除。需要实现真正的后端删除 API。

### Q: 可以导出会话吗？
A: 当前未实现，但可以添加导出功能，将会话导出为 JSON、Markdown 等格式。

## 下一步计划

- [ ] 后端 API 集成（获取、删除、更新会话）
- [ ] Session 标签/分类功能
- [ ] 会话搜索优化（后端支持）
- [ ] 会话导出功能
- [ ] 会话归档功能
- [ ] 多人协作会话（共享）
- [ ] 键盘快捷键支持
- [ ] 移动端优化

