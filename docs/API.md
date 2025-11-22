# API 文档

## 基础信息
- **基础路径**: `/api/v1`
- **数据格式**: JSON
- **编码**: UTF-8

---

## 1. 会话管理

### 1.1 创建会话
```
POST /api/v1/sessions
```

**请求体**:
```json
{
  "user_id": "user_123",  // 可选
  "metadata": {}          // 可选
}
```

**响应**:
```json
{
  "session_id": "673f8a1c9e5d3a001a8f4b2e",
  "status": "active",
  "created_at": "2025-11-20T10:30:00.123456"
}
```

**说明**: `session_id` 由 MongoDB 自动生成（ObjectId 转字符串）

### 1.2 获取会话
```
GET /api/v1/sessions/{session_id}
```

**响应**:
```json
{
  "session_id": "session_abc123",
  "user_id": "user_123",
  "status": "active",
  "metadata": {},
  "created_at": "2025-11-20T10:30:00.123456",
  "updated_at": "2025-11-20T10:30:00.123456"
}
```

### 1.3 列出会话
```
GET /api/v1/sessions?user_id=user_123&status=active&limit=50&offset=0
```

**查询参数**:
- `user_id` (可选): 按用户ID过滤
- `status` (可选): 按状态过滤 (active/inactive/completed)
- `limit` (可选): 返回数量，默认50，范围1-200
- `offset` (可选): 偏移量，默认0

**响应**:
```json
{
  "sessions": [
    {
      "session_id": "session_abc123",
      "user_id": "user_123",
      "status": "active",
      "metadata": {},
      "created_at": "2025-11-20T10:30:00.123456",
      "updated_at": "2025-11-20T10:30:00.123456"
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

### 1.4 获取用户的所有会话
```
GET /api/v1/users/{user_id}/sessions?limit=50&offset=0
```

**响应**:
```json
{
  "user_id": "user_123",
  "sessions": [...],
  "total": 50,
  "limit": 50,
  "offset": 0
}
```

### 1.5 更新会话元数据
```
PATCH /api/v1/sessions/{session_id}/metadata
```

**请求体**:
```json
{
  "metadata": {
    "custom_field": "value"
  }
}
```

**响应**:
```json
{
  "session_id": "session_abc123",
  "status": "updated"
}
```

### 1.6 获取会话统计
```
GET /api/v1/sessions/statistics?user_id=user_123
```

**查询参数**:
- `user_id` (可选): 按用户ID过滤

**响应**:
```json
{
  "total": 150,
  "by_status": {
    "active": 50,
    "inactive": 30,
    "completed": 70
  },
  "user_id": "user_123"
}
```

### 1.7 关闭会话
```
POST /api/v1/sessions/{session_id}/close
```

**响应**:
```json
{
  "session_id": "session_abc123",
  "status": "closed"
}
```

### 1.8 删除会话
```
DELETE /api/v1/sessions/{session_id}
```

**响应**:
```json
{
  "session_id": "session_abc123",
  "status": "deleted"
}
```

---

## 2. 消息管理

### 2.1 发送消息
```
POST /api/v1/sessions/{session_id}/messages
```

**请求体**:
```json
{
  "content_blocks": [
    {
      "content_type": "text",
      "text": "你好"
    },
    {
      "content_type": "image",
      "image": {
        "url": "https://example.com/image.jpg",
        "caption": "图片说明"
      }
    }
  ],
  "role": "user",              // 可选，默认user
  "parent_message_id": null,   // 可选
  "metadata": {}               // 可选
}
```

**响应**:
```json
{
  "message_id": "msg_user_001",
  "assistant_message_id": "msg_assistant_001",
  "session_id": "session_abc123",
  "message": {
    "message_id": "msg_user_001",
    "session_id": "session_abc123",
    "role": "user",
    "content_blocks": [
      {
        "content_id": "content_001",
        "content_type": "text",
        "text": "你好",
        "sequence": 1,
        "is_placeholder": false,
        "created_at": "2025-11-20T10:30:00.123456",
        "updated_at": "2025-11-20T10:30:00.123456"
      }
    ],
    "pending_tasks": {},
    "is_complete": true,
    "parent_message_id": null,
    "metadata": {},
    "created_at": "2025-11-20T10:30:00.123456",
    "updated_at": "2025-11-20T10:30:00.123456"
  }
}
```

#### Content Block 类型

**文本**:
```json
{
  "content_type": "text",
  "text": "文本内容"
}
```

**图片**:
```json
{
  "content_type": "image",
  "image": {
    "url": "https://example.com/image.jpg",     // url或data二选一
    "data": "base64编码",                        // url或data二选一
    "format": "png",                             // 可选，默认png
    "caption": "图片说明",                        // 可选
    "summary": "图片内容描述",                    // 可选，帮助AI理解
    "width": 800,                                // 可选
    "height": 600,                               // 可选
    "alt": "替代文本"                             // 可选
  }
}
```

**视频**:
```json
{
  "content_type": "video",
  "video": {
    "url": "https://example.com/video.mp4",
    "data": "base64编码",                        // 可选
    "format": "mp4",                             // 可选，默认mp4
    "title": "视频标题",                         // 可选
    "summary": "视频内容描述",                    // 可选
    "duration": 120,                             // 可选，秒
    "width": 1920,                               // 可选
    "height": 1080,                              // 可选
    "thumbnail_url": "https://..."               // 可选
  }
}
```

**音频**:
```json
{
  "content_type": "audio",
  "audio": {
    "url": "https://example.com/audio.mp3",
    "data": "base64编码",                        // 可选
    "format": "mp3",                             // 可选，默认mp3
    "title": "音频标题",                         // 可选
    "summary": "音频内容描述/转录",               // 可选
    "duration": 180,                             // 可选，秒
    "sample_rate": 44100,                        // 可选
    "channels": 2                                // 可选
  }
}
```

**文件**:
```json
{
  "content_type": "file",
  "file": {
    "name": "document.pdf",                      // 必需
    "url": "https://example.com/doc.pdf",
    "data": "base64编码",                        // 可选
    "size": 204800,                              // 可选，字节
    "mime_type": "application/pdf",              // 可选
    "extension": "pdf",                          // 可选
    "description": "文件描述",                    // 可选
    "summary": "文件内容总结"                     // 可选
  }
}
```

### 2.2 获取会话消息列表
```
GET /api/v1/sessions/{session_id}/messages?limit=50&offset=0
```

**查询参数**:
- `limit` (可选): 返回数量，默认50，范围1-100
- `offset` (可选): 偏移量，默认0

**响应**:
```json
{
  "session_id": "session_abc123",
  "messages": [
    {
      "message_id": "msg_001",
      "session_id": "session_abc123",
      "role": "user",
      "content_blocks": [...],
      "pending_tasks": {},
      "is_complete": true,
      "parent_message_id": null,
      "metadata": {},
      "created_at": "2025-11-20T10:30:00.123456",
      "updated_at": "2025-11-20T10:30:00.123456"
    }
  ],
  "count": 2
}
```

### 2.3 获取单个消息
```
GET /api/v1/messages/{message_id}
```

**响应**: 完整的Message对象（同上）

### 2.4 获取会话历史（仅已完成消息）
```
GET /api/v1/sessions/{session_id}/history?limit=50&include_system=false
```

**查询参数**:
- `limit` (可选): 返回数量，默认50，范围1-200
- `include_system` (可选): 是否包含系统消息，默认false

**响应**:
```json
{
  "session_id": "session_abc123",
  "messages": [...],
  "count": 10
}
```

### 2.5 搜索消息
```
GET /api/v1/messages/search?query=搜索关键词&session_id=session_abc123&limit=20
```

**查询参数**:
- `query` (必需): 搜索关键词
- `session_id` (可选): 按会话ID过滤
- `limit` (可选): 返回数量，默认20，范围1-100

**响应**:
```json
{
  "query": "搜索关键词",
  "session_id": "session_abc123",
  "messages": [...],
  "count": 5
}
```

### 2.6 获取消息统计
```
GET /api/v1/messages/statistics?session_id=session_abc123
```

**查询参数**:
- `session_id` (可选): 按会话ID过滤

**响应**:
```json
{
  "total": 500,
  "by_role": {
    "user": 250,
    "assistant": 230,
    "system": 20
  },
  "by_session": {
    "session_abc123": 100
  }
}
```

### 2.7 删除会话的所有消息
```
DELETE /api/v1/sessions/{session_id}/messages
```

**响应**:
```json
{
  "session_id": "session_abc123",
  "deleted_count": 50,
  "status": "success"
}
```

### 2.8 流式订阅消息（SSE）
```
GET /api/v1/sessions/{session_id}/messages/{message_id}/stream?last_id=0
```

**查询参数**:
- `last_id` (可选): 上次接收的事件ID，用于断线重连，默认"0"

**响应**: `text/event-stream`

**事件类型**:
- `text_delta` - 文本增量更新
- `content_added` - 添加新内容块（包括 thinking 类型）
- `content_updated` - 内容块更新
- `tool_call` - 工具调用（不作为文本展示，仅通知前端）
- `tool_result` - 工具执行结果（不作为文本展示，仅通知前端）
- `task_started` - 任务开始
- `task_progress` - 任务进度
- `task_completed` - 任务完成
- `task_failed` - 任务失败
- `error` - 消息处理失败
- `message_end` - 消息结束

**事件示例**:
```
event: text_delta
data: {"event_id":"evt_001","event_type":"text_delta","message_id":"msg_001","session_id":"session_abc123","sequence":1,"payload":{"delta":"你好"},"timestamp":"2025-11-20T10:30:01.123456"}

event: content_added
data: {"event_id":"evt_002","event_type":"content_added","message_id":"msg_001","session_id":"session_abc123","sequence":2,"payload":{"content_id":"content_001","content_type":"thinking","sequence":2,"text":"Let me think about this..."},"timestamp":"2025-11-20T10:30:01.500000"}

event: tool_call
data: {"event_id":"evt_003","event_type":"tool_call","message_id":"msg_001","session_id":"session_abc123","sequence":3,"payload":{"tool_call_id":"call_001","tool_name":"web_search","tool_args":{"query":"latest news"}},"timestamp":"2025-11-20T10:30:02.000000"}

event: tool_result
data: {"event_id":"evt_004","event_type":"tool_result","message_id":"msg_001","session_id":"session_abc123","sequence":4,"payload":{"tool_name":"web_search","result":"Search results...","success":true},"timestamp":"2025-11-20T10:30:03.000000"}

event: content_added
data: {"event_id":"evt_005","event_type":"content_added","message_id":"msg_001","session_id":"session_abc123","sequence":5,"payload":{"content_id":"content_002","content_type":"image","sequence":3,"is_placeholder":true,"placeholder":"generating..."},"timestamp":"2025-11-20T10:30:03.500000"}

event: task_started
data: {"event_id":"evt_006","event_type":"task_started","message_id":"msg_001","session_id":"session_abc123","sequence":6,"payload":{"task_id":"task_001","task_type":"image_generation","status":"processing","progress":0.0},"timestamp":"2025-11-20T10:30:04.000000"}

event: task_completed
data: {"event_id":"evt_007","event_type":"task_completed","message_id":"msg_001","session_id":"session_abc123","sequence":7,"payload":{"task_id":"task_001","status":"completed","progress":1.0},"timestamp":"2025-11-20T10:30:06.000000"}

event: content_updated
data: {"event_id":"evt_008","event_type":"content_updated","message_id":"msg_001","session_id":"session_abc123","sequence":8,"payload":{"content_id":"content_002","content_type":"image","sequence":3,"task_id":"task_001","image":{"url":"https://...","format":"png"}},"timestamp":"2025-11-20T10:30:06.123456"}

event: message_end
data: {"event_id":"evt_009","event_type":"message_end","message_id":"msg_001","session_id":"session_abc123","sequence":9,"payload":{},"timestamp":"2025-11-20T10:30:07.000000"}

# 错误场景示例
event: error
data: {"event_id":"evt_err_001","event_type":"error","message_id":"msg_002","session_id":"session_abc123","sequence":5,"payload":{"error":"Agent execution failed","details":{"type":"APIError","traceback":"..."}},"timestamp":"2025-11-20T10:35:00.000000"}
```

---

## 3. 系统接口

### 3.1 健康检查
```
GET /api/v1/health
```

**响应**:
```json
{
  "status": "healthy",
  "redis": "connected",
  "mongodb": "connected",
  "timestamp": "2025-11-20T10:30:00.123456"
}
```

### 3.2 资源分析
```
POST /api/v1/analyze-assets
```

**请求体**:
```json
{
  "type": "image",
  "url": "https://example.com/image.jpg"
}
```

**type 可选值**: `image`, `video`, `audio`, `pdf`, `document`, `text`, `code`, `other`

**响应**:
```json
{
  "dense_summary": "详细的内容描述，包括场景、物体、动作、人物、上下文等",
  "keywords": "关键词1, 关键词2, 关键词3"
}
```

---

## 4. 重要说明

### 4.1 Session ID 生成
- `session_id` 由 MongoDB 自动生成
- 使用 MongoDB 的 ObjectId 转换为字符串格式
- 无需客户端手动创建 UUID

### 4.2 Content Blocks 顺序
- **数组顺序就是显示顺序**
- 系统自动分配 `sequence` 序号（1, 2, 3...）
- 不需要手动设置 sequence
- 响应中的 `content_blocks` 包含完整的 `sequence` 值

### 4.3 URL vs Base64
- 小文件（<1MB）：可用 `data` 字段（Base64）
- 大文件（>1MB）：建议用 `url` 字段
- Base64 会增加约33%大小

### 4.4 Summary 字段
- 用于存储媒体内容的文本总结
- 可选但强烈推荐（帮助AI理解内容）
- 可以是AI生成或用户提供

### 4.5 会话状态
- `active` - 活跃会话
- `inactive` - 非活跃会话
- `completed` - 已完成会话

### 4.6 消息角色
- `user` - 用户消息
- `assistant` - 助手消息
- `system` - 系统消息
- `agent` - 代理消息
- `tool` - 工具消息

### 4.7 任务状态
- `pending` - 待处理
- `processing` - 处理中
- `completed` - 已完成
- `failed` - 失败
- `cancelled` - 已取消

### 4.8 错误响应
```json
{
  "detail": "错误描述"
}
```

**状态码**:
- `200` - 成功
- `400` - 请求参数错误
- `404` - 资源不存在
- `500` - 服务器错误

---

## 5. 完整流程示例

```bash
# 1. 创建会话
curl -X POST http://localhost:8000/api/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user_123"}'

# 2. 发送消息
curl -X POST http://localhost:8000/api/v1/sessions/session_abc123/messages \
  -H "Content-Type: application/json" \
  -d '{
    "content_blocks": [
      {"content_type": "text", "text": "你好，生成一张图片"}
    ]
  }'

# 3. 订阅流式响应
curl -N http://localhost:8000/api/v1/sessions/session_abc123/messages/msg_assistant_001/stream

# 4. 获取消息历史
curl http://localhost:8000/api/v1/sessions/session_abc123/messages

# 5. 搜索消息
curl "http://localhost:8000/api/v1/messages/search?query=图片&session_id=session_abc123"

# 6. 获取会话统计
curl http://localhost:8000/api/v1/sessions/statistics

# 7. 关闭会话
curl -X POST http://localhost:8000/api/v1/sessions/session_abc123/close

# 8. 删除会话
curl -X DELETE http://localhost:8000/api/v1/sessions/session_abc123

# 9. 分析资源
curl -X POST http://localhost:8000/api/v1/analyze-assets \
  -H "Content-Type: application/json" \
  -d '{
    "type": "image",
    "url": "https://example.com/image.jpg"
  }'
```

---

## 6. JavaScript 示例

```javascript
// 创建会话
const session = await fetch('/api/v1/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ user_id: 'user_123' })
}).then(r => r.json());

// 发送消息
const message = await fetch(`/api/v1/sessions/${session.session_id}/messages`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content_blocks: [
      { content_type: 'text', text: '你好' }
    ]
  })
}).then(r => r.json());

// 订阅流式响应
const eventSource = new EventSource(
  `/api/v1/sessions/${session.session_id}/messages/${message.assistant_message_id}/stream`
);

eventSource.addEventListener('text_delta', (e) => {
  const data = JSON.parse(e.data);
  console.log('文本增量:', data.payload.delta);
});

eventSource.addEventListener('error', (e) => {
  const data = JSON.parse(e.data);
  console.error('消息处理失败:', data.payload.error);
  console.error('错误详情:', data.payload.details);
  eventSource.close();
});

eventSource.addEventListener('message_end', (e) => {
  console.log('消息完成');
  eventSource.close();
});

// 获取消息列表
const messages = await fetch(`/api/v1/sessions/${session.session_id}/messages`)
  .then(r => r.json());

// 搜索消息
const searchResults = await fetch('/api/v1/messages/search?query=你好')
  .then(r => r.json());

// 分析资源
const analysis = await fetch('/api/v1/analyze-assets', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'image',
    url: 'https://example.com/image.jpg'
  })
}).then(r => r.json());
console.log('分析结果:', analysis.dense_summary);
console.log('关键词:', analysis.keywords);
```
