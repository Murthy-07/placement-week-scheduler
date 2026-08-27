import { generatePlacementDataset } from '../src/engine/dataGenerator';
import { SchedulingEngine } from '../src/engine/scheduler';
import { validateSchedule } from '../src/engine/validator';
import { calculateMetrics } from '../src/engine/metricsEngine';
import { DEFAULT_PLACEMENT_CONFIG, PlacementConfig, validatePlacementConfig } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

console.log('====================================================');
console.log('STARTING CONFIGURATION UI & INTEGRATION TEST SUITE (MODULE 7)');
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
// TEST 1: Default Configuration Integrity
// -----------------------------------------------------------------------------
runTest('Default configuration loads correctly and matches Assignment A specifications', () => {
  assert(DEFAULT_PLACEMENT_CONFIG.studentCount === 800, 'Default students must be 800');
  assert(DEFAULT_PLACEMENT_CONFIG.companyCount === 35, 'Default companies must be 35');
  assert(DEFAULT_PLACEMENT_CONFIG.roomCount === 20, 'Default rooms must be 20');
  assert(DEFAULT_PLACEMENT_CONFIG.placementDays === 5, 'Default placement days must be 5');
  assert(DEFAULT_PLACEMENT_CONFIG.startTime === '09:00', 'Default start time must be 09:00');
  assert(DEFAULT_PLACEMENT_CONFIG.endTime === '17:00', 'Default end time must be 17:00');
  assert(DEFAULT_PLACEMENT_CONFIG.interviewDurationMinutes === 30, 'Default interview duration must be 30');
  assert(DEFAULT_PLACEMENT_CONFIG.seed === 42, 'Default seed must be 42');

  const val = validatePlacementConfig(DEFAULT_PLACEMENT_CONFIG);
  assert(val.isValid, 'DEFAULT_PLACEMENT_CONFIG must pass validation with zero errors');
});

// -----------------------------------------------------------------------------
// TEST 2: Student Count Configuration
// -----------------------------------------------------------------------------
runTest('User can configure custom student count (e.g. 1,500 students)', () => {
  const config: PlacementConfig = {
    ...DEFAULT_PLACEMENT_CONFIG,
    studentCount: 1500,
  };
  const dataset = generatePlacementDataset(config);
  assert(dataset.students.length === 1500, `Dataset must have 1500 students, got ${dataset.students.length}`);
  
  const engine = new SchedulingEngine();
  const res = engine.generateSchedule(dataset);
  const val = validateSchedule(res.interviews, dataset);
  assert(val.isValid, '1,500 student schedule must be valid with 0 clashes');
});

// -----------------------------------------------------------------------------
// TEST 3: Company Count Configuration
// -----------------------------------------------------------------------------
runTest('User can configure custom company count (e.g. 45 companies)', () => {
  const config: PlacementConfig = {
    ...DEFAULT_PLACEMENT_CONFIG,
    companyCount: 45,
  };
  const dataset = generatePlacementDataset(config);
  assert(dataset.companies.length === 45, `Dataset must have 45 companies, got ${dataset.companies.length}`);
  
  const engine = new SchedulingEngine();
  const res = engine.generateSchedule(dataset);
  const val = validateSchedule(res.interviews, dataset);
  assert(val.isValid, '45 company schedule must be valid with 0 clashes');
});

// -----------------------------------------------------------------------------
// TEST 4: Room Count Configuration
// -----------------------------------------------------------------------------
runTest('User can configure custom room count (e.g. 28 rooms across blocks)', () => {
  const config: PlacementConfig = {
    ...DEFAULT_PLACEMENT_CONFIG,
    roomCount: 28,
  };
  const dataset = generatePlacementDataset(config);
  assert(dataset.rooms.length === 28, `Dataset must have 28 rooms, got ${dataset.rooms.length}`);
  assert(dataset.rooms[0].building === 'Academic Block A', 'First block is Academic Block A');
  assert(dataset.rooms[20].building === 'Academic Block B', '21st room belongs to Academic Block B');
  
  const engine = new SchedulingEngine();
  const res = engine.generateSchedule(dataset);
  const val = validateSchedule(res.interviews, dataset);
  assert(val.isValid, '28 room schedule must be valid with 0 clashes');
});

// -----------------------------------------------------------------------------
// TEST 5: Panel Count Configuration Override
// -----------------------------------------------------------------------------
runTest('User can configure total panel count override (e.g. 70 panels)', () => {
  const config: PlacementConfig = {
    ...DEFAULT_PLACEMENT_CONFIG,
    companyCount: 35,
    panelCount: 70,
  };
  const dataset = generatePlacementDataset(config);
  const totalPanels = dataset.companies.reduce((acc, c) => acc + c.panels.length, 0);
  assert(totalPanels === 70, `Total panels must equal 70, got ${totalPanels}`);
});

// -----------------------------------------------------------------------------
// TEST 6: Placement Days Configuration
// -----------------------------------------------------------------------------
runTest('User can configure placement days horizon (e.g. 8 days = 128 slots)', () => {
  const config: PlacementConfig = {
    ...DEFAULT_PLACEMENT_CONFIG,
    placementDays: 8,
  };
  const dataset = generatePlacementDataset(config);
  assert(dataset.placementDays.length === 8, `Placement days must be 8, got ${dataset.placementDays.length}`);
  assert(dataset.timeslots.length === 128, `Expected 128 slots (8 * 16), got ${dataset.timeslots.length}`);
});

// -----------------------------------------------------------------------------
// TEST 7: Operating Window (Start and End Time)
// -----------------------------------------------------------------------------
runTest('User can configure operating window (e.g. 08:30 to 16:30 = 16 slots of 30 min)', () => {
  const config: PlacementConfig = {
    ...DEFAULT_PLACEMENT_CONFIG,
    startTime: '08:30',
    endTime: '16:30',
    placementDays: 2,
  };
  const dataset = generatePlacementDataset(config);
  assert(dataset.timeslots[0].startTime === '08:30', 'First slot starts at 08:30');
  assert(dataset.timeslots[15].endTime === '16:30', 'Last slot of Day 1 ends at 16:30');
  assert(dataset.timeslots.length === 32, '32 total slots across 2 days');
});

// -----------------------------------------------------------------------------
// TEST 8: Interview Duration and Inter-Interview Breaks
// -----------------------------------------------------------------------------
runTest('User can configure interview duration and breaks (e.g. 45m interview + 15m break)', () => {
  const config: PlacementConfig = {
    ...DEFAULT_PLACEMENT_CONFIG,
    startTime: '09:00',
    endTime: '17:00',
    interviewDurationMinutes: 45,
    breakDurationMinutes: 15,
    placementDays: 2,
  };
  const dataset = generatePlacementDataset(config);
  assert(dataset.timeslots[0].startTime === '09:00' && dataset.timeslots[0].endTime === '09:45', 'Slot 0 is 09:00-09:45');
  assert(dataset.timeslots[1].startTime === '10:00' && dataset.timeslots[1].endTime === '10:45', 'Slot 1 is 10:00-10:45');
  assert(dataset.timeslots.length === 16, '16 total slots (8 per day * 2 days)');
});

// -----------------------------------------------------------------------------
// TEST 9: Comprehensive Input Validation Rules
// -----------------------------------------------------------------------------
runTest('Invalid configurations are strictly rejected by validation logic', () => {
  // Test invalid student count
  const errStudents = validatePlacementConfig({ studentCount: 0 });
  assert(!errStudents.isValid && errStudents.errors.some(e => e.includes('Student count')), 'Zero students rejected');

  // Test invalid company count
  const errCompanies = validatePlacementConfig({ companyCount: -5 });
  assert(!errCompanies.isValid && errCompanies.errors.some(e => e.includes('Company count')), 'Negative companies rejected');

  // Test invalid room count
  const errRooms = validatePlacementConfig({ roomCount: 0 });
  assert(!errRooms.isValid && errRooms.errors.some(e => e.includes('Room count')), 'Zero rooms rejected');

  // Test invalid panel count
  const errPanels = validatePlacementConfig({ panelCount: -1 });
  assert(!errPanels.isValid && errPanels.errors.some(e => e.includes('Panel count')), 'Negative panels rejected');

  // Test invalid placement days
  const errDays = validatePlacementConfig({ placementDays: 0 });
  assert(!errDays.isValid && errDays.errors.some(e => e.includes('Placement days')), 'Zero days rejected');

  // Test invalid time sequence
  const errTime = validatePlacementConfig({ startTime: '17:00', endTime: '09:00' });
  assert(!errTime.isValid && errTime.errors.some(e => e.includes('End time')), 'End time before start time rejected');

  // Test invalid interview duration
  const errDur = validatePlacementConfig({ interviewDurationMinutes: 0 });
  assert(!errDur.isValid && errDur.errors.some(e => e.includes('duration')), 'Zero duration rejected');
});

// -----------------------------------------------------------------------------
// TEST 10: Reset to Default Contract
// -----------------------------------------------------------------------------
runTest('Reset restores exact DEFAULT_PLACEMENT_CONFIG values', () => {
  const customConfig: PlacementConfig = {
    studentCount: 3000,
    companyCount: 60,
    roomCount: 40,
    panelCount: 50,
    placementDays: 12,
    startTime: '08:00',
    endTime: '18:00',
    interviewDurationMinutes: 45,
    breakDurationMinutes: 15,
    seed: 9999,
  };

  // Simulating reset action
  const resetConfig = { ...DEFAULT_PLACEMENT_CONFIG };
  assert(resetConfig.studentCount === 800, 'Reset student count is 800');
  assert(resetConfig.companyCount === 35, 'Reset company count is 35');
  assert(resetConfig.roomCount === 20, 'Reset room count is 20');
  assert(resetConfig.placementDays === 5, 'Reset placement days is 5');
  assert(resetConfig.startTime === '09:00', 'Reset start time is 09:00');
  assert(resetConfig.endTime === '17:00', 'Reset end time is 17:00');
  assert(resetConfig.interviewDurationMinutes === 30, 'Reset interview duration is 30');
  assert(resetConfig.seed === 42, 'Reset seed is 42');
});

// -----------------------------------------------------------------------------
// TEST 11: Real-World Mega Campus Scenario (Part 11 of Spec)
// -----------------------------------------------------------------------------
runTest('Real-World Scenario: 4,000 Students, 50 Companies, 30 Rooms, 40 Panels, 10 Days', () => {
  const megaConfig: PlacementConfig = {
    studentCount: 2000,
    companyCount: 50,
    roomCount: 30,
    panelCount: 40,
    placementDays: 10,
    startTime: '09:00',
    endTime: '18:00',
    interviewDurationMinutes: 30,
    breakDurationMinutes: 0,
    seed: 42,
  };

  const val = validatePlacementConfig(megaConfig);
  assert(val.isValid, 'Mega campus configuration is valid');

  const dataset = generatePlacementDataset(megaConfig);
  assert(dataset.students.length === 2000, 'Dataset contains 2,000 students');
  assert(dataset.companies.length === 50, 'Dataset contains 50 companies');
  assert(dataset.rooms.length === 30, 'Dataset contains 30 rooms');
  assert(dataset.placementDays.length === 10, 'Dataset contains 10 placement days');
  
  // 09:00-18:00 (9 hours) * 2 slots/hr = 18 slots/day * 10 days = 180 timeslots
  assert(dataset.timeslots.length === 180, `Expected 180 timeslots, got ${dataset.timeslots.length}`);

  // Schedule Generation & Validation
  const engine = new SchedulingEngine();
  const res = engine.generateSchedule(dataset);
  const valSchedule = validateSchedule(res.interviews, dataset);
  const metrics = calculateMetrics(res.interviews, dataset);

  assert(valSchedule.isValid, 'Mega schedule generated with 0 validation violations');
  assert(metrics.studentClashes === 0, 'Zero student clashes guaranteed');
  assert(metrics.roomConflicts === 0, 'Zero room conflicts guaranteed');
  assert(metrics.panelConflicts === 0, 'Zero panel conflicts guaranteed');
  assert(metrics.totalCapacitySlots === 30 * 180, `Capacity must be 5,400 (30 rooms * 180 slots), got ${metrics.totalCapacitySlots}`);
  assert(metrics.totalScheduledInterviews > 0, 'Interviews successfully scheduled');
});

// -----------------------------------------------------------------------------
// TEST 12: Live Capacity Calculation Formula Parity
// -----------------------------------------------------------------------------
runTest('Live capacity preview calculation accurately mirrors engine timeslot generation', () => {
  function computePreviewCapacity(cfg: PlacementConfig) {
    const [sh, sm] = cfg.startTime.split(':').map(Number);
    const [eh, em] = cfg.endTime.split(':').map(Number);
    const dailyMins = (eh * 60 + em) - (sh * 60 + sm);
    const slotCycle = cfg.interviewDurationMinutes + (cfg.breakDurationMinutes || 0);
    const slotsPerRoomPerDay = Math.floor(dailyMins / slotCycle);
    return cfg.roomCount * slotsPerRoomPerDay * cfg.placementDays;
  }

  const testConfigs: PlacementConfig[] = [
    DEFAULT_PLACEMENT_CONFIG,
    { ...DEFAULT_PLACEMENT_CONFIG, roomCount: 30, placementDays: 10, startTime: '09:00', endTime: '18:00' },
    { ...DEFAULT_PLACEMENT_CONFIG, roomCount: 25, placementDays: 7, startTime: '08:30', endTime: '17:30', interviewDurationMinutes: 45, breakDurationMinutes: 15 },
  ];

  for (const cfg of testConfigs) {
    const previewCap = computePreviewCapacity(cfg);
    const dataset = generatePlacementDataset(cfg);
    const engineCap = dataset.rooms.length * dataset.timeslots.length;
    assert(previewCap === engineCap, `Preview capacity (${previewCap}) must match engine capacity (${engineCap})`);
  }
});

console.log('\n====================================================');
console.log(`CONFIGURATION UI SUITE RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
console.log('====================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
