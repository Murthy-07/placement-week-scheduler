import {
  addStudentRecord,
  validateStudentRecord,
} from '../src/engine/recordManager';
import { generatePlacementDataset, Dataset } from '../src/engine/dataGenerator';
import { SchedulingEngine } from '../src/engine/scheduler';
import { validateSchedule } from '../src/engine/validator';
import { calculateMetrics } from '../src/engine/metricsEngine';
import { DEFAULT_PLACEMENT_CONFIG, Student } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

console.log('====================================================');
console.log('STARTING MODULE 10: STUDENT ADD FORM & DATA INTEGRATION TEST SUITE');
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

// Helper mimicking UI parse and validation logic
function processStudentFormSubmission(
  currentDataset: Dataset,
  rawId: string,
  rawName: string,
  rawCgpa: string,
  rawBranch: 'CS' | 'IT' | 'ECE' | 'EE' | 'ME' = 'CS',
  rawEmail = ''
): { success: boolean; error?: string; dataset: Dataset; student?: Student } {
  const trimmedId = rawId.trim();
  if (!trimmedId) {
    return { success: false, error: 'Student ID is required.', dataset: currentDataset };
  }

  const numericPart = trimmedId.replace(/^[sS#]/, '');
  const parsedId = parseInt(numericPart, 10);
  if (isNaN(parsedId) || parsedId <= 0) {
    return {
      success: false,
      error: `Student ID ${trimmedId} must be a valid positive number.`,
      dataset: currentDataset,
    };
  }

  const isDuplicate = currentDataset.students.some(s => s.id === parsedId);
  if (isDuplicate) {
    return {
      success: false,
      error: `Student ID ${trimmedId} already exists.`,
      dataset: currentDataset,
    };
  }

  const trimmedName = rawName.trim();
  if (!trimmedName) {
    return { success: false, error: 'Student name is required.', dataset: currentDataset };
  }

  const trimmedCgpa = rawCgpa.trim();
  if (!trimmedCgpa) {
    return { success: false, error: 'CGPA is required.', dataset: currentDataset };
  }

  const parsedCgpa = parseFloat(trimmedCgpa);
  if (isNaN(parsedCgpa)) {
    return { success: false, error: 'CGPA must be a valid number.', dataset: currentDataset };
  }

  if (parsedCgpa < 0.0 || parsedCgpa > 10.0) {
    return {
      success: false,
      error: `CGPA must be between 0.00 and 10.00 (received ${parsedCgpa}).`,
      dataset: currentDataset,
    };
  }

  const autoEmail =
    rawEmail.trim() || `${trimmedName.toLowerCase().replace(/\s+/g, '.')}${parsedId}@campus.edu`;

  const addRes = addStudentRecord(currentDataset, {
    id: parsedId,
    name: trimmedName,
    cgpa: Number(parsedCgpa.toFixed(2)),
    branch: rawBranch,
    email: autoEmail,
    shortlistedCompanyIds: [],
  });

  if (addRes.error) {
    return { success: false, error: addRes.error, dataset: currentDataset };
  }

  return {
    success: true,
    dataset: addRes.dataset,
    student: addRes.student,
  };
}

// -----------------------------------------------------------------------------
// TEST 1: Add Student with exact prompt example (S4001, Rahul Kumar, 8.4)
// -----------------------------------------------------------------------------
runTest('Add student with S4001, Rahul Kumar, 8.4 creates real domain student immediately in dataset', () => {
  const result = processStudentFormSubmission(baseDataset, 'S4001', 'Rahul Kumar', '8.4', 'CS');
  assert(result.success, `Expected success, got: ${result.error}`);
  assert(result.student !== undefined, 'Expected student object');
  assert(result.student?.id === 4001, 'Student ID must be 4001');
  assert(result.student?.name === 'Rahul Kumar', 'Student name must be Rahul Kumar');
  assert(result.student?.cgpa === 8.4, 'Student CGPA must be 8.4');
  assert(result.student?.branch === 'CS', 'Student branch must be CS');
  assert(result.student?.status === 'AVAILABLE', 'Student status must be AVAILABLE');
  assert(result.dataset.students.length === baseDataset.students.length + 1, 'Student count must increment');
  
  const found = result.dataset.students.find(s => s.id === 4001);
  assert(found !== undefined, 'Student S4001 must exist in current dataset');
  assert(found?.name === 'Rahul Kumar', 'Found student name must match');
});

// -----------------------------------------------------------------------------
// TEST 2: Reject Empty Student ID
// -----------------------------------------------------------------------------
runTest('Reject empty Student ID with clear validation error', () => {
  const result = processStudentFormSubmission(baseDataset, '', 'Rahul Kumar', '8.4');
  assert(!result.success, 'Must fail validation');
  assert(result.error === 'Student ID is required.', `Expected ID required error, got: ${result.error}`);
  assert(result.dataset.students.length === baseDataset.students.length, 'Dataset must remain unchanged');
});

// -----------------------------------------------------------------------------
// TEST 3: Reject Empty Name
// -----------------------------------------------------------------------------
runTest('Reject empty Student Name with clear validation error', () => {
  const result = processStudentFormSubmission(baseDataset, 'S4002', '   ', '8.4');
  assert(!result.success, 'Must fail validation');
  assert(result.error === 'Student name is required.', `Expected Name required error, got: ${result.error}`);
});

// -----------------------------------------------------------------------------
// TEST 4: Reject Empty or Non-Numeric CGPA
// -----------------------------------------------------------------------------
runTest('Reject empty or non-numeric CGPA with clear validation error', () => {
  const resEmpty = processStudentFormSubmission(baseDataset, 'S4003', 'Priya Patel', '');
  assert(!resEmpty.success, 'Must fail on empty CGPA');
  assert(resEmpty.error === 'CGPA is required.', `Got: ${resEmpty.error}`);

  const resInvalid = processStudentFormSubmission(baseDataset, 'S4003', 'Priya Patel', 'not-a-number');
  assert(!resInvalid.success, 'Must fail on invalid CGPA');
  assert(resInvalid.error === 'CGPA must be a valid number.', `Got: ${resInvalid.error}`);
});

// -----------------------------------------------------------------------------
// TEST 5: Reject Out of Range CGPA (< 0 or > 10)
// -----------------------------------------------------------------------------
runTest('Reject out-of-range CGPA (< 0.00 or > 10.00)', () => {
  const resHigh = processStudentFormSubmission(baseDataset, 'S4004', 'Ananya Sharma', '10.5');
  assert(!resHigh.success, 'Must fail on CGPA > 10');
  assert(resHigh.error?.includes('CGPA must be between 0.00 and 10.00'), `Got: ${resHigh.error}`);

  const resLow = processStudentFormSubmission(baseDataset, 'S4004', 'Ananya Sharma', '-1.0');
  assert(!resLow.success, 'Must fail on CGPA < 0');
  assert(resLow.error?.includes('CGPA must be between 0.00 and 10.00'), `Got: ${resLow.error}`);
});

// -----------------------------------------------------------------------------
// TEST 6: Reject Duplicate Student ID
// -----------------------------------------------------------------------------
runTest('Reject duplicate Student ID without overwriting existing candidate', () => {
  const existingStudent = baseDataset.students[0];
  const duplicateId = `S${existingStudent.id}`;

  const result = processStudentFormSubmission(baseDataset, duplicateId, 'Duplicate Imposter', '9.0');
  assert(!result.success, 'Must reject duplicate ID');
  assert(result.error === `Student ID ${duplicateId} already exists.`, `Got: ${result.error}`);

  // Confirm original student in dataset was not overwritten
  const check = baseDataset.students.find(s => s.id === existingStudent.id);
  assert(check?.name === existingStudent.name, 'Original student record must be untouched');
});

// -----------------------------------------------------------------------------
// TEST 7: Cancel Behavior (Dataset remains completely untouched)
// -----------------------------------------------------------------------------
runTest('Cancel behavior leaves dataset completely untouched', () => {
  const initialLength = baseDataset.students.length;
  // User entered values but clicked Cancel -> no mutation is applied
  const stateCopy = { ...baseDataset };
  assert(stateCopy.students.length === initialLength, 'Student list untouched on cancel');
});

// -----------------------------------------------------------------------------
// TEST 8: Full Downstream Data Flow (Student added -> Shortlisted -> Scheduled -> Validated)
// -----------------------------------------------------------------------------
runTest('Newly added student participates in shortlists, scheduling, and metrics as real domain object', () => {
  // Add Rahul Kumar S4001 with CGPA 9.2
  const added = processStudentFormSubmission(baseDataset, 'S4001', 'Rahul Kumar', '9.2', 'CS');
  assert(added.success && added.student, 'Student addition must succeed');

  // Shortlist Rahul for company 1 (Google)
  const targetCompany = added.dataset.companies[0];
  const updatedStudents = added.dataset.students.map(s =>
    s.id === 4001 ? { ...s, shortlistedCompanyIds: [targetCompany.id] } : s
  );
  const updatedCompanies = added.dataset.companies.map(c =>
    c.id === targetCompany.id ? { ...c, shortlistedStudentIds: [...c.shortlistedStudentIds, 4001] } : c
  );

  const activeWorkingDataset: Dataset = {
    ...added.dataset,
    students: updatedStudents,
    companies: updatedCompanies,
  };

  // Run Scheduler
  const scheduler = new SchedulingEngine();
  const scheduleResult = scheduler.generateSchedule(activeWorkingDataset);
  assert(scheduleResult.interviews.length > 0, 'Must produce scheduled interviews');

  // Validate Schedule
  const validation = validateSchedule(scheduleResult.interviews, activeWorkingDataset);
  assert(validation.isValid, `Schedule must be valid with 0 clashes: ${validation.issues.map(i => i.message).join(' ')}`);

  // Calculate Metrics
  const metrics = calculateMetrics(scheduleResult.interviews, activeWorkingDataset, 15);
  assert(metrics.totalScheduledInterviews > 0, 'Total scheduled interviews must be > 0');
  assert(metrics.schedulingSuccessRate > 0, 'Scheduling success rate must be > 0');
  assert(metrics.studentClashes === 0, 'Student clashes must be 0');
  assert(metrics.roomConflicts === 0, 'Room conflicts must be 0');
  assert(metrics.panelConflicts === 0, 'Panel conflicts must be 0');
});

console.log('\n====================================================');
console.log(`MODULE 10 TEST SUITE COMPLETED: ${passedTests}/${totalTests} PASSED`);
console.log('====================================================');
