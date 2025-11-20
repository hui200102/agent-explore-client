# Agent API 接口文档

## 基础信息

- **基础路径**: `/api/v1`
- **协议**: HTTP/HTTPS
- **数据格式**: JSON
- **字符编码**: UTF-8

---

## 目录

1. [会话管理](#1-会话管理)
   - [1.1 创建会话](#11-创建会话)
   - [1.2 获取会话信息](#12-获取会话信息)
   - [1.3 关闭会话](#13-关闭会话)
2. [消息管理](#2-消息管理)
   - [2.1 发送消息](#21-发送消息)
   - [2.2 获取会话消息列表](#22-获取会话消息列表)
   - [2.3 获取单个消息](#23-获取单个消息)
   - [2.4 流式订阅消息](#24-流式订阅消息)
3. [系统接口](#3-系统接口)
   - [3.1 健康检查](#31-健康检查)
   - [3.2 根路径](#32-根路径)

---

## 1. 会话管理

### 1.1 创建会话

创建一个新的对话会话。

**接口地址**: `POST /api/v1/sessions`

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| user_id | string | 否 | 用户ID，用于标识用户 |
| metadata | object | 否 | 会话元数据，任意键值对 |

**请求示例**:

```json
{
  "user_id": "user_123",
  "metadata": {
    "source": "web",
    "device": "desktop"
  }
}
```

**响应参数**:

| 参数名 | 类型 | 说明 |
|--------|------|------|
| session_id | string | 会话ID |
| status | string | 会话状态，通常为 "active" |
| created_at | string | 创建时间，ISO 8601 格式 |

**响应示例**:

```json
{
  "session_id": "session_abc123",
  "status": "active",
  "created_at": "2025-11-20T10:30:00.123456"
}
```

**状态码**:
- `200`: 成功

---

### 1.2 获取会话信息

获取指定会话的详细信息。

**接口地址**: `GET /api/v1/sessions/{session_id}`

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| session_id | string | 是 | 会话ID |

**响应参数**:

| 参数名 | 类型 | 说明 |
|--------|------|------|
| session_id | string | 会话ID |
| user_id | string | 用户ID |
| metadata | object | 会话元数据 |
| created_at | string | 创建时间 |
| updated_at | string | 更新时间 |
| status | string | 会话状态 |

**响应示例**:

```json
{
  "session_id": "session_abc123",
  "user_id": "user_123",
  "metadata": {
    "source": "web",
    "device": "desktop"
  },
  "created_at": "2025-11-20T10:30:00.123456",
  "updated_at": "2025-11-20T10:35:00.123456",
  "status": "active"
}
```

**状态码**:
- `200`: 成功
- `404`: 会话不存在

---

### 1.3 关闭会话

关闭指定的会话。

**接口地址**: `DELETE /api/v1/sessions/{session_id}`

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| session_id | string | 是 | 会话ID |

**响应参数**:

| 参数名 | 类型 | 说明 |
|--------|------|------|
| session_id | string | 会话ID |
| status | string | 状态，通常为 "closed" |

**响应示例**:

```json
{
  "session_id": "session_abc123",
  "status": "closed"
}
```

**状态码**:
- `200`: 成功

---

## 2. 消息管理

### 2.1 发送消息

向指定会话发送消息，系统会创建用户消息和助手消息。

**接口地址**: `POST /api/v1/sessions/{session_id}/messages`

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| session_id | string | 是 | 会话ID |

**请求参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| content | string | 是 | 消息内容 |
| type | string | 否 | 消息类型，默认为 "text" |
| metadata | object | 否 | 消息元数据 |

**请求示例**:

```json
{
  "content": "你好，请帮我生成一张图片",
  "type": "text",
  "metadata": {
    "intent": "image_generation"
  }
}
```

**响应参数**:

| 参数名 | 类型 | 说明 |
|--------|------|------|
| user_message_id | string | 用户消息ID |
| assistant_message_id | string | 助手消息ID |
| session_id | string | 会话ID |

**响应示例**:

```json
{
  "user_message_id": "msg_user_001",
  "assistant_message_id": "msg_assistant_001",
  "session_id": "session_abc123"
}
```

**状态码**:
- `200`: 成功
- `404`: 会话不存在

**注意事项**:
- 发送消息后，需要通过流式接口订阅 `assistant_message_id` 来接收助手的回复

---

### 2.2 获取会话消息列表

获取指定会话的消息列表，支持分页。

**接口地址**: `GET /api/v1/sessions/{session_id}/messages`

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| session_id | string | 是 | 会话ID |

**查询参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| limit | integer | 否 | 50 | 返回消息数量，范围: 1-100 |
| offset | integer | 否 | 0 | 偏移量，用于分页 |

**响应参数**:

| 参数名 | 类型 | 说明 |
|--------|------|------|
| session_id | string | 会话ID |
| messages | array | 消息列表 |
| count | integer | 返回的消息数量 |

**消息对象结构**:

| 字段名 | 类型 | 说明 |
|--------|------|------|
| message_id | string | 消息ID |
| session_id | string | 会话ID |
| role | string | 角色: "user", "assistant", "system", "agent", "tool" |
| text | string | 文本内容 |
| content_blocks | array | 内容块列表（图片、视频、音频、文件等） |
| pending_tasks | object | 待处理任务 |
| is_complete | boolean | 消息是否完成 |
| parent_message_id | string | 父消息ID |
| metadata | object | 消息元数据 |
| created_at | string | 创建时间 |
| updated_at | string | 更新时间 |

**响应示例**:

```json
{
  "session_id": "session_abc123",
  "messages": [
    {
      "message_id": "msg_user_001",
      "session_id": "session_abc123",
      "role": "user",
      "text": "你好，请帮我生成一张图片",
      "content_blocks": [],
      "pending_tasks": {},
      "is_complete": true,
      "parent_message_id": null,
      "metadata": {},
      "created_at": "2025-11-20T10:30:00.123456",
      "updated_at": "2025-11-20T10:30:00.123456"
    },
    {
      "message_id": "msg_assistant_001",
      "session_id": "session_abc123",
      "role": "assistant",
      "text": "好的，我正在为您生成图片...",
      "content_blocks": [
        {
          "content_id": "content_001",
          "content_type": "image",
          "image": {
            "url": "https://example.com/image.jpg",
            "caption": "生成的图片"
          }
        }
      ],
      "pending_tasks": {},
      "is_complete": true,
      "parent_message_id": "msg_user_001",
      "metadata": {},
      "created_at": "2025-11-20T10:30:01.123456",
      "updated_at": "2025-11-20T10:30:05.123456"
    }
  ],
  "count": 2
}
```

**状态码**:
- `200`: 成功
- `404`: 会话不存在

---

### 2.3 获取单个消息

获取指定消息的详细信息。

**接口地址**: `GET /api/v1/messages/{message_id}`

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| message_id | string | 是 | 消息ID |

**响应参数**: 与消息对象结构相同

**响应示例**:

```json
{
  "message_id": "msg_assistant_001",
  "session_id": "session_abc123",
  "role": "assistant",
  "text": "好的，我正在为您生成图片...",
  "content_blocks": [
    {
      "content_id": "content_001",
      "content_type": "image",
      "image": {
        "url": "https://example.com/image.jpg",
        "caption": "生成的图片",
        "format": "jpeg"
      }
    }
  ],
  "pending_tasks": {},
  "is_complete": true,
  "parent_message_id": "msg_user_001",
  "metadata": {},
  "created_at": "2025-11-20T10:30:01.123456",
  "updated_at": "2025-11-20T10:30:05.123456"
}
```

**状态码**:
- `200`: 成功
- `404`: 消息不存在

---

### 2.4 流式订阅消息

通过 Server-Sent Events (SSE) 流式接收消息的实时更新。

**接口地址**: `GET /api/v1/sessions/{session_id}/messages/{message_id}/stream`

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| session_id | string | 是 | 会话ID |
| message_id | string | 是 | 消息ID（通常是助手消息ID） |

**查询参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| last_id | string | 否 | "0" | 上次接收的事件ID，用于断线重连 |

**响应格式**: `text/event-stream`

**事件类型**:

| 事件类型 | 说明 |
|----------|------|
| text_delta | 文本增量更新 |
| content_added | 添加新内容块（图片、视频等） |
| content_updated | 内容块更新 |
| task_started | 任务开始 |
| task_progress | 任务进度更新 |
| task_completed | 任务完成 |
| task_failed | 任务失败 |
| message_end | 消息结束 |

**事件数据格式**:

```
event: <event_type>
data: <JSON格式数据>

```

**响应示例**:

```
event: text_delta
data: {"event_id": "evt_001", "event_type": "text_delta", "message_id": "msg_assistant_001", "session_id": "session_abc123", "sequence": 1, "payload": {"delta": "好的"}, "timestamp": "2025-11-20T10:30:01.123456"}

event: text_delta
data: {"event_id": "evt_002", "event_type": "text_delta", "message_id": "msg_assistant_001", "session_id": "session_abc123", "sequence": 2, "payload": {"delta": "，我正在"}, "timestamp": "2025-11-20T10:30:01.223456"}

event: task_started
data: {"event_id": "evt_003", "event_type": "task_started", "message_id": "msg_assistant_001", "session_id": "session_abc123", "sequence": 3, "payload": {"task_id": "task_001", "task_type": "image_generation", "status": "processing", "progress": 0.0}, "timestamp": "2025-11-20T10:30:02.123456"}

event: content_added
data: {"event_id": "evt_004", "event_type": "content_added", "message_id": "msg_assistant_001", "session_id": "session_abc123", "sequence": 4, "payload": {"content_id": "content_001", "content_type": "image", "placeholder": "正在生成..."}, "timestamp": "2025-11-20T10:30:02.223456"}

event: task_completed
data: {"event_id": "evt_005", "event_type": "task_completed", "message_id": "msg_assistant_001", "session_id": "session_abc123", "sequence": 5, "payload": {"task_id": "task_001", "status": "completed", "progress": 1.0}, "timestamp": "2025-11-20T10:30:05.123456"}

event: content_updated
data: {"event_id": "evt_006", "event_type": "content_updated", "message_id": "msg_assistant_001", "session_id": "session_abc123", "sequence": 6, "payload": {"content_id": "content_001", "content_type": "image"}, "timestamp": "2025-11-20T10:30:05.223456"}

event: message_end
data: {"event_id": "evt_007", "event_type": "message_end", "message_id": "msg_assistant_001", "session_id": "session_abc123", "sequence": 7, "payload": {}, "timestamp": "2025-11-20T10:30:05.323456"}
```

**状态码**:
- `200`: 成功建立连接
- `404`: 会话或消息不存在

**使用示例（JavaScript）**:

```javascript
const eventSource = new EventSource(
  '/api/v1/sessions/session_abc123/messages/msg_assistant_001/stream?last_id=0'
);

eventSource.addEventListener('text_delta', (event) => {
  const data = JSON.parse(event.data);
  console.log('文本增量:', data.payload.delta);
});

eventSource.addEventListener('task_started', (event) => {
  const data = JSON.parse(event.data);
  console.log('任务开始:', data.payload.task_type);
});

eventSource.addEventListener('message_end', (event) => {
  console.log('消息完成');
  eventSource.close();
});

eventSource.onerror = (error) => {
  console.error('连接错误:', error);
  eventSource.close();
};
```

---

## 3. 系统接口

### 3.1 健康检查

检查服务健康状态。

**接口地址**: `GET /api/v1/health`

**响应参数**:

| 参数名 | 类型 | 说明 |
|--------|------|------|
| status | string | 服务状态 |
| redis | string | Redis 连接状态 |
| timestamp | string | 检查时间戳 |

**响应示例**:

```json
{
  "status": "healthy",
  "redis": "connected",
  "timestamp": "2025-11-20T10:30:00.123456"
}
```

**状态码**:
- `200`: 服务正常

---

### 3.2 根路径

获取 API 基本信息。

**接口地址**: `GET /`

**响应参数**:

| 参数名 | 类型 | 说明 |
|--------|------|------|
| name | string | 应用名称 |
| version | string | 应用版本 |
| docs | string | API 文档路径 |
| health | string | 健康检查路径 |

**响应示例**:

```json
{
  "name": "MultiModal Agent System",
  "version": "0.1.0",
  "docs": "/docs",
  "health": "/api/v1/health"
}
```

**状态码**:
- `200`: 成功

---

## 内容块类型说明

消息中的 `content_blocks` 数组可以包含多种类型的内容：

### 图片内容块

```json
{
  "content_id": "content_001",
  "content_type": "image",
  "is_placeholder": false,
  "image": {
    "url": "https://example.com/image.jpg",
    "data": "base64编码的图片数据（可选）",
    "caption": "图片描述",
    "alt": "图片替代文本",
    "format": "jpeg",
    "size": 102400
  }
}
```

### 视频内容块

```json
{
  "content_id": "content_002",
  "content_type": "video",
  "is_placeholder": false,
  "video": {
    "url": "https://example.com/video.mp4",
    "data": "base64编码的视频数据（可选）",
    "title": "视频标题",
    "format": "mp4",
    "size": 1024000,
    "duration": 120
  }
}
```

### 音频内容块

```json
{
  "content_id": "content_003",
  "content_type": "audio",
  "is_placeholder": false,
  "audio": {
    "url": "https://example.com/audio.mp3",
    "data": "base64编码的音频数据（可选）",
    "title": "音频标题",
    "format": "mp3",
    "size": 512000,
    "duration": 180
  }
}
```

### 文件内容块

```json
{
  "content_id": "content_004",
  "content_type": "file",
  "is_placeholder": false,
  "file": {
    "url": "https://example.com/document.pdf",
    "data": "base64编码的文件数据（可选）",
    "name": "document.pdf",
    "mime_type": "application/pdf",
    "size": 204800
  }
}
```

---

## 错误响应

所有接口在发生错误时返回统一格式：

```json
{
  "detail": "错误描述信息"
}
```

**常见状态码**:

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 使用流程示例

### 完整对话流程

1. **创建会话**
```bash
curl -X POST http://localhost:8000/api/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user_123"}'
```

响应:
```json
{
  "session_id": "session_abc123",
  "status": "active",
  "created_at": "2025-11-20T10:30:00.123456"
}
```

2. **发送消息**
```bash
curl -X POST http://localhost:8000/api/v1/sessions/session_abc123/messages \
  -H "Content-Type: application/json" \
  -d '{"content": "你好，请帮我生成一张图片"}'
```

响应:
```json
{
  "user_message_id": "msg_user_001",
  "assistant_message_id": "msg_assistant_001",
  "session_id": "session_abc123"
}
```

3. **订阅流式响应**
```bash
curl -N http://localhost:8000/api/v1/sessions/session_abc123/messages/msg_assistant_001/stream
```

4. **获取消息历史**
```bash
curl http://localhost:8000/api/v1/sessions/session_abc123/messages
```

5. **关闭会话**
```bash
curl -X DELETE http://localhost:8000/api/v1/sessions/session_abc123
```

---

## 注意事项

1. **流式接口**: 使用 SSE 进行流式传输，需要客户端支持 Server-Sent Events
2. **消息完整性**: 通过 `sequence` 字段保证事件顺序
3. **断线重连**: 使用 `last_id` 参数可以从断点继续接收事件
4. **内容存储**: 大文件（图片、视频等）会单独存储，返回 URL 或 base64 编码
5. **超时设置**: 建议设置合适的超时时间，特别是流式接口
6. **并发限制**: 单个会话建议串行发送消息，避免并发冲突

---

## 附录

### Swagger/OpenAPI 文档

访问 `/docs` 可查看交互式 API 文档。

### 支持的消息角色

- `user`: 用户消息
- `assistant`: 助手消息
- `system`: 系统消息
- `agent`: 代理消息
- `tool`: 工具消息

### 支持的内容类型

- `image`: 图片
- `video`: 视频
- `audio`: 音频
- `file`: 文件

### 任务状态

- `processing`: 处理中
- `completed`: 已完成
- `failed`: 失败

