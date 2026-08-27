import React, { useState, useRef, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Database,
  DoorClosed,
  Download,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  FileUp,
  GraduationCap,
  Info,
  Layers,
  RefreshCw,
  Sliders,
  Sparkles,
  Trash2,
  UploadCloud,
  Users,
  XCircle,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import {
  buildImportedDataset,
  CSV_TEMPLATES,
  CsvValidationError,
  ImportedDatasetSummary,
  parseCompaniesCsv,
  parsePanelsCsv,
  parseRoomsCsv,
  parseShortlistsCsv,
  parseStudentsCsv,
  RawCsvPayloads,
} from '../engine/csvImporter';
import { generatePlacementDataset } from '../engine/dataGenerator';

export const CsvImportSection: React.FC = () => {
  const {
    config,
    dataSourceMode,
    importedPayloads,
    importedSummary,
    setDataSourceMode,
    importCsvPayloads,
    clearImportedData,
    syncConfigWithImportedCounts,
    setActiveTab,
    isGenerating,
  } = useScheduler();

  const [rawTexts, setRawTexts] = useState<RawCsvPayloads>({
    studentsCsv: importedPayloads.studentsCsv || '',
    companiesCsv: importedPayloads.companiesCsv || '',
    shortlistsCsv: importedPayloads.shortlistsCsv || '',
    roomsCsv: importedPayloads.roomsCsv || '',
    panelsCsv: importedPayloads.panelsCsv || '',
  });

  const [activeModalTab, setActiveModalTab] = useState<'students' | 'companies' | 'shortlists' | 'rooms' | 'panels'>('students');
  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(null);

  // File input refs
  const studentsInputRef = useRef<HTMLInputElement>(null);
  const companiesInputRef = useRef<HTMLInputElement>(null);
  const shortlistsInputRef = useRef<HTMLInputElement>(null);
  const roomsInputRef = useRef<HTMLInputElement>(null);
  const panelsInputRef = useRef<HTMLInputElement>(null);

  // Real-time parsing of current staged CSV texts
  const studentsParse = useMemo(() => (rawTexts.studentsCsv ? parseStudentsCsv(rawTexts.studentsCsv) : null), [rawTexts.studentsCsv]);
  const companiesParse = useMemo(() => (rawTexts.companiesCsv ? parseCompaniesCsv(rawTexts.companiesCsv) : null), [rawTexts.companiesCsv]);

  const studentIdsSet = useMemo(() => (studentsParse ? new Set(studentsParse.students.map(s => s.id)) : undefined), [studentsParse]);
  const companyIdsSet = useMemo(() => (companiesParse ? new Set(companiesParse.companies.map(c => c.id)) : undefined), [companiesParse]);

  const shortlistsParse = useMemo(
    () => (rawTexts.shortlistsCsv ? parseShortlistsCsv(rawTexts.shortlistsCsv, studentIdsSet, companyIdsSet) : null),
    [rawTexts.shortlistsCsv, studentIdsSet, companyIdsSet]
  );
  const roomsParse = useMemo(() => (rawTexts.roomsCsv ? parseRoomsCsv(rawTexts.roomsCsv) : null), [rawTexts.roomsCsv]);
  const panelsParse = useMemo(
    () => (rawTexts.panelsCsv ? parsePanelsCsv(rawTexts.panelsCsv, companyIdsSet) : null),
    [rawTexts.panelsCsv, companyIdsSet]
  );

  // Staged Dataset Validation
  const stagedValidation = useMemo(() => {
    return buildImportedDataset(rawTexts, config);
  }, [rawTexts, config]);

  // Handle file selection
  const handleFileUpload = (fileKey: keyof RawCsvPayloads, file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const content = e.target?.result as string;
      setRawTexts(prev => ({ ...prev, [fileKey]: content }));
    };
    reader.readAsText(file);
  };

  // Download template
  const downloadTemplate = (type: keyof typeof CSV_TEMPLATES, filename: string) => {
    const element = document.createElement('a');
    const file = new Blob([CSV_TEMPLATES[type]], { type: 'text/csv;charset=utf-8;' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Quick load realistic sample real-world CSV dataset (4000 students, 50 companies, etc.)
  const loadRealisticMegaSample = () => {
    // Generate sample dataset using generator to format into authentic CSV rows
    const demo = generatePlacementDataset({
      studentCount: 4000,
      companyCount: 50,
      roomCount: 30,
      placementDays: 10,
      startTime: '09:00',
      endTime: '18:00',
      seed: 42,
    });

    const studentsCsv =
      'student_id,name,cgpa,branch,email\n' +
      demo.students.map(s => `S${String(s.id).padStart(4, '0')},${s.name},${s.cgpa},${s.branch},${s.email}`).join('\n');

    const companiesCsv =
      'company_id,name,tier,min_cgpa,interview_duration\n' +
      demo.companies.map(c => `C${String(c.id).padStart(3, '0')},${c.name},${c.tier},${c.minCgpa},${c.interviewDurationMinutes}`).join('\n');

    const shortlistRows: string[] = ['student_id,company_id'];
    demo.students.forEach(s => {
      s.shortlistedCompanyIds.forEach(cId => {
        shortlistRows.push(`S${String(s.id).padStart(4, '0')},C${String(cId).padStart(3, '0')}`);
      });
    });
    const shortlistsCsv = shortlistRows.join('\n');

    const roomsCsv =
      'room_id,room_number,building,is_available\n' +
      demo.rooms.map(r => `R${String(r.id).padStart(3, '0')},${r.roomNumber},${r.building},${r.isAvailable}`).join('\n');

    const panelRows: string[] = ['panel_id,company_id,panel_name,is_available'];
    let pId = 1;
    demo.companies.forEach(c => {
      c.panels.forEach(p => {
        panelRows.push(`P${String(pId++).padStart(3, '0')},C${String(c.id).padStart(3, '0')},${p.panelName},true`);
      });
    });
    const panelsCsv = panelRows.join('\n');

    setRawTexts({
      studentsCsv,
      companiesCsv,
      shortlistsCsv,
      roomsCsv,
      panelsCsv,
    });
  };

  // Quick load Assignment A baseline sample
  const loadAssignmentASample = () => {
    const demo = generatePlacementDataset({
      studentCount: 800,
      companyCount: 35,
      roomCount: 20,
      placementDays: 5,
      seed: 42,
    });

    const studentsCsv =
      'student_id,name,cgpa,branch,email\n' +
      demo.students.map(s => `S${String(s.id).padStart(3, '0')},${s.name},${s.cgpa},${s.branch},${s.email}`).join('\n');

    const companiesCsv =
      'company_id,name,tier,min_cgpa,interview_duration\n' +
      demo.companies.map(c => `C${String(c.id).padStart(3, '0')},${c.name},${c.tier},${c.minCgpa},${c.interviewDurationMinutes}`).join('\n');

    const shortlistRows: string[] = ['student_id,company_id'];
    demo.students.forEach(s => {
      s.shortlistedCompanyIds.forEach(cId => {
        shortlistRows.push(`S${String(s.id).padStart(3, '0')},C${String(cId).padStart(3, '0')}`);
      });
    });
    const shortlistsCsv = shortlistRows.join('\n');

    const roomsCsv =
      'room_id,room_number,building,is_available\n' +
      demo.rooms.map(r => `R${String(r.id).padStart(3, '0')},${r.roomNumber},${r.building},true`).join('\n');

    const panelRows: string[] = ['panel_id,company_id,panel_name,is_available'];
    let pId = 1;
    demo.companies.forEach(c => {
      c.panels.forEach(p => {
        panelRows.push(`P${String(pId++).padStart(3, '0')},C${String(c.id).padStart(3, '0')},${p.panelName},true`);
      });
    });
    const panelsCsv = panelRows.join('\n');

    setRawTexts({
      studentsCsv,
      companiesCsv,
      shortlistsCsv,
      roomsCsv,
      panelsCsv,
    });
  };

  const handleApplyImport = () => {
    const res = importCsvPayloads(rawTexts);
    if (res.success) {
      setImportStatusMessage('Real CSV dataset imported and scheduled successfully with 0 clashes!');
      setTimeout(() => setImportStatusMessage(null), 5000);
    }
  };

  const handleClear = () => {
    setRawTexts({
      studentsCsv: '',
      companiesCsv: '',
      shortlistsCsv: '',
      roomsCsv: '',
      panelsCsv: '',
    });
    clearImportedData();
  };

  // Mismatch calculation
  const hasCountMismatch = useMemo(() => {
    if (!stagedValidation.summary.isValid) return false;
    const sDiff = stagedValidation.summary.studentCount !== config.studentCount;
    const cDiff = stagedValidation.summary.companyCount !== config.companyCount;
    const rDiff = stagedValidation.summary.roomCount !== config.roomCount;
    return sDiff || cDiff || rDiff;
  }, [stagedValidation, config]);

  return (
    <div className="space-y-6">
      {/* Mode Status Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center space-x-1 ${
                dataSourceMode === 'IMPORTED'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Data Source: {dataSourceMode === 'IMPORTED' ? 'IMPORTED REAL DATA' : 'DEMO DATA (PRNG)'}</span>
            </span>
            <span className="text-slate-400 text-xs">&bull; Module 8 CSV Pipeline</span>
          </div>
          <h3 className="text-lg font-bold text-white mt-1">Real-World CSV Data Input & Import Management</h3>
          <p className="text-slate-300 text-xs max-w-2xl mt-0.5">
            Import authentic college candidate rosters, recruiter catalogues, shortlist matrices, room lists, and panel assignments.
            Imported records feed directly into the constraint satisfaction scheduler.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {dataSourceMode === 'IMPORTED' ? (
            <button
              onClick={() => setDataSourceMode('DEMO')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
            >
              Switch to Demo Mode
            </button>
          ) : (
            <button
              onClick={() => {
                if (stagedValidation.dataset) {
                  handleApplyImport();
                } else {
                  loadAssignmentASample();
                }
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              Switch to Real CSV Mode
            </button>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {importStatusMessage && (
        <div className="bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 px-4 py-3 rounded-xl flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-medium">{importStatusMessage}</span>
          </div>
          <button
            onClick={() => setActiveTab('schedule')}
            className="text-xs bg-emerald-700/60 hover:bg-emerald-600/80 text-white px-3 py-1 rounded font-medium transition"
          >
            View Master Schedule &rarr;
          </button>
        </div>
      )}

      {/* Template Download & Preset Actions Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-slate-700">Download CSV Templates:</span>
        </div>
        <div className="flex items-center flex-wrap gap-1.5">
          <button
            onClick={() => downloadTemplate('students', 'students_template.csv')}
            className="px-2.5 py-1 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 rounded border border-slate-300 flex items-center space-x-1"
          >
            <Download className="w-3 h-3 text-slate-500" />
            <span>Students CSV</span>
          </button>
          <button
            onClick={() => downloadTemplate('companies', 'companies_template.csv')}
            className="px-2.5 py-1 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 rounded border border-slate-300 flex items-center space-x-1"
          >
            <Download className="w-3 h-3 text-slate-500" />
            <span>Companies CSV</span>
          </button>
          <button
            onClick={() => downloadTemplate('shortlists', 'shortlists_template.csv')}
            className="px-2.5 py-1 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 rounded border border-slate-300 flex items-center space-x-1"
          >
            <Download className="w-3 h-3 text-slate-500" />
            <span>Shortlists CSV</span>
          </button>
          <button
            onClick={() => downloadTemplate('rooms', 'rooms_template.csv')}
            className="px-2.5 py-1 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 rounded border border-slate-300 flex items-center space-x-1"
          >
            <Download className="w-3 h-3 text-slate-500" />
            <span>Rooms CSV</span>
          </button>
          <button
            onClick={() => downloadTemplate('panels', 'panels_template.csv')}
            className="px-2.5 py-1 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 rounded border border-slate-300 flex items-center space-x-1"
          >
            <Download className="w-3 h-3 text-slate-500" />
            <span>Panels CSV</span>
          </button>
        </div>
      </div>

      {/* Quick Load Realistic Samples */}
      <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <div>
            <span className="text-xs font-bold text-indigo-900 block">Quick Load Authentic Test Datasets:</span>
            <span className="text-[11px] text-indigo-700">Pre-populates the 5 CSV payload stages with valid real-world data</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAssignmentASample}
            className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-indigo-100 text-indigo-900 rounded-lg border border-indigo-300 transition"
          >
            Load 800-Student Baseline CSV
          </button>
          <button
            onClick={loadRealisticMegaSample}
            className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-xs transition"
          >
            Load 4,000-Student Mega Campus CSV
          </button>
        </div>
      </div>

      {/* 5-File CSV Staging Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {/* FILE 1: STUDENTS */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <span>1. Students CSV</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded font-bold">Required</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">Columns: student_id, name, cgpa, branch, email</p>

            <div className="mt-3">
              {studentsParse ? (
                <div className={`p-2 rounded-lg text-xs ${studentsParse.summary.rejectedRows === 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                  <div className="flex items-center justify-between font-semibold">
                    <span>{studentsParse.students.length.toLocaleString()} valid students</span>
                    {studentsParse.summary.rejectedRows > 0 && <span className="text-red-600">{studentsParse.summary.rejectedRows} rejected</span>}
                  </div>
                </div>
              ) : (
                <div className="p-2 bg-slate-50 rounded-lg text-[11px] text-slate-400 text-center">No students CSV loaded</div>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
            <input
              type="file"
              accept=".csv,.txt"
              ref={studentsInputRef}
              onChange={e => e.target.files?.[0] && handleFileUpload('studentsCsv', e.target.files[0])}
              className="hidden"
            />
            <button
              onClick={() => studentsInputRef.current?.click()}
              className="flex-1 px-2 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded flex items-center justify-center space-x-1"
            >
              <FileUp className="w-3.5 h-3.5 text-slate-600" />
              <span>Upload CSV</span>
            </button>
            <button
              onClick={() => setActiveModalTab('students')}
              className="px-2 py-1.5 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded"
              title="Edit / View CSV Text"
            >
              Edit
            </button>
          </div>
        </div>

        {/* FILE 2: COMPANIES */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                <Building2 className="w-4 h-4 text-sky-600" />
                <span>2. Companies CSV</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 bg-sky-50 text-sky-700 rounded font-bold">Required</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">Columns: company_id, name, tier, min_cgpa, duration</p>

            <div className="mt-3">
              {companiesParse ? (
                <div className={`p-2 rounded-lg text-xs ${companiesParse.summary.rejectedRows === 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                  <div className="flex items-center justify-between font-semibold">
                    <span>{companiesParse.companies.length} valid companies</span>
                    {companiesParse.summary.rejectedRows > 0 && <span className="text-red-600">{companiesParse.summary.rejectedRows} rejected</span>}
                  </div>
                </div>
              ) : (
                <div className="p-2 bg-slate-50 rounded-lg text-[11px] text-slate-400 text-center">No companies CSV loaded</div>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
            <input
              type="file"
              accept=".csv,.txt"
              ref={companiesInputRef}
              onChange={e => e.target.files?.[0] && handleFileUpload('companiesCsv', e.target.files[0])}
              className="hidden"
            />
            <button
              onClick={() => companiesInputRef.current?.click()}
              className="flex-1 px-2 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded flex items-center justify-center space-x-1"
            >
              <FileUp className="w-3.5 h-3.5 text-slate-600" />
              <span>Upload CSV</span>
            </button>
            <button
              onClick={() => setActiveModalTab('companies')}
              className="px-2 py-1.5 text-xs font-semibold bg-sky-50 hover:bg-sky-100 text-sky-700 rounded"
              title="Edit / View CSV Text"
            >
              Edit
            </button>
          </div>
        </div>

        {/* FILE 3: SHORTLISTS */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                <FileCheck2 className="w-4 h-4 text-violet-600" />
                <span>3. Shortlists CSV</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-medium">Optional</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">Columns: student_id, company_id</p>

            <div className="mt-3">
              {shortlistsParse ? (
                <div className={`p-2 rounded-lg text-xs ${shortlistsParse.summary.rejectedRows === 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                  <div className="flex items-center justify-between font-semibold">
                    <span>{shortlistsParse.relationships.length.toLocaleString()} links</span>
                    {shortlistsParse.summary.rejectedRows > 0 && <span className="text-red-600">{shortlistsParse.summary.rejectedRows} rej</span>}
                  </div>
                </div>
              ) : (
                <div className="p-2 bg-slate-50 rounded-lg text-[11px] text-slate-400 text-center">Auto-derived via CGPA</div>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
            <input
              type="file"
              accept=".csv,.txt"
              ref={shortlistsInputRef}
              onChange={e => e.target.files?.[0] && handleFileUpload('shortlistsCsv', e.target.files[0])}
              className="hidden"
            />
            <button
              onClick={() => shortlistsInputRef.current?.click()}
              className="flex-1 px-2 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded flex items-center justify-center space-x-1"
            >
              <FileUp className="w-3.5 h-3.5 text-slate-600" />
              <span>Upload CSV</span>
            </button>
            <button
              onClick={() => setActiveModalTab('shortlists')}
              className="px-2 py-1.5 text-xs font-semibold bg-violet-50 hover:bg-violet-100 text-violet-700 rounded"
              title="Edit / View CSV Text"
            >
              Edit
            </button>
          </div>
        </div>

        {/* FILE 4: ROOMS */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                <DoorClosed className="w-4 h-4 text-amber-600" />
                <span>4. Rooms CSV</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-medium">Optional</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">Columns: room_id, room_number, building, is_available</p>

            <div className="mt-3">
              {roomsParse ? (
                <div className={`p-2 rounded-lg text-xs ${roomsParse.summary.rejectedRows === 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                  <div className="flex items-center justify-between font-semibold">
                    <span>{roomsParse.rooms.length} rooms</span>
                    {roomsParse.summary.rejectedRows > 0 && <span className="text-red-600">{roomsParse.summary.rejectedRows} rej</span>}
                  </div>
                </div>
              ) : (
                <div className="p-2 bg-slate-50 rounded-lg text-[11px] text-slate-400 text-center">Using {config.roomCount} config rooms</div>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
            <input
              type="file"
              accept=".csv,.txt"
              ref={roomsInputRef}
              onChange={e => e.target.files?.[0] && handleFileUpload('roomsCsv', e.target.files[0])}
              className="hidden"
            />
            <button
              onClick={() => roomsInputRef.current?.click()}
              className="flex-1 px-2 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded flex items-center justify-center space-x-1"
            >
              <FileUp className="w-3.5 h-3.5 text-slate-600" />
              <span>Upload CSV</span>
            </button>
            <button
              onClick={() => setActiveModalTab('rooms')}
              className="px-2 py-1.5 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 rounded"
              title="Edit / View CSV Text"
            >
              Edit
            </button>
          </div>
        </div>

        {/* FILE 5: PANELS */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>5. Panels CSV</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-medium">Optional</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">Columns: panel_id, company_id, panel_name, is_available</p>

            <div className="mt-3">
              {panelsParse ? (
                <div className={`p-2 rounded-lg text-xs ${panelsParse.summary.rejectedRows === 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                  <div className="flex items-center justify-between font-semibold">
                    <span>{panelsParse.panels.length} panels</span>
                    {panelsParse.summary.rejectedRows > 0 && <span className="text-red-600">{panelsParse.summary.rejectedRows} rej</span>}
                  </div>
                </div>
              ) : (
                <div className="p-2 bg-slate-50 rounded-lg text-[11px] text-slate-400 text-center">Auto-derived via Tier</div>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
            <input
              type="file"
              accept=".csv,.txt"
              ref={panelsInputRef}
              onChange={e => e.target.files?.[0] && handleFileUpload('panelsCsv', e.target.files[0])}
              className="hidden"
            />
            <button
              onClick={() => panelsInputRef.current?.click()}
              className="flex-1 px-2 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded flex items-center justify-center space-x-1"
            >
              <FileUp className="w-3.5 h-3.5 text-slate-600" />
              <span>Upload CSV</span>
            </button>
            <button
              onClick={() => setActiveModalTab('panels')}
              className="px-2 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded"
              title="Edit / View CSV Text"
            >
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* CSV Direct Text Editor */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Direct CSV Text Editor & Inspector</span>
          </div>

          {/* Sub-tabs for each CSV */}
          <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveModalTab('students')}
              className={`px-2.5 py-1 rounded-md transition ${activeModalTab === 'students' ? 'bg-white text-indigo-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Students
            </button>
            <button
              onClick={() => setActiveModalTab('companies')}
              className={`px-2.5 py-1 rounded-md transition ${activeModalTab === 'companies' ? 'bg-white text-sky-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Companies
            </button>
            <button
              onClick={() => setActiveModalTab('shortlists')}
              className={`px-2.5 py-1 rounded-md transition ${activeModalTab === 'shortlists' ? 'bg-white text-violet-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Shortlists
            </button>
            <button
              onClick={() => setActiveModalTab('rooms')}
              className={`px-2.5 py-1 rounded-md transition ${activeModalTab === 'rooms' ? 'bg-white text-amber-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Rooms
            </button>
            <button
              onClick={() => setActiveModalTab('panels')}
              className={`px-2.5 py-1 rounded-md transition ${activeModalTab === 'panels' ? 'bg-white text-emerald-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Panels
            </button>
          </div>
        </div>

        <div>
          <textarea
            rows={6}
            value={
              activeModalTab === 'students'
                ? rawTexts.studentsCsv
                : activeModalTab === 'companies'
                ? rawTexts.companiesCsv
                : activeModalTab === 'shortlists'
                ? rawTexts.shortlistsCsv
                : activeModalTab === 'rooms'
                ? rawTexts.roomsCsv
                : rawTexts.panelsCsv
            }
            onChange={e => {
              const val = e.target.value;
              const key: keyof RawCsvPayloads =
                activeModalTab === 'students'
                  ? 'studentsCsv'
                  : activeModalTab === 'companies'
                  ? 'companiesCsv'
                  : activeModalTab === 'shortlists'
                  ? 'shortlistsCsv'
                  : activeModalTab === 'rooms'
                  ? 'roomsCsv'
                  : 'panelsCsv';
              setRawTexts(prev => ({ ...prev, [key]: val }));
            }}
            placeholder={`Paste or edit ${activeModalTab}.csv content here...`}
            className="w-full p-3 font-mono text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 text-slate-800"
          />
        </div>
      </div>

      {/* Dataset Consistency & Mismatch Handling Box */}
      {hasCountMismatch && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start space-x-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="font-bold block text-amber-950">Configuration vs. Imported Record Count Discrepancy</strong>
              <span>
                System configuration expects: <strong>{config.studentCount} students, {config.companyCount} companies, {config.roomCount} rooms</strong>.
                <br />
                Imported CSV contains: <strong>{stagedValidation.summary.studentCount} students, {stagedValidation.summary.companyCount} companies, {stagedValidation.summary.roomCount} rooms</strong>.
              </span>
            </div>
          </div>
          <button
            onClick={syncConfigWithImportedCounts}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-lg shadow-xs transition"
          >
            Sync Config to Match CSV
          </button>
        </div>
      )}

      {/* Validation Errors & Warnings Summary */}
      {stagedValidation.summary.errors.length > 0 && (
        <div className="bg-red-950/40 border border-red-500/40 text-red-200 p-4 rounded-xl space-y-2 shadow-md">
          <div className="flex items-center space-x-2">
            <XCircle className="w-5 h-5 text-red-400" />
            <strong className="text-sm font-semibold text-red-300">
              CSV Validation Violations ({stagedValidation.summary.errors.length} errors found)
            </strong>
          </div>
          <div className="max-h-40 overflow-y-auto pr-2 space-y-1">
            {stagedValidation.summary.errors.map((err, idx) => (
              <div key={idx} className="text-xs flex items-center justify-between bg-red-900/30 p-1.5 rounded border border-red-800/40">
                <span className="font-mono text-[11px] text-red-300 uppercase">[{err.file}.csv &bull; Row {err.row}]</span>
                <span className="text-red-100 flex-1 ml-3">{err.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dataset Summary & Apply Button */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Imported Dataset Validation Summary</h4>
          <div className="flex items-center flex-wrap gap-3 mt-1.5 text-xs text-slate-600">
            <span className="flex items-center space-x-1">
              <span className="font-semibold text-slate-900">{stagedValidation.summary.studentCount.toLocaleString()}</span> Students
            </span>
            <span>&bull;</span>
            <span className="flex items-center space-x-1">
              <span className="font-semibold text-slate-900">{stagedValidation.summary.companyCount}</span> Companies
            </span>
            <span>&bull;</span>
            <span className="flex items-center space-x-1">
              <span className="font-semibold text-slate-900">{stagedValidation.summary.shortlistCount.toLocaleString()}</span> Shortlists
            </span>
            <span>&bull;</span>
            <span className="flex items-center space-x-1">
              <span className="font-semibold text-slate-900">{stagedValidation.summary.roomCount}</span> Rooms
            </span>
            <span>&bull;</span>
            <span className="flex items-center space-x-1">
              <span className="font-semibold text-slate-900">{stagedValidation.summary.panelCount}</span> Panels
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
          >
            Clear Staged CSVs
          </button>
          <button
            onClick={handleApplyImport}
            disabled={!stagedValidation.summary.isValid || isGenerating}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center space-x-2 cursor-pointer disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Scheduling...' : 'Apply & Generate Schedule'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
