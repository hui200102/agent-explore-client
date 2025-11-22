# API 更新日志

## 2024-11-22: 消息发送 API 重大更新

### 概述

消息发送 API 从简单的文本格式升级为支持多媒体内容块（content blocks）的格式，支持文本、图片、视频、音频和文件。

### 变更详情

#### 1. 请求格式变更

**旧格式（已废弃）：**
```typescript
interface SendMessageRequest {
  content: string;
  type?: string;
  metadata?: Record<string, unknown>;
}
```

**新格式：**
```typescript
interface SendMessageRequest {
  content_blocks: ContentBlockInput[];  // 必需：内容块数组
  role?: "user" | "assistant" | "system";
  parent_message_id?: string;
  metadata?: Record<string, unknown>;
}
```

#### 2. 响应格式变更

**旧格式（已废弃）：**
```typescript
interface SendMessageResponse {
  user_message_id: string;
  assistant_message_id: string;
  session_id: string;
}
```

**新格式：**
```typescript
interface SendMessageResponse {
  message_id: string;              // 创建的消息 ID
  session_id: string;              // 会话 ID
  assistant_message_id?: string;   // 助手消息 ID（可选）
}
```

#### 3. 新增内容块类型

现在支持 5 种内容类型：

1. **文本块（Text）**
   ```typescript
   {
     content_type: "text",
     text: string
   }
   ```

2. **图片块（Image）**
   ```typescript
   {
     content_type: "image",
     image: {
       url?: string,
       data?: string,  // Base64
       format?: string,
       caption?: string,
       alt?: string,
       summary?: string,
       width?: number,
       height?: number
     }
   }
   ```

3. **视频块（Video）**
   ```typescript
   {
     content_type: "video",
     video: {
       url?: string,
       data?: string,  // Base64
       format?: string,
       title?: string,
       summary?: string,
       duration?: number,
       width?: number,
       height?: number,
       thumbnail_url?: string
     }
   }
   ```

4. **音频块（Audio）**
   ```typescript
   {
     content_type: "audio",
     audio: {
       url?: string,
       data?: string,  // Base64
       format?: string,
       title?: string,
       summary?: string,
       duration?: number,
       sample_rate?: number,
       channels?: number
     }
   }
   ```

5. **文件块（File）**
   ```typescript
   {
     content_type: "file",
     file: {
       name: string,  // 必需
       url?: string,
       data?: string,  // Base64
       size?: number,
       mime_type?: string,
       extension?: string,
       description?: string,
       summary?: string
     }
   }
   ```

### 新增功能

#### 1. 工具函数库 (`lib/content-block-utils.ts`)

新增了一系列辅助函数来简化内容块的创建：

**基础创建函数：**
- `createTextBlock(text)` - 创建文本块
- `createImageBlockFromUrl(url, options)` - 从 URL 创建图片块
- `createImageBlockFromFile(file, options)` - 从 File 对象创建图片块
- `createVideoBlockFromFile(file, options)` - 从 File 对象创建视频块
- `createAudioBlockFromFile(file, options)` - 从 File 对象创建音频块
- `createFileBlockFromFile(file, options)` - 从 File 对象创建文件块

**便捷函数：**
- `createContentBlocks(text?, files?)` - 自动处理混合内容
- `fileToBase64(file)` - 文件转 Base64

**工具函数：**
- `isImageFile(file)` - 判断是否为图片
- `isVideoFile(file)` - 判断是否为视频
- `isAudioFile(file)` - 判断是否为音频
- `formatFileSize(bytes)` - 格式化文件大小

#### 2. 更新的组件

**`chat-container.tsx`:**
- 更新 `handleSendMessage` 函数以支持新的 API 格式
- 使用 `createContentBlocks` 辅助函数处理文本和文件
- 支持自动识别文件类型并创建相应的内容块

**`api-client.ts`:**
- 更新 `SendMessageRequest` 和 `SendMessageResponse` 接口
- 新增 `ContentBlockInput` 相关类型定义

### 迁移指南

#### 简单文本消息

**旧代码：**
```typescript
await apiClient.sendMessage(sessionId, {
  content: "Hello!",
  type: "text"
})
```

**新代码（方式 1 - 直接使用）：**
```typescript
await apiClient.sendMessage(sessionId, {
  content_blocks: [
    {
      content_type: "text",
      text: "Hello!"
    }
  ]
})
```

**新代码（方式 2 - 使用辅助函数，推荐）：**
```typescript
import { createTextBlock } from "@/lib/content-block-utils"

await apiClient.sendMessage(sessionId, {
  content_blocks: [createTextBlock("Hello!")]
})
```

#### 带文件的消息

**旧代码（不支持）：**
```typescript
// 旧版本不支持直接发送文件
await apiClient.sendMessage(sessionId, {
  content: "See attached",
  type: "text"
})
```

**新代码：**
```typescript
import { createContentBlocks } from "@/lib/content-block-utils"

const contentBlocks = await createContentBlocks(
  "See attached",
  [imageFile, pdfFile]
)

await apiClient.sendMessage(sessionId, {
  content_blocks: contentBlocks
})
```

#### 处理响应

**旧代码：**
```typescript
const response = await apiClient.sendMessage(sessionId, request)
console.log(response.user_message_id)      // 用户消息 ID
console.log(response.assistant_message_id) // 助手消息 ID
```

**新代码：**
```typescript
const response = await apiClient.sendMessage(sessionId, request)
console.log(response.message_id)           // 消息 ID
console.log(response.assistant_message_id) // 可能不存在
```

### 兼容性说明

- ⚠️ **破坏性变更**: 旧的请求和响应格式已废弃
- 所有使用 `sendMessage` 的代码都需要更新
- `content` 字段已被 `content_blocks` 替代
- `user_message_id` 已被 `message_id` 替代

### 测试建议

在迁移后，请测试以下场景：

1. ✅ 发送纯文本消息
2. ✅ 发送图片（URL 和文件）
3. ✅ 发送视频文件
4. ✅ 发送音频文件
5. ✅ 发送 PDF/文档文件
6. ✅ 发送混合内容（文本 + 多个文件）
7. ✅ 只发送文件，不发送文本
8. ✅ 错误处理（文件过大、格式不支持等）

### 性能优化建议

1. **大文件处理**
   - 小于 1MB：可以使用 Base64（`data` 字段）
   - 大于 1MB：建议先上传到 CDN，使用 URL（`url` 字段）

2. **Base64 开销**
   - Base64 编码会增加约 33% 的数据大小
   - 对于大文件，网络传输时间会显著增加

3. **建议的上传流程**
   ```typescript
   // 1. 检查文件大小
   if (file.size > 1024 * 1024) {
     // 2. 先上传到 CDN
     const url = await uploadToCDN(file)
     // 3. 使用 URL
     contentBlocks.push(createImageBlockFromUrl(url))
   } else {
     // 4. 小文件直接使用 Base64
     contentBlocks.push(await createImageBlockFromFile(file))
   }
   ```

### 文档更新

新增和更新的文档：

1. **SEND_MESSAGE_EXAMPLES.md** - 新增详细的使用示例
2. **FRONTEND_API.md** - 更新了完整的 API 文档
3. **lib/content-block-utils.ts** - 新增工具函数库（包含 JSDoc 注释）

### 未来计划

1. 支持内容块的流式传输
2. 支持大文件分片上传
3. 支持直接从 URL 导入文件
4. 添加内容块的预览和编辑功能
5. 支持更多媒体格式（如 GIF、WebP 等）

### 需要帮助？

如果在迁移过程中遇到问题：

1. 查看 [SEND_MESSAGE_EXAMPLES.md](./SEND_MESSAGE_EXAMPLES.md) 获取详细示例
2. 查看 [FRONTEND_API.md](./FRONTEND_API.md) 了解完整 API 规范
3. 查看 `lib/content-block-utils.ts` 源码了解工具函数实现

### 总结

这次更新使消息系统更加强大和灵活，能够支持丰富的多媒体内容。虽然是破坏性变更，但提供了完整的工具函数库来简化迁移过程。建议使用 `createContentBlocks` 等辅助函数来构建内容块，这样代码会更简洁易维护。

