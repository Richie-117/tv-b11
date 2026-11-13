import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Student, CourseType, AttendanceSession, AttendanceRecord } from '@/types';

export type DocumentFormatType = 'simple' | 'with_id' | 'with_course' | 'attendance' | 'custom';
export type PaperSize = 'a4' | 'letter';
export type Orientation = 'portrait' | 'landscape';

export type ColumnDensity = 'compact' | 'standard' | 'spacious';

export interface DocumentOptions {
  format: DocumentFormatType;
  headline: string;
  divisionName: string;
  institutionName: string;
  subtitle: string;
  includeDate: boolean;
  dateText: string;

  // Column toggles
  includeSerialNo: boolean;
  includeStudentId: boolean;
  includePhone: boolean;
  includeCourse: boolean;
  includeBatch: boolean;
  emptyColumnTitle: string;
  emptyColumnWidth: 'normal' | 'wide' | 'extra';

  // Custom add-on columns & density
  customColumnTitle?: string;
  extraColumns?: string[];
  columnDensity?: ColumnDensity;

  // Table options
  sortAlpha: boolean;
  blankRowsCount: number;
  repeatHeader: boolean;
  paperSize: PaperSize;
  orientation: Orientation;
}

export const DEFAULT_DOCUMENT_OPTIONS: DocumentOptions = {
  format: 'simple',
  headline: 'OFFICIAL STUDENT ROSTER',
  divisionName: 'Division of Television Studies',
  institutionName: 'University College of Rathmalana',
  subtitle: 'Batch 11 — Intake 2026',
  includeDate: true,
  dateText: new Date().toISOString().split('T')[0],

  includeSerialNo: true,
  includeStudentId: true,
  includePhone: true,
  includeCourse: false,
  includeBatch: false,
  emptyColumnTitle: 'Signature',
  emptyColumnWidth: 'normal',
  customColumnTitle: '',
  extraColumns: [],
  columnDensity: 'standard',

  sortAlpha: false,
  blankRowsCount: 5,
  repeatHeader: true,
  paperSize: 'a4',
  orientation: 'portrait',
};

export interface PreparedColumn {
  id: string;
  header: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  getValue: (s: Student, index: number) => string;
}

export function getActiveColumns(options: DocumentOptions): PreparedColumn[] {
  const cols: PreparedColumn[] = [];

  if (options.includeSerialNo) {
    cols.push({
      id: 'no',
      header: 'No.',
      width: 14,
      align: 'center',
      getValue: (_, index) => (index + 1).toString(),
    });
  }

  const shouldIncludeId =
    options.format === 'with_id' ||
    options.format === 'attendance' ||
    options.format === 'with_course' ||
    (options.format === 'custom' && options.includeStudentId);

  if (shouldIncludeId) {
    cols.push({
      id: 'studentNumber',
      header: 'Student ID',
      width: 38,
      align: 'left',
      getValue: (s) => s.studentNumber || '',
    });
  }

  // Name is always included
  cols.push({
    id: 'name',
    header: 'Full Student Name',
    align: 'left',
    getValue: (s) => s.fullName || '',
  });

  const shouldIncludeCourse =
    options.format === 'with_course' ||
    (options.format === 'custom' && options.includeCourse);

  if (shouldIncludeCourse) {
    cols.push({
      id: 'course',
      header: 'Course',
      width: 24,
      align: 'center',
      getValue: (s) => s.course || '',
    });
  }

  const shouldIncludeBatch =
    options.format === 'with_course' ||
    (options.format === 'custom' && options.includeBatch);

  if (shouldIncludeBatch) {
    cols.push({
      id: 'batch',
      header: 'Batch',
      width: 32,
      align: 'left',
      getValue: (s) => s.batch || '',
    });
  }

  const shouldIncludePhone =
    options.format === 'simple' ||
    options.format === 'with_id' ||
    options.format === 'with_course' ||
    (options.format === 'custom' && options.includePhone);

  if (shouldIncludePhone) {
    cols.push({
      id: 'phone',
      header: 'Contact No',
      width: 36,
      align: 'left',
      getValue: (s) => s.phoneNumber || '—',
    });
  }

  if (options.format === 'attendance') {
    cols.push({
      id: 'status',
      header: 'Attendance',
      width: 32,
      align: 'center',
      getValue: () => '',
    });
  }

  // Custom addon column if requested
  if (options.format === 'custom' && options.customColumnTitle?.trim()) {
    cols.push({
      id: 'customCol',
      header: options.customColumnTitle.trim(),
      width: 30,
      align: 'center',
      getValue: () => '',
    });
  }

  // Extra dynamic custom columns
  if (options.format === 'custom' && Array.isArray(options.extraColumns)) {
    options.extraColumns.forEach((colName, cIdx) => {
      if (colName && colName.trim()) {
        cols.push({
          id: `extraCol_${cIdx}`,
          header: colName.trim(),
          width: 28,
          align: 'center',
          getValue: () => '',
        });
      }
    });
  }

  if (options.emptyColumnTitle) {
    const emptyWidth =
      options.emptyColumnWidth === 'extra'
        ? 46
        : options.emptyColumnWidth === 'wide'
        ? 36
        : 26;

    cols.push({
      id: 'empty',
      header: options.emptyColumnTitle,
      width: emptyWidth,
      align: 'center',
      getValue: () => '',
    });
  }

  return cols;
}

export function sortStudentsList(students: Student[], sortAlpha: boolean): Student[] {
  const copy = [...students];
  if (sortAlpha) {
    return copy.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }
  return copy.sort((a, b) => (a.studentNumber || '').localeCompare(b.studentNumber || ''));
}

export async function generateStudentsPDF(
  students: Student[],
  options: DocumentOptions = DEFAULT_DOCUMENT_OPTIONS
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: options.orientation,
    unit: 'mm',
    format: options.paperSize,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  let startY = 18;

  // Clean, sleek typographic branding header (No old logos)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39); // Slate-900
  doc.text(options.headline || 'OFFICIAL STUDENT ROSTER', pageWidth / 2, startY, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(249, 115, 22); // Brand Orange
  doc.text(options.divisionName || 'Division of Television Studies', pageWidth / 2, startY + 5.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(options.institutionName || 'University College of Rathmalana', pageWidth / 2, startY + 10, { align: 'center' });

  if (options.subtitle) {
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(options.subtitle, pageWidth / 2, startY + 14.5, { align: 'center' });
    startY += 4;
  }

  if (options.includeDate && options.dateText) {
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated Date: ${options.dateText}`, pageWidth - margin, startY + 14, { align: 'right' });
  }

  startY += 18;

  const sorted = sortStudentsList(students, options.sortAlpha);
  const activeCols = getActiveColumns(options);

  const head = [activeCols.map((c) => c.header)];
  const body: string[][] = sorted.map((student, idx) =>
    activeCols.map((col) => col.getValue(student, idx))
  );

  for (let i = 0; i < options.blankRowsCount; i++) {
    const blankRow: string[] = activeCols.map((c) => {
      if (c.id === 'no') return (sorted.length + i + 1).toString();
      return '';
    });
    body.push(blankRow);
  }

  const columnStyles: Record<number, any> = {};
  activeCols.forEach((col, idx) => {
    columnStyles[idx] = {
      halign: col.align || 'left',
      ...(col.width ? { cellWidth: col.width } : {}),
    };
  });

  autoTable(doc, {
    head,
    body,
    startY,
    margin: { left: margin, right: margin, bottom: 20 },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: options.columnDensity === 'compact' ? 7.5 : options.columnDensity === 'spacious' ? 9.5 : 8.5,
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
      cellPadding: options.columnDensity === 'compact' ? 1.4 : options.columnDensity === 'spacious' ? 3.2 : 2.2,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles,
    didDrawPage: (data) => {
      const pageNumber = (doc as any).internal.getNumberOfPages();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);

      doc.text(
        'Division of Television Studies — University College of Rathmalana',
        margin,
        pageHeight - 8
      );

      doc.text(
        `Page ${data.pageNumber} of ${pageNumber}`,
        pageWidth - margin,
        pageHeight - 8,
        { align: 'right' }
      );
    },
  });

  return doc;
}

/**
 * Generates an official printable PDF for a single attendance session
 * showing all enrolled students, their present/absent status, and audit metadata.
 */
export async function generateSessionAttendancePDF(
  session: AttendanceSession,
  sessionRecords: AttendanceRecord[],
  students: Student[]
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  let startY = 16;

  // Header Typography
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text('UNIVERSITY COLLEGE OF RATHMALANA', pageWidth / 2, startY, { align: 'center' });

  doc.setFontSize(10.5);
  doc.setTextColor(249, 115, 22); // Brand Orange
  doc.text('Division of Television Studies — Batch 11 (2026 Intake)', pageWidth / 2, startY + 5.5, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('OFFICIAL SESSION ATTENDANCE AUDIT SHEET', pageWidth / 2, startY + 10, { align: 'center' });

  startY += 17;

  // Session Parameter Box
  doc.setFillColor(241, 245, 249); // Slate 100
  doc.roundedRect(margin, startY, pageWidth - margin * 2, 22, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Subject: ${session.moduleTitle} ${session.moduleCode ? `[${session.moduleCode}]` : ''}`, margin + 4, startY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Date: ${session.date}   |   Time: ${session.startTime || 'Scheduled Slot'} - ${session.endTime || ''}`, margin + 4, startY + 11);
  doc.text(`Programme: ${session.course}   |   Session Type: ${(session.sessionType || 'Lecture').toUpperCase()}   |   Recorded By: ${session.markedByAdminName}`, margin + 4, startY + 16.5);

  const total = (session.presentCount || 0) + (session.absentCount || 0);
  const rate = total > 0 ? Math.round(((session.presentCount || 0) / total) * 100) : 0;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(2, 132, 199); // Sky blue
  doc.text(`Attendance: ${rate}% (${session.presentCount} Present · ${session.absentCount} Absent)`, pageWidth - margin - 4, startY + 11, { align: 'right' });

  startY += 26;

  // Build table rows
  const recordMap = new Map<string, AttendanceRecord>();
  sessionRecords.forEach((r) => {
    recordMap.set(r.studentId, r);
    if (r.studentNumber) recordMap.set(r.studentNumber.toUpperCase(), r);
  });

  const eligibleStudents = students.filter((s) => session.course === 'ALL' || s.course === session.course);

  const head = [['#', 'Student Index', 'Full Name', 'Course', 'Attendance Status', 'Remarks / Signature']];
  const body = eligibleStudents.map((st, idx) => {
    const rec = recordMap.get(st.id) || recordMap.get(st.studentNumber.toUpperCase());
    const rawStatus = rec ? rec.status : 'absent';
    return [
      (idx + 1).toString(),
      st.studentNumber,
      st.fullName,
      st.course,
      rawStatus.toUpperCase(),
      rec?.remarks || '',
    ];
  });

  autoTable(doc, {
    head,
    body,
    startY,
    margin: { left: margin, right: margin, bottom: 20 },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 32 },
      2: { halign: 'left', cellWidth: 60 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'center', cellWidth: 30 },
      5: { halign: 'left', cellWidth: 30 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const val = String(data.cell.raw).toUpperCase();
        if (val === 'PRESENT') {
          data.cell.styles.textColor = [22, 101, 52]; // Green
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'ABSENT') {
          data.cell.styles.textColor = [153, 27, 27]; // Red
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'EXCUSED') {
          data.cell.styles.textColor = [146, 64, 14]; // Amber
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    didDrawPage: (data) => {
      const pageNumber = (doc as any).internal.getNumberOfPages();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);

      doc.text(
        'Division of Television Studies — University College of Rathmalana',
        margin,
        pageHeight - 8
      );

      doc.text(
        `Page ${data.pageNumber} of ${pageNumber}`,
        pageWidth - margin,
        pageHeight - 8,
        { align: 'right' }
      );
    },
  });

  return doc;
}
