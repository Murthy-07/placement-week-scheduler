# EXISTING ARCHITECTURE: Placement Week Scheduler

## 1. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PRESENTATION LAYER                               │
│  React 19 + TypeScript + Tailwind CSS (Utility Dashboard Design)            │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                              Navbar                                   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────┬────────────────┬─────────────────┬──────────────────┐    │
│  │ DashboardView │ScheduleGridView│  StudentsView   │  CompaniesView   │    │
│  ├───────────────┼────────────────┼─────────────────┼──────────────────┤    │
│  │   RoomsView   │DisruptionsView │  ConflictsView  │DefenseDossierView│    │
│  └───────────────┴────────────────┴─────────────────┴──────────────────┘    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (Hooks: useScheduler)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            STATE MANAGEMENT LAYER                           │
│  src/context/SchedulerContext.tsx                                            │
│  - Holds active dataset, original & current schedule, diff logs, metrics    │
│  - Dispatches actions: reset, runDisruption, resolve, filter                │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (Method Invocations)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CORE BUSINESS LOGIC ENGINE                        │
│  src/engine/                                                                │
│  ├── dataGenerator.ts     -> Mulberry32 PRNG Dataset Generator              │
│  ├── scheduler.ts         -> Multi-Constraint Tier Backtracking Scheduler   │
│  ├── replanningEngine.ts  -> Disruption Simulator & Minimal-Churn Re-planner│
│  ├── validator.ts         -> Invariant Auditor & Overlap Detector           │
│  └── metricsEngine.ts     -> Telemetry & Performance Calculator             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2. Technology Stack
- **Frontend Framework**: React 19 (Functional Components + Hooks)
- **Language**: TypeScript 5.8 (Strict Type Safety)
- **Styling**: Tailwind CSS (PostCSS/Vite integrated, Professional Slate Theme)
- **Icons**: Lucide-React
- **Build Tool**: Vite 6.2
- **Data Store**: In-Memory Deterministic State + React Context API

## 3. Communication & Data Flow
1. **Initialization**: On application mount, `SchedulerContext` calls `generateInitialDataset(seed = 42)` in `dataGenerator.ts`.
2. **Initial Schedule Computation**: The context immediately passes the dataset to `generateSchedule(dataset)` in `scheduler.ts`.
3. **Validation & Metrics**: The generated schedule is validated by `validateSchedule(interviews, dataset)` and metrics are computed via `calculateMetrics(interviews, dataset)`.
4. **State Distribution**: The schedule, metrics, validation results, and raw entities are published via React Context to all 8 UI views.
5. **Disruptions & Replanning**: When a coordinator triggers a disruption in `DisruptionsView` or `DashboardView`, `SchedulerContext` routes the payload to the corresponding method in `replanningEngine.ts`. The resulting updated schedule and diff object (`ReplanResult`) are written back to context, instantly updating all views.
