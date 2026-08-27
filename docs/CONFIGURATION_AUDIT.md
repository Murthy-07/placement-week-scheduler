# Configuration Foundation Audit & Architecture Specification

## Executive Summary
This document provides a comprehensive audit of all hardcoded structural, parametric, and temporal assumptions across the Placement Week Scheduler codebase and details the unified `PlacementConfig` architecture implemented in Module 6.

---

## 1. Audit of Hardcoded Assumptions Discovered

### A. Data Generator (`src/engine/dataGenerator.ts`)
1. **Fixed Room Count (20 Rooms)**:
   - Previously hardcoded `for (let i = 1; i <= 20; i++)` producing `A-101` through `A-120` in Academic Block A.
2. **Fixed Placement Days (5 Days)**:
   - Previously hardcoded `for (let d = 1; d <= 5; d++)` anchored to `2026-09-01`.
3. **Fixed Daily Timeslots (16 Slots)**:
   - Previously hardcoded `for (let s = 0; s < 16; s++)` assuming fixed 09:00 to 17:00 with 30-minute intervals and zero break.
4. **Fixed Company Catalogue (35 Companies)**:
   - Hardcoded 35 predefined enterprise and product recruiters with fixed panel allotments.
5. **Fixed Student Cohort (800 Students)**:
   - Previously hardcoded `for (let s = 1; s <= 800; s++)` with static Gaussian CGPA mean (7.6).
6. **Fixed Seed (42)**:
   - Default PRNG seed 42.

### B. Scheduling Engine (`src/engine/scheduler.ts`)
1. **Hardcoded Tiered Day Sequences**:
   - Explicitly referenced days 1, 2, 3, 4, 5 in array literals for Tier 1, Tier 2, and Tier 3.
2. **Hardcoded Resource Messages**:
   - Failure diagnostics stated `"All 20 interview rooms are fully occupied in candidate slots."`

### C. Replanning Engine (`src/engine/replanningEngine.ts`)
1. **Hardcoded Affected Room Count in Benchmark**:
   - `handleDay1Crisis` recorded a static `affectedRoomsCount: 12` rather than dynamically calculating the unique rooms touched across all disruption passes.

### D. Context Layer (`src/context/SchedulerContext.tsx`)
1. Initialized dataset via `generatePlacementDataset(42)` without exposing configuration state or parameter updates to consumers.

---

## 2. Configuration Model Architecture (`PlacementConfig`)

The central configuration interface was defined in `src/types.ts` with strict validation rules and default values that preserve 100% of Assignment A behavior:

```typescript
export interface PlacementConfig {
  studentCount: number;             // e.g. 800 (supports 1 - 10,000)
  companyCount: number;             // e.g. 35 (supports 1 - 500)
  roomCount: number;                // e.g. 20 (supports 1 - 200)
  panelCount?: number;              // optional override
  placementDays: number;            // e.g. 5 (supports 1 - 30)
  startTime: string;                // 24h format "09:00"
  endTime: string;                  // 24h format "17:00"
  interviewDurationMinutes: number; // e.g. 30 (supports 15 - 480)
  breakDurationMinutes?: number;    // e.g. 0 (supports 0 - 120)
  seed: number;                     // e.g. 42
}
```

### Default Assignment A Configuration
```typescript
export const DEFAULT_PLACEMENT_CONFIG: PlacementConfig = {
  studentCount: 800,
  companyCount: 35,
  roomCount: 20,
  placementDays: 5,
  startTime: '09:00',
  endTime: '17:00',
  interviewDurationMinutes: 30,
  breakDurationMinutes: 0,
  seed: 42,
};
```

---

## 3. Backward Compatibility & Scalability Strategy

1. **Overloaded `generatePlacementDataset`**:
   - Accepts either `seed: number` or `Partial<PlacementConfig>`.
   - Calling `generatePlacementDataset(42)` continues to output the exact bit-level dataset as before.
2. **Dynamic Day Tier Sequencing**:
   - For $N=5$, evaluates to the exact Assignment A priority arrays `[1, 2, 3, 4, 5]`, `[2, 3, 1, 4, 5]`, `[3, 4, 5, 1, 2]`.
   - For general $N$, dynamically partitions horizon into early (40%), mid (30%), and late (30%) phases.
3. **Dynamic Room Numbering & Multi-Block Expansion**:
   - Generates blocks A, B, C... for room counts exceeding single-block limits.
4. **Time & Break Duration Interpolation**:
   - Dynamic math `startTotalMinutes` to `endTotalMinutes` step `interviewDuration + breakDuration` automatically computes exact timeslot entities.
