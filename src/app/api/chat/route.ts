import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getChatMessages, addChatMessage, clearChatMessages } from '@/lib/db';
import { recordAdminAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const messages = await getChatMessages();
    return NextResponse.json({ success: true, messages });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve messages' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    const body = await req.json();

    const senderName = session?.name || body.senderName || 'Anonymous Student';
    const senderRole = session?.role === 'superadmin' ? 'SuperAdmin' : session?.role === 'representative' ? 'Batch Rep' : 'Student';
    const senderAvatar = body.senderAvatar || '';
    const course = session?.representativeCourse || body.course || 'TPOPT';

    const newMsg = await addChatMessage({
      senderId: session?.userId || body.senderId || 'student',
      senderName,
      senderRole,
      senderAvatar,
      course,
      text: body.text || '',
      attachment: body.attachment,
      taskMention: body.taskMention,
    });

    return NextResponse.json({ success: true, message: newMsg });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to post message' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    if (!session || (session.role !== 'superadmin' && !session.permissions?.includes('chat:moderate'))) {
      return NextResponse.json({ error: 'Unauthorized to clear division chat' }, { status: 403 });
    }

    await clearChatMessages();

    await recordAdminAuditLog({
      admin: session,
      action: 'CHAT_PURGED',
      targetType: 'chat',
      targetId: 'all',
      details: { clearedBy: session.name },
    });

    return NextResponse.json({ success: true, message: 'All chat messages have been erased.' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to clear chat' }, { status: 500 });
  }
}
