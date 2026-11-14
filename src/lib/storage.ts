import fs from 'fs';
import path from 'path';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSupabaseAdmin } from './supabase';

export interface UploadResult {
  url: string;
  storageType: 'r2' | 'supabase' | 'local';
  fileName: string;
  fileSize: number;
}

export interface R2BackupItem {
  key: string;
  filename: string;
  size: string;
  bytes: number;
  lastModified: string;
  etag?: string;
}

/**
 * Returns a configured S3Client targeting Cloudflare R2 if credentials are set
 */
export function getR2Client(): { client: S3Client; bucket: string } | null {
  const r2AccountId = process.env.R2_ACCOUNT_ID;
  const r2AccessKey = process.env.R2_ACCESS_KEY_ID;
  const r2SecretKey = process.env.R2_SECRET_ACCESS_KEY;
  const r2Bucket = process.env.R2_BUCKET_NAME || 'ucr-portal-assets';

  if (!r2AccountId || !r2AccessKey || !r2SecretKey) {
    return null;
  }

  const endpoint =
    process.env.R2_ENDPOINT ||
    `https://${r2AccountId}.r2.cloudflarestorage.com`;

  const client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId: r2AccessKey,
      secretAccessKey: r2SecretKey,
    },
  });

  return { client, bucket: r2Bucket };
}

/**
 * Uploads a disaster recovery backup JSON buffer directly to Cloudflare R2
 */
export async function uploadBackupToR2(
  backupBuffer: Buffer,
  key: string
): Promise<{ success: boolean; key: string; size: number; etag?: string }> {
  const r2 = getR2Client();
  if (!r2) {
    throw new Error('Cloudflare R2 storage credentials are not configured in environment.');
  }

  const putRes = await r2.client.send(
    new PutObjectCommand({
      Bucket: r2.bucket,
      Key: key,
      Body: backupBuffer,
      ContentType: 'application/json',
      Metadata: {
        'portal-division': 'television-studies',
        'batch-intake': 'batch-11-2026',
        'backup-timestamp': new Date().toISOString(),
      },
    })
  );

  return {
    success: true,
    key,
    size: backupBuffer.length,
    etag: putRes.ETag,
  };
}

/**
 * Lists all online backup snapshots stored in the Cloudflare R2 bucket
 */
export async function listR2Backups(): Promise<R2BackupItem[]> {
  const r2 = getR2Client();
  if (!r2) return [];

  try {
    const listRes = await r2.client.send(
      new ListObjectsV2Command({
        Bucket: r2.bucket,
        Prefix: 'backups/',
      })
    );

    const contents = listRes.Contents || [];
    return contents
      .filter((obj) => obj.Key && obj.Key.endsWith('.json'))
      .map((obj) => {
        const bytes = obj.Size || 0;
        const key = obj.Key!;
        const filename = path.basename(key);
        return {
          key,
          filename,
          size: `${Math.round(bytes / 1024)} KB`,
          bytes,
          lastModified: obj.LastModified ? obj.LastModified.toISOString() : new Date().toISOString(),
          etag: obj.ETag,
        };
      })
      .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
  } catch (err) {
    console.warn('Failed to list R2 backups:', err);
    return [];
  }
}

/**
 * Downloads a disaster recovery backup file directly from Cloudflare R2
 */
export async function downloadBackupFromR2(
  key: string
): Promise<{ buffer: Buffer; etag?: string; lastModified?: Date }> {
  const r2 = getR2Client();
  if (!r2) {
    throw new Error('Cloudflare R2 storage credentials not configured.');
  }

  const getRes = await r2.client.send(
    new GetObjectCommand({
      Bucket: r2.bucket,
      Key: key,
    })
  );

  const chunks: Buffer[] = [];
  for await (const chunk of getRes.Body as any) {
    chunks.push(Buffer.from(chunk));
  }

  const buffer = Buffer.concat(chunks);
  return {
    buffer,
    etag: getRes.ETag,
    lastModified: getRes.LastModified,
  };
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

