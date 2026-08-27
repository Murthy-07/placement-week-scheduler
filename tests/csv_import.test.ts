import {
  buildImportedDataset,
  parseCompaniesCsv,
  parseCsvRows,
  parsePanelsCsv,
  parseRoomsCsv,
  parseShortlistsCsv,
  parseStudentsCsv,
  RawCsvPayloads,
} from '../src/engine/csvImporter';
import { SchedulingEngine } from '../src/engine/scheduler';
import { validateSchedule } from '../src/engine/validator';
import { calculateMetrics } from '../src/engine/metricsEngine';
import { DEFAULT_PLACEMENT_CONFIG } from '../src/types';
import { generatePlacementDataset } from '../src/engine/dataGenerator';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

console.log('====================================================');
console.log('STARTING CSV IMPORT & REAL DATA TEST SUITE (MODULE 8)');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] Test ${totalTests}: ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`[FAIL] Test ${totalTests}: ${name}`);
    console.error(`       Error: ${err.message}`);
  }
}

// -----------------------------------------------------------------------------
// TEST 1: Low-level CSV Row Tokenizer
// -----------------------------------------------------------------------------
runTest('parseCsvRows handles quotes, commas, escapes, and mixed line endings', () => {
  const csv = 'id,name,notes\r\n1,"Doe, John","Good candidate"\n2,"Acme, Inc.",\n';
  const rows = parseCsvRows(csv);

  assert(rows.length === 3, `Expected 3 rows, got ${rows.length}`);
  assert(rows[1][1] === 'Doe, John', 'Quoted comma must be preserved');
  assert(rows[2][1] === 'Acme, Inc.', 'Quoted company name preserved');
});

// -----------------------------------------------------------------------------
// TEST 2: Students CSV Parser Validation
// -----------------------------------------------------------------------------
runTest('parseStudentsCsv parses valid records and catches malformed data', () => {
  const validCsv = `student_id,name,cgpa,branch,email
S001,Alice Smith,9.2,CSE,alice@example.com
S002,Bob Jones,8.4,ECE,bob@example.com
S003,Charlie Brown,7.8,MECH,charlie@example.com`;

  const parsed = parseStudentsCsv(validCsv);
  assert(parsed.students.length === 3, 'Must parse 3 students');
  assert(parsed.summary.errors.length === 0, 'No errors in valid CSV');
  assert(parsed.students[0].name === 'Alice Smith', 'First student name match');
  assert(parsed.students[0].cgpa === 9.2, 'First student CGPA match');

  // Malformed test: Invalid CGPA, missing ID, and duplicate ID
  const invalidCsv = `student_id,name,cgpa,branch,email
S001,Valid Student,8.0,CSE,valid@example.com
,No ID,8.5,CSE,noid@example.com
S004,Bad CGPA,15.5,CSE,bad@example.com
S005,Negative CGPA,-2.0,CSE,neg@example.com
S001,Duplicate ID,8.0,CSE,dup@example.com`;

  const invalidParsed = parseStudentsCsv(invalidCsv);
  assert(invalidParsed.students.length === 1, 'Exactly 1 valid student parsed');
  assert(invalidParsed.summary.errors.length >= 4, `Expected at least 4 errors, got ${invalidParsed.summary.errors.length}`);
});

// -----------------------------------------------------------------------------
// TEST 3: Companies CSV Parser Validation
// -----------------------------------------------------------------------------
runTest('parseCompaniesCsv parses tiers, durations, and min_cgpa constraints', () => {
  const csv = `company_id,name,tier,min_cgpa,interview_duration
C01,Google,TIER_1,8.5,45
C02,Microsoft,DREAM,8.0,30
C03,Amazon,TIER_2,7.5,30
C04,Infosys,MASS,6.0,20`;

  const parsed = parseCompaniesCsv(csv);
  assert(parsed.companies.length === 4, 'Must parse 4 companies');
  assert(parsed.companies[0].tier === 1, 'Tier 1 mapped');
  assert(parsed.companies[1].tier === 1, 'DREAM mapped to Tier 1');
  assert(parsed.companies[2].tier === 2, 'Tier 2 mapped');
  assert(parsed.companies[3].tier === 3, 'MASS mapped to Tier 3');
  assert(parsed.companies[0].interviewDurationMinutes === 45, 'Custom duration respected');
});

// -----------------------------------------------------------------------------
// TEST 4: Referential Integrity Check in Shortlists and Panels
// -----------------------------------------------------------------------------
runTest('parseShortlistsCsv and parsePanelsCsv reject foreign keys referencing non-existent entities', () => {
  const studentIds = new Set([1, 2, 3]);
  const companyIds = new Set([10, 20]);

  const shortlistsCsv = `student_id,company_id
1,10
2,20
999,10
1,999`;

  const sParsed = parseShortlistsCsv(shortlistsCsv, studentIds, companyIds);
  assert(sParsed.relationships.length === 2, 'Must accept 2 valid relationships');
  assert(sParsed.summary.errors.length === 2, 'Must flag 2 foreign key violations');

  const panelsCsv = `panel_id,company_id,panel_name,is_available
P01,10,Panel A,true
P02,999,Ghost Panel,true`;

  const pParsed = parsePanelsCsv(panelsCsv, companyIds);
  assert(pParsed.panels.length === 1, 'Must accept 1 valid panel');
  assert(pParsed.summary.errors.length === 1, 'Must flag 1 invalid company foreign key');
});

// -----------------------------------------------------------------------------
// TEST 5: Full Imported Dataset Assembly with Fallbacks
// -----------------------------------------------------------------------------
runTest('buildImportedDataset falls back cleanly for optional files (rooms, panels, shortlists)', () => {
  const studentsCsv = `student_id,name,cgpa,branch,email
1,Student One,9.0,CSE,s1@test.com
2,Student Two,8.5,ECE,s2@test.com
3,Student Three,8.0,MECH,s3@test.com
4,Student Four,7.5,EE,s4@test.com`;

  const companiesCsv = `company_id,name,tier,min_cgpa,interview_duration
1,Tech Corp,TIER_1,8.0,30
2,Systems Inc,TIER_2,7.0,30`;

  const payloads: RawCsvPayloads = {
    studentsCsv,
    companiesCsv,
  };

  const res = buildImportedDataset(payloads, DEFAULT_PLACEMENT_CONFIG);
  assert(res.summary.isValid, 'Dataset must be valid with optional files omitted');
  assert(res.dataset !== null, 'Dataset object must be produced');
  assert(res.dataset!.students.length === 4, '4 students created');
  assert(res.dataset!.companies.length === 2, '2 companies created');
  assert(res.dataset!.rooms.length === DEFAULT_PLACEMENT_CONFIG.roomCount, 'Default rooms used');
  assert(res.summary.shortlistCount > 0, 'Auto-generated shortlists created based on CGPA');

  const engine = new SchedulingEngine();
  const schedRes = engine.generateSchedule(res.dataset!);
  const val = validateSchedule(schedRes.interviews, res.dataset!);
  assert(val.isValid, 'Schedule generated from fallback imported dataset must be valid');
});

// -----------------------------------------------------------------------------
// TEST 6: Real-World Realistic Scaled Student Imported Dataset Verification
// -----------------------------------------------------------------------------
runTest('Scaled 1,500-Student real-world CSV import schedules with 0 clashes and high throughput', () => {
  // Generate sample 1,500 student data
  const base = generatePlacementDataset({
    studentCount: 1500,
    companyCount: 30,
    roomCount: 25,
    placementDays: 5,
    startTime: '09:00',
    endTime: '17:00',
    seed: 123,
  });

  const studentsCsv =
    'student_id,name,cgpa,branch,email\n' +
    base.students.map(s => `${s.id},${s.name},${s.cgpa},${s.branch},${s.email}`).join('\n');

  const companiesCsv =
    'company_id,name,tier,min_cgpa,interview_duration\n' +
    base.companies.map(c => `${c.id},${c.name},${c.tier},${c.minCgpa},${c.interviewDurationMinutes}`).join('\n');

  const shortlistRows: string[] = ['student_id,company_id'];
  base.students.forEach(s => {
    s.shortlistedCompanyIds.forEach(cId => {
      shortlistRows.push(`${s.id},${cId}`);
    });
  });
  const shortlistsCsv = shortlistRows.join('\n');

  const roomsCsv =
    'room_id,room_number,building,is_available\n' +
    base.rooms.map(r => `${r.id},${r.roomNumber},${r.building},${r.isAvailable}`).join('\n');

  const res = buildImportedDataset(
    {
      studentsCsv,
      companiesCsv,
      shortlistsCsv,
      roomsCsv,
    },
    {
      ...DEFAULT_PLACEMENT_CONFIG,
      placementDays: 5,
      roomCount: 25,
      companyCount: 30,
      studentCount: 1500,
    }
  );

  assert(res.summary.isValid, '1,500 student CSV dataset must be valid');
  assert(res.summary.studentCount === 1500, '1,500 students verified in summary');
  assert(res.summary.companyCount === 30, '30 companies verified');
  assert(res.summary.roomCount === 25, '25 rooms verified');

  const engine = new SchedulingEngine();
  const schedRes = engine.generateSchedule(res.dataset!);
  const val = validateSchedule(schedRes.interviews, res.dataset!);
  const met = calculateMetrics(schedRes.interviews, res.dataset!);

  assert(val.isValid, '1,500 student schedule validation must pass');
  assert(met.studentClashes === 0, 'Zero student clashes in 1,500 student schedule');
  assert(met.roomConflicts === 0, 'Zero room conflicts in 1,500 student schedule');
  assert(met.panelConflicts === 0, 'Zero panel conflicts in 1,500 student schedule');
  assert(schedRes.interviews.length > 1000, `Interviews scheduled must exceed 1,000 (got ${schedRes.interviews.length})`);
});

// -----------------------------------------------------------------------------
// TEST 7: Invalid Payloads & Error Reporting Accuracy
// -----------------------------------------------------------------------------
runTest('buildImportedDataset returns errors without throwing and does not build invalid dataset', () => {
  const invalidPayloads: RawCsvPayloads = {
    studentsCsv: 'student_id,name\n1,Only Two Columns', // missing cgpa
    companiesCsv: 'company_id,name,tier\n1,No Duration,INVALID_TIER',
  };

  const res = buildImportedDataset(invalidPayloads, DEFAULT_PLACEMENT_CONFIG);
  assert(!res.summary.isValid, 'Summary must mark dataset as invalid');
  assert(res.dataset === null, 'Must not produce dataset when invalid');
  assert(res.summary.errors.length > 0, 'Errors list must be populated with specific diagnostic feedback');
});

console.log('\n====================================================');
console.log(`CSV IMPORT TEST SUITE COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
console.log('====================================================\n');
