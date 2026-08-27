# PROJECT ANALYSIS: Mirai Labs Assignment A — The Placement Week Scheduler

**Date**: August 25, 2026  
**Document Version**: 1.0.0  
**Project**: Placement Week Scheduler & Real-Time Disruption Engine

---

## 1. Executive Summary

This project implements an enterprise-grade Placement Week Scheduling and Dynamic Replanning Engine designed to coordinate university campus placement drives with zero resource clashes, optimal room utilization, minimal student wait times, and low-churn disruption management.

Per project constraints, the existing user interface and navigation structure are **FIXED and PRESERVED**. All enhancements and scheduling capabilities are integrated seamlessly with the established UI components, engine interfaces, and state structures.

---

## 2. Existing Architecture

The codebase is structured around a modular React + TypeScript architecture with a dedicated core scheduling and replanning engine:

```
/
├── index.html
├── metadata.json
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.tsx
    ├── App.tsx                    # Root UI shell & Tab Router
    ├── types.ts                   # Core Domain Types & Invariants
    ├── context/
    │   └── SchedulerContext.tsx   # Global Scheduling State Provider
    ├── engine/
    │   ├── dataGenerator.ts       # Deterministic PRNG (Mulberry32) Dataset Builder
    │   ├── scheduler.ts           # Primary Multi-Constraint Scheduling Engine
    │   ├── replanningEngine.ts    # Dynamic Disruption & Real-Time Re-planner
    │   ├── validator.ts           # Formal Invariant & Conflict Verification Engine
    │   └── metricsEngine.ts       # Performance, Utilization & Churn Telemetry
    └── components/
        ├── Navbar.tsx             # Global Navigation & Telemetry Badges
        ├── DashboardView.tsx      # Executive Metrics & Overview
        ├── ScheduleGridView.tsx   # Master 20-Room x 16-Slot Interactive Matrix
        ├── StudentsView.tsx       # Student Roster & Personalized Itineraries
        ├── CompaniesView.tsx      # Recruiter Profiles, Panels & CGPA Cutoffs
        ├── RoomsView.tsx          # Room Utilization & Status Roster
        ├── DisruptionsView.tsx    # Live Disruption Simulator & Diff Audit Studio
        ├── ConflictsView.tsx      # Constraint Audit & 0-Clash Proof System
        ├── DefenseDossierView.tsx # Technical Defense, Math Bounds & Benchmarks
        └── Modal.tsx              # Generic Accessible Modal Wrapper
```

---

## 3. Existing UI Analysis

| View Component | Route/Tab | Capabilities & Features |
| :--- | :--- | :--- |
| **`Navbar`** | Header | Top-level tab switcher (Dashboard, Schedule Grid, Students, Companies, Rooms, Disruptions, Conflicts, Defense Dossier), deterministic seed generator selector, instant dataset reset, active disruption counter, 0-clash validation badge. |
| **`DashboardView`** | `dashboard` | High-level KPI metric cards (Total Shortlists, Scheduled Interviews, Success Rate, Room Utilization, Clashes, Student Waiting Time, Disruption Churn), quick disruption simulation triggers, tier distribution breakdown, room load progress indicators, validation auditor card. |
| **`ScheduleGridView`** | `schedule` | 20 Rooms $\times$ 16 Timeslots grid per day (Day 1 to 5 selector), student search, company/tier filters, color-coded interview blocks, and candidate detail modal. |
| **`StudentsView`** | `students` | Filterable list of 800 candidates (by branch, CGPA, status, shortlist count), individual student itinerary modal with time-stamped timeline and idle gap detection. |
| **`CompaniesView`** | `companies` | 35 recruiters categorized by Tier (Tier 1, 2, 3), panel lists, minimum CGPA eligibility cutoffs, interview durations, shortlists count, and scheduled count. |
| **`RoomsView`** | `rooms` | 20 Academic Block-A rooms, real-time occupancy meters, utilization rates, and active interview breakdowns. |
| **`DisruptionsView`** | `disruptions` | Disruption Simulation Lab featuring: (1) Recruiter Delay push-forward, (2) Panel Dropout sibling reallocation, (3) Student Withdrawal slot release, (4) Room Outage zero-time relocation, and (5) Day-1 Crisis benchmark. Includes visual before/after diff audit table with Churn % calculation. |
| **`ConflictsView`** | `conflicts` | Verification suite running automated audits for Student Double-Booking, Room Overlap, Panel Overlap, and CGPA Cutoff Violations. |
| **`DefenseDossierView`** | `defense` | Technical defense documentation, complexity analysis ($O(C \cdot S \cdot T)$), mathematical 0-clash proof, and live benchmark execution logs. |

---

## 4. Existing Backend & APIs

- **Runtime Mode**: Currently runs as a high-performance client-side TypeScript application powered by Vite dev server.
- **Backend Dependencies**: `express`, `@types/express`, `dotenv`, `tsx`, `@google/genai` are installed in `package.json`.
- **API Status**: All core scheduling, metric computation, validation checks, and disruption replanning execute via the deterministic TypeScript engine in `src/engine/` through `SchedulerContext`. If full-stack REST API endpoints (e.g., `/api/schedule`, `/api/replan`, `/api/validate`) are requested, Express can serve them via `server.ts`.

---

## 5. Existing Data Model & Entities

### 1. `Student`
- `id: number`
- `name: string`
- `email: string`
- `cgpa: number` (Gaussian distribution: mean 7.6, min 5.2, max 9.95)
- `branch: 'CS' | 'IT' | 'ECE' | 'EE' | 'ME'`
- `shortlistedCompanyIds: number[]`
- `status: 'AVAILABLE' | 'SCHEDULED' | 'PLACED' | 'WITHDRAWN'`

### 2. `Company` & `CompanyPanel`
- `id: number`, `name: string`, `minCgpa: number`, `tier: 1 | 2 | 3`, `interviewDurationMinutes: number`
- `panels: CompanyPanel[]` (`id`, `companyId`, `panelName`, `isAvailable`)
- `shortlistedStudentIds: number[]`

### 3. `Room`
- `id: number`, `roomNumber: string` (e.g. `A-101` to `A-120`), `building: string`, `isAvailable: boolean`

### 4. `Timeslot` & `PlacementDay`
- 5 Placement Days (Day 1 to 5)
- 16 Timeslots per day (09:00 to 17:00, 30-minute intervals = 80 total slots per room, 1600 total capacity slots)

### 5. `Interview`
- `id: number`, `studentId: number`, `companyId: number`, `panelId: number`, `roomId: number`, `timeslotId: number`, `dayId: number`, `startTime: string`, `endTime: string`, `status: InterviewStatus`

### 6. `ReplanResult` & `ScheduleMetrics`
- `churnPercentage: number`, `movedInterviewsCount`, `cancelledInterviewsCount`, `unchangedInterviewsCount`, `affectedStudents`, `affectedCompanies`, `changes: InterviewChange[]`
- `studentClashes`, `roomConflicts`, `panelConflicts`, `roomUtilizationRate`, `averageWaitTimeMinutes`

---

## 6. Scope Boundaries: Editable vs. Non-Editable Areas

### Non-Editable Areas (MUST BE PRESERVED)
1. **Frontend Layout & Structure**: The existing navigation bar, 8 view components (`DashboardView`, `ScheduleGridView`, `StudentsView`, `CompaniesView`, `RoomsView`, `DisruptionsView`, `ConflictsView`, `DefenseDossierView`), and their UI cards/modals must not be deleted, replaced, or redesigned.
2. **Design Language & Theme**: Fixed slate-neutral utility dashboard theme with crisp data density.
3. **Core Workflow**: The interaction model where user actions in the UI trigger state updates in `SchedulerContext`.

### Editable Areas (Open for logic & algorithmic refinements)
1. **Scheduling Engine (`src/engine/scheduler.ts`)**: Constraint satisfaction algorithm, tier prioritization, student ordering heuristics, multi-resource matching.
2. **Replanning Engine (`src/engine/replanningEngine.ts`)**: Minimal-churn local push-forward, sibling panel fallback, zero-time room swaps, cascade mitigation.
3. **Validation Engine (`src/engine/validator.ts`)**: Hard constraint auditing, overlap detection, cutoff verification.
4. **Metrics Telemetry (`src/engine/metricsEngine.ts`)**: Wait time calculation, capacity optimization, churn measurement.
5. **Data Generator (`src/engine/dataGenerator.ts`)**: Deterministic dataset parameters (Mulberry32 seed, CGPA distributions, shortlist sizes).
6. **Backend Server Integration (`server.ts` & `package.json`)**: If backend REST endpoints or server-side execution are specified.

---

## 7. Assignment A Requirement Checklist & Missing Capabilities

| Assignment A Requirement | Codebase Status | Integration Note |
| :--- | :--- | :--- |
| **800 Students, 35 Companies, 20 Rooms, 5 Days** | Fully Implemented | Configured deterministically in `dataGenerator.ts` |
| **Multi-Tier Company Hierarchy (Tier 1, 2, 3)** | Fully Implemented | Tier 1 (3-4 panels, cutoff $\ge 8.5$), Tier 2 (3 panels, cutoff $\ge 7.0$), Tier 3 (5-8 panels, cutoff $\ge 6.0$) |
| **Hard Constraints (0 Student/Room/Panel Clashes)** | Fully Implemented | Verified by `validator.ts` and `metricsEngine.ts` |
| **CGPA Cutoff Compliance** | Fully Implemented | Strictly enforced prior to slot booking |
| **Interview Duration & Day Slot Windows** | Fully Implemented | 16 half-hour slots per day (09:00 - 17:00) |
| **Scenario 1: Panel Delay Handling** | Fully Implemented | Local push-forward algorithm in `replanningEngine.ts` |
| **Scenario 2: Panel Dropout Handling** | Fully Implemented | Sibling panel transfer with minimal time shift |
| **Scenario 3: Student Withdrawal Handling** | Fully Implemented | Clean slot release and resource de-allocation |
| **Scenario 4: Room Outage Handling** | Fully Implemented | Same-slot relocation to spare rooms |
| **Scenario 5: Day-1 Recruiter Crisis Stress Test** | Fully Implemented | Multi-disruption benchmark with churn telemetry |
| **Before / After Diff Audit Table** | Fully Implemented | Accessible in `DisruptionsView.tsx` |
| **Live Defense Dossier** | Fully Implemented | Accessible in `DefenseDossierView.tsx` |

---

## 8. UI to Backend / Engine Communication Flow

```
[User Action in UI (e.g. Trigger Disruption / Filter / Change Seed)]
                          │
                          ▼
             [src/context/SchedulerContext.tsx]
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
[SchedulingEngine] [ReplanningEngine] [ValidationEngine]
        │                 │                 │
        └─────────────────┼─────────────────┘
                          ▼
                [metricsEngine.ts]
                          │
                          ▼
            [Updated React State / ReplanResult]
                          │
                          ▼
        [Re-rendered UI Views with Live Diff & KPIs]
```

---

## 9. Recommended Implementation Approach

1. **Keep the Existing UI Fixed**: Respect all visual layouts, navigation items, and established UX components.
2. **Algorithmic Tuning in Engine Files**: Keep all scheduling logic, heuristic optimization, disruption handling, and constraint validation cleanly isolated inside `src/engine/`.
3. **State Consistency**: Ensure `SchedulerContext.tsx` remains the single source of truth for the dataset, interviews, metrics, validations, and disruption logs.
4. **Zero Build/Lint Regressions**: Validate with `lint_applet` and `compile_applet` to maintain 100% build health.
