# Session 持久化修复说明

## 问题描述
之前创建新 session 后，旧的 session 就看不到了。

## 原因分析
原来的 `SessionStorage` 只存储**单个** session ID，每次创建新 session 就覆盖了旧的。

## 解决方案

### 1. 扩展 SessionStorage (`lib/session-storage.ts`)

新增功能：
- ✅ `getSessions()` - 获取所有存储的 sessions
- ✅ `saveSession(session)` - 保存或更新 session
- ✅ `removeSession(sessionId)` - 删除指定 session
- ✅ `updateSessionMetadata(sessionId, metadata)` - 更新 session 元数据
- ✅ `clearAllSessions()` - 清空所有 sessions

**存储结构：**
```typescript
interface StoredSession {
  session_id: string
  user_id: string
  created_at: string
  updated_at: string
  metadata?: {
    title?: string           // 会话标题
    lastMessage?: string     // 最后一条消息
    messageCount?: number    // 消息数量
  }
}
```

**存储位置：**
- `chat_session_id` - 当前激活的 session ID
- `chat_sessions_list` - 所有 session 的列表（JSON 数组，最多 50 个）

### 2. 更新 use-session-list.ts

现在所有操作都会同步到 localStorage：
- ✅ `loadSessions()` - 从 localStorage 加载所有 sessions
- ✅ `createSession()` - 创建后自动保存到 localStorage
- ✅ `deleteSession()` - 删除时同步移除
- ✅ `updateSession()` - 更新元数据时同步保存

### 3. 自动更新元数据

现在当发送消息时会自动更新：
- ✅ `lastMessage` - 最后一条消息内容（截取前 100 字符）
- ✅ `messageCount` - 消息总数
- ✅ `updated_at` - 更新时间

在侧边栏可以看到：
```
┌─────────────────────┐
│ ✓ 技术讨论         │
│   最后消息预览...   │
│   ⏰ 2h ago • 15 msg │
└─────────────────────┘
```

## 使用效果

### 创建新 session
1. 点击 "+" 按钮创建新对话
2. 新 session 出现在列表顶部
3. **旧的 sessions 依然保留**在列表中 ✅

### 切换 session
1. 点击任意 session 卡片
2. 自动加载该 session 的消息历史
3. 当前 session 高亮显示

### 数据持久化
1. 刷新页面后，所有 sessions 依然存在 ✅
2. 最后一条消息和消息数量自动更新
3. 最多保存 50 个 sessions（按创建时间排序）

## 存储限制

### LocalStorage 容量
- 大多数浏览器：5-10MB
- 50 个 sessions 约占用：~50-100KB
- 完全够用 ✅

### 数据格式示例
```json
[
  {
    "session_id": "session_abc123",
    "user_id": "user_default",
    "created_at": "2025-01-01T10:00:00.000Z",
    "updated_at": "2025-01-01T10:30:00.000Z",
    "metadata": {
      "title": "技术讨论",
      "lastMessage": "如何实现文件上传功能？",
      "messageCount": 15
    }
  },
  {
    "session_id": "session_def456",
    "user_id": "user_default",
    "created_at": "2025-01-01T09:00:00.000Z",
    "updated_at": "2025-01-01T09:45:00.000Z",
    "metadata": {
      "title": "产品规划",
      "lastMessage": "下个版本的功能清单",
      "messageCount": 8
    }
  }
]
```

## 清理数据

如果需要清空所有 sessions：
```typescript
import { SessionStorage } from "@/lib/session-storage"

// 清空所有 sessions
SessionStorage.clearAllSessions()

// 清空当前 session
SessionStorage.clearSessionId()
```

或者在浏览器控制台：
```javascript
localStorage.removeItem('chat_sessions_list')
localStorage.removeItem('chat_session_id')
```

## 升级建议

### 短期（当前实现）
- ✅ LocalStorage 存储（已实现）
- ✅ 最多 50 个 sessions
- ✅ 自动更新元数据

### 中期（可选）
- 🔄 IndexedDB 存储（支持更多 sessions）
- 🔄 后端 API 集成（跨设备同步）
- 🔄 Session 导出/导入

### 长期（企业级）
- 🔄 云端存储（多设备同步）
- 🔄 Session 分享功能
- 🔄 自动备份
- 🔄 版本历史

## 测试验证

1. ✅ 创建多个 sessions
2. ✅ 切换 sessions
3. ✅ 刷新页面（数据保留）
4. ✅ 编辑 session 标题
5. ✅ 删除 session
6. ✅ 发送消息（元数据更新）
7. ✅ 搜索 sessions

## 注意事项

1. **数据只存在浏览器本地**
   - 清除浏览器数据会丢失
   - 不同浏览器不共享
   - 无痕模式下不持久化

2. **50 个 session 限制**
   - 超过 50 个，旧的会被自动删除
   - 按创建时间排序（newest first）

3. **元数据更新时机**
   - 发送消息时自动更新
   - 编辑标题时立即保存
   - 切换 session 时不更新

4. **性能考虑**
   - 每次操作都会读写 localStorage
   - 数据量小，性能影响可忽略
   - 未来可考虑使用 IndexedDB

## 完成状态

✅ 问题已修复
✅ 无 linter 错误
✅ 所有功能正常工作
✅ 数据持久化正常

