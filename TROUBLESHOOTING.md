# SSE Agent 组件显示问题诊断

## 问题描述
Agent 特殊组件（AgentStatusBar, PlanCard, ToolPlaceholder 等）在 SSE 流式传输中无法正确显示。

## 根本原因分析

### Agent 组件需要的数据结构

Agent 组件依赖于 ContentBlock 中的 `metadata` 字段，该字段必须包含以下信息：

```typescript
{
  phase: "planning" | "execution" | "evaluation" | "reflection",
  type: "status" | "plan" | "step_progress" | "result" | "insight",
  // 其他特定字段...
}
```

### 正确的事件流程

1. **`content_added` 事件** - 创建带有 metadata 的 content block
```json
{
  "event_type": "content_added",
  "payload": {
    "content_id": "content_001",
    "content_type": "text",
    "sequence": 1,
    "text": "Planning...",
    "metadata": {
      "phase": "planning",
      "type": "status"
    }
  }
}
```

2. **`text_delta` 事件** - 仅用于追加文本（不包含 metadata）
```json
{
  "event_type": "text_delta",
  "payload": {
    "delta": "夜"
  }
}
```

## 诊断步骤

### 步骤 1: 检查浏览器控制台

打开浏览器开发者工具（F12），查看控制台输出：

1. 查找 `[ContentAdded]` 日志
2. 检查是否显示 "⚠️ NO METADATA in payload"
3. 如果有 metadata，检查其结构是否正确

### 步骤 2: 确认后端发送的事件

**问题场景 A**: 后端只发送 `text_delta` 事件
- **症状**: 只看到 `[TextDelta]` 日志，没有 `[ContentAdded]` 日志
- **解决**: 后端需要先发送 `content_added` 事件创建 content block（带 metadata），然后才发送 `text_delta`

**问题场景 B**: 后端发送 `content_added`，但 `payload.metadata` 为空
- **症状**: 看到 `[ContentAdded]` 日志，但显示 "⚠️ NO METADATA in payload"
- **解决**: 后端需要在 `content_added` 事件的 `payload` 中包含 `metadata` 字段

**问题场景 C**: metadata 结构不正确
- **症状**: 看到 metadata，但没有 `phase` 字段
- **解决**: 确保 metadata 包含 `phase` 和 `type` 字段

### 步骤 3: 后端修复示例

#### Planning 阶段
```python
# 1. 先发送 content_added（带 metadata）
await send_sse_event({
    "event_type": "content_added",
    "payload": {
        "content_id": "plan_status_001",
        "content_type": "text",
        "sequence": 1,
        "text": "🤔 Planning...",
        "metadata": {
            "phase": "planning",
            "type": "status"
        }
    }
})

# 2. 发送计划内容
await send_sse_event({
    "event_type": "content_added",
    "payload": {
        "content_id": "plan_001",
        "content_type": "text",
        "sequence": 2,
        "metadata": {
            "phase": "planning",
            "type": "plan",
            "steps": [
                {"step": 1, "description": "分析需求"},
                {"step": 2, "description": "设计方案"}
            ]
        }
    }
})

# 3. 然后可以发送普通文本（用于其他内容）
await send_sse_event({
    "event_type": "content_added",
    "payload": {
        "content_id": "text_001",
        "content_type": "text",
        "sequence": 3,
        "text": ""  # 创建空 text block
    }
})

# 4. 使用 text_delta 追加文本到上面的 text block
await send_sse_event({
    "event_type": "text_delta",
    "payload": {
        "delta": "开始执行计划..."
    }
})
```

#### Execution 阶段（工具调用）
```python
# 1. 发送 task_started（会显示 ToolPlaceholder）
await send_sse_event({
    "event_type": "task_started",
    "payload": {
        "task_id": "task_001",
        "task_type": "tool_call",
        "tool_name": "web_search",
        "tool_args": {"query": "latest news"},
        "display_text": "Searching the web...",
        "status": "processing",
        "progress": 0.0
    }
})

# 2. 可选：更新进度
await send_sse_event({
    "event_type": "task_progress",
    "payload": {
        "task_id": "task_001",
        "progress": 0.5,
        "status": "processing"
    }
})

# 3. 工具完成，发送 content_added 显示结果
await send_sse_event({
    "event_type": "content_added",
    "payload": {
        "content_id": "exec_status_001",
        "content_type": "text",
        "sequence": 4,
        "text": "Step 1 of 3: Analyzing data...",
        "task_id": "task_001",
        "metadata": {
            "phase": "execution",
            "type": "step_progress",
            "step": 1,
            "total": 3
        }
    }
})

# 4. 清除 pending task
await send_sse_event({
    "event_type": "task_completed",
    "payload": {
        "task_id": "task_001",
        "status": "completed",
        "progress": 1.0
    }
})
```

## 快速检查清单

- [ ] 后端是否发送 `content_added` 事件（不只是 `text_delta`）？
- [ ] `content_added` 事件的 `payload` 中是否包含 `metadata` 字段？
- [ ] `metadata` 中是否包含 `phase` 字段？
- [ ] `metadata` 中是否包含 `type` 字段？
- [ ] 浏览器控制台是否显示 "[ContentAdded] Full metadata"？
- [ ] 浏览器控制台是否显示 "[ContentBlockRenderer] Detected Agent phase"？

## 前端验证

打开浏览器控制台，应该看到类似以下的日志：

```
[ContentAdded] Event received: {
  content_type: "text",
  has_metadata: true,
  metadata_keys: ["phase", "type"],
  payload_keys: ["content_id", "content_type", "sequence", "text", "metadata"]
}

[ContentAdded] Full metadata: {
  "phase": "planning",
  "type": "status"
}

[ContentAdded] Metadata added: { phase: 'planning', type: 'status' }

[ContentBlockRenderer] Block with metadata: {
  content_id: "plan_status_001",
  content_type: "text",
  metadata: { phase: "planning", type: "status" }
}

[ContentBlockRenderer] Detected Agent phase: planning type: status
```

如果看不到这些日志，说明后端没有正确发送带 metadata 的事件。





