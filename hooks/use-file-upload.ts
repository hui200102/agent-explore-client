import { useState, useCallback } from "react"

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
  onUploadComplete?: (file: UploadedFile) => void
  onUploadError?: (file: UploadedFile, error: string) => void
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const {
    maxFiles = 5,
    maxFileSize = 10 * 1024 * 1024, // 10MB default
    acceptedTypes = ["image/*", "video/*", "audio/*", "application/pdf", ".doc", ".docx", ".txt"],
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
      // TODO: Implement actual upload logic here
      // This is a placeholder that simulates an upload
      
      // Simulate progress
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 100))
        setFiles(prev => 
          prev.map(f => 
            f.id === uploadedFile.id 
              ? { ...f, uploadProgress: progress }
              : f
          )
        )
      }

      // Simulate successful upload
      const mockUrl = `https://example.com/uploads/${uploadedFile.id}`
      
      setFiles(prev => 
        prev.map(f => 
          f.id === uploadedFile.id 
            ? { 
                ...f, 
                uploadStatus: "success" as const, 
                uploadProgress: 100,
                url: mockUrl 
              }
            : f
        )
      )

      const updatedFile = { ...uploadedFile, uploadStatus: "success" as const, url: mockUrl }
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
