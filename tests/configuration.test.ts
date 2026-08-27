import { generatePlacementDataset } from '../src/engine/dataGenerator';
import { SchedulingEngine } from '../src/engine/scheduler';
import { validateSchedule } from '../src/engine/validator';
import { calculateMetrics } from '../src/engine/metricsEngine';
import { DEFAULT_PLACEMENT_CONFIG, validatePlacementConfig } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

console.log('====================================================');
console.log('STARTING CONFIGURATION TEST SUITE (MODULE 6)');
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
// TEST 1: Default Configuration Parity with Assignment A
// -----------------------------------------------------------------------------
runTest('Default Configuration Parity (800 students, 35 companies, 20 rooms, 5 days)', () => {
  const d1 = generatePlacementDataset(42);
  const d2 = generatePlacementDataset(DEFAULT_PLACEMENT_CONFIG);

  assert(d1.students.length === 800, 'Student count must be 800');
  assert(d1.companies.length === 35, 'Company count must be 35');
  assert(d1.rooms.length === 20, 'Room count must be 20');
  assert(d1.placementDays.length === 5, 'Placement days must be 5');
  assert(d1.timeslots.length === 80, 'Timeslots must be 80');

  // Exact equivalence
  assert(d1.students.length === d2.students.length, 'Dataset student length parity');
  assert(d1.students[0].name === d2.students[0].name, 'Student 1 name identity');
  assert(d1.students[0].cgpa === d2.students[0].cgpa, 'Student 1 cgpa identity');

  const engine = new SchedulingEngine();
  const res = engine.generateSchedule(d1);
  const val = validateSchedule(res.interviews, d1);
  const met = calculateMetrics(res.interviews, d1);

  assert(val.isValid, 'Default schedule must be valid');
  assert(met.studentClashes === 0, 'Zero student clashes');
  assert(met.roomConflicts === 0, 'Zero room conflicts');
  assert(met.panelConflicts === 0, 'Zero panel conflicts');
  assert(met.totalScheduledInterviews === 1600, 'Scheduled interviews must equal 1600');
  assert(met.totalCapacitySlots === 1600, 'Total capacity slots must equal 1600 (20 rooms * 80 slots)');
});

// -----------------------------------------------------------------------------
// TEST 2: Scaled Cohort (2,000 Students)
// -----------------------------------------------------------------------------
runTest('Scaled Cohort (2000 students) Execution and Bottleneck Reporting', () => {
  const dataset = generatePlacementDataset({ studentCount: 2000, seed: 123 });
  assert(dataset.students.length === 2000, 'Must generate exactly 2000 students');

  const engine = new SchedulingEngine();
  const res = engine.generateSchedule(dataset);
  const val = validateSchedule(res.interviews, dataset);
  const met = calculateMetrics(res.interviews, dataset);

  assert(val.isValid, 'Scaled 2000-student schedule must maintain 100% hard constraints');
  assert(met.studentClashes === 0, 'Zero student clashes with 2000 students');
  assert(met.roomConflicts === 0, 'Zero room conflicts with 2000 students');
  assert(met.panelConflicts === 0, 'Zero panel conflicts with 2000 students');
  assert(res.unscheduledReports.length > 0, 'Should accurately track and report unscheduled candidates under high load');
});

// -----------------------------------------------------------------------------
// TEST 3: Scaled Recruiter Catalogue (50 Companies)
// -----------------------------------------------------------------------------
runTest('Scaled Recruiter Catalogue (50 companies)', () => {
  const dataset = generatePlacementDataset({ companyCount: 50, seed: 42 });
  assert(dataset.companies.length === 50, 'Must generate exactly 50 companies');

  const engine = new SchedulingEngine();
  const res = engine.generateSchedule(dataset);
  const val = validateSchedule(res.interviews, dataset);

  assert(val.isValid, '50-company schedule must be valid with 0 critical errors');
  assert(res.interviews.length > 0, 'Must schedule interviews across 50 companies');
});

// -----------------------------------------------------------------------------
// TEST 4: Scaled Room Capacity (30 Rooms across Blocks)
// -----------------------------------------------------------------------------
runTest('Scaled Room Capacity (30 rooms) Expansion & Utilization', () => {
  const dataset = generatePlacementDataset({ roomCount: 30, seed: 42 });
  assert(dataset.rooms.length === 30, 'Must generate exactly 30 rooms');
  assert(dataset.rooms.some(r => r.roomNumber.startsWith('B-')), 'Must expand into Academic Block B');

  const engine = new SchedulingEngine();
  const res = engine.generateSchedule(dataset);
  const val = validateSchedule(res.interviews, dataset);
  const met = calculateMetrics(res.interviews, dataset);

  assert(val.isValid, '30-room schedule must be valid');
  assert(met.totalCapacitySlots === 30 * 80, `Capacity must be 2400 (was ${met.totalCapacitySlots})`);
  assert(met.roomConflicts === 0, 'Zero room conflicts in 30 rooms');
});

// -----------------------------------------------------------------------------
// TEST 5: Extended Placement Horizon (10 Placement Days)
// -----------------------------------------------------------------------------
runTest('Extended Placement Horizon (10 placement days = 160 timeslots)', () => {
  const dataset = generatePlacementDataset({ placementDays: 10, seed: 42 });
  assert(dataset.placementDays.length === 10, 'Must generate 10 placement days');
  assert(dataset.timeslots.length === 160, '10 days * 16 slots/day = 160 timeslots');

  const engine = new SchedulingEngine();
  const res = engine.generateSchedule(dataset);
  const val = validateSchedule(res.interviews, dataset);
  const met = calculateMetrics(res.interviews, dataset);

  assert(val.isValid, '10-day schedule must be valid');
  assert(met.totalCapacitySlots === 20 * 160, 'Capacity must equal 3200 slots');
  assert(met.studentClashes === 0, 'Zero student clashes across 10 days');
});

// -----------------------------------------------------------------------------
// TEST 6: Custom Working Hours (08:00 to 18:00, 10 hours)
// -----------------------------------------------------------------------------
runTest('Custom Working Hours (08:00 to 18:00 = 20 slots/day)', () => {
  const dataset = generatePlacementDataset({
    startTime: '08:00',
    endTime: '18:00',
    interviewDurationMinutes: 30,
    placementDays: 5,
  });

  assert(dataset.timeslots.length === 100, '5 days * 20 slots/day = 100 timeslots');
  assert(dataset.timeslots[0].startTime === '08:00', 'First slot starts at 08:00');
  assert(dataset.timeslots[19].endTime === '18:00', 'Last slot of Day 1 ends at 18:00');

  const engine = new SchedulingEngine();
  const res = engine.generateSchedule(dataset);
  const val = validateSchedule(res.interviews, dataset);

  assert(val.isValid, 'Custom hours schedule must be valid');
});

// -----------------------------------------------------------------------------
// TEST 7: Custom Duration & Breaks (45-min interviews with 15-min breaks)
// -----------------------------------------------------------------------------
runTest('Custom Duration and Break Handling (45m slot + 15m break = 1 hour step)', () => {
  const dataset = generatePlacementDataset({
    startTime: '09:00',
    endTime: '17:00',
    interviewDurationMinutes: 45,
    breakDurationMinutes: 15,
    placementDays: 3,
  });

  // 09:00-17:00 is 8 hours -> 8 slots per day * 3 days = 24 slots
  assert(dataset.timeslots.length === 24, `Expected 24 slots, got ${dataset.timeslots.length}`);
  assert(dataset.timeslots[0].startTime === '09:00' && dataset.timeslots[0].endTime === '09:45', 'Slot 0 is 09:00 - 09:45');
  assert(dataset.timeslots[1].startTime === '10:00' && dataset.timeslots[1].endTime === '10:45', 'Slot 1 is 10:00 - 10:45 (after 15m break)');

  const engine = new SchedulingEngine();
  const res = engine.generateSchedule(dataset);
  const val = validateSchedule(res.interviews, dataset);

  assert(val.isValid, 'Custom duration/break schedule must be valid');
});

// -----------------------------------------------------------------------------
// TEST 8: Configuration Validation Engine
// -----------------------------------------------------------------------------
runTest('Configuration Parameter Validation Rules', () => {
  const valid = validatePlacementConfig({ studentCount: 500, roomCount: 15, startTime: '09:00', endTime: '17:00' });
  assert(valid.isValid, 'Valid partial config should pass');

  const invalidStudents = validatePlacementConfig({ studentCount: -10 });
  assert(!invalidStudents.isValid, 'Negative students must fail');

  const invalidTime = validatePlacementConfig({ startTime: '18:00', endTime: '09:00' });
  assert(!invalidTime.isValid, 'End time before start time must fail');

  const invalidDuration = validatePlacementConfig({ interviewDurationMinutes: 0 });
  assert(!invalidDuration.isValid, 'Zero interview duration must fail');
});

// -----------------------------------------------------------------------------
// TEST 9: Determinism across Configured Datasets
// -----------------------------------------------------------------------------
runTest('Deterministic PRNG Repetition with Custom Configuration', () => {
  const cfg = { studentCount: 1200, companyCount: 40, roomCount: 25, seed: 98765 };
  const d1 = generatePlacementDataset(cfg);
  const d2 = generatePlacementDataset(cfg);

  assert(d1.students.length === d2.students.length, 'Students length match');
  assert(d1.students[50].name === d2.students[50].name, 'Student index 50 match');
  assert(d1.students[50].cgpa === d2.students[50].cgpa, 'Student index 50 CGPA match');
  assert(d1.companies[15].shortlistedStudentIds.join(',') === d2.companies[15].shortlistedStudentIds.join(','), 'Shortlists match exactly');
});

console.log('\n====================================================');
console.log(`CONFIGURATION SUITE RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
console.log('====================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
