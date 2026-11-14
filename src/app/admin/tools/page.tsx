'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Eye,
  Sliders,
  Check,
  RotateCcw,
  Sparkles,
  PlusCircle,
  Settings2,
} from 'lucide-react';
import { Student, CourseType } from '@/types';
import {
  DocumentOptions,
  DEFAULT_DOCUMENT_OPTIONS,
  generateStudentsPDF,
  getActiveColumns,
  sortStudentsList,
} from '@/lib/pdfGenerator';

export default function AdminToolsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CourseType | 'ALL'>('ALL');
  const [options, setOptions] = useState<DocumentOptions>(DEFAULT_DOCUMENT_OPTIONS);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetch('/api/admin/students')
      .then((r) => r.json())
      .then((d) => setStudents(d.students || []))
      .catch(() => {});
  }, []);

  const filteredStudents = React.useMemo(() => {
    if (selectedCourse === 'ALL') return students;
    return students.filter((s) => s.course === selectedCourse);
  }, [students, selectedCourse]);

  const sortedStudents = React.useMemo(() => {
    return sortStudentsList(filteredStudents, options.sortAlpha);
  }, [filteredStudents, options.sortAlpha]);

  const activeCols = React.useMemo(() => {
    return getActiveColumns(options);
  }, [options]);

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try {
      const pdf = await generateStudentsPDF(filteredStudents, options);
      const filename = `UCR_Student_List_${selectedCourse}_${options.format}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF document.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePresetFormat = (format: DocumentOptions['format']) => {
    setOptions((prev) => {
      switch (format) {
        case 'simple':
          return {
            ...prev,
            format: 'simple',
            includeSerialNo: true,
            includeStudentId: false,
            includePhone: true,
            includeCourse: false,
            includeBatch: false,
            emptyColumnTitle: 'Signature',
            customColumnTitle: '',
          };
        case 'with_id':
          return {
            ...prev,
            format: 'with_id',
            includeSerialNo: true,
            includeStudentId: true,
            includePhone: true,
            includeCourse: false,
            includeBatch: false,
            emptyColumnTitle: 'Signature',
            customColumnTitle: '',
          };
        case 'with_course':
          return {
            ...prev,
            format: 'with_course',
            includeSerialNo: true,
            includeStudentId: true,
            includePhone: true,
            includeCourse: true,
            includeBatch: false,
            emptyColumnTitle: 'Remarks',
            customColumnTitle: '',
          };
        case 'attendance':
          return {
            ...prev,
            format: 'attendance',
            includeSerialNo: true,
            includeStudentId: true,
            includePhone: false,
            includeCourse: true,
            includeBatch: false,
            emptyColumnTitle: 'Signature',
            customColumnTitle: '',
          };
        case 'custom':
          return {
            ...prev,
            format: 'custom',
            includeSerialNo: true,
            includeStudentId: true,
            includePhone: true,
            includeCourse: true,
            includeBatch: false,
            emptyColumnTitle: 'Signature',
          };
        default:
          return prev;
      }
    });
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 font-heading">
            <FileText className="w-6 h-6 text-brand-accent" />
            <span>PDF Document & Custom List Generator</span>
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Export official rosters, attendance layouts, and custom addon tables
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadPDF}
          disabled={isGenerating}
          className="self-start sm:self-center flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-accent to-brand-primary hover:opacity-95 text-white text-xs font-bold shadow-lg shadow-brand-primary/20 transition-all active:scale-95 disabled:opacity-50 touch-target"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Rendering PDF...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Download PDF Document</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Generator Controls */}
        <div className="lg:col-span-5 space-y-4">
          {/* Format Preset Selector including Custom Add-on Mode */}
          <div className="bg-surface/90 border border-surface-border rounded-2xl p-4 shadow-md space-y-3">
            <div className="text-xs font-bold text-brand-accent uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Document Modes & Templates</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handlePresetFormat('simple')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  options.format === 'simple'
                    ? 'bg-brand-accent/20 border-brand-accent text-white font-bold'
                    : 'bg-surface-card border-surface-border text-text-muted hover:text-white'
                }`}
              >
                <div className="font-bold">Simple Roster</div>
                <div className="text-[10px] text-text-muted mt-0.5">Name + Phone + Sign</div>
              </button>

              <button
                type="button"
                onClick={() => handlePresetFormat('with_id')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  options.format === 'with_id'
                    ? 'bg-brand-accent/20 border-brand-accent text-white font-bold'
                    : 'bg-surface-card border-surface-border text-text-muted hover:text-white'
                }`}
              >
                <div className="font-bold">With Student ID</div>
                <div className="text-[10px] text-text-muted mt-0.5">ID + Name + Phone + Sign</div>
              </button>

              <button
                type="button"
                onClick={() => handlePresetFormat('with_course')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  options.format === 'with_course'
                    ? 'bg-brand-accent/20 border-brand-accent text-white font-bold'
                    : 'bg-surface-card border-surface-border text-text-muted hover:text-white'
                }`}
              >
                <div className="font-bold">Academic Record</div>
                <div className="text-[10px] text-text-muted mt-0.5">ID + Name + Course</div>
              </button>

              <button
                type="button"
                onClick={() => handlePresetFormat('custom')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  options.format === 'custom'
                    ? 'bg-brand-cyan/20 border-brand-cyan text-white font-bold'
                    : 'bg-surface-card border-surface-border text-text-muted hover:text-white'
                }`}
              >
                <div className="font-bold flex items-center gap-1 text-brand-cyan">
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>Custom Add-on Mode</span>
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">Pick any columns + custom fields</div>
              </button>
            </div>
          </div>

          {/* Scope & Course Filter */}
          <div className="bg-surface/90 border border-surface-border rounded-2xl p-4 shadow-md space-y-3">
            <div className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              Student Scope
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedCourse('ALL')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  selectedCourse === 'ALL'
                    ? 'bg-white text-surface shadow'
                    : 'bg-surface-card text-text-secondary hover:text-white border border-surface-border'
                }`}
              >
                All (48)
              </button>
              <button
                type="button"
                onClick={() => setSelectedCourse('TPOPT')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  selectedCourse === 'TPOPT'
                    ? 'bg-brand-accent text-white shadow'
                    : 'bg-surface-card text-text-secondary hover:text-white border border-surface-border'
                }`}
              >
                TPOPT (26)
              </button>
              <button
                type="button"
                onClick={() => setSelectedCourse('TPRPT')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  selectedCourse === 'TPRPT'
                    ? 'bg-brand-primary text-white shadow'
                    : 'bg-surface-card text-text-secondary hover:text-white border border-surface-border'
                }`}
              >
                TPRPT (22)
              </button>
            </div>
          </div>

          {/* Custom Addon Columns (When Custom Mode is active) */}
          {options.format === 'custom' && (
            <div className="bg-surface/90 border border-brand-cyan/40 rounded-2xl p-4 shadow-md space-y-3.5">
              <div className="text-xs font-bold text-brand-cyan uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Custom Column Add-ons</span>
                </span>
                <span className="text-[10px] text-text-muted">A4 Optimized</span>
              </div>

              {/* Column Toggles (Batch Label Removed as requested) */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <label className="flex items-center gap-2 p-2 rounded-xl bg-surface-card border border-surface-border cursor-pointer text-white">
                  <input
                    type="checkbox"
                    checked={options.includeStudentId}
                    onChange={(e) => setOptions({ ...options, includeStudentId: e.target.checked })}
                    className="rounded border-surface-border text-brand-cyan focus:ring-brand-cyan"
                  />
                  <span>Student ID</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl bg-surface-card border border-surface-border cursor-pointer text-white">
                  <input
                    type="checkbox"
                    checked={options.includePhone}
                    onChange={(e) => setOptions({ ...options, includePhone: e.target.checked })}
                    className="rounded border-surface-border text-brand-cyan focus:ring-brand-cyan"
                  />
                  <span>Contact Phone</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl bg-surface-card border border-surface-border cursor-pointer text-white">
                  <input
                    type="checkbox"
                    checked={options.includeCourse}
                    onChange={(e) => setOptions({ ...options, includeCourse: e.target.checked })}
                    className="rounded border-surface-border text-brand-cyan focus:ring-brand-cyan"
                  />
                  <span>Course Code</span>
                </label>
              </div>

              {/* Date ON / OFF Option */}
              <div className="p-2.5 rounded-xl bg-surface-card border border-surface-border flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Document Date Header</span>
                  <span className="text-[10px] text-text-muted">Show or hide date on printed document</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOptions({ ...options, includeDate: !options.includeDate })}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    options.includeDate
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-surface border border-surface-border text-text-muted'
                  }`}
                >
                  {options.includeDate ? 'Date: ON' : 'Date: OFF'}
                </button>
              </div>

              {/* Column Size / Density Adjust Option */}
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5">
                  Column Spacing & Density
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['compact', 'standard', 'spacious'] as const).map((density) => (
                    <button
                      key={density}
                      type="button"
                      onClick={() => setOptions({ ...options, columnDensity: density })}
                      className={`py-1.5 px-2.5 rounded-xl text-xs font-bold capitalize transition-all ${
                        (options.columnDensity || 'standard') === density
                          ? 'bg-brand-cyan text-white shadow-md'
                          : 'bg-surface-card text-text-muted hover:text-white border border-surface-border'
                      }`}
                    >
                      {density}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Add-on Columns Input */}
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1">
                  Add Custom Columns (e.g. Practical Marks, NIC, Lab Seat)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={options.customColumnTitle || ''}
                    onChange={(e) => setOptions({ ...options, customColumnTitle: e.target.value })}
                    placeholder="Column name (e.g. Practical Score)"
                    className="flex-1 px-3 py-2 rounded-xl bg-surface-card border border-surface-border text-xs text-white focus:outline-none focus:border-brand-cyan"
                  />
                  {options.customColumnTitle && (
                    <button
                      type="button"
                      onClick={() => {
                        const current = options.extraColumns || [];
                        if (options.customColumnTitle?.trim()) {
                          setOptions({
                            ...options,
                            extraColumns: [...current, options.customColumnTitle.trim()],
                            customColumnTitle: '',
                          });
                        }
                      }}
                      className="px-3 py-2 rounded-xl bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan text-xs font-bold hover:bg-brand-cyan/30 transition-all"
                    >
                      + Add
                    </button>
                  )}
                </div>

                {options.extraColumns && options.extraColumns.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {options.extraColumns.map((colName, cIdx) => (
                      <span
                        key={cIdx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-surface-border text-[11px] text-white"
                      >
                        <span>{colName}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setOptions({
                              ...options,
                              extraColumns: options.extraColumns?.filter((_, i) => i !== cIdx),
                            });
                          }}
                          className="text-slate-400 hover:text-rose-400 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Document Content Customization */}
          <div className="bg-surface/90 border border-surface-border rounded-2xl p-4 shadow-md space-y-3">
            <div className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              Header & Layout Customization
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">
                Document Headline
              </label>
              <input
                type="text"
                value={options.headline}
                onChange={(e) => setOptions({ ...options, headline: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-card border border-surface-border text-xs text-white focus:outline-none focus:border-brand-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">
                Document Subtitle
              </label>
              <input
                type="text"
                value={options.subtitle}
                onChange={(e) => setOptions({ ...options, subtitle: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface-card border border-surface-border text-xs text-white focus:outline-none focus:border-brand-accent"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1">
                  Handwriting Column
                </label>
                <input
                  type="text"
                  value={options.emptyColumnTitle}
                  onChange={(e) => setOptions({ ...options, emptyColumnTitle: e.target.value })}
                  placeholder="e.g. Signature"
                  className="w-full px-3 py-2 rounded-xl bg-surface-card border border-surface-border text-xs text-white focus:outline-none focus:border-brand-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1">
                  Blank Extra Rows
                </label>
                <input
                  type="number"
                  min={0}
                  max={25}
                  value={options.blankRowsCount}
                  onChange={(e) =>
                    setOptions({ ...options, blankRowsCount: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-surface-card border border-surface-border text-xs text-white focus:outline-none focus:border-brand-accent"
                />
              </div>
            </div>

            {/* Layout Toggles */}
            <div className="pt-2 border-t border-surface-border flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-text-secondary hover:text-white">
                <input
                  type="checkbox"
                  checked={options.sortAlpha}
                  onChange={(e) => setOptions({ ...options, sortAlpha: e.target.checked })}
                  className="rounded border-surface-border bg-surface-card text-brand-accent focus:ring-brand-accent"
                />
                <span>Sort Alphabetically</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Live Document Preview */}
        <div className="lg:col-span-7">
          <div className="bg-surface/90 border border-surface-border rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-brand-cyan" />
                <h2 className="text-sm font-bold text-white font-heading">Live Document Preview</h2>
              </div>
              <span className="text-xs text-text-muted">
                {filteredStudents.length} entries + {options.blankRowsCount} blank rows
              </span>
            </div>

            {/* Clean, Logo-Free Virtual Paper Preview (Full A4 Preview) */}
            <div className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 shadow-2xl overflow-x-auto max-h-[720px] overflow-y-auto border border-slate-300">
              <div className="text-center mb-6 pb-4 border-b border-slate-300">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-950 uppercase font-heading">
                  {options.headline || 'OFFICIAL STUDENT ROSTER'}
                </h3>
                <div className="text-xs font-bold text-orange-600">
                  {options.divisionName}
                </div>
                <div className="text-xs text-slate-600">
                  {options.institutionName}
                </div>
                {options.subtitle && (
                  <div className="text-[11px] text-slate-500 mt-1 italic">{options.subtitle}</div>
                )}
                {options.includeDate && options.dateText && (
                  <div className="text-[10px] text-slate-400 mt-1 text-right">
                    Date: {options.dateText}
                  </div>
                )}
              </div>

              {/* Table Preview */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold">
                    {activeCols.map((col) => (
                      <th
                        key={col.id}
                        className={`p-2 border border-slate-700 text-[11px] ${
                          col.align === 'center' ? 'text-center' : 'text-left'
                        }`}
                      >
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedStudents.map((student, idx) => (
                    <tr
                      key={student.id}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                    >
                      {activeCols.map((col) => (
                        <td
                          key={col.id}
                          className={`border border-slate-300 text-slate-800 ${
                            options.columnDensity === 'compact'
                              ? 'p-1 text-[10px]'
                              : options.columnDensity === 'spacious'
                              ? 'p-3 text-xs'
                              : 'p-2 text-[11px]'
                          } ${col.align === 'center' ? 'text-center' : 'text-left'}`}
                        >
                          {col.getValue(student, idx)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {options.blankRowsCount > 0 &&
                    Array.from({ length: options.blankRowsCount }).map((_, bIdx) => (
                      <tr key={`blank-${bIdx}`} className="bg-slate-50/50">
                        {activeCols.map((col, cIdx) => (
                          <td
                            key={`b-${bIdx}-${cIdx}`}
                            className="p-2 border border-slate-300 text-slate-400 text-center text-[10px]"
                          >
                            {col.id === 'no' ? sortedStudents.length + bIdx + 1 : ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>

              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
                  <span>✓</span>
                  <span>Full Live Preview ({sortedStudents.length} Enrolled Students + {options.blankRowsCount} Blank Rows)</span>
                </span>
                <span className="font-mono text-[10px] text-slate-400">Standard A4 Format (210 × 297 mm)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
