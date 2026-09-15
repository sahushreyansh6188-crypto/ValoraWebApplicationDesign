import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../config/env.js';

export class StorageService {
  private s3Client: S3Client;

  constructor() {
    this.s3Client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'auto',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || 'mock',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'mock',
      },
    });
  }

  /**
   * Generates a presigned upload URL for direct client upload to S3/Cloudflare R2
   */
  async generatePresignedUpload(
    userId: string,
    fileType: string,
    fileName: string
  ): Promise<{ uploadUrl: string; finalUrl: string; key: string }> {
    const key = `profiles/${userId}/${Date.now()}-${fileName}`;
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME || 'valora-media-dev',
      Key: key,
      ContentType: fileType,
    });

    try {
      const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
      const finalUrl = `${env.MEDIA_CDN_URL}/${key}`;
      return { uploadUrl, finalUrl, key };
    } catch (err) {
      // Fallback for development if S3 credentials are mock
      const mockUrl = `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&h=1000&fit=crop&auto=format`;
      return {
        uploadUrl: 'http://localhost:8080/api/v1/profiles/photos/mock-upload',
        finalUrl: mockUrl,
        key,
      };
    }
  }
}

export const storageService = new StorageService();
