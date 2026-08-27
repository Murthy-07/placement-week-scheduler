# Module 7: Configuration Input Interface Audit

## 1. Overview & Placement in UI Hierarchy

Module 7 introduces a dedicated, high-visibility **Configuration Interface** (`src/components/ConfigurationView.tsx`) accessible directly via the top navigation bar (`Navbar.tsx` &rarr; "Configuration" with the `Sliders` icon).

This design preserves 100% of the existing single-view tabs (Dashboard, Master Schedule, Students, Companies, Rooms, Disruptions, Conflicts, Defense Dossier) without altering their layout, styling, or existing component signatures.

---

## 2. Configuration Parameters & Controls

The configuration interface exposes real, validated inputs for all core parameters defined in `PlacementConfig`:

### A. Dataset Specification
- **Number of Students (`studentCount`)**: Integer input ($1 \le N \le 10,000$). Automatically generates realistic candidate profiles with Gaussian CGPA distributions and randomized branch shortlists.
- **Number of Companies (`companyCount`)**: Integer input ($1 \le C \le 500$). Dynamically partitioned into Tier 1 (Dream/Super-Dream), Tier 2 (Core), and Tier 3 (Mass Recruiters).

### B. Resources & Infrastructure
- **Number of Rooms (`roomCount`)**: Integer input ($1 \le R \le 200$). Dynamically provisioned and distributed across physical buildings (`Academic Block A`, `Block B`, `Block C`... at 20 rooms per building).
- **Total Interview Panels (`panelCount`)**: Optional integer input ($1 \le P \le 1,000$). Overrides default tier-based allocations when set.

### C. Schedule & Operating Window
- **Placement Days (`placementDays`)**: Integer input ($1 \le D \le 30$). Sets the calendar horizon of the placement drive.
- **Daily Start Time (`startTime`)**: 24-hour time string (e.g., `09:00`, `08:30`).
- **Daily End Time (`endTime`)**: 24-hour time string (e.g., `17:00`, `18:00`).
- **Interview Duration (`interviewDurationMinutes`)**: Selectable slot interval (`15m`, `20m`, `30m` [Default], `45m`, `60m`, `90m`).
- **Inter-Interview Break (`breakDurationMinutes`)**: Selectable buffer interval (`0m` [Continuous], `5m`, `10m`, `15m`, `30m`).

### D. Determinism & Reproducibility
- **Dataset Seed (`seed`)**: Integer seed for the pseudo-random number generator (`Mulberry32`), guaranteeing bit-exact reproducible schedules across sessions.

---

## 3. Validation Architecture

Validation is performed reactively on the staged form state using `validatePlacementConfig(config)` from `src/types.ts`:
- **Student Count**: Must be $> 0$ and $\le 10,000$.
- **Company Count**: Must be $> 0$ and $\le 500$.
- **Room Count**: Must be $> 0$ and $\le 200$.
- **Panel Count**: Must be $> 0$ and $\le 1,000$ (if specified).
- **Placement Days**: Must be $> 0$ and $\le 30$.
- **Time Window**: `startTime` and `endTime` must be valid `HH:MM` strings, and `endTime` must strictly follow `startTime`.
- **Durations**: Interview duration must be $> 0$ and $\le 240$ min; break duration must be $\ge 0$ and $< 120$ min.

**UI Feedback**:
- When invalid, a prominent error alert lists all validation messages.
- The `[Apply & Generate Schedule]` button is disabled (`disabled={!validation.isValid}`).

---

## 4. Lifecycle & Pipeline Execution

```
[User Edits Form Inputs]
          ↓ (Staged in local React state, no auto-replan on keystroke)
[User Clicks "Apply & Generate Schedule"]
          ↓ (Validation Gate)
[SchedulerContext.updateConfig(formState)]
          ↓
[dataGenerator: generatePlacementDataset(config)]
          ↓
[scheduler: SchedulingEngine.generateSchedule(dataset)]
          ↓
[validator: validateSchedule(interviews, dataset)]
          ↓
[metricsEngine: calculateMetrics(interviews, dataset)]
          ↓
[React Views Updated with 0-Clash Master Schedule]
```

1. **No Keystroke Thrashing**: Modifying inputs updates local form state only. A banner notifies the coordinator: *"Unapplied Changes Staged"*.
2. **Explicit Apply**: Clicking `[Apply & Generate Schedule]` commits the changes to `SchedulerContext`, generating a fresh `dataset` and running the full `SchedulingEngine`.
3. **Reset to Default**: Clicking `[Reset to Default]` restores exact Assignment A baseline parameters from `DEFAULT_PLACEMENT_CONFIG` (800 students, 35 companies, 20 rooms, 5 days, 09:00–17:00, 30m slots, seed 42).

---

## 5. Live Capacity Preview Calculation

The live capacity card computes theoretical maximum slot-room capacity without hardcoded constants:

$$\text{Daily Operating Mins} = \text{End Mins} - \text{Start Mins}$$
$$\text{Slot Cycle} = \text{Interview Duration} + \text{Break Duration}$$
$$\text{Slots Per Room Per Day} = \left\lfloor \frac{\text{Daily Operating Mins}}{\text{Slot Cycle}} \right\rfloor$$
$$\text{Daily Campus Capacity} = \text{Room Count} \times \text{Slots Per Room Per Day}$$
$$\text{Total Available Capacity} = \text{Daily Campus Capacity} \times \text{Placement Days}$$
$$\text{Estimated Candidate Demand} \approx \text{Student Count} \times 2$$

---

## 6. Large Dataset Warning

When configuring large scale workloads ($\ge 2,500$ students, $> 10$ days, $> 50$ rooms, or $> 100$ companies), a high-visibility warning informs the coordinator that bipartite matching and graph optimization will execute across all shortlists and guarantee 0 hard clashes.

---

## 7. Files Changed and Created

### Files Created:
1. `src/components/ConfigurationView.tsx`: Full parameterization UI with validation, live capacity preview, quick scale presets, and apply/reset actions.
2. `tests/configuration_ui.test.ts`: 12 automated unit and integration tests for Module 7.
3. `docs/CONFIGURATION_UI_AUDIT.md`: This comprehensive architectural record.

### Files Modified:
1. `src/App.tsx`: Mounted `ConfigurationView` when `activeTab === 'config'`.
2. `src/components/Navbar.tsx`: Added `Configuration` navigation item with dynamic resource counts.
3. `src/components/DashboardView.tsx`: Generalized hardcoded counts (800 students, 35 companies, 20 rooms) to dynamic properties from `dataset` and `metrics`.
4. `src/components/ScheduleGridView.tsx`: Generalized dropdown options for companies and rooms to dynamic counts.
5. `src/components/RoomsView.tsx`: Generalized room counts and capacity computations.
6. `src/components/CompaniesView.tsx`: Generalized company and tier counts.
7. `src/components/StudentsView.tsx`: Generalized student pool sizes and average CGPA computation.
8. `src/types.ts`: Added validation rule for optional `panelCount`.
9. `src/engine/dataGenerator.ts`: Added panel count distribution logic when `panelCount` is overridden.
10. `package.json`: Included `tests/configuration_ui.test.ts` in `npm test` script.
