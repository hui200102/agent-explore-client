import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const r2Config = {
  accountId: process.env.R2_ACCOUNT_ID || "",
  accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  bucketName: process.env.R2_BUCKET_NAME || "image2svg-results",
  publicDomain: process.env.R2_PUBLIC_DOMAIN,
  accessDomain: process.env.R2_WORK_DOMAIN,
};


export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${r2Config.accountId}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  // signatureVersion: "v4",
  credentials: {
    accessKeyId: r2Config.accessKeyId,
    secretAccessKey: r2Config.secretAccessKey,
  },
});


export interface PresignedUrlResponse {
  uploadUrl: string;
  fileUrl: string;
  key: string;
  expiresIn: number;
  method: 'PUT';
}

// Generate presigned PUT URL for direct upload
export async function generatePresignedPut(
  fileName: string,
  fileType: string,
  fileSize: number,
  folder: string = "videos"
): Promise<PresignedUrlResponse> {
  // Generate unique key with timestamp and random string
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const fileExtension = fileName.split(".").pop() || "";
  const key = `${folder}/${timestamp}-${randomString}.${fileExtension}`;

  const expiresIn = 3600; // 1 hour

  // Create PutObjectCommand with metadata
  const command = new PutObjectCommand({
    Bucket: r2Config.bucketName,
    Key: key,
    ContentType: fileType,
    ContentLength: fileSize,
    Metadata: {
      "original-name": fileName,
      "uploaded-at": new Date().toISOString(),
      "expected-size": fileSize.toString(),
    },
  });

  // Generate presigned URL for PUT operation
  const uploadUrl = await getSignedUrl(r2Client, command, { 
    expiresIn 
  });

  // Construct the public URL for accessing the file
  const fileUrl = r2Config.publicDomain
    ? `https://${r2Config.publicDomain}/${key}`
    : `https://${r2Config.bucketName}.${r2Config.accountId}.r2.cloudflarestorage.com/${key}`;

  return {
    uploadUrl,
    fileUrl,
    key,
    expiresIn,
    method: 'PUT' as const,
  };
}

// Generate presigned GET URL for downloading files
export async function generatePresignedGet(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: r2Config.bucketName,
    Key: key,
  });

  return await getSignedUrl(r2Client, command, { expiresIn });
}
