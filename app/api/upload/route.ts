import { generatePresignedPut } from '@/lib/upload';
import { 
  validateFileType, 
  validateFileSize, 
  getMaxFileSize, 
  formatFileSize 
} from '@/lib/upload-config';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { fileName, fileType, fileSize, folder } = await request.json();

    // Validate required fields
    if (!fileName || !fileType || typeof fileSize !== 'number') {
      return NextResponse.json(
        { error: 'fileName, fileType, and fileSize are required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!validateFileType(fileType)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only video and image files are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (!validateFileSize(fileSize, fileType)) {
      const maxSize = getMaxFileSize(fileType);
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      return NextResponse.json(
        { 
          error: `File size (${formatFileSize(fileSize)}) exceeds limit. Maximum allowed: ${maxSizeMB}MB`,
          maxSize: maxSize,
          maxSizeMB: maxSizeMB
        },
        { status: 413 } // 413 Payload Too Large
      );
    }

    // Generate presigned PUT URL for direct upload
    const presignedData = await generatePresignedPut(
      fileName,
      fileType,
      fileSize,
      folder || 'videos'
    );

    return NextResponse.json({
      success: true,
      data: presignedData,
    });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}

