import {
  Company,
  CompanyPanel,
  CompanyTier,
  DEFAULT_PLACEMENT_CONFIG,
  PlacementConfig,
  PlacementDay,
  Room,
  Student,
  Timeslot,
} from '../types';
import { Dataset } from './dataGenerator';

export interface CsvValidationError {
  file: 'students' | 'companies' | 'shortlists' | 'rooms' | 'panels';
  row: number;
  column?: string;
  value?: string;
  message: string;
  type: 'ERROR' | 'WARNING';
}

export interface CsvImportSummary {
  fileName: string;
  totalRows: number;
  validRows: number;
  rejectedRows: number;
  errors: CsvValidationError[];
}

export interface ImportedDatasetSummary {
  studentCount: number;
  companyCount: number;
  shortlistCount: number;
  roomCount: number;
  panelCount: number;
  isValid: boolean;
  errors: CsvValidationError[];
  warnings: CsvValidationError[];
}

export interface RawCsvPayloads {
  studentsCsv?: string;
  companiesCsv?: string;
  shortlistsCsv?: string;
  roomsCsv?: string;
  panelsCsv?: string;
}

// -----------------------------------------------------------------------------
// Robust CSV Parser (handles quoted strings, commas, trimming, CRLF/LF)
// -----------------------------------------------------------------------------
export function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuote = false;

  const text = csvText.trim();
  if (!text) return [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (insideQuote) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++;
        } else {
          insideQuote = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuote = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        currentRow.push(currentField.trim());
        if (currentRow.some(f => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some(f => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(f => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// Helper to normalize header names
function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[\s_-]+/g, '');
}

// Helper to parse ID (numeric or alphanumeric like S001 -> 1, C002 -> 2)
export function parseId(raw: string | number): number {
  if (typeof raw === 'number') return raw;
  const str = String(raw).trim();
  if (/^\d+$/.test(str)) {
    return parseInt(str, 10);
  }
  const digits = str.replace(/\D/g, '');
  if (digits.length > 0) {
    return parseInt(digits, 10);
  }
  // Fallback hash code if no digits
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}

// -----------------------------------------------------------------------------
// STUDENT CSV PARSER
// Format: student_id,name,cgpa[,branch,email]
// -----------------------------------------------------------------------------
export function parseStudentsCsv(csvText: string): {
  students: Student[];
  summary: CsvImportSummary;
} {
  const rows = parseCsvRows(csvText);
  const errors: CsvValidationError[] = [];
  const students: Student[] = [];
  const seenIds = new Set<number>();

  if (rows.length === 0) {
    return {
      students: [],
      summary: { fileName: 'students.csv', totalRows: 0, validRows: 0, rejectedRows: 0, errors: [{ file: 'students', row: 0, message: 'CSV file is empty.', type: 'ERROR' }] },
    };
  }

  const headers = rows[0].map(normalizeHeader);
  const idIdx = headers.findIndex(h => h.includes('studentid') || h === 'id' || h === 'rollno' || h === 'student');
  const nameIdx = headers.findIndex(h => h.includes('name') || h === 'fullname' || h === 'studentname');
  const cgpaIdx = headers.findIndex(h => h.includes('cgpa') || h === 'gpa' || h === 'grade');
  const branchIdx = headers.findIndex(h => h.includes('branch') || h === 'dept' || h === 'department');
  const emailIdx = headers.findIndex(h => h.includes('email') || h === 'mail');

  if (nameIdx === -1 || cgpaIdx === -1) {
    errors.push({
      file: 'students',
      row: 1,
      message: 'Missing required header columns. Must include at least "name" and "cgpa" (and optionally "student_id", "branch", "email").',
      type: 'ERROR',
    });
    return {
      students: [],
      summary: { fileName: 'students.csv', totalRows: rows.length - 1, validRows: 0, rejectedRows: rows.length - 1, errors },
    };
  }

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 0 || (row.length === 1 && !row[0])) continue;

    const rawId = idIdx !== -1 ? row[idIdx] : String(r);
    const rawName = row[nameIdx];
    const rawCgpa = row[cgpaIdx];
    const rawBranch = branchIdx !== -1 ? row[branchIdx] : 'CS';
    const rawEmail = emailIdx !== -1 ? row[emailIdx] : '';

    if (idIdx !== -1 && (!rawId || !rawId.trim())) {
      errors.push({ file: 'students', row: r + 1, column: 'student_id', value: '', message: 'Candidate student_id cannot be blank.', type: 'ERROR' });
      continue;
    }

    if (!rawName || !rawName.trim()) {
      errors.push({ file: 'students', row: r + 1, column: 'name', value: '', message: 'Candidate name is required.', type: 'ERROR' });
      continue;
    }

    const cgpa = parseFloat(rawCgpa);
    if (isNaN(cgpa) || cgpa < 0 || cgpa > 10.0) {
      errors.push({ file: 'students', row: r + 1, column: 'cgpa', value: rawCgpa, message: `Invalid CGPA "${rawCgpa}". Must be a number between 0.0 and 10.0.`, type: 'ERROR' });
      continue;
    }

    const studentId = parseId(rawId);
    if (seenIds.has(studentId)) {
      errors.push({ file: 'students', row: r + 1, column: 'student_id', value: rawId, message: `Duplicate student ID detected: ${studentId}.`, type: 'ERROR' });
      continue;
    }
    seenIds.add(studentId);

    const validBranches: Array<'CS' | 'IT' | 'ECE' | 'EE' | 'ME'> = ['CS', 'IT', 'ECE', 'EE', 'ME'];
    const branchUpper = (rawBranch || 'CS').toUpperCase() as any;
    const branch = validBranches.includes(branchUpper) ? branchUpper : 'CS';

    const email = rawEmail || `${rawName.toLowerCase().replace(/[^a-z0-9]/g, '')}${studentId}@college.edu`;

    students.push({
      id: studentId,
      name: rawName,
      email,
      cgpa: Number(cgpa.toFixed(2)),
      branch,
      shortlistedCompanyIds: [],
      status: 'AVAILABLE',
    });
  }

  return {
    students,
    summary: {
      fileName: 'students.csv',
      totalRows: rows.length - 1,
      validRows: students.length,
      rejectedRows: rows.length - 1 - students.length,
      errors,
    },
  };
}

// -----------------------------------------------------------------------------
// COMPANY CSV PARSER
// Format: company_id,name,tier,min_cgpa[,interview_duration]
// -----------------------------------------------------------------------------
export function parseCompaniesCsv(csvText: string): {
  companies: Company[];
  summary: CsvImportSummary;
} {
  const rows = parseCsvRows(csvText);
  const errors: CsvValidationError[] = [];
  const companies: Company[] = [];
  const seenIds = new Set<number>();

  if (rows.length === 0) {
    return {
      companies: [],
      summary: { fileName: 'companies.csv', totalRows: 0, validRows: 0, rejectedRows: 0, errors: [{ file: 'companies', row: 0, message: 'CSV file is empty.', type: 'ERROR' }] },
    };
  }

  const headers = rows[0].map(normalizeHeader);
  const idIdx = headers.findIndex(h => h.includes('companyid') || h === 'id' || h === 'code');
  const nameIdx = headers.findIndex(h => h.includes('name') || h === 'companyname' || h === 'firm');
  const tierIdx = headers.findIndex(h => h.includes('tier') || h === 'priority');
  const minCgpaIdx = headers.findIndex(h => h.includes('mincgpa') || h.includes('cutoff') || h === 'cgpa' || h === 'threshold');
  const durationIdx = headers.findIndex(h => h.includes('duration') || h.includes('interviewduration'));

  if (nameIdx === -1) {
    errors.push({
      file: 'companies',
      row: 1,
      message: 'Missing required header column "name" (and optionally "company_id", "tier", "min_cgpa").',
      type: 'ERROR',
    });
    return {
      companies: [],
      summary: { fileName: 'companies.csv', totalRows: rows.length - 1, validRows: 0, rejectedRows: rows.length - 1, errors },
    };
  }

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 0 || (row.length === 1 && !row[0])) continue;

    const rawId = idIdx !== -1 ? row[idIdx] : String(r);
    const rawName = row[nameIdx];
    const rawTier = tierIdx !== -1 ? row[tierIdx] : '2';
    const rawMinCgpa = minCgpaIdx !== -1 ? row[minCgpaIdx] : '7.0';
    const rawDuration = durationIdx !== -1 ? row[durationIdx] : '30';

    if (idIdx !== -1 && (!rawId || !rawId.trim())) {
      errors.push({ file: 'companies', row: r + 1, column: 'company_id', value: '', message: 'Company ID cannot be blank.', type: 'ERROR' });
      continue;
    }

    if (!rawName || !rawName.trim()) {
      errors.push({ file: 'companies', row: r + 1, column: 'name', value: '', message: 'Company name is required.', type: 'ERROR' });
      continue;
    }

    const companyId = parseId(rawId);
    if (seenIds.has(companyId)) {
      errors.push({ file: 'companies', row: r + 1, column: 'company_id', value: rawId, message: `Duplicate company ID detected: ${companyId}.`, type: 'ERROR' });
      continue;
    }
    seenIds.add(companyId);

    let tierNum: number = 2;
    const tierStr = rawTier.toUpperCase().trim();
    if (tierStr === '1' || tierStr === 'TIER_1' || tierStr === 'TIER 1' || tierStr === 'T1' || tierStr === 'DREAM' || tierStr === 'SUPER_DREAM' || tierStr === 'SUPER DREAM') {
      tierNum = 1;
    } else if (tierStr === '2' || tierStr === 'TIER_2' || tierStr === 'TIER 2' || tierStr === 'T2' || tierStr === 'CORE') {
      tierNum = 2;
    } else if (tierStr === '3' || tierStr === 'TIER_3' || tierStr === 'TIER 3' || tierStr === 'T3' || tierStr === 'MASS' || tierStr === 'OPEN') {
      tierNum = 3;
    } else {
      const parsedInt = parseInt(rawTier, 10);
      if (!isNaN(parsedInt) && (parsedInt === 1 || parsedInt === 2 || parsedInt === 3)) {
        tierNum = parsedInt;
      } else {
        errors.push({ file: 'companies', row: r + 1, column: 'tier', value: rawTier, message: `Invalid tier "${rawTier}". Tier must be 1 (Dream), 2 (Core), or 3 (Mass).`, type: 'ERROR' });
        continue;
      }
    }

    const minCgpa = parseFloat(rawMinCgpa);
    if (isNaN(minCgpa) || minCgpa < 0 || minCgpa > 10.0) {
      errors.push({ file: 'companies', row: r + 1, column: 'min_cgpa', value: rawMinCgpa, message: `Invalid minimum CGPA cutoff "${rawMinCgpa}". Must be between 0.0 and 10.0.`, type: 'ERROR' });
      continue;
    }

    const duration = parseInt(rawDuration, 10) || 30;

    companies.push({
      id: companyId,
      name: rawName,
      tier: tierNum as CompanyTier,
      minCgpa: Number(minCgpa.toFixed(2)),
      interviewDurationMinutes: duration,
      panels: [], // will be populated from panels CSV or default panels generator
      shortlistedStudentIds: [],
    });
  }

  return {
    companies,
    summary: {
      fileName: 'companies.csv',
      totalRows: rows.length - 1,
      validRows: companies.length,
      rejectedRows: rows.length - 1 - companies.length,
      errors,
    },
  };
}

// -----------------------------------------------------------------------------
// SHORTLISTS / APPLICATIONS CSV PARSER
// Format: student_id,company_id
// -----------------------------------------------------------------------------
export function parseShortlistsCsv(
  csvText: string,
  existingStudentIds?: Set<number>,
  existingCompanyIds?: Set<number>
): {
  relationships: Array<{ studentId: number; companyId: number }>;
  summary: CsvImportSummary;
} {
  const rows = parseCsvRows(csvText);
  const errors: CsvValidationError[] = [];
  const relationships: Array<{ studentId: number; companyId: number }> = [];
  const seenPairs = new Set<string>();

  if (rows.length === 0) {
    return {
      relationships: [],
      summary: { fileName: 'shortlists.csv', totalRows: 0, validRows: 0, rejectedRows: 0, errors: [{ file: 'shortlists', row: 0, message: 'CSV file is empty.', type: 'ERROR' }] },
    };
  }

  const headers = rows[0].map(normalizeHeader);
  const studentIdIdx = headers.findIndex(h => h.includes('studentid') || h === 'student' || h === 'candidate');
  const companyIdIdx = headers.findIndex(h => h.includes('companyid') || h === 'company' || h === 'firm');

  if (studentIdIdx === -1 || companyIdIdx === -1) {
    errors.push({
      file: 'shortlists',
      row: 1,
      message: 'Missing required header columns. Must include both "student_id" and "company_id".',
      type: 'ERROR',
    });
    return {
      relationships: [],
      summary: { fileName: 'shortlists.csv', totalRows: rows.length - 1, validRows: 0, rejectedRows: rows.length - 1, errors },
    };
  }

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 0 || (row.length === 1 && !row[0])) continue;

    const rawStudentId = row[studentIdIdx];
    const rawCompanyId = row[companyIdIdx];

    if (!rawStudentId || !rawCompanyId) {
      errors.push({ file: 'shortlists', row: r + 1, message: 'Both student_id and company_id are required in every row.', type: 'ERROR' });
      continue;
    }

    const studentId = parseId(rawStudentId);
    const companyId = parseId(rawCompanyId);

    // Referential check if student IDs set provided
    if (existingStudentIds && !existingStudentIds.has(studentId)) {
      errors.push({ file: 'shortlists', row: r + 1, column: 'student_id', value: rawStudentId, message: `Unknown student ID: ${rawStudentId} (not found in imported student roster).`, type: 'ERROR' });
      continue;
    }

    // Referential check if company IDs set provided
    if (existingCompanyIds && !existingCompanyIds.has(companyId)) {
      errors.push({ file: 'shortlists', row: r + 1, column: 'company_id', value: rawCompanyId, message: `Unknown company ID: ${rawCompanyId} (not found in imported company catalogue).`, type: 'ERROR' });
      continue;
    }

    const pairKey = `${studentId}_${companyId}`;
    if (seenPairs.has(pairKey)) {
      errors.push({ file: 'shortlists', row: r + 1, message: `Duplicate shortlist relationship for Student ${studentId} & Company ${companyId}.`, type: 'WARNING' });
      continue;
    }
    seenPairs.add(pairKey);

    relationships.push({ studentId, companyId });
  }

  return {
    relationships,
    summary: {
      fileName: 'shortlists.csv',
      totalRows: rows.length - 1,
      validRows: relationships.length,
      rejectedRows: rows.length - 1 - relationships.length,
      errors,
    },
  };
}

// -----------------------------------------------------------------------------
// ROOMS CSV PARSER
// Format: room_id,name/room_number,building/block[,is_available]
// -----------------------------------------------------------------------------
export function parseRoomsCsv(csvText: string): {
  rooms: Room[];
  summary: CsvImportSummary;
} {
  const rows = parseCsvRows(csvText);
  const errors: CsvValidationError[] = [];
  const rooms: Room[] = [];
  const seenIds = new Set<number>();
  const seenNumbers = new Set<string>();

  if (rows.length === 0) {
    return {
      rooms: [],
      summary: { fileName: 'rooms.csv', totalRows: 0, validRows: 0, rejectedRows: 0, errors: [{ file: 'rooms', row: 0, message: 'CSV file is empty.', type: 'ERROR' }] },
    };
  }

  const headers = rows[0].map(normalizeHeader);
  const idIdx = headers.findIndex(h => h.includes('roomid') || h === 'id');
  const numberIdx = headers.findIndex(h => h.includes('number') || h.includes('name') || h === 'room' || h === 'roomnumber');
  const buildingIdx = headers.findIndex(h => h.includes('building') || h.includes('block') || h === 'hall');
  const availIdx = headers.findIndex(h => h.includes('avail') || h === 'status');

  if (numberIdx === -1 && idIdx === -1) {
    errors.push({
      file: 'rooms',
      row: 1,
      message: 'Missing required header column. Must include "room_id" or "room_number" (and optionally "building").',
      type: 'ERROR',
    });
    return {
      rooms: [],
      summary: { fileName: 'rooms.csv', totalRows: rows.length - 1, validRows: 0, rejectedRows: rows.length - 1, errors },
    };
  }

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 0 || (row.length === 1 && !row[0])) continue;

    const rawId = idIdx !== -1 ? row[idIdx] : String(r);
    const rawNumber = numberIdx !== -1 ? row[numberIdx] : `Room-${rawId}`;
    const rawBuilding = buildingIdx !== -1 ? row[buildingIdx] : 'Academic Block A';
    const rawAvail = availIdx !== -1 ? row[availIdx] : 'true';

    if (!rawNumber) {
      errors.push({ file: 'rooms', row: r + 1, column: 'room_number', value: '', message: 'Room number is required.', type: 'ERROR' });
      continue;
    }

    const roomId = parseId(rawId);
    if (seenIds.has(roomId)) {
      errors.push({ file: 'rooms', row: r + 1, column: 'room_id', value: rawId, message: `Duplicate room ID detected: ${roomId}.`, type: 'ERROR' });
      continue;
    }
    seenIds.add(roomId);

    if (seenNumbers.has(rawNumber.toLowerCase())) {
      errors.push({ file: 'rooms', row: r + 1, column: 'room_number', value: rawNumber, message: `Duplicate room number detected: "${rawNumber}".`, type: 'WARNING' });
    }
    seenNumbers.add(rawNumber.toLowerCase());

    const isAvailable = rawAvail.toLowerCase() !== 'false' && rawAvail.toLowerCase() !== '0' && rawAvail.toLowerCase() !== 'inactive';

    rooms.push({
      id: roomId,
      roomNumber: rawNumber,
      building: rawBuilding,
      isAvailable,
    });
  }

  return {
    rooms,
    summary: {
      fileName: 'rooms.csv',
      totalRows: rows.length - 1,
      validRows: rooms.length,
      rejectedRows: rows.length - 1 - rooms.length,
      errors,
    },
  };
}

// -----------------------------------------------------------------------------
// PANELS CSV PARSER
// Format: panel_id,company_id,name/panel_name[,is_available]
// -----------------------------------------------------------------------------
export function parsePanelsCsv(
  csvText: string,
  existingCompanyIds?: Set<number>
): {
  panels: CompanyPanel[];
  summary: CsvImportSummary;
} {
  const rows = parseCsvRows(csvText);
  const errors: CsvValidationError[] = [];
  const panels: CompanyPanel[] = [];
  const seenIds = new Set<number>();

  if (rows.length === 0) {
    return {
      panels: [],
      summary: { fileName: 'panels.csv', totalRows: 0, validRows: 0, rejectedRows: 0, errors: [{ file: 'panels', row: 0, message: 'CSV file is empty.', type: 'ERROR' }] },
    };
  }

  const headers = rows[0].map(normalizeHeader);
  const idIdx = headers.findIndex(h => h.includes('panelid') || h === 'id');
  const companyIdIdx = headers.findIndex(h => h.includes('companyid') || h === 'company');
  const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('panelname') || h === 'panel');
  const availIdx = headers.findIndex(h => h.includes('avail') || h === 'status');

  if (companyIdIdx === -1 || nameIdx === -1) {
    errors.push({
      file: 'panels',
      row: 1,
      message: 'Missing required header columns. Must include both "company_id" and "name" / "panel_name".',
      type: 'ERROR',
    });
    return {
      panels: [],
      summary: { fileName: 'panels.csv', totalRows: rows.length - 1, validRows: 0, rejectedRows: rows.length - 1, errors },
    };
  }

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 0 || (row.length === 1 && !row[0])) continue;

    const rawId = idIdx !== -1 ? row[idIdx] : String(r);
    const rawCompanyId = row[companyIdIdx];
    const rawName = row[nameIdx];
    const rawAvail = availIdx !== -1 ? row[availIdx] : 'true';

    if (!rawName) {
      errors.push({ file: 'panels', row: r + 1, column: 'panel_name', value: '', message: 'Panel name is required.', type: 'ERROR' });
      continue;
    }

    const panelId = parseId(rawId);
    if (seenIds.has(panelId)) {
      errors.push({ file: 'panels', row: r + 1, column: 'panel_id', value: rawId, message: `Duplicate panel ID detected: ${panelId}.`, type: 'ERROR' });
      continue;
    }
    seenIds.add(panelId);

    const companyId = parseId(rawCompanyId);
    if (existingCompanyIds && !existingCompanyIds.has(companyId)) {
      errors.push({ file: 'panels', row: r + 1, column: 'company_id', value: rawCompanyId, message: `Unknown company ID: ${rawCompanyId} (not found in imported company catalogue).`, type: 'ERROR' });
      continue;
    }

    const isAvailable = rawAvail.toLowerCase() !== 'false' && rawAvail.toLowerCase() !== '0';

    panels.push({
      id: panelId,
      companyId,
      panelName: rawName,
      isAvailable,
    });
  }

  return {
    panels,
    summary: {
      fileName: 'panels.csv',
      totalRows: rows.length - 1,
      validRows: panels.length,
      rejectedRows: rows.length - 1 - panels.length,
      errors,
    },
  };
}

// -----------------------------------------------------------------------------
// COMPLETE DATASET ASSEMBLY & RECONCILIATION
// -----------------------------------------------------------------------------
export function buildImportedDataset(
  payload: RawCsvPayloads,
  config: PlacementConfig = DEFAULT_PLACEMENT_CONFIG
): {
  dataset: Dataset | null;
  summary: ImportedDatasetSummary;
} {
  const allErrors: CsvValidationError[] = [];
  const allWarnings: CsvValidationError[] = [];

  if (!payload.studentsCsv || !payload.studentsCsv.trim()) {
    allErrors.push({ file: 'students', row: 0, message: 'Students CSV is required for imported dataset.', type: 'ERROR' });
  }
  if (!payload.companiesCsv || !payload.companiesCsv.trim()) {
    allErrors.push({ file: 'companies', row: 0, message: 'Companies CSV is required for imported dataset.', type: 'ERROR' });
  }

  if (allErrors.length > 0) {
    return {
      dataset: null,
      summary: {
        studentCount: 0,
        companyCount: 0,
        shortlistCount: 0,
        roomCount: 0,
        panelCount: 0,
        isValid: false,
        errors: allErrors,
        warnings: [],
      },
    };
  }

  // 1. Parse Students
  const studentsRes = parseStudentsCsv(payload.studentsCsv!);
  studentsRes.summary.errors.forEach(e => (e.type === 'ERROR' ? allErrors.push(e) : allWarnings.push(e)));
  const students = studentsRes.students;
  const studentIdMap = new Map<number, Student>(students.map(s => [s.id, s]));
  const studentIdsSet = new Set<number>(students.map(s => s.id));

  // 2. Parse Companies
  const companiesRes = parseCompaniesCsv(payload.companiesCsv!);
  companiesRes.summary.errors.forEach(e => (e.type === 'ERROR' ? allErrors.push(e) : allWarnings.push(e)));
  const companies = companiesRes.companies;
  const companyIdMap = new Map<number, Company>(companies.map(c => [c.id, c]));
  const companyIdsSet = new Set<number>(companies.map(c => c.id));

  // 3. Parse Shortlists (if provided)
  let shortlistCount = 0;
  if (payload.shortlistsCsv && payload.shortlistsCsv.trim()) {
    const shortlistsRes = parseShortlistsCsv(payload.shortlistsCsv, studentIdsSet, companyIdsSet);
    shortlistsRes.summary.errors.forEach(e => (e.type === 'ERROR' ? allErrors.push(e) : allWarnings.push(e)));

    for (const rel of shortlistsRes.relationships) {
      const student = studentIdMap.get(rel.studentId);
      const company = companyIdMap.get(rel.companyId);
      if (student && company) {
        if (!student.shortlistedCompanyIds.includes(company.id)) {
          student.shortlistedCompanyIds.push(company.id);
        }
        if (!company.shortlistedStudentIds.includes(student.id)) {
          company.shortlistedStudentIds.push(student.id);
        }
        shortlistCount++;
      }
    }
  } else {
    // If no explicit shortlist CSV is supplied, compute eligibility based on minCgpa
    for (const student of students) {
      for (const company of companies) {
        if (student.cgpa >= company.minCgpa) {
          student.shortlistedCompanyIds.push(company.id);
          company.shortlistedStudentIds.push(student.id);
          shortlistCount++;
        }
      }
    }
    allWarnings.push({
      file: 'shortlists',
      row: 0,
      message: 'No separate shortlists CSV provided. Derived shortlists automatically based on CGPA thresholds.',
      type: 'WARNING',
    });
  }

  // 4. Parse Rooms (if provided, else generate required rooms from config or company count)
  let rooms: Room[] = [];
  if (payload.roomsCsv && payload.roomsCsv.trim()) {
    const roomsRes = parseRoomsCsv(payload.roomsCsv);
    roomsRes.summary.errors.forEach(e => (e.type === 'ERROR' ? allErrors.push(e) : allWarnings.push(e)));
    rooms = roomsRes.rooms;
  } else {
    const targetRooms = config.roomCount || 20;
    for (let r = 1; r <= targetRooms; r++) {
      const blockLetter = String.fromCharCode(65 + Math.floor((r - 1) / 20));
      const roomNum = 100 + ((r - 1) % 20) + 1;
      rooms.push({
        id: r,
        roomNumber: `${blockLetter}-${roomNum}`,
        building: `Academic Block ${blockLetter}`,
        isAvailable: true,
      });
    }
  }

  // 5. Parse Panels (if provided, else derive panels per company)
  let totalPanelsCount = 0;
  if (payload.panelsCsv && payload.panelsCsv.trim()) {
    const panelsRes = parsePanelsCsv(payload.panelsCsv, companyIdsSet);
    panelsRes.summary.errors.forEach(e => (e.type === 'ERROR' ? allErrors.push(e) : allWarnings.push(e)));

    for (const panel of panelsRes.panels) {
      const comp = companyIdMap.get(panel.companyId);
      if (comp) {
        comp.panels.push(panel);
        totalPanelsCount++;
      }
    }
  } else {
    // Standard tier-based panel provisioning
    let globalPanelId = 1;
    for (const company of companies) {
      const panelCount = company.tier === 1 ? 2 : company.tier === 2 ? 3 : 4;
      for (let p = 1; p <= panelCount; p++) {
        const letter = String.fromCharCode(64 + p);
        company.panels.push({
          id: globalPanelId++,
          companyId: company.id,
          panelName: `${company.name} Panel ${letter}`,
          isAvailable: true,
        });
        totalPanelsCount++;
      }
    }
  }

  // 6. Generate Timeslots & Placement Days from Config
  const placementDays: PlacementDay[] = [];
  const timeslots: Timeslot[] = [];

  const daysCount = config.placementDays || 5;
  const startTime = config.startTime || '09:00';
  const endTime = config.endTime || '17:00';
  const duration = config.interviewDurationMinutes || 30;
  const breakDuration = config.breakDurationMinutes || 0;

  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  const totalMins = endMins - startMins;
  const slotCycle = duration + breakDuration;
  const slotsPerDay = slotCycle > 0 ? Math.floor(totalMins / slotCycle) : 0;

  for (let d = 1; d <= daysCount; d++) {
    placementDays.push({
      id: d,
      dayNumber: d,
      date: `2026-09-0${d}`,
      description: `Day ${d} Interviews`,
    });

    for (let s = 0; s < slotsPerDay; s++) {
      const slotStartMins = startMins + s * slotCycle;
      const slotEndMins = slotStartMins + duration;

      const sHour = Math.floor(slotStartMins / 60);
      const sMin = slotStartMins % 60;
      const eHour = Math.floor(slotEndMins / 60);
      const eMin = slotEndMins % 60;

      const startStr = `${String(sHour).padStart(2, '0')}:${String(sMin).padStart(2, '0')}`;
      const endStr = `${String(eHour).padStart(2, '0')}:${String(eMin).padStart(2, '0')}`;

      const format12 = (h: number, m: number) => {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
      };

      const displayTime = `${format12(sHour, sMin)} - ${format12(eHour, eMin)}`;

      timeslots.push({
        id: (d - 1) * slotsPerDay + (s + 1),
        dayId: d,
        slotIndex: s,
        startTime: startStr,
        endTime: endStr,
        displayTime,
      });
    }
  }

  const isValid = allErrors.length === 0 && students.length > 0 && companies.length > 0 && rooms.length > 0;

  const dataset: Dataset | null = isValid
    ? {
        students,
        companies,
        rooms,
        placementDays,
        timeslots,
        seed: config.seed || 42,
        config: {
          ...config,
          studentCount: students.length,
          companyCount: companies.length,
          roomCount: rooms.length,
          panelCount: totalPanelsCount,
        },
      }
    : null;

  return {
    dataset,
    summary: {
      studentCount: students.length,
      companyCount: companies.length,
      shortlistCount,
      roomCount: rooms.length,
      panelCount: totalPanelsCount,
      isValid,
      errors: allErrors,
      warnings: allWarnings,
    },
  };
}

// -----------------------------------------------------------------------------
// CSV TEMPLATES GENERATOR
// -----------------------------------------------------------------------------
export const CSV_TEMPLATES = {
  students: `student_id,name,cgpa,branch,email
S001,Rahul Sharma,8.75,CS,rahul.sharma@college.edu
S002,Priya Singh,9.12,IT,priya.singh@college.edu
S003,Arjun Kumar,7.80,ECE,arjun.kumar@college.edu
S004,Sneha Patel,8.45,EE,sneha.patel@college.edu
S005,Ananya Rao,9.30,CS,ananya.rao@college.edu`,

  companies: `company_id,name,tier,min_cgpa,interview_duration
C001,Google,1,8.0,30
C002,Microsoft,1,7.5,30
C003,Amazon,2,7.0,30
C004,Goldman Sachs,1,8.5,30
C005,TCS,3,6.0,30`,

  shortlists: `student_id,company_id
S001,C001
S001,C002
S001,C003
S002,C001
S002,C004
S003,C003
S003,C005
S004,C002
S004,C005
S005,C001
S005,C004`,

  rooms: `room_id,room_number,building,is_available
A101,A-101,Academic Block A,true
A102,A-102,Academic Block A,true
A103,A-103,Academic Block A,true
B201,B-201,Academic Block B,true
B202,B-202,Academic Block B,true`,

  panels: `panel_id,company_id,panel_name,is_available
P001,C001,Google Panel A,true
P002,C001,Google Panel B,true
P003,C002,Microsoft Panel Alpha,true
P004,C003,Amazon Panel 1,true
P005,C004,Goldman Sachs Panel 1,true`,
};
