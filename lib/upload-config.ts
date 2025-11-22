// Upload configuration and limits
export const UPLOAD_CONFIG = {
  // File size limits in bytes
  FILE_SIZE_LIMITS: {
    video: 500 * 1024 * 1024, // 100MB for videos
    image: 50 * 1024 * 1024,  // 50MB for images
    document: 100 * 1024 * 1024, // 100MB for documents
    default: 100 * 1024 * 1024, // 100MB for other files
  },

  // Allowed file types
  ALLOWED_TYPES: {
    video: [
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo', // .avi
      'video/webm',
      'video/ogg',
      'video/x-ms-wmv', // .wmv
    ],
    image: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ],
  },

  // Upload settings
  PRESIGNED_URL_EXPIRES_IN: 3600, // 1 hour in seconds
  
  // Default folder structure
  DEFAULT_FOLDERS: {
    video: 'videos',
    image: 'images',
    document: 'documents',
  },
} as const;

// Helper functions
export const getFileCategory = (fileType: string): keyof typeof UPLOAD_CONFIG.FILE_SIZE_LIMITS => {
  if (fileType.startsWith('video/')) return 'video';
  if (fileType.startsWith('image/')) return 'image';
  if (fileType.includes('document') || fileType.includes('pdf')) return 'document';
  return 'default';
};

export const getMaxFileSize = (fileType: string): number => {
  const category = getFileCategory(fileType);
  return UPLOAD_CONFIG.FILE_SIZE_LIMITS[category];
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const validateFileType = (fileType: string): boolean => {
  const allAllowedTypes = [
    ...UPLOAD_CONFIG.ALLOWED_TYPES.video,
    ...UPLOAD_CONFIG.ALLOWED_TYPES.image,
  ] as const;
  return (allAllowedTypes as readonly string[]).includes(fileType);
};

export const validateFileSize = (fileSize: number, fileType: string): boolean => {
  const maxSize = getMaxFileSize(fileType);
  return fileSize > 0 && fileSize <= maxSize;
};
