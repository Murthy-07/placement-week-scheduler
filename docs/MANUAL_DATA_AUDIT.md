# Module 9: Manual Data Management & Record Editing Audit

## 1. Inspection of Existing Application Views (Part 1)

Before implementing Module 9, a comprehensive inspection of existing views and data structures was conducted:

| File | Purpose | Initial Capability | Editing Status Found |
| :--- | :--- | :--- | :--- |
| `src/components/StudentsView.tsx` | Candidate directory, branch filters, CGPA filtering, candidate search, individual interview itinerary modal. | Read-Only | No add, edit, or delete operations existed. Only modal view of candidate itinerary was supported. |
| `src/components/CompaniesView.tsx` | Recruiter directory, tier filters, search, panel lists, shortlisted candidate counts. | Read-Only | No add, edit, or remove operations existed. |
| `src/components/RoomsView.tsx` | Physical room capacity, building assignment, occupancy stats. | Operational Disruption Trigger | Contained emergency maintenance disruption trigger (`handleMaintenanceToggle`), but no domain-level Room CRUD (add/edit/delete room records). |
| `src/components/DisruptionsView.tsx` | Operational simulation (panel delays, dropouts, candidate withdrawals, room outages, Day-1 crisis benchmark). | Dynamic Replanner | Manages active replanning on existing schedules, but does not perform domain master data creation or record modification. |
| `src/context/SchedulerContext.tsx` | State hub for dataset, configuration, scheduling, replanning, metrics, and CSV import. | Central Controller | Managed DEMO and IMPORTED data modes, but lacked granular record mutation handlers, stale-schedule dirty tracking, and 'EDITED' data source state. |
| `src/types.ts` | Domain entity definitions (`Student`, `Company`, `CompanyPanel`, `Room`, `PlacementConfig`, etc.). | Domain Types | Contains clean canonical models shared by both PRNG generator and CSV importer. |
| `src/engine/csvImporter.ts` | RFC 4180 CSV parser and multi-file validation engine. | Import Pipeline | Enforces schema validation, referential integrity, and type coercion. |
| `src/engine/dataGenerator.ts` | Deterministic PRNG data generator for demo data. | Synthetic Generator | Produces immutable default datasets when given seed/config. |

---

## 2. New Manual Data Management Architecture

To ensure manual edits adhere to the same stringent rules as imported CSV data without introducing backend databases, a dedicated **Record Manager Engine** (`src/engine/recordManager.ts`) has been designed.

### Core Principles:
1. **Unified Domain Model**: Manual operations manipulate the exact same `Student`, `Company`, `CompanyPanel`, `Room`, and `Timeslot` structures as CSV imports and PRNG demo generation.
2. **Referential Integrity**: Adding a shortlist requires verifiable student and company existence; adding a panel requires valid company linkage; removing entities cascades safely with warnings.
3. **Strict Invariant Validation**:
   - `Student`: Positive ID, non-empty name, valid CGPA ($0.00 \le \text{CGPA} \le 10.00$), valid branch (`CS`, `IT`, `ECE`, `EE`, `ME`).
   - `Company`: Positive ID, non-empty name, valid Tier (`1 | 2 | 3`), valid min CGPA cutoff ($0.00 \le \text{minCgpa} \le 10.00$), positive interview duration.
   - `Room`: Unique room number, non-empty building name, availability flag.
   - `CompanyPanel`: Unique panel ID, valid company foreign key, non-empty panel name.
4. **Stale Schedule Safety**:
   - Any record modification immediately sets `isScheduleStale = true` with a detailed audit description (`scheduleStaleReason`).
   - A persistent banner alerts the user: *"Current schedule was generated using previous data. [Regenerate Schedule]"*.
   - Never silently passes stale schedule metrics as valid.
5. **Data Source Mode Transition**:
   - `DEMO`: Pristine deterministic generated data.
   - `IMPORTED`: Freshly parsed and validated CSV data.
   - `EDITED`: Active working dataset with manual user modifications.
   - `[Reset to Default Demo Data]`: Restores pristine `DEFAULT_PLACEMENT_CONFIG` and seed 42 dataset.

---

## 3. Detailed Editing Capabilities per Domain Entity

### 3.1 Student Management
- **Add Student**: Assigns next available ID (or user-specified unique ID), name, branch, CGPA, email, and empty shortlist array.
- **Edit Student**: Edits candidate name, CGPA, branch, and email. If CGPA is lowered below existing company cutoffs, soft warnings are flagged.
- **Delete Student**: Deletes candidate from dataset and purges all references from company `shortlistedStudentIds`. Warns user if candidate was scheduled in active interviews.

### 3.2 Company Management
- **Add Company**: Creates company record with Tier (1, 2, 3), min CGPA cutoff, interview duration (minutes), and initial panel count.
- **Edit Company**: Updates recruiter parameters. If CGPA cutoff is raised, warnings are given for candidates falling below new threshold.
- **Delete Company**: Removes recruiter, cascading deletion to all student `shortlistedCompanyIds` and panels.

### 3.3 Shortlist Management
- **Add Shortlist**: Adds bidirectional link between student and company. Validates that student and company exist and relation is unique. Issues warning if student CGPA < company cutoff.
- **Remove Shortlist**: Unlinks student and company bidirectionally.

### 3.4 Room Management
- **Add Room**: Adds unique room number and building venue.
- **Edit Room**: Edits room number, building, and availability flag.
- **Delete Room**: Removes room from dataset.

### 3.5 Panel Management
- **Add Panel**: Adds an interview panel belonging to a specific company.
- **Edit Panel**: Renames panel or toggles availability.
- **Delete Panel**: Removes panel from company's panel list.

---

## 4. Schedule Stale-State Handling

When any record is added, edited, or deleted:
1. `isScheduleStale` is set to `true`.
2. `scheduleStaleReason` records the human-readable action (e.g., `"Added student Aaron Burr"`, `"Updated Google cutoff to 9.00"`).
3. The global top banner and navbar badge display `"Schedule is Stale"`.
4. The user can click `[Regenerate Schedule]` at any time to run the fast Greedy + Tier Priority scheduling engine over the modified dataset.
5. Upon regeneration, `isScheduleStale` resets to `false`, and all metrics, conflicts, and defense dossiers update instantaneously.

---

## 5. Verification and Test Results

The comprehensive test suite verifies:
- Student creation, editing, deletion, and duplicate rejection.
- Company creation, editing, deletion, and tier validation.
- Shortlist additions, unlinking, duplicate prevention, and cutoff warnings.
- Room addition, case-insensitive duplicate rejection, and updates.
- Panel creation, editing, and deletion within companies.
- Stale schedule flag activation and clean regeneration.
- Reset to default demo data.
- CSV import parity and compatibility.
- Scale test with 4,000 students, 50 companies, 30 rooms, 40 panels, and 10 days with zero clashes.

All 7 test suites pass completely (51 existing + 20 manual data tests = **71 tests passed**).

---

## 6. Known Limitations
- Manual edits are maintained in client memory during the active session. If the user desires persistent external storage across devices, they can export or import CSV files.
- Manual changes convert data mode to `EDITED`. Clicking "Reset to Initial Schedule" or "Reset to Default Demo Data" resets working state to pristine demo baseline.

