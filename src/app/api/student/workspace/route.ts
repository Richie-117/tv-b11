import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getAssignments, createAssignment, addChatMessage } from '@/lib/db';
import { uploadFileToStorage } from '@/lib/storage';

export async function GET(req: NextRequest) {
  try {
    const assignments = await getAssignments();
    return NextResponse.json({ success: true, projects: assignments });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve projects' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    const body = await req.json();

    const {
      title,
      description,
      course,
      moduleId,
      moduleTitle,
      deadline,
      externalLink,
      attachmentUrl,
      attachmentName,
      mentionInChat,
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Project / task title is required.' }, { status: 400 });
    }

    const studentName = session?.name || body.studentName || 'Student';
    const studentNumber = session?.username?.toUpperCase() || body.studentNumber || '';
    const studentCourse = session?.representativeCourse || course || 'TPOPT';

    const newProject = await createAssignment({
      title: title.trim(),
      description: description?.trim() || '',
      course: course || studentCourse || 'ALL',
      moduleId: moduleId || 'mod-custom',
      moduleTitle: moduleTitle || 'Television Studies Workshop',
      issueDate: new Date().toISOString().split('T')[0],
      deadline: deadline || new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      priority: 'normal',
      status: 'active',
      externalLinks: externalLink ? [{ title: 'Project Asset Link', url: externalLink }] : [],
      attachments: attachmentUrl ? [{ title: attachmentName || 'Project File', url: attachmentUrl }] : [],
      createdByAdminId: session?.userId || 'student',
      createdByAdminName: `${studentName}${studentNumber ? ` (${studentNumber})` : ''}`,
    });

    // Optionally broadcast notification to Division Chat
    if (mentionInChat) {
      const chatText = `📁 [Workspace Upload] ${studentName} shared a new project: "${title.trim()}" (${course || studentCourse}). Check it in Student Workspace!`;
      await addChatMessage({
        senderId: session?.userId || 'student',
        senderName: studentName,
        senderRole: session?.role === 'representative' ? 'Batch Rep' : 'Student',
        course: studentCourse,
        text: chatText,
        taskMention: {
          taskId: newProject.id,
          taskTitle: newProject.title,
        },
      });
    }

    return NextResponse.json({ success: true, project: newProject });
  } catch (err: any) {
    console.error('Failed to create student workspace project:', err);
    return NextResponse.json({ error: 'Failed to create student project' }, { status: 500 });
  }
}
