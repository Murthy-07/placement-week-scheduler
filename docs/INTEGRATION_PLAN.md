# INTEGRATION PLAN: Placement Week Scheduler

## 1. Integration Overview
The scheduling engine, replanning logic, validation suite, and user interface are already connected through clean, decoupled interfaces. This plan defines how any future scheduling algorithm improvements, constraint extensions, or API bridges integrate into the system.

## 2. Integration Points

### A. Engine Interface (`src/engine/scheduler.ts`)
- **Input**: `PlacementDataset` containing `students`, `companies`, `rooms`, `timeslots`, and `days`.
- **Output**: `ScheduleResult` containing:
  - `interviews: Interview[]` (All successfully scheduled interviews with day, slot, room, panel, student, and company IDs)
  - `unscheduled: UnscheduledCandidate[]` (Candidates who could not be placed due to capacity, with reason tags)
  - `stats: { totalShortlists, scheduledCount, unscheduledCount, successRate, executionTimeMs }`
- **Contract**:
  - Zero double-booking of students across any single timeslot.
  - Zero room overlaps across any single timeslot.
  - Zero panel overlaps across any single timeslot.
  - 100% adherence to company minimum CGPA requirements.

### B. Replanning Interface (`src/engine/replanningEngine.ts`)
- **Input**:
  - `currentSchedule: Interview[]`
  - `dataset: PlacementDataset`
  - Scenario-specific parameters (e.g. `panelId`, `delaySlots`, `withdrawnStudentId`, `unavailableRoomId`)
- **Output**: `ReplanResult` containing:
  - `updatedSchedule: Interview[]`
  - `changes: InterviewChange[]` (Type of change: MOVED, CANCELLED, ROOM_CHANGED, RESCHEDULED, ADDED)
  - `churnPercentage: number` ($(\text{changed interviews} / \text{total initial}) \times 100$)
  - `affectedStudents: number[]`
  - `affectedCompanies: number[]`
  - `validation: ValidationResult`

### C. State Context Bridge (`src/context/SchedulerContext.tsx`)
- Coordinates the calling of scheduler and replanner methods.
- Exposes:
  - `dataset`: Read-only current placement dataset.
  - `schedule`: Active interview list.
  - `originalSchedule`: Snapshot prior to active disruptions.
  - `replanResult`: Latest diff and churn breakdown.
  - `metrics`: Live KPIs (wait time, utilization, clashes).
  - `validation`: 0-clash audit status.
  - Action handlers: `triggerPanelDelay`, `triggerPanelDropout`, `triggerStudentWithdrawal`, `triggerRoomUnavailable`, `triggerDay1Crisis`, `resetSchedule`, `resolveAllDisruptions`.

### D. Presentation Views (`src/components/`)
- All 8 UI views consume `useScheduler()` hook from `SchedulerContext.tsx`.
- **No changes to UI structure or component hierarchy are required** when updating underlying scheduling logic.
