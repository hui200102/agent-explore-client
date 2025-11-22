import { useState, useCallback } from "react"
import { apiClient, type AssetType } from "@/lib/api-client"

export interface FileAnalysis {
  dense_summary: string // 详细的内容描述
  keywords: string // 逗号分隔的关键词
}

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
  // Analysis fields
  analysisStatus?: "pending" | "analyzing" | "complete" | "error"
  analysis?: FileAnalysis
  analysisError?: string
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
                url: presignedData.fileUrl, // Use the public file URL
                analysisStatus: "pending" as const
              }
            : f
        )
      )

      // Step 4: Analyze the uploaded file
      try {
        // Update status to analyzing
        setFiles(prev => 
          prev.map(f => 
            f.id === uploadedFile.id 
              ? { ...f, analysisStatus: "analyzing" as const }
              : f
          )
        )

        // Determine asset type from file type
        const assetType = getAssetType(uploadedFile.file.type)

        const analysisResult = await apiClient.analyzeAsset({
          type: assetType,
          url: presignedData.fileUrl,
        })

        // Update with analysis result
        setFiles(prev => 
          prev.map(f => 
            f.id === uploadedFile.id 
              ? { 
                  ...f, 
                  analysisStatus: "complete" as const,
                  analysis: analysisResult
                }
              : f
          )
        )

        const updatedFile = { 
          ...uploadedFile, 
          uploadStatus: "success" as const, 
          url: presignedData.fileUrl,
          analysisStatus: "complete" as const,
          analysis: analysisResult
        }
        onUploadComplete?.(updatedFile)

      } catch (analysisError) {
        // If analysis fails, still mark upload as complete but note analysis error
        const analysisErrorMessage = analysisError instanceof Error 
          ? analysisError.message 
          : "Failed to analyze file"
        
        setFiles(prev => 
          prev.map(f => 
            f.id === uploadedFile.id 
              ? { 
                  ...f, 
                  analysisStatus: "error" as const,
                  analysisError: analysisErrorMessage
                }
              : f
          )
        )

        console.error("File analysis failed:", analysisError)
        
        // Still call onUploadComplete even if analysis fails
        const updatedFile = { 
          ...uploadedFile, 
          uploadStatus: "success" as const, 
          url: presignedData.fileUrl,
          analysisStatus: "error" as const,
          analysisError: analysisErrorMessage
        }
        onUploadComplete?.(updatedFile)
      }

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

// Helper function to determine asset type from MIME type
function getAssetType(mimeType: string): AssetType {
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType === "application/pdf") return "pdf"
  if (
    mimeType.includes("document") ||
    mimeType.includes("word") ||
    mimeType.includes("excel") ||
    mimeType.includes("powerpoint") ||
    mimeType.includes("text")
  ) {
    return "document"
  }
  if (mimeType.includes("json") || mimeType.includes("javascript") || mimeType.includes("typescript")) {
    return "code"
  }
  return "other"
}
