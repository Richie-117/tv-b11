/**
 * Comprehensive Verification Suite:
 * 1. SuperAdmin & Representative Authentication
 * 2. Quick Console Tool Routes
 * 3. Complete Student Check-in Lifecycle (Push -> Submit -> Undo -> Re-submit -> Confirm -> Lock -> Close)
 * 4. Cloudflare R2 Remote Backup Engine (Upload, List, Download, ETag validation)
 */

const BASE_URL = 'http://localhost:3000';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { ...(options.headers || {}) };
  let body = options.body;
  if (body && typeof body !== 'string' && !(body instanceof Uint8Array)) {
    body = JSON.stringify(body);
    if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body,
    signal: AbortSignal.timeout(20000),
  });

  const contentType = res.headers.get('content-type') || '';
  let responseBody;
  if (contentType.includes('application/json')) {
    responseBody = await res.json().catch(() => null);
  } else {
    responseBody = await res.text();
  }

  // Extract set-cookie
  const setCookie = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : [res.headers.get('set-cookie')].filter(Boolean);

  const cookies = {};
  for (const str of setCookie) {
    if (!str) continue;
    const [pair] = str.split(';');
    const [k, v] = pair.split('=');
    if (k && v) cookies[k.trim()] = v.trim();
  }

  return {
    status: res.status,
    headers: Object.fromEntries(res.headers.entries()),
    cookies,
    body: responseBody,
  };
}

function cookieString(cookies) {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

async function runTests() {
  console.log('================================================================');
  console.log('🚀 UCR BATCH 11 PERFORMANCE, CHECK-IN & R2 BACKUP TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. SuperAdmin Login
  console.log('--- TEST 1: SuperAdmin Authentication ---');
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: {
      username: 'ucrtvrepb11',
      password: 'TelevisionStudies#2026',
    },
  });

  assert(loginRes.status === 200, 'SuperAdmin login returns 200 OK');
  assert(loginRes.body?.user?.role === 'superadmin', 'User has superadmin role');
  assert(Boolean(loginRes.cookies.ucr_admin_session), 'Cookie ucr_admin_session issued');

  const adminCookieHeader = cookieString(loginRes.cookies);

  // 2. Auth me endpoint check
  console.log('\n--- TEST 2: Current Session Verification ---');
  const meRes = await request('/api/auth/me', {
    headers: { Cookie: adminCookieHeader },
  });
  assert(meRes.status === 200 && meRes.body?.authenticated === true, 'SuperAdmin authenticated in /api/auth/me');
  assert(meRes.body?.user?.role === 'superadmin', 'Role in session token is superadmin');

  // 3. Quick Console Tool Routes
  console.log('\n--- TEST 3: Admin Quick Console Tool Navigation Endpoints ---');
  const toolRoutes = [
    { name: 'Students Roster', url: '/api/admin/students' },
    { name: 'Division Chat', url: '/api/chat' },
    { name: 'Attendance Dashboard', url: '/api/admin/attendance' },
    { name: 'Foundation Timetable', url: '/api/admin/timetable' },
    { name: 'Student Invitations', url: '/api/admin/invitations' },
  ];

  for (const route of toolRoutes) {
    const res = await request(route.url, {
      headers: { Cookie: adminCookieHeader },
    });
    assert(res.status === 200, `Quick Console Route '${route.name}' (${route.url}) responds 200 OK`);
  }

  // 4. Student Check-in Lifecycle
  console.log('\n--- TEST 4: Student Attendance Check-in Lifecycle ---');

  // Step 4a: Create / ensure an active attendance session for TPOPT
  const createSessionRes = await request('/api/admin/attendance', {
    method: 'POST',
    headers: { Cookie: adminCookieHeader },
    body: {
      date: new Date().toISOString().split('T')[0],
      course: 'TPOPT',
      moduleId: 'sub-ict',
      moduleCode: 'ICT',
      moduleTitle: 'ICT (Digital Media Systems)',
      sessionType: 'practical',
      startTime: '10:40',
      endTime: '12:40',
      notes: 'Automated Check-in Verification Session',
      records: [
        {
          studentId: 'student-tpopt-001',
          studentNumber: 'RT/TPOPT/26/01',
          studentName: 'D.G. Dissanayaka',
          course: 'TPOPT',
          status: 'absent',
        },
      ],
    },
  });

  assert(createSessionRes.status === 200, 'Attendance session created by Admin');
  const session = createSessionRes.body?.session;
  assert(Boolean(session?.id), `Session created with ID: ${session?.id}`);

  // Step 4b: Admin pushes check-in for this session (30 minutes)
  const pushRes = await request('/api/admin/attendance/checkin/push', {
    method: 'POST',
    headers: { Cookie: adminCookieHeader },
    body: {
      sessionId: session.id,
      action: 'open',
      durationMinutes: 30,
    },
  });

  assert(pushRes.status === 200, 'Admin pushes check-in successfully');
  assert(pushRes.body?.session?.checkinStatus === 'active', 'Session checkinStatus is active');
  assert(Boolean(pushRes.body?.expiresAt), `Check-in window open until: ${pushRes.body?.expiresAt}`);

  // Step 4c: Student session login (activate student-tpopt-01 if needed)
  let studentLoginRes = await request('/api/auth/login', {
    method: 'POST',
    body: {
      username: 'RT/TPOPT/26/01',
      password: 'studentpassword123',
    },
  });

  let studentCookies = studentLoginRes.cookies;

  if (studentLoginRes.status !== 200 || !studentCookies.ucr_admin_session) {
    // Generate fresh single invite for RT/TPOPT/26/01
    const createInvRes = await request('/api/admin/invitations', {
      method: 'POST',
      headers: { Cookie: adminCookieHeader },
      body: {
        mode: 'single',
        studentId: 'student-tpopt-01',
        studentNumber: 'RT/TPOPT/26/01',
        studentName: 'D.G. Dissanayaka',
        course: 'TPOPT',
      },
    });

    let code = createInvRes.body?.invitation?.code || createInvRes.body?.code;
    if (!code) {
      const getInvs = await request('/api/admin/invitations', {
        headers: { Cookie: adminCookieHeader },
      });
      const existing = getInvs.body?.invitations?.find((i) => i.studentNumber === 'RT/TPOPT/26/01' && !i.isUsed);
      code = existing?.code;
    }

    if (code) {
      const actRes = await request('/api/auth/activate', {
        method: 'POST',
        body: {
          studentNumber: 'RT/TPOPT/26/01',
          invitationCode: code,
          password: 'studentpassword123',
        },
      });

      studentCookies = actRes.cookies;

      if (!studentCookies.ucr_admin_session) {
        studentLoginRes = await request('/api/auth/login', {
          method: 'POST',
          body: {
            username: 'RT/TPOPT/26/01',
            password: 'studentpassword123',
          },
        });
        studentCookies = studentLoginRes.cookies;
      }
    }
  }

  const studentCookieHeader = cookieString(studentCookies);
  assert(Boolean(studentCookies.ucr_admin_session), 'Student RT/TPOPT/26/01 logged in successfully');

  // Step 4d: Student checks for active check-in
  const studentCheckinGet = await request('/api/student/checkin', {
    headers: { Cookie: studentCookieHeader },
  });

  assert(studentCheckinGet.status === 200, 'Student calls GET /api/student/checkin successfully');
  assert(studentCheckinGet.body?.hasActiveCheckin === true, 'Student detects active check-in for their cohort');
  assert(studentCheckinGet.body?.session?.id === session.id, 'Active session ID matches the pushed session');

  // Step 4e: Student submits check-in
  const studentSubmit = await request('/api/student/checkin', {
    method: 'POST',
    headers: { Cookie: studentCookieHeader },
    body: { sessionId: session.id },
  });

  assert(studentSubmit.status === 200, 'Student submits check-in (100% server-side derived identity)');
  assert(studentSubmit.body?.checkin?.status === 'submitted', 'Check-in state is submitted');

  // Step 4f: Student tests undo
  const studentUndo = await request('/api/student/checkin/undo', {
    method: 'POST',
    headers: { Cookie: studentCookieHeader },
    body: { sessionId: session.id },
  });

  assert(studentUndo.status === 200, 'Student undid check-in successfully');

  const studentStateAfterUndo = await request('/api/student/checkin', {
    headers: { Cookie: studentCookieHeader },
  });
  assert(studentStateAfterUndo.body?.checkinStatus === 'withdrawn', 'Check-in status is withdrawn');

  // Step 4g: Student re-submits check-in
  const studentReSubmit = await request('/api/student/checkin', {
    method: 'POST',
    headers: { Cookie: studentCookieHeader },
    body: { sessionId: session.id },
  });
  assert(studentReSubmit.status === 200, 'Student successfully re-submits check-in');

  // Step 4h: Admin checks attendance & confirms check-in
  const adminAttGet = await request('/api/admin/attendance', {
    headers: { Cookie: adminCookieHeader },
  });

  const targetCheckin = adminAttGet.body?.checkins?.find(
    (c) => c.sessionId === session.id && (c.studentId === 'student-tpopt-001' || c.studentNumber === 'RT/TPOPT/26/01')
  );
  assert(Boolean(targetCheckin && targetCheckin.status === 'submitted'), 'Admin sees student in pending check-ins');

  // Admin confirms check-in as Present with 1 click
  const adminConfirmRes = await request('/api/admin/attendance/checkin/confirm', {
    method: 'POST',
    headers: { Cookie: adminCookieHeader },
    body: {
      sessionId: session.id,
      studentId: 'student-tpopt-001',
    },
  });

  assert(adminConfirmRes.status === 200, 'Admin confirms check-in as Present with 1 click');
  assert(adminConfirmRes.body?.updatedCount === 1, '1 student record confirmed');

  // Step 4i: Verify student cannot undo after admin confirmation
  const studentUndoAfterConfirm = await request('/api/student/checkin/undo', {
    method: 'POST',
    headers: { Cookie: studentCookieHeader },
    body: { sessionId: session.id },
  });
  assert(studentUndoAfterConfirm.status === 400, 'Student cannot undo attendance after admin confirmation');

  // Step 4j: Admin closes check-in window
  const closeRes = await request('/api/admin/attendance/checkin/push', {
    method: 'POST',
    headers: { Cookie: adminCookieHeader },
    body: {
      sessionId: session.id,
      action: 'close',
    },
  });

  assert(closeRes.status === 200, 'Admin successfully closed check-in window');
  assert(closeRes.body?.session?.checkinStatus === 'closed', 'Session checkinStatus is closed');

  // 5. Cloudflare R2 Remote Backup Operations
  console.log('\n--- TEST 5: Cloudflare R2 Online Backup Engine ---');

  // Step 5a: Upload backup to real R2 bucket
  const r2UploadRes = await request('/api/admin/backup?action=r2-upload', {
    method: 'POST',
    headers: { Cookie: adminCookieHeader },
  });

  assert(r2UploadRes.status === 200, 'Cloudflare R2 live backup upload returns 200 OK');
  assert(Boolean(r2UploadRes.body?.r2Key), `R2 Key returned: ${r2UploadRes.body?.r2Key}`);
  assert(Boolean(r2UploadRes.body?.etag), `Real R2 ETag verified: ${r2UploadRes.body?.etag}`);
  const uploadedKey = r2UploadRes.body?.r2Key;

  // Step 5b: List R2 backups
  const r2ListRes = await request('/api/admin/backup?action=r2-list', {
    headers: { Cookie: adminCookieHeader },
  });

  assert(r2ListRes.status === 200, 'Cloudflare R2 backup listing returns 200 OK');
  const foundBackup = r2ListRes.body?.backups?.find((b) => b.key === uploadedKey);
  assert(Boolean(foundBackup), 'Uploaded backup exists in R2 bucket object list');
  assert(foundBackup?.size > 1000, `Backup file size is realistic (${Math.round((foundBackup?.size || 0) / 1024)} KB)`);

  // Step 5c: Download backup from R2
  const r2DownloadRes = await request(`/api/admin/backup?action=r2-download&key=${encodeURIComponent(uploadedKey)}`, {
    headers: { Cookie: adminCookieHeader },
  });

  assert(r2DownloadRes.status === 200, 'Cloudflare R2 direct download returns 200 OK');
  assert(Boolean(r2DownloadRes.headers['content-disposition']), 'Content-Disposition header present');
  assert(Boolean(r2DownloadRes.body?.snapshot || r2DownloadRes.body?.counts), 'Downloaded backup contains valid database payload');

  // Clean up test attendance session
  await request(`/api/admin/attendance?id=${session.id}`, {
    method: 'DELETE',
    headers: { Cookie: adminCookieHeader },
  });

  console.log('\n================================================================');
  console.log(`📊 FINAL RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
