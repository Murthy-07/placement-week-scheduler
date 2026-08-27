import { generatePlacementDataset } from '../src/engine/dataGenerator';
import { SchedulingEngine } from '../src/engine/scheduler';
import { validateSchedule } from '../src/engine/validator';
import { calculateMetrics } from '../src/engine/metricsEngine';
import { Company, Student, Room, Timeslot, PlacementDay } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

console.log('====================================================');
console.log('STARTING PLACEMENT SCHEDULER TEST SUITE (MODULE 2)');
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
// TEST 1: Default Dataset (Seed 42) Constraint Verification
// -----------------------------------------------------------------------------
runTest('Default Dataset (Seed 42) - Hard Invariants & 0 Clashes', () => {
  const dataset = generatePlacementDataset(42);
  const engine = new SchedulingEngine();
  const result = engine.generateSchedule(dataset);
  const validation = validateSchedule(result.interviews, dataset);
  const metrics = calculateMetrics(result.interviews, dataset);

  assert(validation.isValid === true, 'Schedule must be valid with 0 critical issues');
  assert(validation.criticalIssuesCount === 0, 'Critical issues count must be 0');
  assert(metrics.studentClashes === 0, 'Student clashes must be 0');
  assert(metrics.roomConflicts === 0, 'Room conflicts must be 0');
  assert(metrics.panelConflicts === 0, 'Panel conflicts must be 0');
  assert(result.interviews.length > 0, 'Should schedule interviews successfully');
  assert(metrics.roomUtilizationRate > 50, 'Room utilization should be substantial (>50%)');
});

// -----------------------------------------------------------------------------
// TEST 2: Multi-Seed Robustness (Seeds 101, 777, 9999, 12345)
// -----------------------------------------------------------------------------
runTest('Multi-Seed Invariant Integrity across Diverse Seeds', () => {
  const testSeeds = [101, 777, 9999, 12345];
  const engine = new SchedulingEngine();

  for (const seed of testSeeds) {
    const dataset = generatePlacementDataset(seed);
    const result = engine.generateSchedule(dataset);
    const validation = validateSchedule(result.interviews, dataset);
    const metrics = calculateMetrics(result.interviews, dataset);

    assert(validation.isValid, `Seed ${seed} must produce 0 critical issues`);
    assert(metrics.studentClashes === 0, `Seed ${seed} student clashes must be 0`);
    assert(metrics.roomConflicts === 0, `Seed ${seed} room conflicts must be 0`);
    assert(metrics.panelConflicts === 0, `Seed ${seed} panel conflicts must be 0`);
  }
});

// -----------------------------------------------------------------------------
// TEST 3: CGPA Eligibility Enforcement
// -----------------------------------------------------------------------------
runTest('Strict CGPA Cutoff Enforcement (No Ineligible Student Scheduled)', () => {
  const dataset = generatePlacementDataset(42);
  const engine = new SchedulingEngine();
  const result = engine.generateSchedule(dataset);
  const companyMap = new Map(dataset.companies.map(c => [c.id, c]));

  for (const interview of result.interviews) {
    const comp = companyMap.get(interview.companyId)!;
    assert(
      interview.studentCgpa >= comp.minCgpa,
      `Student ${interview.studentName} (CGPA ${interview.studentCgpa}) scheduled with ${comp.name} requiring min CGPA ${comp.minCgpa}`
    );
  }
});

// -----------------------------------------------------------------------------
// TEST 4: Explicit Tracking of Unscheduled Candidates with Reasons
// -----------------------------------------------------------------------------
runTest('Explicit Unscheduled Candidate Reports and Classification', () => {
  const dataset = generatePlacementDataset(42);
  const engine = new SchedulingEngine();
  const result = engine.generateSchedule(dataset);

  assert(result.unscheduledReports.length > 0, 'Should track unscheduled reports for unplaced shortlists');
  for (const report of result.unscheduledReports) {
    assert(Boolean(report.studentName), 'Report must contain studentName');
    assert(Boolean(report.companyName), 'Report must contain companyName');
    assert(Boolean(report.reason), 'Report must contain failure reason');
    assert(Boolean(report.conflictingResource), 'Report must contain conflictingResource tag');
  }
});

// -----------------------------------------------------------------------------
// TEST 5: Synthetic High-Conflict Scenario (1 Student Shortlisted by 20 Companies)
// -----------------------------------------------------------------------------
runTest('High-Conflict Stress Test: 1 Student with 20 Shortlists', () => {
  const dataset = generatePlacementDataset(42);
  const superstarStudent: Student = {
    id: 9999,
    name: 'Superstar Candidate',
    email: 'superstar@university.edu',
    cgpa: 9.99,
    branch: 'CS',
    shortlistedCompanyIds: dataset.companies.slice(0, 20).map(c => c.id),
    status: 'AVAILABLE',
  };

  // Add student to dataset and to each company's shortlist
  dataset.students.push(superstarStudent);
  for (const compId of superstarStudent.shortlistedCompanyIds) {
    const comp = dataset.companies.find(c => c.id === compId)!;
    comp.shortlistedStudentIds.push(superstarStudent.id);
  }

  const engine = new SchedulingEngine();
  const result = engine.generateSchedule(dataset);
  const validation = validateSchedule(result.interviews, dataset);

  assert(validation.isValid, 'High-conflict schedule must remain completely valid with 0 clashes');

  // Verify all interviews for this superstar are in distinct timeslots
  const superstarInterviews = result.interviews.filter(i => i.studentId === superstarStudent.id);
  const bookedSlots = new Set(superstarInterviews.map(i => i.timeslotId));
  assert(
    bookedSlots.size === superstarInterviews.length,
    'All superstar interviews must be in strictly distinct timeslots'
  );
});

// -----------------------------------------------------------------------------
// TEST 6: Constrained Room Scarcity (Only 2 Rooms for All Companies)
// -----------------------------------------------------------------------------
runTest('Resource Scarcity Test: Restricted to 2 Rooms', () => {
  const dataset = generatePlacementDataset(42);
  // Keep only 2 rooms
  dataset.rooms = dataset.rooms.slice(0, 2);

  const engine = new SchedulingEngine();
  const result = engine.generateSchedule(dataset);
  const validation = validateSchedule(result.interviews, dataset);
  const metrics = calculateMetrics(result.interviews, dataset);

  assert(validation.isValid, 'Schedule under room scarcity must have 0 clashes');
  assert(metrics.roomConflicts === 0, 'No two interviews can share a room in the same slot');
  assert(result.interviews.length <= 2 * dataset.timeslots.length, 'Total interviews cannot exceed 2 * 80 = 160');
});

// -----------------------------------------------------------------------------
// TEST 7: Impossible Scheduling (Student with CGPA below cutoff)
// -----------------------------------------------------------------------------
runTest('Impossible Scheduling: Low CGPA Student on High-Cutoff Company', () => {
  const dataset = generatePlacementDataset(42);
  const lowCgpaStudent: Student = {
    id: 8888,
    name: 'Low CGPA Candidate',
    email: 'lowcgpa@university.edu',
    cgpa: 5.5,
    branch: 'ME',
    shortlistedCompanyIds: [1], // Google Core Systems (Min CGPA 8.75)
    status: 'AVAILABLE',
  };

  dataset.students.push(lowCgpaStudent);
  const googleComp = dataset.companies.find(c => c.id === 1)!;
  googleComp.shortlistedStudentIds.push(lowCgpaStudent.id);

  const engine = new SchedulingEngine();
  const result = engine.generateSchedule(dataset);

  const scheduled = result.interviews.some(i => i.studentId === lowCgpaStudent.id && i.companyId === 1);
  assert(!scheduled, 'Ineligible student must NOT be scheduled');

  const report = result.unscheduledReports.find(r => r.studentId === lowCgpaStudent.id && r.companyId === 1);
  assert(Boolean(report), 'Unscheduled report must be recorded for ineligible student');
  assert(report?.conflictingResource === 'CGPA_MISMATCH', 'Conflicting resource must be CGPA_MISMATCH');
});

// -----------------------------------------------------------------------------
// TEST 8: Timeslot Boundaries & Duration Conformity
// -----------------------------------------------------------------------------
runTest('Timeslot Boundaries and 30-Minute Duration Conformity', () => {
  const dataset = generatePlacementDataset(42);
  const engine = new SchedulingEngine();
  const result = engine.generateSchedule(dataset);
  const timeslotMap = new Map(dataset.timeslots.map(t => [t.id, t]));

  for (const item of result.interviews) {
    const slot = timeslotMap.get(item.timeslotId)!;
    assert(Boolean(slot), 'Timeslot must exist in dataset');
    assert(item.startTime === slot.startTime, 'Interview start time must match slot start time');
    assert(item.endTime === slot.endTime, 'Interview end time must match slot end time');
    assert(item.dayId === slot.dayId, 'Day ID must match slot day ID');
  }
});

console.log('\n====================================================');
console.log(`TEST RUN COMPLETE: ${passedTests} / ${totalTests} PASSED`);
console.log('====================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
