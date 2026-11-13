import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getStudents, updateStudent } from '@/lib/db';
import { uploadFileToStorage } from '@/lib/storage';

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const requestedStudentId = (formData.get('studentId') as string) || '';

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Student or Admin login required' }, { status: 401 });
    }

    // Determine target student: if student session, only allow updating their own profile
    const allStudents = await getStudents();
    let targetStudent = null;

    if (session.role === 'student' || session.role === 'representative') {
      targetStudent = allStudents.find(
        (s) =>
          s.id === session.userId ||
          s.studentNumber.toUpperCase() === session.username.toUpperCase() ||
          Boolean(s.email && session.email && s.email.toLowerCase() === session.email.toLowerCase())
      );
    } else if (session.role === 'superadmin' && requestedStudentId) {
      targetStudent = allStudents.find((s) => s.id === requestedStudentId) || null;
    }

    if (!targetStudent) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 });
    }

    // Validate mime type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file format. Please upload a JPG, PNG, or WEBP photo.' },
        { status: 400 }
      );
    }

    // Check size limit (max 5MB)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Photo size exceeds 5MB limit. Please choose a smaller image.' },
        { status: 400 }
      );
    }

    // Upload to R2 / Supabase / local
    const uploadResult = await uploadFileToStorage(buffer, file.name, file.type, 'avatars');

    // Update student in database (db.json and Supabase)
    const updated = await updateStudent(targetStudent.id, {
      profileImageUrl: uploadResult.url,
    });

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      storageType: uploadResult.storageType,
      student: updated,
    });
  } catch (error: any) {
    console.error('Avatar upload failed:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to upload and sync profile photo' },
      { status: 500 }
    );
  }
}
