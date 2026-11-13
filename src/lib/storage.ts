import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSupabaseAdmin } from './supabase';

export interface UploadResult {
  url: string;
  storageType: 'r2' | 'supabase' | 'local';
  fileName: string;
  fileSize: number;
}

/**
 * Uploads a file buffer to Cloudflare R2, with automatic fallbacks
 * to Supabase Storage and local disk storage.
 */
export async function uploadFileToStorage(
  fileBuffer: Buffer,
  originalFileName: string,
  contentType: string,
  folder: 'avatars' | 'deliverables' | 'attachments' = 'avatars'
): Promise<UploadResult> {
  const ext = path.extname(originalFileName) || '.jpg';
  const cleanBase = path.basename(originalFileName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const uniqueKey = `${cleanBase}_${Date.now()}${ext}`;
  const fullPath = `${folder}/${uniqueKey}`;
  const fileSize = fileBuffer.length;

  // 1. Try Cloudflare R2 if configured
  const r2AccountId = process.env.R2_ACCOUNT_ID;
  const r2AccessKey = process.env.R2_ACCESS_KEY_ID;
  const r2SecretKey = process.env.R2_SECRET_ACCESS_KEY;
  const r2Bucket = process.env.R2_BUCKET_NAME || 'ucr-portal-assets';

  if (r2AccountId && r2AccessKey && r2SecretKey) {
    try {
      const endpoint =
        process.env.R2_ENDPOINT ||
        `https://${r2AccountId}.r2.cloudflarestorage.com`;

      const s3Client = new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
          accessKeyId: r2AccessKey,
          secretAccessKey: r2SecretKey,
        },
      });

      await s3Client.send(
        new PutObjectCommand({
          Bucket: r2Bucket,
          Key: fullPath,
          Body: fileBuffer,
          ContentType: contentType,
        })
      );

      const publicDomain = process.env.R2_PUBLIC_DOMAIN
        ? process.env.R2_PUBLIC_DOMAIN.replace(/\/$/, '')
        : `${endpoint}/${r2Bucket}`;

      return {
        url: `${publicDomain}/${fullPath}`,
        storageType: 'r2',
        fileName: uniqueKey,
        fileSize,
      };
    } catch (r2Error) {
      console.warn('R2 upload failed, attempting Supabase/local fallback:', r2Error);
    }
  }

  // 2. Try Supabase Storage if configured
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const bucketName = folder === 'avatars' ? 'profile-photos' : 'student-submissions';
      const { error: uploadErr } = await supabase.storage
        .from(bucketName)
        .upload(uniqueKey, fileBuffer, {
          contentType,
          upsert: true,
        });

      if (!uploadErr) {
        const { data } = supabase.storage.from(bucketName).getPublicUrl(uniqueKey);
        if (data?.publicUrl) {
          return {
            url: data.publicUrl,
            storageType: 'supabase',
            fileName: uniqueKey,
            fileSize,
          };
        }
      }
    } catch (supabaseError) {
      console.warn('Supabase storage upload failed, attempting local fallback:', supabaseError);
    }
  }

  // 3. Fallback to Local Public Directory
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, uniqueKey);
  fs.writeFileSync(filePath, fileBuffer);

  return {
    url: `/uploads/${folder}/${uniqueKey}`,
    storageType: 'local',
    fileName: uniqueKey,
    fileSize,
  };
}

