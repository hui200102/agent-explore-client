import { useState, useCallback } from "react"
import { apiClient } from "@/lib/api-client"

export interface UploadedFile {
  id: string
  file: File
  name: string
  size: number
  type: string
  preview?: string // For image previews
  uploadProgress?: number // 0-100
  uploadStatus: "pending" | "uploading" | "success" | "error"
  url?: string // URL from server after upload
  error?: string
}

export interface UseFileUploadOptions {
  maxFiles?: number
  maxFileSize?: number // in bytes
  acceptedTypes?: string[] // e.g., ['image/*', 'application/pdf']
  folder?: string // Upload folder path (e.g., 'videos', 'images', 'documents')
  onUploadComplete?: (file: UploadedFile) => void
  onUploadError?: (file: UploadedFile, error: string) => void
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const {
    maxFiles = 5,
    maxFileSize = 10 * 1024 * 1024, // 10MB default
    acceptedTypes = ["image/*", "video/*", "audio/*", "application/pdf", ".doc", ".docx", ".txt"],
    folder = "assets", // Default folder
    onUploadComplete,
    onUploadError,
  } = options

  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const validateFile = useCallback((file: File): string | undefined => {
    // Check file size
    if (file.size > maxFileSize) {
      return `File size exceeds ${(maxFileSize / 1024 / 1024).toFixed(0)}MB limit`
    }

    // Check file type if acceptedTypes is specified
    if (acceptedTypes.length > 0) {
      const isAccepted = acceptedTypes.some(type => {
        if (type.includes("*")) {
          const [category] = type.split("/")
          return file.type.startsWith(category)
        }
        if (type.startsWith(".")) {
          return file.name.toLowerCase().endsWith(type.toLowerCase())
        }
        return file.type === type
      })

      if (!isAccepted) {
        return "File type not supported"
      }
    }

    return undefined
  }, [maxFileSize, acceptedTypes])

  const uploadFile = useCallback(async (uploadedFile: UploadedFile) => {
    setIsUploading(true)
    
    // Update status to uploading
    setFiles(prev => 
      prev.map(f => 
        f.id === uploadedFile.id 
          ? { ...f, uploadStatus: "uploading" as const, uploadProgress: 0 }
          : f
      )
    )

    try {
      // Step 1: Get presigned upload URL from backend
      const presignedData = await apiClient.getPresignedUploadUrl({
        fileName: uploadedFile.file.name,
        fileType: uploadedFile.file.type,
        fileSize: uploadedFile.file.size,
        folder,
      })

      // Step 2: Upload file directly to R2/S3 with progress tracking
      await apiClient.uploadFileWithProgress(
        uploadedFile.file,
        presignedData.uploadUrl,
        (progress) => {
          setFiles(prev => 
            prev.map(f => 
              f.id === uploadedFile.id 
                ? { ...f, uploadProgress: progress }
                : f
            )
          )
        }
      )

      // Step 3: Mark upload as successful and store the public file URL
      setFiles(prev => 
        prev.map(f => 
          f.id === uploadedFile.id 
            ? { 
                ...f, 
                uploadStatus: "success" as const, 
                uploadProgress: 100,
                url: presignedData.fileUrl // Use the public file URL
              }
            : f
        )
      )

      const updatedFile = { 
        ...uploadedFile, 
        uploadStatus: "success" as const, 
        url: presignedData.fileUrl 
      }
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
  }, [folder, onUploadComplete, onUploadError])

  const addFiles = useCallback(async (newFiles: File[]) => {
    if (files.length + newFiles.length > maxFiles) {
      console.warn(`Cannot add more than ${maxFiles} files`)
      return
    }

    const validatedFiles: UploadedFile[] = []

    for (const file of newFiles) {
      const error = validateFile(file)
      
      const uploadedFile: UploadedFile = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadStatus: error ? "error" : "pending",
        error,
      }

      // Generate preview for images
      if (file.type.startsWith("image/")) {
        try {
          const preview = await readFileAsDataURL(file)
          uploadedFile.preview = preview
        } catch (err) {
          console.error("Failed to generate preview:", err)
        }
      }

      validatedFiles.push(uploadedFile)
    }

    setFiles(prev => [...prev, ...validatedFiles])

    // Auto-upload valid files
    validatedFiles
      .filter(f => f.uploadStatus === "pending")
      .forEach(f => {
        // Call uploadFile asynchronously
        uploadFile(f).catch(console.error)
      })
  }, [files.length, maxFiles, validateFile, uploadFile])

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }, [])

  const clearFiles = useCallback(() => {
    setFiles([])
  }, [])

  const retryUpload = useCallback((fileId: string) => {
    const file = files.find(f => f.id === fileId)
    if (file && file.uploadStatus === "error") {
      uploadFile(file).catch(console.error)
    }
  }, [files, uploadFile])

  return {
    files,
    isUploading,
    addFiles,
    removeFile,
    clearFiles,
    retryUpload,
    canAddMore: files.length < maxFiles,
    acceptedTypes,
  }
}

// Helper function to read file as data URL
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
