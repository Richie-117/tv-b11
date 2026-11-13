/**
 * UCR TV Studies Portal - Module-Separated Attendance Excel Generator
 *
 * Implements Section 8 of the specification:
 * - Dedicated worksheet per lecture module (e.g., POST-5101, PROD-5102, etc.)
 * - Summary sheet detailing filters, export metadata, module metrics, and overall percentage
 * - Enforces 16 Nov 2026 tracking boundary and excludes cancelled/postponed sessions
 * - Excel-safe sheet names (<= 31 chars, no invalid characters)
 * - Chronologically sorted sessions
 * - Clean styling: frozen header rows, auto-fit column widths, visual status indicators
 * - No sensitive student details (e.g., parents' phone, home address)
 */

import ExcelJS from 'exceljs';
import { AttendanceSession, AttendanceRecord, Student } from '@/types';
import { isSessionValid, calculateAttendanceRate, TRACKING_START_DATE } from './attendanceCalculations';

export interface AttendanceExportFilters {
  sessionId?: string;
  course?: string; // 'ALL' | 'TPOPT' | 'TPRPT'
  moduleId?: string; // 'ALL' or specific module ID / code
  startDate?: string;
  endDate?: string;
  stage?: string;
  absenteesOnly?: boolean;
  includeEmptyModules?: boolean;
}

export interface AttendanceExportMetadata {
  exportedBy: string;
  exportedByRole: string;
  generatedAt: string;
}

/**
 * Sanitizes worksheet title to comply with Excel requirements:
 * - Maximum 31 characters
 * - Prohibited characters: [ ] * ? : / \
 */
export function sanitizeWorksheetName(rawName: string, usedNames: Set<string>): string {
  let safeName = rawName.replace(/[\\/?*\[\]:]/g, '-').trim();
  if (safeName.length > 31) {
    safeName = safeName.substring(0, 31).trim();
  }
  if (!safeName) safeName = 'Module';

  let uniqueName = safeName;
  let counter = 1;
  while (usedNames.has(uniqueName.toUpperCase())) {
    const suffix = `_${counter}`;
    const maxBaseLen = 31 - suffix.length;
    uniqueName = `${safeName.substring(0, maxBaseLen)}${suffix}`;
    counter++;
  }
  usedNames.add(uniqueName.toUpperCase());
  return uniqueName;
}

export async function generateAttendanceExcelWorkbook(
  sessions: AttendanceSession[],
  records: AttendanceRecord[],
  students: Student[],
  filters: AttendanceExportFilters = {},
  metadata: AttendanceExportMetadata
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'University College of Rathmalana - TV Studies Division';
  workbook.lastModifiedBy = metadata.exportedBy;
  workbook.created = new Date();
  workbook.modified = new Date();

  // 1. Filter sessions according to requested filters
  const filteredSessions = (sessions || []).filter((sess) => {
    if (filters.sessionId && sess.id !== filters.sessionId) {
      return false;
    }
    if (filters.course && filters.course !== 'ALL' && sess.course !== 'ALL' && sess.course !== filters.course) {
      return false;
    }
    if (filters.moduleId && filters.moduleId !== 'ALL' && sess.moduleId !== filters.moduleId && sess.moduleCode !== filters.moduleId) {
      return false;
    }
    if (filters.startDate && sess.date < filters.startDate) {
      return false;
    }
    if (filters.endDate && sess.date > filters.endDate) {
      return false;
    }
    if (filters.stage && sess.stage && sess.stage !== filters.stage) {
      return false;
    }
    return true;
  });

  // Sort sessions chronologically (ascending date, then start time)
  filteredSessions.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.startTime || '').localeCompare(b.startTime || '');
  });

  // Build record maps for fast lookups
  // Map of sessionId -> Map of studentId -> AttendanceRecord
  const sessionRecordsMap = new Map<string, Map<string, AttendanceRecord>>();
  (records || []).forEach((rec) => {
    if (!sessionRecordsMap.has(rec.sessionId)) {
      sessionRecordsMap.set(rec.sessionId, new Map());
    }
    const sMap = sessionRecordsMap.get(rec.sessionId)!;
    sMap.set(rec.studentId, rec);
    if (rec.studentNumber) {
      sMap.set(rec.studentNumber.toUpperCase(), rec);
    }
  });

  // Student lookup map
  const studentMap = new Map<string, Student>();
  (students || []).forEach((stu) => {
    studentMap.set(stu.id, stu);
    studentMap.set(stu.studentNumber.toUpperCase(), stu);
  });

  // Group sessions by Module
  interface ModuleGroup {
    moduleId: string;
    moduleCode: string;
    moduleTitle: string;
    course: string;
    sessions: AttendanceSession[];
    validSessionsCount: number;
    presentCount: number;
    absentCount: number;
    excusedCount: number;
  }

  const moduleGroupsMap = new Map<string, ModuleGroup>();

  filteredSessions.forEach((sess) => {
    const key = sess.moduleCode || sess.moduleId || sess.moduleTitle || 'GENERAL';
    if (!moduleGroupsMap.has(key)) {
      moduleGroupsMap.set(key, {
        moduleId: sess.moduleId,
        moduleCode: sess.moduleCode || key,
        moduleTitle: sess.moduleTitle || key,
        course: sess.course,
        sessions: [],
        validSessionsCount: 0,
        presentCount: 0,
        absentCount: 0,
        excusedCount: 0,
      });
    }
    const group = moduleGroupsMap.get(key)!;
    group.sessions.push(sess);

    if (isSessionValid(sess)) {
      group.validSessionsCount++;
      const sMap = sessionRecordsMap.get(sess.id);
      if (sMap) {
        sMap.forEach((rec) => {
          if (rec.status === 'present') group.presentCount++;
          else if (rec.status === 'absent') group.absentCount++;
          else if (rec.status === 'excused') group.excusedCount++;
        });
      }
    }
  });

  const usedSheetNames = new Set<string>();

  // =========================================================================
  // WORKSHEET 1: SUMMARY
  // =========================================================================
  const summarySheet = workbook.addWorksheet(sanitizeWorksheetName('Summary', usedSheetNames), {
    views: [{ state: 'frozen', ySplit: 8 }],
  });

  // Summary Title
  summarySheet.mergeCells('A1:G1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = 'UNIVERSITY COLLEGE OF RATHMALANA — DIVISION OF TELEVISION STUDIES';
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' }, // Slate 900
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getRow(1).height = 28;

  summarySheet.mergeCells('A2:G2');
  const subTitleCell = summarySheet.getCell('A2');
  subTitleCell.value = 'ACADEMIC ATTENDANCE AUDIT & REPORT (BATCH 11 - 2026 INTAKE)';
  subTitleCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF38BDF8' } };
  subTitleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  };
  subTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getRow(2).height = 22;

  // Metadata block
  const metaRows = [
    ['Export Generated At:', metadata.generatedAt, 'Target Programme / Cohort:', filters.course || 'ALL BATCH 11'],
    ['Generated By:', `${metadata.exportedBy} (${metadata.exportedByRole})`, 'Module Filter:', filters.moduleId || 'ALL ACADEMIC MODULES'],
    [
      'Date Range Filter:',
      `${filters.startDate || 'Start (Tracking 2026-11-16)'} to ${filters.endDate || 'Latest Available'}`,
      'Stage / Semester:',
      filters.stage || 'Foundation (Active)',
    ],
    [
      'Attendance Tracking Policy:',
      `Official tracking begins ${TRACKING_START_DATE}. Pre-tracking dates & cancelled sessions are excluded from valid totals.`,
      'Filter Absentees Only:',
      filters.absenteesOnly ? 'YES' : 'NO',
    ],
  ];

  metaRows.forEach((rowVals, idx) => {
    const rowNum = 3 + idx;
    const row = summarySheet.getRow(rowNum);
    row.values = [rowVals[0], rowVals[1], '', rowVals[2], rowVals[3]];
    row.getCell(1).font = { bold: true, color: { argb: 'FF64748B' } };
    row.getCell(2).font = { bold: false, color: { argb: 'FF0F172A' } };
    row.getCell(4).font = { bold: true, color: { argb: 'FF64748B' } };
    row.getCell(5).font = { bold: false, color: { argb: 'FF0F172A' } };
    row.height = 20;
  });

  summarySheet.getRow(7).height = 10; // Spacer row

  // Summary Table Header
  const summaryHeaderRow = summarySheet.getRow(8);
  summaryHeaderRow.values = [
    'Module Code',
    'Module Title',
    'Target Programme',
    'Total Sessions',
    'Valid Sessions (Held)',
    'Present Marks',
    'Absent Marks',
    'Attendance %',
  ];
  summaryHeaderRow.height = 24;
  summaryHeaderRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0284C7' }, // Sky Blue
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  let grandTotalSessions = 0;
  let grandValidSessions = 0;
  let grandPresent = 0;
  let grandAbsent = 0;

  let currentSummaryRowIndex = 9;
  Array.from(moduleGroupsMap.values()).forEach((grp) => {
    grandTotalSessions += grp.sessions.length;
    grandValidSessions += grp.validSessionsCount;
    grandPresent += grp.presentCount;
    grandAbsent += grp.absentCount;

    const rateResult = calculateAttendanceRate(grp.presentCount, grp.absentCount, grp.excusedCount);

    const sRow = summarySheet.getRow(currentSummaryRowIndex);
    sRow.values = [
      grp.moduleCode,
      grp.moduleTitle,
      grp.course,
      grp.sessions.length,
      grp.validSessionsCount,
      grp.presentCount,
      grp.absentCount,
      rateResult.formattedRate,
    ];
    sRow.height = 20;

    sRow.getCell(1).alignment = { horizontal: 'center' };
    sRow.getCell(3).alignment = { horizontal: 'center' };
    sRow.getCell(4).alignment = { horizontal: 'center' };
    sRow.getCell(5).alignment = { horizontal: 'center' };
    sRow.getCell(6).alignment = { horizontal: 'center' };
    sRow.getCell(7).alignment = { horizontal: 'center' };
    sRow.getCell(8).alignment = { horizontal: 'center' };

    // Row borders & alternate striping
    const isEven = currentSummaryRowIndex % 2 === 0;
    sRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      if (isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        };
      }
    });

    currentSummaryRowIndex++;
  });

  // Overall Total Row
  const overallRateResult = calculateAttendanceRate(grandPresent, grandAbsent);
  const totalRow = summarySheet.getRow(currentSummaryRowIndex);
  totalRow.values = [
    'TOTAL / OVERALL',
    'All Academic Modules Combined',
    filters.course || 'ALL',
    grandTotalSessions,
    grandValidSessions,
    grandPresent,
    grandAbsent,
    overallRateResult.formattedRate,
  ];
  totalRow.height = 24;
  totalRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  totalRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };

  // Set Summary column widths
  summarySheet.columns = [
    { width: 16 }, // Module Code
    { width: 44 }, // Module Title
    { width: 18 }, // Target Programme
    { width: 16 }, // Total Sessions
    { width: 20 }, // Valid Sessions
    { width: 16 }, // Present Marks
    { width: 16 }, // Absent Marks
    { width: 22 }, // Attendance %
  ];

  // =========================================================================
  // WORKSHEETS PER LECTURE MODULE (MANDATORY MODULE SEPARATION)
  // =========================================================================
  Array.from(moduleGroupsMap.values()).forEach((grp) => {
    // Generate clean safe worksheet name
    const sheetName = sanitizeWorksheetName(grp.moduleCode || grp.moduleTitle, usedSheetNames);
    const modSheet = workbook.addWorksheet(sheetName, {
      views: [{ state: 'frozen', ySplit: 5 }],
    });

    // Module Sheet Header Banner
    modSheet.mergeCells('A1:K1');
    const mTitle = modSheet.getCell('A1');
    mTitle.value = `MODULE: [${grp.moduleCode}] ${grp.moduleTitle.toUpperCase()}`;
    mTitle.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    mTitle.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    mTitle.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    modSheet.getRow(1).height = 24;

    // Module Subheader
    modSheet.mergeCells('A2:K2');
    const mSub = modSheet.getCell('A2');
    mSub.value = `Target Programme: ${grp.course} | Stage: Foundation (Batch 11 - 2026) | Sessions Recorded: ${grp.sessions.length} | Valid Held Sessions: ${grp.validSessionsCount}`;
    mSub.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF0284C7' } };
    mSub.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' },
    };
    mSub.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    modSheet.getRow(2).height = 20;

    modSheet.getRow(3).height = 8; // Spacer

    // Data Table Header Row
    const tblHeader = modSheet.getRow(4);
    tblHeader.values = [
      'Session Date',
      'Time Slot',
      'Session Type',
      'Session Status',
      'Student Index',
      'Student Full Name',
      'Course',
      'Attendance Status',
      'Validity',
      'Marked By Admin',
      'Remarks / Log',
    ];
    tblHeader.height = 22;
    tblHeader.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF334155' }, // Slate 700
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FF94A3B8' } },
        right: { style: 'thin', color: { argb: 'FF94A3B8' } },
      };
    });

    let modRowIndex = 5;

    // Iterate through sessions chronologically
    grp.sessions.forEach((sess) => {
      const isValid = isSessionValid(sess);
      const validityLabel = !isValid
        ? sess.date < TRACKING_START_DATE
          ? 'EXCLUDED (Pre-Tracking Date)'
          : 'EXCLUDED (Cancelled/Postponed)'
        : 'VALID (Counted)';

      const timeSlotStr = sess.startTime && sess.endTime ? `${sess.startTime} - ${sess.endTime}` : 'Regular Slot';
      const sessionStatusStr = sess.sessionStatus ? sess.sessionStatus.toUpperCase() : 'HELD';

      // Eligible students for this session
      const eligibleStudents = (students || []).filter((s) => {
        if (sess.course === 'ALL') return true;
        return s.course === sess.course;
      });

      const sRecordsMap = sessionRecordsMap.get(sess.id) || new Map();

      eligibleStudents.forEach((stu) => {
        const rec = sRecordsMap.get(stu.id) || sRecordsMap.get(stu.studentNumber.toUpperCase());
        const rawStatus = rec ? rec.status : 'unmarked';

        // If absentee filter is active, skip presents and unmarked
        if (filters.absenteesOnly && rawStatus !== 'absent') {
          return;
        }

        const row = modSheet.getRow(modRowIndex);
        row.values = [
          sess.date,
          timeSlotStr,
          sess.sessionType.toUpperCase(),
          sessionStatusStr,
          stu.studentNumber,
          stu.fullName,
          stu.course,
          rawStatus.toUpperCase(),
          validityLabel,
          sess.markedByAdminName || 'Admin System',
          rec?.remarks || sess.notes || '',
        ];
        row.height = 19;

        // Alignment
        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(2).alignment = { horizontal: 'center' };
        row.getCell(3).alignment = { horizontal: 'center' };
        row.getCell(4).alignment = { horizontal: 'center' };
        row.getCell(5).alignment = { horizontal: 'center' };
        row.getCell(7).alignment = { horizontal: 'center' };
        row.getCell(8).alignment = { horizontal: 'center' };
        row.getCell(9).alignment = { horizontal: 'center' };

        // Color coding for Attendance Status
        const statusCell = row.getCell(8);
        if (rawStatus === 'present') {
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFDCFCE7' }, // Emerald 100
          };
          statusCell.font = { bold: true, color: { argb: 'FF166534' } }; // Emerald 800
        } else if (rawStatus === 'absent') {
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEE2E2' }, // Red 100
          };
          statusCell.font = { bold: true, color: { argb: 'FF991B1B' } }; // Red 800
        } else if (rawStatus === 'excused') {
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEF3C7' }, // Amber 100
          };
          statusCell.font = { bold: true, color: { argb: 'FF92400E' } }; // Amber 800
        }

        // Validity Cell style
        const validityCell = row.getCell(9);
        if (!isValid) {
          validityCell.font = { italic: true, color: { argb: 'FF64748B' } };
          validityCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF1F5F9' },
          };
        } else {
          validityCell.font = { color: { argb: 'FF0284C7' } };
        }

        // Session status styling (if cancelled / postponed)
        if (sessionStatusStr === 'CANCELLED' || sessionStatusStr === 'POSTPONED') {
          const sessStatusCell = row.getCell(4);
          sessStatusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF3E8FF' }, // Purple 100
          };
          sessStatusCell.font = { bold: true, color: { argb: 'FF6B21A8' } };
        }

        // Borders
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          };
        });

        modRowIndex++;
      });
    });

    // Column widths
    modSheet.columns = [
      { width: 14 }, // Session Date
      { width: 16 }, // Time Slot
      { width: 14 }, // Session Type
      { width: 16 }, // Session Status
      { width: 18 }, // Student Index
      { width: 32 }, // Student Full Name
      { width: 12 }, // Course
      { width: 18 }, // Attendance Status
      { width: 28 }, // Validity
      { width: 22 }, // Marked By Admin
      { width: 30 }, // Remarks / Log
    ];
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
