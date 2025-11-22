/**
 * Content Block Utilities
 * Helper functions to build content blocks for sending messages
 */

import type { ContentBlockInput } from "./api-client"

/**
 * Convert a File object to base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(",")[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Create a text content block
 */
export function createTextBlock(text: string): ContentBlockInput {
  return {
    content_type: "text",
    text,
  }
}

/**
 * Create an image content block from URL
 */
export function createImageBlockFromUrl(
  url: string,
  options?: {
    caption?: string
    alt?: string
    summary?: string
    width?: number
    height?: number
  }
): ContentBlockInput {
  return {
    content_type: "image",
    image: {
      url,
      ...options,
    },
  }
}

/**
 * Create an image content block from base64 data
 */
export function createImageBlockFromData(
  base64Data: string,
  format: string = "png",
  options?: {
    caption?: string
    alt?: string
    summary?: string
    width?: number
    height?: number
  }
): ContentBlockInput {
  return {
    content_type: "image",
    image: {
      data: base64Data,
      format,
      ...options,
    },
  }
}

/**
 * Create an image content block from a File object
 */
export async function createImageBlockFromFile(
  file: File,
  options?: {
    caption?: string
    alt?: string
    summary?: string
  }
): Promise<ContentBlockInput> {
  const base64Data = await fileToBase64(file)
  const format = file.type.split("/")[1] || "png"
  
  return createImageBlockFromData(base64Data, format, {
    caption: options?.caption || file.name,
    alt: options?.alt || file.name,
    ...options,
  })
}

/**
 * Create a video content block from URL
 */
export function createVideoBlockFromUrl(
  url: string,
  options?: {
    title?: string
    summary?: string
    duration?: number
    thumbnail_url?: string
  }
): ContentBlockInput {
  return {
    content_type: "video",
    video: {
      url,
      ...options,
    },
  }
}

/**
 * Create a video content block from a File object
 */
export async function createVideoBlockFromFile(
  file: File,
  options?: {
    title?: string
    summary?: string
  }
): Promise<ContentBlockInput> {
  const base64Data = await fileToBase64(file)
  const format = file.type.split("/")[1] || "mp4"
  
  return {
    content_type: "video",
    video: {
      data: base64Data,
      format,
      title: options?.title || file.name,
      ...options,
    },
  }
}

/**
 * Create an audio content block from URL
 */
export function createAudioBlockFromUrl(
  url: string,
  options?: {
    title?: string
    summary?: string
    duration?: number
  }
): ContentBlockInput {
  return {
    content_type: "audio",
    audio: {
      url,
      ...options,
    },
  }
}

/**
 * Create an audio content block from a File object
 */
export async function createAudioBlockFromFile(
  file: File,
  options?: {
    title?: string
    summary?: string
  }
): Promise<ContentBlockInput> {
  const base64Data = await fileToBase64(file)
  const format = file.type.split("/")[1] || "mp3"
  
  return {
    content_type: "audio",
    audio: {
      data: base64Data,
      format,
      title: options?.title || file.name,
      ...options,
    },
  }
}

/**
 * Create a file content block from URL
 */
export function createFileBlockFromUrl(
  name: string,
  url: string,
  options?: {
    mime_type?: string
    size?: number
    description?: string
    summary?: string
  }
): ContentBlockInput {
  return {
    content_type: "file",
    file: {
      name,
      url,
      ...options,
    },
  }
}

/**
 * Create a file content block from a File object
 */
export async function createFileBlockFromFile(
  file: File,
  options?: {
    description?: string
    summary?: string
  }
): Promise<ContentBlockInput> {
  const base64Data = await fileToBase64(file)
  
  return {
    content_type: "file",
    file: {
      name: file.name,
      data: base64Data,
      mime_type: file.type || "application/octet-stream",
      size: file.size,
      extension: file.name.split(".").pop(),
      ...options,
    },
  }
}

/**
 * Automatically create content blocks from mixed content (text + files)
 * This is a convenience function that handles common use cases
 */
export async function createContentBlocks(
  text?: string,
  files?: File[]
): Promise<ContentBlockInput[]> {
  const blocks: ContentBlockInput[] = []
  
  // Add text block if present
  if (text && text.trim()) {
    blocks.push(createTextBlock(text.trim()))
  }
  
  // Add file blocks
  if (files && files.length > 0) {
    for (const file of files) {
      if (file.type.startsWith("image/")) {
        blocks.push(await createImageBlockFromFile(file))
      } else if (file.type.startsWith("video/")) {
        blocks.push(await createVideoBlockFromFile(file))
      } else if (file.type.startsWith("audio/")) {
        blocks.push(await createAudioBlockFromFile(file))
      } else {
        blocks.push(await createFileBlockFromFile(file))
      }
    }
  }
  
  return blocks
}

/**
 * Type guard to check if a file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/")
}

/**
 * Type guard to check if a file is a video
 */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/")
}

/**
 * Type guard to check if a file is an audio
 */
export function isAudioFile(file: File): boolean {
  return file.type.startsWith("audio/")
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string | undefined {
  const parts = filename.split(".")
  return parts.length > 1 ? parts.pop() : undefined
}

/**
 * Format file size to human readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

