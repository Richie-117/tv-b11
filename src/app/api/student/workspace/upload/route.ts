import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { uploadFileToStorage } from '@/lib/storage';

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const isImage = file.type.startsWith('image/');
    const maxSize = isImage ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    const limitLabel = isImage ? '5MB' : '10MB';

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size exceeds the allowed ${limitLabel} limit for ${isImage ? 'images' : 'documents'}.` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await uploadFileToStorage(buffer, file.name, file.type, 'deliverables');

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      fileName: file.name,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      storageType: uploadResult.storageType,
    });
  } catch (err: any) {
    console.error('Workspace upload error:', err);
    return NextResponse.json({ error: 'Failed to process file upload.' }, { status: 500 });
  }
}

