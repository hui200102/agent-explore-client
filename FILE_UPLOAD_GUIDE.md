# 文件上传功能使用指南

## 概述

文件上传功能已经集成到聊天输入框中，使用 `useFileUpload` hook 提供核心功能。目前接口部分是占位实现，等待您完成实际的上传逻辑。

## 文件结构

```
hooks/
  └── use-file-upload.ts       # 文件上传核心 Hook
components/chat/
  ├── file-preview.tsx          # 文件预览组件
  ├── chat-input.tsx            # 输入框组件（已集成文件上传）
  └── chat-container.tsx        # 聊天容器（处理文件消息）
```

## 核心功能

### 1. `useFileUpload` Hook

位置: `hooks/use-file-upload.ts`

#### 特性:
- ✅ 文件验证（大小、类型）
- ✅ 图片预览生成
- ✅ 上传进度跟踪
- ✅ 错误处理
- ✅ 重试机制
- ⏳ **占位上传实现（需要您实现）**

#### 使用方法:

```typescript
const fileUpload = useFileUpload({
  maxFiles: 5,                    // 最大文件数
  maxFileSize: 10 * 1024 * 1024, // 最大文件大小 (10MB)
  acceptedTypes: [                // 接受的文件类型
    "image/*",
    "video/*",
    "audio/*",
    "application/pdf",
    ".doc",
    ".docx"
  ],
  onUploadComplete: (file) => {   // 上传成功回调
    console.log("Uploaded:", file)
  },
  onUploadError: (file, error) => { // 上传失败回调
    console.error("Error:", error)
  },
})

// API
fileUpload.files           // 当前文件列表
fileUpload.isUploading     // 是否正在上传
fileUpload.addFiles(files) // 添加文件
fileUpload.removeFile(id)  // 移除文件
fileUpload.clearFiles()    // 清空所有文件
fileUpload.retryUpload(id) // 重试上传
fileUpload.canAddMore      // 是否可以添加更多文件
```

### 2. 需要实现的上传逻辑

在 `hooks/use-file-upload.ts` 的 `uploadFile` 函数中，找到以下注释：

```typescript
// TODO: Implement actual upload logic here
// This is a placeholder that simulates an upload
```

**实现步骤：**

1. 替换模拟进度更新为实际的上传请求
2. 使用 `FormData` 或您的上传 API
3. 更新进度：`setFiles(prev => prev.map(f => f.id === uploadedFile.id ? { ...f, uploadProgress: progress } : f))`
4. 返回实际的 URL 替换 `mockUrl`

#### 示例实现：

```typescript
const uploadFile = useCallback(async (uploadedFile: UploadedFile) => {
  setIsUploading(true)
  
  setFiles(prev => 
    prev.map(f => 
      f.id === uploadedFile.id 
        ? { ...f, uploadStatus: "uploading" as const, uploadProgress: 0 }
        : f
    )
  )

  try {
    // 创建 FormData
    const formData = new FormData()
    formData.append('file', uploadedFile.file)
    formData.append('filename', uploadedFile.name)
    
    // 使用 XMLHttpRequest 或 fetch 上传
    const xhr = new XMLHttpRequest()
    
    // 监听进度
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const progress = Math.round((e.loaded / e.total) * 100)
        setFiles(prev => 
          prev.map(f => 
            f.id === uploadedFile.id 
              ? { ...f, uploadProgress: progress }
              : f
          )
        )
      }
    })
    
    // 完成上传
    const response = await new Promise<string>((resolve, reject) => {
      xhr.onload = () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText)
          resolve(data.url) // 假设返回 { url: "..." }
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`))
        }
      }
      xhr.onerror = () => reject(new Error('Network error'))
      
      xhr.open('POST', '/api/upload') // 您的上传端点
      xhr.send(formData)
    })
    
    // 更新为成功状态
    setFiles(prev => 
      prev.map(f => 
        f.id === uploadedFile.id 
          ? { 
              ...f, 
              uploadStatus: "success" as const, 
              uploadProgress: 100,
              url: response // 实际的 URL
            }
          : f
      )
    )

    const updatedFile = { ...uploadedFile, uploadStatus: "success" as const, url: response }
    onUploadComplete?.(updatedFile)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Upload failed"
    
    setFiles(prev => 
      prev.map(f => 
        f.id === uploadedFile.id 
          ? { 
              ...f, 
              uploadStatus: "error" as const, 
              error: errorMessage 
            }
          : f
      )
    )

    onUploadError?.(uploadedFile, errorMessage)
  } finally {
    setIsUploading(false)
  }
}, [onUploadComplete, onUploadError])
```

### 3. 在 Chat Container 中处理文件

位置: `components/chat/chat-container.tsx` 的 `handleSendMessage` 函数

找到以下注释：

```typescript
// TODO: Handle file uploads here when backend is ready
if (files && files.length > 0) {
  console.log("Files to upload:", files)
  // You can implement your file upload logic here
  // Example:
  // const uploadedFiles = await uploadFiles(files)
  // Then attach the uploaded file URLs to the message
}
```

**建议实现：**

```typescript
if (files && files.length > 0) {
  // 等待所有文件上传完成（如果还在上传中）
  const uploadedUrls = await Promise.all(
    files.map(async (file) => {
      // 如果使用 useFileUpload，文件应该已经上传
      // 从 fileUpload.files 中获取对应的 URL
      return file.url || await uploadSingleFile(file)
    })
  )
  
  // 将文件 URL 添加到消息元数据
  metadata.fileUrls = uploadedUrls
}
```

## UI 组件

### FilePreview 组件

显示单个文件的预览，包括：
- 图片预览（带缩略图）
- 上传进度条
- 错误状态和重试按钮
- 删除按钮

支持 `compact` 模式用于输入框，完整模式用于聊天消息。

### FilePreviewList 组件

批量显示文件列表的容器组件。

## 功能特性

### ✅ 已实现
- 文件选择和验证
- 图片预览生成
- 文件大小和类型检查
- UI 预览组件
- 进度显示
- 错误处理和重试
- 多文件支持
- 拖拽上传占位

### ⏳ 需要实现
- 实际的文件上传 API 调用
- 后端集成
- 文件消息在聊天中的显示
- 文件下载功能

## 配置选项

在 `chat-input.tsx` 中可以修改上传配置：

```typescript
const fileUpload = useFileUpload({
  maxFiles: 5,                    // 修改最大文件数
  maxFileSize: 10 * 1024 * 1024, // 修改最大文件大小
  acceptedTypes: [...],           // 修改接受的文件类型
})
```

## 测试建议

1. 测试文件大小限制
2. 测试文件类型过滤
3. 测试最大文件数限制
4. 测试图片预览生成
5. 测试上传进度显示
6. 测试错误处理和重试
7. 测试文件删除功能

## 下一步

1. 实现 `uploadFile` 函数中的实际上传逻辑
2. 更新后端 API 以接收文件
3. 在聊天消息中显示上传的文件
4. 添加文件下载功能
5. 考虑添加拖拽上传支持
6. 添加更多文件类型的预览支持

## 注意事项

- 当前上传是模拟的，会自动"成功"
- 文件只存储在前端状态中，刷新后会丢失
- 需要根据您的后端 API 调整上传逻辑
- 建议添加文件上传的安全检查（如病毒扫描）

