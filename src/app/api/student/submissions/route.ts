import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getTaskSubmissions, createTaskSubmission, addChatMessage } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId') || undefined;

    // If student, return only their submissions or task-filtered
    const studentId = session?.role === 'student' ? session.userId : undefined;
    const submissions = await getTaskSubmissions(taskId, studentId);

    return NextResponse.json({ success: true, submissions });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve task submissions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    const body = await req.json();

    const studentName = session?.name || body.studentName || 'Student';
    const studentNumber = session?.username?.toUpperCase() || body.studentNumber || 'RT/TPOPT/26/00';
    const studentId = session?.userId || body.studentId || 'student-user';
    const course = session?.representativeCourse || body.course || 'TPOPT';

    const submission = await createTaskSubmission({
      taskId: body.taskId,
      taskTitle: body.taskTitle,
      studentId,
      studentNumber,
      studentName,
      course,
      remarks: body.remarks || '',
      submissionUrl: body.submissionUrl || '',
      fileName: body.fileName || '',
      fileSize: body.fileSize || '',
      mentionedInChat: Boolean(body.mentionInChat),
    });

    // If mentionInChat is checked, post notification in Division Chat
    if (body.mentionInChat) {
      await addChatMessage({
        senderId: studentId,
        senderName: studentName,
        senderRole: 'Student',
        course,
        text: `📎 Submitted deliverable for task: "${body.taskTitle}"`,
        taskMention: {
          taskId: body.taskId,
          taskTitle: body.taskTitle,
        },
      });
    }

    return NextResponse.json({ success: true, submission });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to submit task deliverable' }, { status: 500 });
  }
}
