# PROJECT ANALYSIS: Mirai Labs Assignment A — The Placement Week Scheduler

## 1. What the Existing Application Does
The existing application is an interactive Placement Week Scheduler and Disruption Simulator designed for campus placement coordinators.
- Generates a deterministic dataset of 800 students, 35 companies (Tier 1, 2, and 3), 20 interview rooms (Block A), 5 placement days, and 16 timeslots per day (80 total timeslots per room = 1600 slot capacity).
- Computes an initial schedule satisfying all hard constraints (zero student double-booking, zero room overlap, zero panel overlap, and strict CGPA cutoffs).
- Provides live disruption simulation handling 5 real-world scenarios (Panel Delay, Panel Dropout, Student Withdrawal, Room Outage, and Day-1 Crisis).
- Calculates comprehensive performance metrics (room utilization, scheduled counts, average wait time, and disruption churn %).
- Audits and proves 0-clash invariants with an integrated Defense Dossier.

## 2. What Assignment A Requires
1. **Entities & Scale**:
   - 800 Candidates with CGPAs, branches, and company shortlists.
   - 35 Companies categorized into 3 Tiers with minimum CGPA requirements, interview durations (30 min), and 3–8 panels.
   - 20 Rooms available across 5 placement days (16 slots/day = 09:00 to 17:00).
2. **Scheduling Constraints**:
   - Hard Constraint 1: A student cannot be in more than one interview in the same timeslot.
   - Hard Constraint 2: A panel cannot conduct more than one interview in the same timeslot.
   - Hard Constraint 3: A room can host at most one interview in the same timeslot.
   - Hard Constraint 4: Student CGPA must meet or exceed the company's minimum CGPA cutoff.
   - Soft Constraints: Maximize total scheduled interviews, prioritize higher tiers (Tier 1 > Tier 2 > Tier 3), minimize student idle waiting gap between interviews, and optimize room load.
3. **Disruption Management & Replanning**:
   - **Scenario 1 (Company/Panel Delay)**: Push forward subsequent interviews for that panel; cascade without creating student clashes.
   - **Scenario 2 (Panel Dropout)**: Reallocate interviews to sibling panels of the same company or reschedule with minimum displacement.
   - **Scenario 3 (Student Withdrawal)**: Free allocated slots and offer them to backlogged or unscheduled candidates.
   - **Scenario 4 (Room Outage)**: Relocate interviews to spare rooms in the same timeslot or reschedule with zero time changes.
   - **Scenario 5 (Day-1 Recruiter Crisis / Multi-Disruption)**: Handle compound disruptions simultaneously with minimal churn percentage (<15%).
4. **Visibility & Verification**:
   - Master Grid view (Rooms x Slots).
   - Candidate itineraries.
   - Company & Room status.
   - Real-time before/after diff audit table.
   - Invariant validation & conflict detection logs.

## 3. What is Already Implemented
- **Data Generator (`src/engine/dataGenerator.ts`)**: PRNG Mulberry32 deterministic generator creating 800 students, 35 companies (Tiers 1–3), 20 rooms, 5 days, and 16 slots.
- **Initial Scheduler (`src/engine/scheduler.ts`)**: Tier-prioritized backtracking and greedy slot allocation engine.
- **Replanning Engine (`src/engine/replanningEngine.ts`)**: Dedicated handlers for all 5 disruption scenarios with local push-forward, sibling panel fallback, zero-time room swaps, and diff tracking.
- **Validation Engine (`src/engine/validator.ts`)**: Formal constraint validator checking student, room, panel conflicts, and CGPA compliance.
- **Metrics Engine (`src/engine/metricsEngine.ts`)**: Computes utilization rates, churn percentages, average student wait times, and status counts.
- **State Management (`src/context/SchedulerContext.tsx`)**: Global React context exposing state, dispatchers, filters, active disruptions, and diff logs.
- **Full UI Surface (`src/components/`)**:
  - `Navbar.tsx`: Global navigation & status indicators.
  - `DashboardView.tsx`: KPI metrics and quick simulation triggers.
  - `ScheduleGridView.tsx`: 20-Room x 16-Slot matrix across 5 days with candidate popovers.
  - `StudentsView.tsx`: 800-candidate roster with itinerary modal.
  - `CompaniesView.tsx`: 35 recruiters with panel and eligibility details.
  - `RoomsView.tsx`: 20 rooms with occupancy telemetry.
  - `DisruptionsView.tsx`: Interactive scenario simulator and before/after diff table.
  - `ConflictsView.tsx`: Invariant verification and conflict audit report.
  - `DefenseDossierView.tsx`: Technical defense and mathematical bounds documentation.

## 4. What is Missing or Needs Fine-Tuning
- Fine-tuning of advanced heuristic weights (e.g. optimizing student gap penalty vs room distribution).
- Optional backend REST proxy endpoints in `server.ts` if external HTTP consumption or headless benchmarking is requested.

## 5. Where Each Feature is Implemented

| Feature / Requirement | File Location | Responsibility |
| :--- | :--- | :--- |
| Data Entities & Types | `src/types.ts` | Data schema for Student, Company, Panel, Room, Timeslot, Interview, ReplanResult, Metrics |
| Dataset Generation | `src/engine/dataGenerator.ts` | Deterministic generation of 800 students, 35 companies, 20 rooms |
| Core Scheduling Algorithm | `src/engine/scheduler.ts` | Initial multi-tier constraint satisfaction scheduler |
| Disruption & Replanning | `src/engine/replanningEngine.ts` | 5 Disruption scenarios, minimal churn heuristics, diff generation |
| Invariant Auditing | `src/engine/validator.ts` | Hard constraint conflict detection (0 clashes) |
| Telemetry & Metrics | `src/engine/metricsEngine.ts` | Room utilization, wait times, churn metrics |
| Application State | `src/context/SchedulerContext.tsx` | State bridge connecting engines to UI components |
| Coordinator Interface | `src/components/*.tsx` | 8 dedicated views displaying all schedules, metrics, diffs, and controls |
