import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { generateFullSystemBackup, saveLocalDatabase, DatabaseState } from '@/lib/db';
import { requireAdminPermission } from '@/lib/auth';
import { recordAdminAuditLog } from '@/lib/audit';
import {
  uploadBackupToR2,
  listR2Backups,
  downloadBackupFromR2,
  getR2Client,
} from '@/lib/storage';

const BACKUPS_DIR = path.join(process.cwd(), 'data', 'backups');

function ensureBackupsDir() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
}

// GET: Create / List Backups (Local & Cloudflare R2)
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

    // 1. List online Cloudflare R2 backups
    if (action === 'r2-list') {
      const r2Backups = await listR2Backups();
      const r2Configured = Boolean(getR2Client());
      return NextResponse.json({
        success: true,
        r2Configured,
        r2Backups,
        backups: r2Backups,
      });
    }

    // 2. Download a specific backup from Cloudflare R2
    if (action === 'r2-download') {
      const key = url.searchParams.get('key');
      if (!key) {
        return NextResponse.json({ error: 'Object key is required for R2 download.' }, { status: 400 });
      }

      const { buffer, etag } = await downloadBackupFromR2(key);
      const filename = path.basename(key);

      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'ETag': etag || '',
        },
      });
    }

    // 3. Trigger direct Cloudflare R2 online backup
    if (action === 'r2-upload') {
      const backupData = await generateFullSystemBackup();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `ucr_b11_backup_${timestamp}.json`;
      const key = `backups/${filename}`;
      const jsonBuffer = Buffer.from(JSON.stringify(backupData, null, 2), 'utf8');

      // Upload to Cloudflare R2
      const r2Result = await uploadBackupToR2(jsonBuffer, key);

      // Also save locally in BACKUPS_DIR for redundancy
      fs.writeFileSync(path.join(BACKUPS_DIR, filename), jsonBuffer);

      await recordAdminAuditLog({
        admin: auth.user,
        action: 'SYSTEM_BACKUP_R2_UPLOADED',
        targetType: 'backup',
        details: {
          key,
          size: r2Result.size,
          etag: r2Result.etag,
          counts: backupData.counts,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Disaster recovery snapshot successfully uploaded and verified in Cloudflare R2.',
        key,
        r2Key: key,
        filename,
        size: `${Math.round(r2Result.size / 1024)} KB`,
        bytes: r2Result.size,
        etag: r2Result.etag,
        timestamp: backupData.timestamp,
        counts: backupData.counts,
      });
    }

    // 4. List local disk backups
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

    // 5. Default: generate snapshot and download locally
    const backupData = await generateFullSystemBackup();
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
    return NextResponse.json({ error: err.message || 'Failed to process backup request.' }, { status: 500 });
  }
}

// POST: Restore / Recovery from JSON snapshot or Cloudflare R2
export async function POST(req: NextRequest) {
  const auth = await requireAdminPermission(req, 'backups:manage');
  if (auth instanceof NextResponse) return auth;

  if (auth.user.role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden. Super Admin only.' }, { status: 403 });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  // Trigger Cloudflare R2 Upload via POST
  if (action === 'r2-upload') {
    try {
      ensureBackupsDir();
      const backupData = await generateFullSystemBackup();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `ucr_b11_backup_${timestamp}.json`;
      const key = `backups/${filename}`;
      const jsonBuffer = Buffer.from(JSON.stringify(backupData, null, 2), 'utf8');

      const r2Result = await uploadBackupToR2(jsonBuffer, key);
      fs.writeFileSync(path.join(BACKUPS_DIR, filename), jsonBuffer);

      await recordAdminAuditLog({
        admin: auth.user,
        action: 'SYSTEM_BACKUP_R2_UPLOADED',
        targetType: 'backup',
        details: {
          key,
          size: r2Result.size,
          etag: r2Result.etag,
          counts: backupData.counts,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Disaster recovery snapshot successfully uploaded and verified in Cloudflare R2.',
        key,
        r2Key: key,
        filename,
        size: `${Math.round(r2Result.size / 1024)} KB`,
        bytes: r2Result.size,
        etag: r2Result.etag,
        timestamp: backupData.timestamp,
        counts: backupData.counts,
      });
    } catch (err: any) {
      console.error('R2 backup upload error:', err);
      return NextResponse.json({ error: err.message || 'Failed to upload backup to R2.' }, { status: 500 });
    }
  }

  try {
    const { snapshot, onlineFilename, r2Key } = await req.json();
    let stateToRestore: DatabaseState | null = null;

    if (r2Key) {
      // Restore from Cloudflare R2
      const { buffer } = await downloadBackupFromR2(r2Key);
      const parsed = JSON.parse(buffer.toString('utf8'));
      stateToRestore = parsed.snapshot || parsed;
    } else if (onlineFilename) {
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
        source: r2Key ? `Cloudflare R2: ${r2Key}` : onlineFilename || 'uploaded file',
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
    return NextResponse.json({ error: err.message || 'Failed to restore database from backup.' }, { status: 500 });
  }
}
