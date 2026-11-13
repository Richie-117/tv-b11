import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { generateFullSystemBackup, saveLocalDatabase, DatabaseState } from '@/lib/db';
import { requireAdminPermission } from '@/lib/auth';
import { recordAdminAuditLog } from '@/lib/audit';

const BACKUPS_DIR = path.join(process.cwd(), 'data', 'backups');

function ensureBackupsDir() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
}

// GET: Create / List Backups
export async function GET(req: NextRequest) {
  const auth = await requireAdminPermission(req, 'backups:manage');
  if (auth instanceof NextResponse) return auth;

  if (auth.user.role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden. Only Super Administrators can manage backups.' }, { status: 403 });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  try {
    ensureBackupsDir();

    // If action === 'list', return online stored backups
    if (action === 'list') {
      const files = fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith('.json'));
      const onlineBackups = files.map((filename) => {
        const stats = fs.statSync(path.join(BACKUPS_DIR, filename));
        return {
          filename,
          size: `${Math.round(stats.size / 1024)} KB`,
          createdAt: stats.birthtime.toISOString(),
        };
      });
      return NextResponse.json({ onlineBackups });
    }

    // Default: generate snapshot
    const backupData = await generateFullSystemBackup();

    // Also persist an online snapshot to disk in BACKUPS_DIR
    const onlineFilename = `online_backup_${Date.now()}.json`;
    fs.writeFileSync(path.join(BACKUPS_DIR, onlineFilename), JSON.stringify(backupData, null, 2), 'utf8');

    await recordAdminAuditLog({
      admin: auth.user,
      action: 'SYSTEM_BACKUP_EXPORTED',
      targetType: 'backup',
      details: { counts: backupData.counts, timestamp: backupData.timestamp, onlineFilename },
    });

    return NextResponse.json({
      ...backupData,
      onlineSaved: onlineFilename,
    });
  } catch (err: any) {
    console.error('Backup generation error:', err);
    return NextResponse.json({ error: 'Failed to generate backup.' }, { status: 500 });
  }
}

// POST: Restore / Recovery from JSON snapshot
export async function POST(req: NextRequest) {
  const auth = await requireAdminPermission(req, 'backups:manage');
  if (auth instanceof NextResponse) return auth;

  if (auth.user.role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden. Super Admin only.' }, { status: 403 });
  }

  try {
    const { snapshot, onlineFilename } = await req.json();

    let stateToRestore: DatabaseState | null = null;

    if (onlineFilename) {
      ensureBackupsDir();
      const filePath = path.join(BACKUPS_DIR, onlineFilename);
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: 'Online backup file not found.' }, { status: 404 });
      }
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      stateToRestore = parsed.snapshot || parsed;
    } else if (snapshot) {
      stateToRestore = snapshot;
    }

    if (!stateToRestore || !Array.isArray(stateToRestore.students)) {
      return NextResponse.json({ error: 'Invalid backup file format or missing required students array.' }, { status: 400 });
    }

    // Perform safe restoration
    await saveLocalDatabase((currentState) => {
      return {
        ...currentState,
        students: stateToRestore!.students || currentState.students,
        studentLabels: stateToRestore!.studentLabels || currentState.studentLabels,
        timetables: stateToRestore!.timetables || currentState.timetables,
        timetableOverrides: stateToRestore!.timetableOverrides || currentState.timetableOverrides,
        attendanceSessions: stateToRestore!.attendanceSessions || currentState.attendanceSessions,
        attendanceRecords: stateToRestore!.attendanceRecords || currentState.attendanceRecords,
        assignments: stateToRestore!.assignments || currentState.assignments,
        modules: stateToRestore!.modules || currentState.modules,
        // preserve current admin accounts for safety
        admins: currentState.admins,
      };
    });

    await recordAdminAuditLog({
      admin: auth.user,
      action: 'SYSTEM_BACKUP_RESTORED',
      targetType: 'backup',
      details: {
        restoredStudents: stateToRestore.students?.length || 0,
        restoredSessions: stateToRestore.attendanceSessions?.length || 0,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'System successfully restored from backup snapshot.',
      restoredCounts: {
        students: stateToRestore.students?.length || 0,
        attendanceSessions: stateToRestore.attendanceSessions?.length || 0,
        assignments: stateToRestore.assignments?.length || 0,
      },
    });
  } catch (err: any) {
    console.error('Restore error:', err);
    return NextResponse.json({ error: 'Failed to restore database from backup.' }, { status: 500 });
  }
}
