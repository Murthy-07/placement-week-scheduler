import { generatePlacementDataset } from '../src/engine/dataGenerator';
import { SchedulingEngine } from '../src/engine/scheduler';
import { ReplanningEngine } from '../src/engine/replanningEngine';
import { validateSchedule } from '../src/engine/validator';
import { calculateMetrics } from '../src/engine/metricsEngine';

const dataset = generatePlacementDataset(42);
const scheduler = new SchedulingEngine();
const initialResult = scheduler.generateSchedule(dataset);
const replanner = new ReplanningEngine();

console.log('=== BENCHMARKING REPLANNING RUNTIME & CHURN ===\n');

// 1. Panel Delay Benchmark
const t0 = performance.now();
const resDelay = replanner.handlePanelDelay(
  initialResult.interviews,
  dataset,
  { panelId: dataset.companies[0].panels[0].id, dayId: 1, delayMinutes: 120, startHour: 9 }
);
const tDelay = performance.now() - t0;
console.log('1. Panel Delay (120 min):');
console.log('   Runtime:', tDelay.toFixed(2), 'ms');
console.log('   Churn:', resDelay.replanResult.churnPercentage, '%');
console.log('   Moved:', resDelay.replanResult.movedInterviewsCount);
console.log('   Cancelled:', resDelay.replanResult.cancelledInterviewsCount);
console.log('   Unchanged:', resDelay.replanResult.unchangedInterviewsCount);
console.log('   Validation Valid:', validateSchedule(resDelay.updatedInterviews, dataset).isValid);

// 2. Panel Dropout Benchmark
const t1 = performance.now();
const resDropout = replanner.handlePanelDropout(
  initialResult.interviews,
  dataset,
  { panelId: dataset.companies[0].panels[0].id, reason: 'Technical lead ill' }
);
const tDropout = performance.now() - t1;
console.log('\n2. Panel Dropout:');
console.log('   Runtime:', tDropout.toFixed(2), 'ms');
console.log('   Churn:', resDropout.replanResult.churnPercentage, '%');
console.log('   Moved:', resDropout.replanResult.movedInterviewsCount);
console.log('   Cancelled:', resDropout.replanResult.cancelledInterviewsCount);
console.log('   Unchanged:', resDropout.replanResult.unchangedInterviewsCount);
console.log('   Validation Valid:', validateSchedule(resDropout.updatedInterviews, dataset).isValid);

// 3. Student Withdrawal Benchmark
const t2 = performance.now();
const resWithdraw = replanner.handleStudentWithdrawal(
  initialResult.interviews,
  dataset,
  { studentIds: dataset.students.slice(0, 15).map(s => s.id), reason: 'Off-campus offer' }
);
const tWithdraw = performance.now() - t2;
console.log('\n3. Student Withdrawal (15 Students):');
console.log('   Runtime:', tWithdraw.toFixed(2), 'ms');
console.log('   Churn:', resWithdraw.replanResult.churnPercentage, '%');
console.log('   Cancelled:', resWithdraw.replanResult.cancelledInterviewsCount);
console.log('   Unchanged:', resWithdraw.replanResult.unchangedInterviewsCount);
console.log('   Validation Valid:', validateSchedule(resWithdraw.updatedInterviews, dataset).isValid);

// 4. Room Outage Benchmark
const t3 = performance.now();
const resRoom = replanner.handleRoomUnavailable(
  initialResult.interviews,
  dataset,
  { roomId: dataset.rooms[0].id, dayId: 1, reason: 'Power Outage' }
);
const tRoom = performance.now() - t3;
console.log('\n4. Room Outage:');
console.log('   Runtime:', tRoom.toFixed(2), 'ms');
console.log('   Churn:', resRoom.replanResult.churnPercentage, '%');
console.log('   Moved:', resRoom.replanResult.movedInterviewsCount);
console.log('   Cancelled:', resRoom.replanResult.cancelledInterviewsCount);
console.log('   Unchanged:', resRoom.replanResult.unchangedInterviewsCount);
console.log('   Validation Valid:', validateSchedule(resRoom.updatedInterviews, dataset).isValid);

// 5. Combined Day-1 Crisis Benchmark
const t4 = performance.now();
const resCrisis = replanner.handleDay1Crisis(
  initialResult.interviews,
  dataset
);
const tCrisis = performance.now() - t4;
console.log('\n5. Combined Day-1 Crisis Benchmark:');
console.log('   Runtime:', tCrisis.toFixed(2), 'ms');
console.log('   Churn:', resCrisis.replanResult.churnPercentage, '%');
console.log('   Moved:', resCrisis.replanResult.movedInterviewsCount);
console.log('   Cancelled:', resCrisis.replanResult.cancelledInterviewsCount);
console.log('   Unchanged:', resCrisis.replanResult.unchangedInterviewsCount);
console.log('   Validation Valid:', validateSchedule(resCrisis.updatedInterviews, dataset).isValid);
console.log('   Student Clashes:', calculateMetrics(resCrisis.updatedInterviews, dataset).studentClashes);
console.log('   Room Conflicts:', calculateMetrics(resCrisis.updatedInterviews, dataset).roomConflicts);
console.log('   Panel Conflicts:', calculateMetrics(resCrisis.updatedInterviews, dataset).panelConflicts);
