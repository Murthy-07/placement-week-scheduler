import { generatePlacementDataset } from '../src/engine/dataGenerator';
import { SchedulingEngine } from '../src/engine/scheduler';
import { validateSchedule } from '../src/engine/validator';
import { calculateMetrics } from '../src/engine/metricsEngine';
import { ReplanningEngine } from '../src/engine/replanningEngine';

console.log('========================================================');
console.log('STARTING DETERMINISM & END-TO-END PIPELINE AUDIT');
console.log('========================================================\n');

// 1. DETERMINISM TEST: Run Seed 42 five times and compare outputs
console.log('1. Testing Determinism across 5 Independent Executions (Seed 42)...');
const scheduler = new SchedulingEngine();
const initialOutputs: string[] = [];

for (let run = 1; run <= 5; run++) {
  const ds = generatePlacementDataset(42);
  const res = scheduler.generateSchedule(ds);
  const metrics = calculateMetrics(res.interviews, ds);
  const signature = JSON.stringify({
    scheduledCount: res.interviews.length,
    unscheduledCount: res.unscheduledReports.length,
    utilization: metrics.roomUtilizationRate,
    avgWait: metrics.averageWaitTimeMinutes,
    firstInterviewId: res.interviews[0].id,
    lastInterviewId: res.interviews[res.interviews.length - 1].id,
  });
  initialOutputs.push(signature);
}

const isIdentical = initialOutputs.every(sig => sig === initialOutputs[0]);
console.log('   Execution Signature Match:', isIdentical ? '100% IDENTICAL' : 'FAILED - DISCREPANCY DETECTED');
if (!isIdentical) {
  throw new Error('Determinism failed: Seed 42 produced non-identical schedules across runs');
}

// 2. MULTI-SEED VALIDITY TEST: Run 10 Diverse Seeds
console.log('\n2. Testing Multi-Seed Validity Across 10 Diverse Seeds...');
const testSeeds = [1, 7, 42, 101, 777, 1337, 2026, 9999, 12345, 88888];
let allSeedsValid = true;

for (const seed of testSeeds) {
  const ds = generatePlacementDataset(seed);
  const res = scheduler.generateSchedule(ds);
  const val = validateSchedule(res.interviews, ds);
  const met = calculateMetrics(res.interviews, ds);

  const passed = val.isValid && met.studentClashes === 0 && met.roomConflicts === 0 && met.panelConflicts === 0;
  if (!passed) allSeedsValid = false;

  console.log(`   Seed ${seed.toString().padEnd(6)}: Scheduled=${res.interviews.length.toString().padEnd(4)} | Clashes=${met.studentClashes} | RoomConflicts=${met.roomConflicts} | Valid=${val.isValid}`);
}

console.log('   Multi-Seed Validation Result:', allSeedsValid ? '100% VALID' : 'FAILED');
if (!allSeedsValid) {
  throw new Error('Multi-seed validation failed on one or more seeds');
}

// 3. PIPELINE END-TO-END TIMINGS
console.log('\n3. Measuring End-to-End Pipeline Performance (Seed 42)...');
const tGen0 = performance.now();
const dataset = generatePlacementDataset(42);
const tGen = performance.now() - tGen0;

const tSched0 = performance.now();
const scheduleResult = scheduler.generateSchedule(dataset);
const tSched = performance.now() - tSched0;

const tVal0 = performance.now();
const valResult = validateSchedule(scheduleResult.interviews, dataset);
const tVal = performance.now() - tVal0;

const tMet0 = performance.now();
const metResult = calculateMetrics(scheduleResult.interviews, dataset);
const tMet = performance.now() - tMet0;

const replanner = new ReplanningEngine();
const tRep0 = performance.now();
const replanResult = replanner.handleDay1Crisis(scheduleResult.interviews, dataset);
const tRep = performance.now() - tRep0;

console.log(`   Dataset Generation:    ${tGen.toFixed(2)} ms`);
console.log(`   Initial Scheduling:    ${tSched.toFixed(2)} ms`);
console.log(`   Constraint Validation: ${tVal.toFixed(2)} ms`);
console.log(`   Metrics Calculation:   ${tMet.toFixed(2)} ms`);
console.log(`   Crisis Replanning:     ${tRep.toFixed(2)} ms`);
console.log(`   Total Pipeline Time:   ${(tGen + tSched + tVal + tMet + tRep).toFixed(2)} ms`);

console.log('\n========================================================');
console.log('[SUCCESS] All Determinism, Invariance, and Pipeline Tests Passed.');
console.log('========================================================');
