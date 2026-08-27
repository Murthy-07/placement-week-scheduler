import { calculateMetrics } from '../src/engine/metricsEngine';
import { Dataset } from '../src/engine/dataGenerator';
import { Interview, Student, Company, Room, Timeslot } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

console.log('====================================================');
console.log('STARTING METRICS ENGINE TEST SUITE (MODULE 4)');
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

// Minimal mock helper
function createMockDataset(): Dataset {
  const students: Student[] = [
    { id: 1, name: 'Alice', email: 'alice@test.com', cgpa: 9.0, branch: 'CS', shortlistedCompanyIds: [101, 102], status: 'AVAILABLE' },
    { id: 2, name: 'Bob', email: 'bob@test.com', cgpa: 8.5, branch: 'IT', shortlistedCompanyIds: [101], status: 'AVAILABLE' },
  ];

  const companies: Company[] = [
    {
      id: 101,
      name: 'Alpha Corp',
      minCgpa: 8.0,
      tier: 1,
      interviewDurationMinutes: 30,
      panels: [{ id: 201, companyId: 101, panelName: 'Panel 1', isAvailable: true }],
      shortlistedStudentIds: [1, 2],
    },
    {
      id: 102,
      name: 'Beta Tech',
      minCgpa: 8.0,
      tier: 2,
      interviewDurationMinutes: 30,
      panels: [{ id: 202, companyId: 102, panelName: 'Panel 1', isAvailable: true }],
      shortlistedStudentIds: [1],
    },
  ];

  const rooms: Room[] = [
    { id: 301, roomNumber: 'R-1', building: 'Block-A', isAvailable: true },
    { id: 302, roomNumber: 'R-2', building: 'Block-A', isAvailable: true },
  ];

  const timeslots: Timeslot[] = [
    { id: 1, dayId: 1, slotIndex: 1, startTime: '09:00', endTime: '09:30', displayTime: '09:00 AM - 09:30 AM' },
    { id: 2, dayId: 1, slotIndex: 2, startTime: '09:30', endTime: '10:00', displayTime: '09:30 AM - 10:00 AM' },
    { id: 3, dayId: 1, slotIndex: 3, startTime: '10:00', endTime: '10:30', displayTime: '10:00 AM - 10:30 AM' },
    { id: 4, dayId: 1, slotIndex: 4, startTime: '10:30', endTime: '11:00', displayTime: '10:30 AM - 11:00 AM' },
    { id: 5, dayId: 2, slotIndex: 1, startTime: '09:00', endTime: '09:30', displayTime: '09:00 AM - 09:30 AM' },
  ];

  return {
    seed: 123,
    students,
    companies,
    rooms,
    placementDays: [
      { id: 1, dayNumber: 1, date: '2026-09-01', description: 'Day 1' },
      { id: 2, dayNumber: 2, date: '2026-09-02', description: 'Day 2' },
    ],
    timeslots,
  };
}

// -----------------------------------------------------------------------------
// TEST 1: Empty Schedule (Zero Scheduled)
// -----------------------------------------------------------------------------
runTest('Empty Schedule Edge Case: No NaN, No Division by Zero', () => {
  const dataset = createMockDataset();
  const metrics = calculateMetrics([], dataset);

  assert(metrics.totalShortlists === 3, 'Total shortlists must be 3 (Alice=2, Bob=1)');
  assert(metrics.totalScheduledInterviews === 0, 'Total scheduled must be 0');
  assert(metrics.totalUnscheduledInterviews === 3, 'Total unscheduled must be 3');
  assert(metrics.schedulingSuccessRate === 0, 'Success rate must be 0%');
  assert(metrics.roomUtilizationRate === 0, 'Room utilization must be 0%');
  assert(!isNaN(metrics.schedulingSuccessRate), 'Success rate must not be NaN');
  assert(!isNaN(metrics.roomUtilizationRate), 'Room utilization must not be NaN');
  assert(metrics.studentClashes === 0, 'Student clashes must be 0');
  assert(metrics.averageWaitTimeMinutes === 0, 'Avg wait time must be 0 for empty schedule');
});

// -----------------------------------------------------------------------------
// TEST 2: Single Scheduled Interview
// -----------------------------------------------------------------------------
runTest('Single Scheduled Interview Metric Accuracy', () => {
  const dataset = createMockDataset();
  const interviews: Interview[] = [
    {
      id: 1,
      studentId: 1,
      studentName: 'Alice',
      studentCgpa: 9.0,
      studentBranch: 'CS',
      companyId: 101,
      companyName: 'Alpha Corp',
      companyTier: 1,
      panelId: 201,
      panelName: 'Panel 1',
      roomId: 301,
      roomNumber: 'R-1',
      timeslotId: 1,
      dayId: 1,
      dayNumber: 1,
      startTime: '09:00',
      endTime: '09:30',
      durationMinutes: 30,
      status: 'SCHEDULED',
    },
  ];

  const metrics = calculateMetrics(interviews, dataset);

  assert(metrics.totalScheduledInterviews === 1, 'Total scheduled must be 1');
  assert(metrics.totalUnscheduledInterviews === 2, 'Total unscheduled must be 2');
  assert(metrics.totalCapacitySlots === 10, 'Total capacity slots must be 2 rooms * 5 slots = 10');
  assert(metrics.roomUtilizationRate === 10.0, 'Room utilization must be 1/10 = 10.0%');
  assert(metrics.schedulingSuccessRate === 33.3, 'Success rate must be 1/3 = 33.3%');
  assert(metrics.averageWaitTimeMinutes === 0, 'Single interview has no waiting gap');
});

// -----------------------------------------------------------------------------
// TEST 3: Student Waiting Time with Adjacent Interviews (0 min gap)
// -----------------------------------------------------------------------------
runTest('Student with Adjacent Interviews: 0 min Idle Wait', () => {
  const dataset = createMockDataset();
  const interviews: Interview[] = [
    {
      id: 1,
      studentId: 1,
      studentName: 'Alice',
      studentCgpa: 9.0,
      studentBranch: 'CS',
      companyId: 101,
      companyName: 'Alpha Corp',
      companyTier: 1,
      panelId: 201,
      panelName: 'Panel 1',
      roomId: 301,
      roomNumber: 'R-1',
      timeslotId: 1,
      dayId: 1,
      dayNumber: 1,
      startTime: '09:00',
      endTime: '09:30',
      durationMinutes: 30,
      status: 'SCHEDULED',
    },
    {
      id: 2,
      studentId: 1,
      studentName: 'Alice',
      studentCgpa: 9.0,
      studentBranch: 'CS',
      companyId: 102,
      companyName: 'Beta Tech',
      companyTier: 2,
      panelId: 202,
      panelName: 'Panel 1',
      roomId: 302,
      roomNumber: 'R-2',
      timeslotId: 2,
      dayId: 1,
      dayNumber: 1,
      startTime: '09:30',
      endTime: '10:00',
      durationMinutes: 30,
      status: 'SCHEDULED',
    },
  ];

  const metrics = calculateMetrics(interviews, dataset);
  assert(metrics.averageWaitTimeMinutes === 0, 'Back-to-back adjacent interviews have 0 waiting gap');
  assert(metrics.maxWaitTimeMinutes === 0, 'Max wait time must be 0');
});

// -----------------------------------------------------------------------------
// TEST 4: Student Waiting Time with 60-Minute Gap
// -----------------------------------------------------------------------------
runTest('Student with 60-Minute Gap (09:00-09:30 and 10:30-11:00)', () => {
  const dataset = createMockDataset();
  const interviews: Interview[] = [
    {
      id: 1,
      studentId: 1,
      studentName: 'Alice',
      studentCgpa: 9.0,
      studentBranch: 'CS',
      companyId: 101,
      companyName: 'Alpha Corp',
      companyTier: 1,
      panelId: 201,
      panelName: 'Panel 1',
      roomId: 301,
      roomNumber: 'R-1',
      timeslotId: 1,
      dayId: 1,
      dayNumber: 1,
      startTime: '09:00',
      endTime: '09:30',
      durationMinutes: 30,
      status: 'SCHEDULED',
    },
    {
      id: 2,
      studentId: 1,
      studentName: 'Alice',
      studentCgpa: 9.0,
      studentBranch: 'CS',
      companyId: 102,
      companyName: 'Beta Tech',
      companyTier: 2,
      panelId: 202,
      panelName: 'Panel 1',
      roomId: 302,
      roomNumber: 'R-2',
      timeslotId: 4,
      dayId: 1,
      dayNumber: 1,
      startTime: '10:30',
      endTime: '11:00',
      durationMinutes: 30,
      status: 'SCHEDULED',
    },
  ];

  const metrics = calculateMetrics(interviews, dataset);
  assert(metrics.averageWaitTimeMinutes === 60, `Avg wait time must be exactly 60 min, got ${metrics.averageWaitTimeMinutes}`);
  assert(metrics.maxWaitTimeMinutes === 60, `Max wait time must be exactly 60 min, got ${metrics.maxWaitTimeMinutes}`);
});

// -----------------------------------------------------------------------------
// TEST 5: Inter-Day Interviews (No false wait gap across different days)
// -----------------------------------------------------------------------------
runTest('Interviews on Different Days (Day 1 vs Day 2): Gaps Not Aggregated', () => {
  const dataset = createMockDataset();
  const interviews: Interview[] = [
    {
      id: 1,
      studentId: 1,
      studentName: 'Alice',
      studentCgpa: 9.0,
      studentBranch: 'CS',
      companyId: 101,
      companyName: 'Alpha Corp',
      companyTier: 1,
      panelId: 201,
      panelName: 'Panel 1',
      roomId: 301,
      roomNumber: 'R-1',
      timeslotId: 1,
      dayId: 1,
      dayNumber: 1,
      startTime: '09:00',
      endTime: '09:30',
      durationMinutes: 30,
      status: 'SCHEDULED',
    },
    {
      id: 2,
      studentId: 1,
      studentName: 'Alice',
      studentCgpa: 9.0,
      studentBranch: 'CS',
      companyId: 102,
      companyName: 'Beta Tech',
      companyTier: 2,
      panelId: 202,
      panelName: 'Panel 1',
      roomId: 302,
      roomNumber: 'R-2',
      timeslotId: 5,
      dayId: 2, // Day 2
      dayNumber: 2,
      startTime: '09:00',
      endTime: '09:30',
      durationMinutes: 30,
      status: 'SCHEDULED',
    },
  ];

  const metrics = calculateMetrics(interviews, dataset);
  assert(metrics.averageWaitTimeMinutes === 0, 'Interviews on separate days must have 0 same-day wait gap');
});

// -----------------------------------------------------------------------------
// TEST 6: Clash Metric Accuracy upon Intentional Violations
// -----------------------------------------------------------------------------
runTest('Clash Metric Accuracy upon Intentional Violations', () => {
  const dataset = createMockDataset();

  // Synthetic schedule with intentional clashes:
  // 1. Student 1 has two interviews at timeslot 1
  // 2. Room 301 has two interviews at timeslot 1
  // 3. Panel 201 has two interviews at timeslot 1
  const clashingInterviews: Interview[] = [
    {
      id: 1,
      studentId: 1,
      studentName: 'Alice',
      studentCgpa: 9.0,
      studentBranch: 'CS',
      companyId: 101,
      companyName: 'Alpha Corp',
      companyTier: 1,
      panelId: 201,
      panelName: 'Panel 1',
      roomId: 301,
      roomNumber: 'R-1',
      timeslotId: 1,
      dayId: 1,
      dayNumber: 1,
      startTime: '09:00',
      endTime: '09:30',
      durationMinutes: 30,
      status: 'SCHEDULED',
    },
    {
      id: 2,
      studentId: 1, // Student Clash!
      studentName: 'Alice',
      studentCgpa: 9.0,
      studentBranch: 'CS',
      companyId: 101,
      companyName: 'Alpha Corp',
      companyTier: 1,
      panelId: 201, // Panel Clash!
      panelName: 'Panel 1',
      roomId: 301, // Room Clash!
      roomNumber: 'R-1',
      timeslotId: 1,
      dayId: 1,
      dayNumber: 1,
      startTime: '09:00',
      endTime: '09:30',
      durationMinutes: 30,
      status: 'SCHEDULED',
    },
  ];

  const metrics = calculateMetrics(clashingInterviews, dataset);
  assert(metrics.studentClashes === 1, 'Must detect exactly 1 student clash');
  assert(metrics.roomConflicts === 1, 'Must detect exactly 1 room conflict');
  assert(metrics.panelConflicts === 1, 'Must detect exactly 1 panel conflict');
});

// -----------------------------------------------------------------------------
// TEST 7: Zero Room Capacity Edge Case (Rooms = 0)
// -----------------------------------------------------------------------------
runTest('Zero Room Capacity: Safe Handling without NaN', () => {
  const dataset = createMockDataset();
  dataset.rooms = []; // 0 rooms

  const metrics = calculateMetrics([], dataset);
  assert(metrics.totalCapacitySlots === 0, 'Capacity should be 0');
  assert(metrics.roomUtilizationRate === 0, 'Room utilization must be 0% when capacity is 0');
  assert(!isNaN(metrics.roomUtilizationRate), 'Must not be NaN');
});

// -----------------------------------------------------------------------------
// TEST 8: Replan Churn Parameter Pass-Through
// -----------------------------------------------------------------------------
runTest('Replan Churn and Disruption Count Telemetry Pass-Through', () => {
  const dataset = createMockDataset();
  const metrics = calculateMetrics([], dataset, 3.75, 2);

  assert(metrics.replanChurnPercentage === 3.75, 'replanChurnPercentage must be passed through');
  assert(metrics.activeDisruptionsCount === 2, 'activeDisruptionsCount must be passed through');
});

console.log('\n====================================================');
console.log(`METRICS TEST RUN COMPLETE: ${passedTests} / ${totalTests} PASSED`);
console.log('====================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
