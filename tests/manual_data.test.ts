import {
  addCompanyRecord,
  addPanelRecord,
  addRoomRecord,
  addShortlistRecord,
  addStudentRecord,
  deleteCompanyRecord,
  deletePanelRecord,
  deleteRoomRecord,
  deleteStudentRecord,
  removeShortlistRecord,
  updateCompanyRecord,
  updatePanelRecord,
  updateRoomRecord,
  updateStudentRecord,
  validateCompanyRecord,
  validatePanelRecord,
  validateRoomRecord,
  validateShortlistRelationship,
  validateStudentRecord,
} from '../src/engine/recordManager';
import { generatePlacementDataset, Dataset } from '../src/engine/dataGenerator';
import { SchedulingEngine } from '../src/engine/scheduler';
import { validateSchedule } from '../src/engine/validator';
import { calculateMetrics } from '../src/engine/metricsEngine';
import { DEFAULT_PLACEMENT_CONFIG } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

console.log('====================================================');
console.log('STARTING MANUAL DATA MANAGEMENT TEST SUITE (MODULE 9)');
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
    process.exitCode = 1;
  }
}

const baseDataset: Dataset = generatePlacementDataset(DEFAULT_PLACEMENT_CONFIG);

// -----------------------------------------------------------------------------
// TEST 1: Student Creation with Valid Parameters
// -----------------------------------------------------------------------------
runTest('Student creation with valid parameters succeeds and appends correctly', () => {
  const res = addStudentRecord(baseDataset, {
    name: 'Aarav Patel',
    cgpa: 9.35,
    branch: 'CS',
    email: 'aarav.patel@campus.edu',
  });

  assert(!res.error, `Expected no error, got: ${res.error}`);
  assert(res.student !== undefined, 'Expected student object returned');
  assert(res.student?.name === 'Aarav Patel', 'Name must match');
  assert(res.student?.cgpa === 9.35, 'CGPA must match');
  assert(res.dataset.students.length === baseDataset.students.length + 1, 'Student count must increment');
  assert(res.dataset.students.some(s => s.id === res.student!.id), 'New student must exist in dataset');
});

// -----------------------------------------------------------------------------
// TEST 2: Student Creation Rejects Duplicate ID
// -----------------------------------------------------------------------------
runTest('Student creation rejects duplicate ID', () => {
  const existingId = baseDataset.students[0].id;
  const res = addStudentRecord(baseDataset, {
    id: existingId,
    name: 'Duplicate Student',
    cgpa: 8.5,
  });

  assert(res.error !== undefined, 'Must return error for duplicate student ID');
  assert(res.error!.includes('already assigned'), `Error should mention duplicate ID, got: ${res.error}`);
});

// -----------------------------------------------------------------------------
// TEST 3: Student Creation Rejects Invalid CGPA (< 0 or > 10)
// -----------------------------------------------------------------------------
runTest('Student creation rejects out-of-range CGPA', () => {
  const resNegative = addStudentRecord(baseDataset, {
    name: 'Negative CGPA',
    cgpa: -1.5,
  });
  assert(resNegative.error !== undefined, 'Must reject negative CGPA');

  const resOver = addStudentRecord(baseDataset, {
    name: 'Excessive CGPA',
    cgpa: 11.2,
  });
  assert(resOver.error !== undefined, 'Must reject CGPA > 10.0');
});

// -----------------------------------------------------------------------------
// TEST 4: Student Edit Updates Fields Correctly
// -----------------------------------------------------------------------------
runTest('Student edit updates fields and maintains integrity', () => {
  const targetStudent = baseDataset.students[0];
  const res = updateStudentRecord(baseDataset, targetStudent.id, {
    name: 'Updated Name VIP',
    cgpa: 9.95,
    branch: 'IT',
  });

  assert(!res.error, `Expected no error on update, got: ${res.error}`);
  const updated = res.dataset.students.find(s => s.id === targetStudent.id);
  assert(updated?.name === 'Updated Name VIP', 'Name must update');
  assert(updated?.cgpa === 9.95, 'CGPA must update');
  assert(updated?.branch === 'IT', 'Branch must update');
});

// -----------------------------------------------------------------------------
// TEST 5: Student Deletion Removes Student and Cleans Company Shortlists
// -----------------------------------------------------------------------------
runTest('Student deletion removes student and purges company shortlist references', () => {
  const targetStudent = baseDataset.students[0];
  const companyWithShortlist = baseDataset.companies.find(c =>
    c.shortlistedStudentIds.includes(targetStudent.id)
  );

  const res = deleteStudentRecord(baseDataset, targetStudent.id);
  assert(!res.error, `Expected no error, got: ${res.error}`);
  assert(!res.dataset.students.some(s => s.id === targetStudent.id), 'Student must be removed from list');

  if (companyWithShortlist) {
    const updatedComp = res.dataset.companies.find(c => c.id === companyWithShortlist.id);
    assert(
      !updatedComp?.shortlistedStudentIds.includes(targetStudent.id),
      'Company shortlist must not contain deleted student'
    );
  }
});

// -----------------------------------------------------------------------------
// TEST 6: Company Creation with Valid Parameters
// -----------------------------------------------------------------------------
runTest('Company creation with valid parameters initializes panels and attaches to dataset', () => {
  const res = addCompanyRecord(baseDataset, {
    name: 'Stripe Global',
    tier: 1,
    minCgpa: 8.75,
    panelCount: 3,
  });

  assert(!res.error, `Expected no error, got: ${res.error}`);
  assert(res.company?.name === 'Stripe Global', 'Company name must match');
  assert(res.company?.panels.length === 3, 'Panels must equal requested panelCount');
  assert(res.dataset.companies.length === baseDataset.companies.length + 1, 'Company count must increment');
});

// -----------------------------------------------------------------------------
// TEST 7: Company Creation Rejects Invalid Tier
// -----------------------------------------------------------------------------
runTest('Company creation rejects invalid tier numbers', () => {
  const val = validateCompanyRecord(
    { name: 'Invalid Tier Corp', tier: 4 as any, minCgpa: 7.0 },
    baseDataset.companies
  );
  assert(!val.isValid, 'Tier 4 must be invalid');
  assert(val.errors.some(e => e.includes('tier')), 'Must return tier error');
});

// -----------------------------------------------------------------------------
// TEST 8: Company Creation Rejects Duplicate ID
// -----------------------------------------------------------------------------
runTest('Company creation rejects duplicate ID', () => {
  const existingId = baseDataset.companies[0].id;
  const res = addCompanyRecord(baseDataset, {
    id: existingId,
    name: 'Duplicate Firm',
    tier: 2,
    minCgpa: 7.5,
  });

  assert(res.error !== undefined, 'Must reject duplicate company ID');
});

// -----------------------------------------------------------------------------
// TEST 9: Company Edit Updates Tier, Min CGPA, Name
// -----------------------------------------------------------------------------
runTest('Company edit updates parameters accurately', () => {
  const target = baseDataset.companies[0];
  const res = updateCompanyRecord(baseDataset, target.id, {
    name: 'Google Quantum Labs',
    tier: 1,
    minCgpa: 9.2,
  });

  assert(!res.error, `Expected no error, got: ${res.error}`);
  const updated = res.dataset.companies.find(c => c.id === target.id);
  assert(updated?.name === 'Google Quantum Labs', 'Name updated');
  assert(updated?.tier === 1, 'Tier updated');
  assert(updated?.minCgpa === 9.2, 'Min CGPA updated');
});

// -----------------------------------------------------------------------------
// TEST 10: Company Deletion Cascades to Student Shortlists
// -----------------------------------------------------------------------------
runTest('Company deletion cascades safely to student shortlistedCompanyIds', () => {
  const target = baseDataset.companies[0];
  const res = deleteCompanyRecord(baseDataset, target.id);

  assert(!res.error, `Expected no error, got: ${res.error}`);
  assert(!res.dataset.companies.some(c => c.id === target.id), 'Company must be removed');
  for (const s of res.dataset.students) {
    assert(!s.shortlistedCompanyIds.includes(target.id), 'Student shortlists must not contain deleted company');
  }
});

// -----------------------------------------------------------------------------
// TEST 11: Shortlist Link Creation
// -----------------------------------------------------------------------------
runTest('Shortlist creation links student and company bidirectionally', () => {
  // Find a student not shortlisted for company 0
  const comp = baseDataset.companies[0];
  const student = baseDataset.students.find(s => !s.shortlistedCompanyIds.includes(comp.id))!;

  const res = addShortlistRecord(baseDataset, student.id, comp.id);
  assert(!res.error, `Expected no error, got: ${res.error}`);

  const updatedStudent = res.dataset.students.find(s => s.id === student.id)!;
  const updatedComp = res.dataset.companies.find(c => c.id === comp.id)!;

  assert(updatedStudent.shortlistedCompanyIds.includes(comp.id), 'Student must contain company in shortlists');
  assert(updatedComp.shortlistedStudentIds.includes(student.id), 'Company must contain student in shortlists');
});

// -----------------------------------------------------------------------------
// TEST 12: Shortlist Duplicate Prevention
// -----------------------------------------------------------------------------
runTest('Shortlist creation rejects duplicate link', () => {
  const student = baseDataset.students.find(s => s.shortlistedCompanyIds.length > 0)!;
  const existingCompId = student.shortlistedCompanyIds[0];

  const res = addShortlistRecord(baseDataset, student.id, existingCompId);
  assert(res.error !== undefined, 'Must reject duplicate shortlist link');
  assert(res.error!.includes('already shortlisted'), 'Error mentions already shortlisted');
});

// -----------------------------------------------------------------------------
// TEST 13: Shortlist Non-Existent Entity Check
// -----------------------------------------------------------------------------
runTest('Shortlist rejects invalid student ID or company ID', () => {
  const resInvalidStudent = addShortlistRecord(baseDataset, 999999, baseDataset.companies[0].id);
  assert(resInvalidStudent.error !== undefined, 'Must reject invalid student ID');

  const resInvalidComp = addShortlistRecord(baseDataset, baseDataset.students[0].id, 999999);
  assert(resInvalidComp.error !== undefined, 'Must reject invalid company ID');
});

// -----------------------------------------------------------------------------
// TEST 14: Shortlist CGPA Cutoff Warning
// -----------------------------------------------------------------------------
runTest('Shortlist produces warning when student CGPA is below company cutoff', () => {
  // Create high-cutoff company
  const highCutoffComp = baseDataset.companies.find(c => c.minCgpa >= 8.5) || baseDataset.companies[0];
  const lowCgpaStudent = baseDataset.students.find(
    s => s.cgpa < highCutoffComp.minCgpa && !s.shortlistedCompanyIds.includes(highCutoffComp.id)
  );

  if (lowCgpaStudent) {
    const res = addShortlistRecord(baseDataset, lowCgpaStudent.id, highCutoffComp.id);
    assert(!res.error, 'Should succeed with warning');
    assert(res.warning !== undefined, 'Must produce cutoff warning');
    assert(res.warning!.includes('below'), 'Warning states below cutoff');
  }
});

// -----------------------------------------------------------------------------
// TEST 15: Shortlist Removal Unlinks Student and Company
// -----------------------------------------------------------------------------
runTest('Shortlist removal unlinks student and company bidirectionally', () => {
  const student = baseDataset.students.find(s => s.shortlistedCompanyIds.length > 0)!;
  const compId = student.shortlistedCompanyIds[0];

  const res = removeShortlistRecord(baseDataset, student.id, compId);
  assert(!res.error, `Expected no error, got: ${res.error}`);

  const updatedStudent = res.dataset.students.find(s => s.id === student.id)!;
  const updatedComp = res.dataset.companies.find(c => c.id === compId)!;

  assert(!updatedStudent.shortlistedCompanyIds.includes(compId), 'Student must no longer have company');
  assert(!updatedComp.shortlistedStudentIds.includes(student.id), 'Company must no longer have student');
});

// -----------------------------------------------------------------------------
// TEST 16: Room Creation with Valid Parameters
// -----------------------------------------------------------------------------
runTest('Room creation adds unique room venue to dataset', () => {
  const res = addRoomRecord(baseDataset, {
    roomNumber: 'TECH-AUDITORIUM',
    building: 'Innovation Block',
  });

  assert(!res.error, `Expected no error, got: ${res.error}`);
  assert(res.room?.roomNumber === 'TECH-AUDITORIUM', 'Room number matches');
  assert(res.dataset.rooms.length === baseDataset.rooms.length + 1, 'Room count increments');
});

// -----------------------------------------------------------------------------
// TEST 17: Room Creation Rejects Duplicate Room Number
// -----------------------------------------------------------------------------
runTest('Room creation rejects duplicate room number case-insensitively', () => {
  const existing = baseDataset.rooms[0].roomNumber;
  const res = addRoomRecord(baseDataset, {
    roomNumber: existing.toLowerCase(),
    building: 'Block B',
  });

  assert(res.error !== undefined, 'Must reject duplicate room identifier');
  assert(res.error!.includes('already registered'), 'Error states room already registered');
});

// -----------------------------------------------------------------------------
// TEST 18: Room Edit and Deletion
// -----------------------------------------------------------------------------
runTest('Room edit and deletion work reliably', () => {
  const target = baseDataset.rooms[0];
  const editRes = updateRoomRecord(baseDataset, target.id, {
    roomNumber: 'ROOM-RENOVATED',
    isAvailable: false,
  });

  assert(!editRes.error, 'Room edit should succeed');
  assert(editRes.dataset.rooms.find(r => r.id === target.id)?.roomNumber === 'ROOM-RENOVATED', 'Updated room number');

  const delRes = deleteRoomRecord(editRes.dataset, target.id);
  assert(!delRes.error, 'Room delete should succeed');
  assert(!delRes.dataset.rooms.some(r => r.id === target.id), 'Room removed from dataset');
});

// -----------------------------------------------------------------------------
// TEST 19: Panel Creation, Update, and Deletion
// -----------------------------------------------------------------------------
runTest('Panel creation, update, and deletion within company', () => {
  const comp = baseDataset.companies[0];
  const initialPanelsCount = comp.panels.length;

  const addRes = addPanelRecord(baseDataset, comp.id, 'Specialized AI Panel');
  assert(!addRes.error, 'Panel add succeeds');
  const compWithPanel = addRes.dataset.companies.find(c => c.id === comp.id)!;
  assert(compWithPanel.panels.length === initialPanelsCount + 1, 'Panel count incremented');

  const addedPanel = addRes.panel!;
  const updateRes = updatePanelRecord(addRes.dataset, addedPanel.id, {
    panelName: 'Executive AI Panel',
    isAvailable: false,
  });
  assert(!updateRes.error, 'Panel update succeeds');

  const delRes = deletePanelRecord(updateRes.dataset, addedPanel.id);
  assert(!delRes.error, 'Panel deletion succeeds');
  const compAfterDel = delRes.dataset.companies.find(c => c.id === comp.id)!;
  assert(compAfterDel.panels.length === initialPanelsCount, 'Panel count restored');
});

// -----------------------------------------------------------------------------
// TEST 20: Real-World 4,000-Student Scale Test with Edits & Regeneration
// -----------------------------------------------------------------------------
runTest('4,000-Student Scale Dataset: Record modifications, scheduler re-run, and 0-clash verification', () => {
  const largeConfig = {
    ...DEFAULT_PLACEMENT_CONFIG,
    studentCount: 4000,
    companyCount: 40,
    roomCount: 30,
    panelCount: 3,
  };

  const largeDataset = generatePlacementDataset(largeConfig);
  assert(largeDataset.students.length === 4000, 'Must generate 4000 students');

  // Perform multiple manual edits
  const step1 = addStudentRecord(largeDataset, {
    name: 'Top Rank Candidate 4001',
    cgpa: 9.99,
    branch: 'CS',
  });
  assert(!step1.error, 'Must add 4001st candidate');

  const step2 = addCompanyRecord(step1.dataset, {
    name: 'Mirai Frontier AI',
    tier: 1,
    minCgpa: 9.0,
    panelCount: 4,
  });
  assert(!step2.error, 'Must add new company');

  const step3 = addShortlistRecord(step2.dataset, step1.student!.id, step2.company!.id);
  assert(!step3.error, 'Must link shortlist');

  // Run scheduler on modified 4,000+ dataset
  const engine = new SchedulingEngine();
  const startTime = Date.now();
  const result = engine.generateSchedule(step3.dataset);
  const durationMs = Date.now() - startTime;

  assert(result.interviews.length > 0, 'Schedule must generate interviews');
  assert(durationMs < 60000, `Scheduler must complete within 60000ms (took ${durationMs}ms)`);

  // Validate schedule for 0 clashes
  const validation = validateSchedule(result.interviews, step3.dataset);
  assert(validation.isValid, `Schedule must be valid with 0 clashes: ${validation.issues.map(i => i.message).join(', ')}`);
  assert(validation.criticalIssuesCount === 0, 'Must have 0 critical clashes');

  // Verify metrics
  const metrics = calculateMetrics(result.interviews, step3.dataset);
  assert(metrics.totalScheduledInterviews === result.interviews.length, 'Metrics count matches');
  assert(metrics.roomUtilizationRate > 0, 'Utilization must be positive');
});

console.log('\n====================================================');
console.log(`MANUAL DATA MANAGEMENT TEST SUITE COMPLETED: ${passedTests}/${totalTests} PASSED`);
console.log('====================================================\n');
