import { generatePlacementDataset } from '../src/engine/dataGenerator';
import { SchedulingEngine } from '../src/engine/scheduler';
import { ReplanningEngine } from '../src/engine/replanningEngine';
import { validateSchedule } from '../src/engine/validator';
import { calculateMetrics } from '../src/engine/metricsEngine';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

console.log('====================================================');
console.log('STARTING REPLANNING ENGINE TEST SUITE (MODULE 3)');
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

// Common setup
const dataset = generatePlacementDataset(42);
const scheduler = new SchedulingEngine();
const initialResult = scheduler.generateSchedule(dataset);
const replanner = new ReplanningEngine();

// -----------------------------------------------------------------------------
// TEST 1: Scenario 1 - Panel / Company Delay Handling & Invariant Verification
// -----------------------------------------------------------------------------
runTest('Scenario 1: Panel Delay (120 min delay on Day 1)', () => {
  const panelId = dataset.companies[0].panels[0].id;
  const { updatedInterviews, replanResult } = replanner.handlePanelDelay(
    initialResult.interviews,
    dataset,
    { panelId, dayId: 1, delayMinutes: 120, startHour: 9 }
  );

  const validation = validateSchedule(updatedInterviews, dataset);
  const metrics = calculateMetrics(updatedInterviews, dataset);

  assert(validation.isValid, 'Delayed schedule must remain 100% valid with 0 critical issues');
  assert(metrics.studentClashes === 0, 'No student clashes allowed after panel delay');
  assert(metrics.roomConflicts === 0, 'No room conflicts allowed after panel delay');
  assert(metrics.panelConflicts === 0, 'No panel conflicts allowed after panel delay');

  // Verify interviews for this panel on Day 1 starting before 11:00 were rescheduled or cancelled
  for (const item of updatedInterviews) {
    if (item.panelId === panelId && item.dayId === 1 && item.status === 'SCHEDULED') {
      const [h, m] = item.startTime.split(':').map(Number);
      assert(h * 60 + m >= 9 * 60 + 120, `Interview at ${item.startTime} must not start before 11:00 AM on Day 1`);
    }
  }

  // Verify churn is localized
  assert(replanResult.churnPercentage < 5.0, `Churn percentage (${replanResult.churnPercentage}%) must be localized under 5%`);
  assert(replanResult.changes.length > 0, 'Should record granular before/after diff changes');
});

// -----------------------------------------------------------------------------
// TEST 2: Scenario 2 - Panel Dropout Handling & Sibling Reallocation
// -----------------------------------------------------------------------------
runTest('Scenario 2: Panel Dropout (Dropout of Google Panel A)', () => {
  const panelId = dataset.companies[0].panels[0].id;
  const { updatedInterviews, replanResult } = replanner.handlePanelDropout(
    initialResult.interviews,
    dataset,
    { panelId, reason: 'Interviewer medical emergency' }
  );

  const validation = validateSchedule(updatedInterviews, dataset);
  const metrics = calculateMetrics(updatedInterviews, dataset);

  assert(validation.isValid, 'Post-dropout schedule must remain valid');
  assert(metrics.studentClashes === 0, 'Zero student clashes after panel dropout');
  assert(metrics.roomConflicts === 0, 'Zero room conflicts after panel dropout');
  assert(metrics.panelConflicts === 0, 'Zero panel conflicts after panel dropout');

  // Verify no active interview remains on the dropped panel
  const droppedInterviews = updatedInterviews.filter(
    i => i.panelId === panelId && (i.status === 'SCHEDULED' || i.status === 'MOVED')
  );
  assert(droppedInterviews.length === 0, 'No active interviews should remain assigned to dropped panel');

  // Verify diff explains old panel vs new panel
  for (const ch of replanResult.changes) {
    assert(Boolean(ch.studentName), 'Change must include student name');
    assert(Boolean(ch.companyName), 'Change must include company name');
    assert(Boolean(ch.reason), 'Change must explain reason');
  }
});

// -----------------------------------------------------------------------------
// TEST 3: Scenario 3 - Student Withdrawal & Resource Release
// -----------------------------------------------------------------------------
runTest('Scenario 3: Student Withdrawal (10 Top Candidates Withdraw)', () => {
  const withdrawStudentIds = dataset.students.slice(0, 10).map(s => s.id);
  const { updatedInterviews, replanResult } = replanner.handleStudentWithdrawal(
    initialResult.interviews,
    dataset,
    { studentIds: withdrawStudentIds, reason: 'Accepted International Tech Offer' }
  );

  const validation = validateSchedule(updatedInterviews, dataset);
  const metrics = calculateMetrics(updatedInterviews, dataset);

  assert(validation.isValid, 'Schedule must remain valid');
  assert(metrics.studentClashes === 0, '0 student clashes');

  // Verify all interviews for withdrawn students are CANCELLED
  const withdrawnActive = updatedInterviews.filter(
    i => withdrawStudentIds.includes(i.studentId) && (i.status === 'SCHEDULED' || i.status === 'MOVED')
  );
  assert(withdrawnActive.length === 0, 'All interviews for withdrawn students must be cancelled');

  // Verify other students are NOT disturbed
  assert(replanResult.movedInterviewsCount === 0, 'Withdrawing students should not move other students');
  assert(replanResult.cancelledInterviewsCount > 0, 'Cancelled interviews must match withdrawn candidate load');
});

// -----------------------------------------------------------------------------
// TEST 4: Scenario 4 - Room Outage & Zero-Time Relocation
// -----------------------------------------------------------------------------
runTest('Scenario 4: Room Outage (Room A-101 AC Breakdown on Day 1)', () => {
  const roomId = dataset.rooms[0].id;
  const { updatedInterviews, replanResult } = replanner.handleRoomUnavailable(
    initialResult.interviews,
    dataset,
    { roomId, dayId: 1, reason: 'AC failure and electrical short-circuit' }
  );

  const validation = validateSchedule(updatedInterviews, dataset);
  const metrics = calculateMetrics(updatedInterviews, dataset);

  assert(validation.isValid, 'Post-room outage schedule must be valid');
  assert(metrics.roomConflicts === 0, '0 room conflicts after relocation');
  assert(metrics.studentClashes === 0, '0 student clashes after relocation');

  // Verify no active interview remains in Room A-101 on Day 1
  const outageInterviews = updatedInterviews.filter(
    i => i.roomId === roomId && i.dayId === 1 && (i.status === 'SCHEDULED' || i.status === 'MOVED')
  );
  assert(outageInterviews.length === 0, 'No active interviews can remain in damaged room on Day 1');

  // Verify diff explains old room vs new room
  for (const ch of replanResult.changes) {
    if (ch.status === 'MOVED') {
      assert(ch.oldRoom !== ch.newRoom || ch.oldTime !== ch.newTime, 'Diff must capture room or time shift');
    }
  }
});

// -----------------------------------------------------------------------------
// TEST 5: Scenario 5 - Combined Day-1 Crisis Stress Test
// -----------------------------------------------------------------------------
runTest('Scenario 5: Combined Day-1 Crisis (Multi-Disruption Stress Test)', () => {
  const { updatedInterviews, replanResult } = replanner.handleDay1Crisis(
    initialResult.interviews,
    dataset
  );

  const validation = validateSchedule(updatedInterviews, dataset);
  const metrics = calculateMetrics(updatedInterviews, dataset);

  assert(validation.isValid, 'Crisis schedule must satisfy all invariants with 0 critical issues');
  assert(metrics.studentClashes === 0, '0 student clashes in crisis');
  assert(metrics.roomConflicts === 0, '0 room conflicts in crisis');
  assert(metrics.panelConflicts === 0, '0 panel conflicts in crisis');

  // Measure churn
  assert(replanResult.churnPercentage < 15.0, `Combined crisis churn (${replanResult.churnPercentage}%) must be <15%`);
  assert(replanResult.changes.length > 0, 'Must contain comprehensive diff entries');
});

// -----------------------------------------------------------------------------
// TEST 6: Edge Case - Double Sequential Replanning
// -----------------------------------------------------------------------------
runTest('Edge Case: Double Sequential Replanning (Delay followed by Dropout)', () => {
  const panel1 = dataset.companies[0].panels[0].id;
  const panel2 = dataset.companies[1].panels[0].id;

  // Step 1: Delay
  const pass1 = replanner.handlePanelDelay(
    initialResult.interviews,
    dataset,
    { panelId: panel1, dayId: 1, delayMinutes: 60, startHour: 9 }
  );

  // Step 2: Dropout on top of pass1
  const pass2 = replanner.handlePanelDropout(
    pass1.updatedInterviews,
    dataset,
    { panelId: panel2, reason: 'Second recruiter dropout' }
  );

  const validation = validateSchedule(pass2.updatedInterviews, dataset);
  const metrics = calculateMetrics(pass2.updatedInterviews, dataset);

  assert(validation.isValid, 'Double replanned schedule must remain valid');
  assert(metrics.studentClashes === 0, '0 student clashes after double replan');
  assert(metrics.roomConflicts === 0, '0 room conflicts after double replan');
  assert(metrics.panelConflicts === 0, '0 panel conflicts after double replan');
});

// -----------------------------------------------------------------------------
// TEST 7: Diff Item Granularity Audit (Before/After/Reason)
// -----------------------------------------------------------------------------
runTest('Before/After Diff Contract Verification', () => {
  const panelId = dataset.companies[0].panels[0].id;
  const { replanResult } = replanner.handlePanelDelay(
    initialResult.interviews,
    dataset,
    { panelId, dayId: 1, delayMinutes: 90, startHour: 9 }
  );

  for (const ch of replanResult.changes) {
    assert(typeof ch.interviewId === 'number', 'interviewId must be a number');
    assert(typeof ch.studentName === 'string' && ch.studentName.length > 0, 'studentName must be non-empty');
    assert(typeof ch.companyName === 'string' && ch.companyName.length > 0, 'companyName must be non-empty');
    assert(typeof ch.oldTime === 'string' && ch.oldTime.length > 0, 'oldTime must be non-empty');
    assert(typeof ch.newTime === 'string' && ch.newTime.length > 0, 'newTime must be non-empty');
    assert(typeof ch.reason === 'string' && ch.reason.length > 0, 'reason must be non-empty');
  }
});

console.log('\n====================================================');
console.log(`REPLANNING TEST RUN COMPLETE: ${passedTests} / ${totalTests} PASSED`);
console.log('====================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
