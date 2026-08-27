import { generatePlacementDataset, Dataset } from '../src/engine/dataGenerator';
import { SchedulingEngine } from '../src/engine/scheduler';
import { calculateMetrics } from '../src/engine/metricsEngine';
import { Interview } from '../src/types';

console.log('====================================================');
console.log('STARTING INDEPENDENT METRICS CROSS-CHECK (MODULE 4)');
console.log('====================================================\n');

const dataset = generatePlacementDataset(42);
const scheduler = new SchedulingEngine();
const initialResult = scheduler.generateSchedule(dataset);
const engineMetrics = calculateMetrics(initialResult.interviews, dataset);

// -----------------------------------------------------------------------------
// INDEPENDENT CALCULATION IMPLEMENTATION
// -----------------------------------------------------------------------------
function independentCalculation(interviews: Interview[], data: Dataset) {
  const active = interviews.filter(i => i.status === 'SCHEDULED' || i.status === 'MOVED');

  // 1. Shortlists
  let shortlistsCount = 0;
  for (const s of data.students) {
    shortlistsCount += s.shortlistedCompanyIds.length;
  }

  // 2. Capacity
  const capacity = data.rooms.length * data.timeslots.length;

  // 3. Scheduled & Unscheduled
  const scheduledCount = active.length;
  const unscheduledCount = Math.max(0, shortlistsCount - scheduledCount);

  // 4. Rates
  const successPct = shortlistsCount > 0 ? Number(((scheduledCount / shortlistsCount) * 100).toFixed(1)) : 0;
  const roomUtilPct = capacity > 0 ? Number(((scheduledCount / capacity) * 100).toFixed(1)) : 0;

  // 5. Clashes
  const studentSlotMap = new Map<string, number>();
  let studentClashes = 0;
  for (const i of active) {
    const k = `${i.studentId}@${i.timeslotId}`;
    const c = (studentSlotMap.get(k) || 0) + 1;
    studentSlotMap.set(k, c);
    if (c === 2) studentClashes++;
  }

  const roomSlotMap = new Map<string, number>();
  let roomConflicts = 0;
  for (const i of active) {
    const k = `${i.roomId}@${i.timeslotId}`;
    const c = (roomSlotMap.get(k) || 0) + 1;
    roomSlotMap.set(k, c);
    if (c === 2) roomConflicts++;
  }

  const panelSlotMap = new Map<string, number>();
  let panelConflicts = 0;
  for (const i of active) {
    const k = `${i.panelId}@${i.timeslotId}`;
    const c = (panelSlotMap.get(k) || 0) + 1;
    panelSlotMap.set(k, c);
    if (c === 2) panelConflicts++;
  }

  // 6. Waiting time
  const studentDayMap = new Map<string, Interview[]>();
  for (const i of active) {
    const k = `${i.studentId}-${i.dayId}`;
    if (!studentDayMap.has(k)) studentDayMap.set(k, []);
    studentDayMap.get(k)!.push(i);
  }

  const waitGaps: number[] = [];
  for (const list of studentDayMap.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let idx = 0; idx < list.length - 1; idx++) {
      const [eh, em] = list[idx].endTime.split(':').map(Number);
      const [sh, sm] = list[idx + 1].startTime.split(':').map(Number);
      const gap = sh * 60 + sm - (eh * 60 + em);
      if (gap > 0) waitGaps.push(gap);
    }
  }

  const avgWait = waitGaps.length > 0 ? Math.round(waitGaps.reduce((a, b) => a + b, 0) / waitGaps.length) : 0;
  const maxWait = waitGaps.length > 0 ? Math.max(...waitGaps) : 0;

  return {
    shortlistsCount,
    capacity,
    scheduledCount,
    unscheduledCount,
    successPct,
    roomUtilPct,
    studentClashes,
    roomConflicts,
    panelConflicts,
    avgWait,
    maxWait,
  };
}

const independent = independentCalculation(initialResult.interviews, dataset);

console.log('Metric Comparison:');
console.log('----------------------------------------------------------------------');
console.log(`Total Shortlists:           metricsEngine=${engineMetrics.totalShortlists} | independent=${independent.shortlistsCount}`);
console.log(`Total Scheduled:            metricsEngine=${engineMetrics.totalScheduledInterviews} | independent=${independent.scheduledCount}`);
console.log(`Total Unscheduled:          metricsEngine=${engineMetrics.totalUnscheduledInterviews} | independent=${independent.unscheduledCount}`);
console.log(`Scheduling Success Rate:    metricsEngine=${engineMetrics.schedulingSuccessRate}% | independent=${independent.successPct}%`);
console.log(`Room Utilization Rate:      metricsEngine=${engineMetrics.roomUtilizationRate}% | independent=${independent.roomUtilPct}%`);
console.log(`Student Clashes:            metricsEngine=${engineMetrics.studentClashes} | independent=${independent.studentClashes}`);
console.log(`Room Conflicts:             metricsEngine=${engineMetrics.roomConflicts} | independent=${independent.roomConflicts}`);
console.log(`Panel Conflicts:            metricsEngine=${engineMetrics.panelConflicts} | independent=${independent.panelConflicts}`);
console.log(`Avg Wait Time (min):        metricsEngine=${engineMetrics.averageWaitTimeMinutes} | independent=${independent.avgWait}`);
console.log(`Max Wait Time (min):        metricsEngine=${engineMetrics.maxWaitTimeMinutes} | independent=${independent.maxWait}`);
console.log('----------------------------------------------------------------------');

let matches = true;
if (engineMetrics.totalShortlists !== independent.shortlistsCount) matches = false;
if (engineMetrics.totalScheduledInterviews !== independent.scheduledCount) matches = false;
if (engineMetrics.totalUnscheduledInterviews !== independent.unscheduledCount) matches = false;
if (engineMetrics.schedulingSuccessRate !== independent.successPct) matches = false;
if (engineMetrics.roomUtilizationRate !== independent.roomUtilPct) matches = false;
if (engineMetrics.studentClashes !== independent.studentClashes) matches = false;
if (engineMetrics.roomConflicts !== independent.roomConflicts) matches = false;
if (engineMetrics.panelConflicts !== independent.panelConflicts) matches = false;
if (engineMetrics.averageWaitTimeMinutes !== independent.avgWait) matches = false;
if (engineMetrics.maxWaitTimeMinutes !== independent.maxWait) matches = false;

if (matches) {
  console.log('\n[SUCCESS] 100% Exact Match between metricsEngine and Independent Verification.');
} else {
  console.error('\n[DISCREPANCY] Discrepancies detected between metricsEngine and Independent Verification.');
  process.exit(1);
}
