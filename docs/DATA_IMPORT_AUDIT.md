# Module 8: Real-World Data Input & CSV Import Audit

## 1. Overview & Objectives

Module 8 enhances the University Placement Scheduling System with real-world data import capabilities, allowing placement coordinators to supply actual college datasets via standard CSV files.

### Key Objectives
1. **Zero Fake Imports**: All uploaded CSV rows are parsed, type-checked, and converted into real entities (`Student`, `Company`, `Room`, `CompanyPanel`, `Timeslot`) that directly drive `SchedulingEngine`.
2. **Deterministic Dual-Mode Operation**: The application maintains clear separation between **Generated Demo Data** (PRNG-based) and **Imported Real Data** (CSV-based) with a persistent indicator badge in the navigation bar.
3. **Robust Tokenization & RFC 4180 Compliance**: Custom CSV lexer handles escaped quotes (`""`), commas within quotes (`"Doe, John"`), CRLF / LF line endings, and trimmed whitespace.
4. **Comprehensive Validation & Referential Integrity**: Every record is scrutinized for schema conformity, duplicate IDs, out-of-bound values (e.g. CGPA $< 0$ or $> 10$), and valid foreign key references.
5. **No Silent Data Mutation**: Invalid rows are never silently discarded or substituted with fake records. Specific row numbers and column diagnostic errors are rendered for coordinator remediation.

---

## 2. Supported File Types & Schemas

The importer supports five modular CSV file types:

### A. Students (`students.csv`) — *Required*
- **Headers**: `student_id`, `name`, `cgpa`, `branch`, `email`
- **Validation**:
  - `name`: Non-empty string.
  - `cgpa`: Number between $0.00$ and $10.00$.
  - `student_id`: Unique identifier (numeric or alphanumeric like `S101`).
  - `branch`: Optional; maps to `'CS' | 'IT' | 'ECE' | 'EE' | 'ME'` with default fallback.

### B. Companies (`companies.csv`) — *Required*
- **Headers**: `company_id`, `name`, `tier`, `min_cgpa`, `interview_duration`
- **Validation**:
  - `name`: Non-empty string.
  - `tier`: `1` (Dream/Super Dream), `2` (Core), or `3` (Mass/Open). Also accepts strings (`TIER_1`, `DREAM`, `CORE`, `MASS`).
  - `min_cgpa`: Cutoff threshold between $0.00$ and $10.00$.
  - `interview_duration`: Slot length in minutes (default `30`).

### C. Shortlists (`shortlists.csv`) — *Optional*
- **Headers**: `student_id`, `company_id`
- **Validation**:
  - Referential integrity: `student_id` must exist in `students.csv`, and `company_id` must exist in `companies.csv`.
  - Duplicate relationships are detected and deduplicated with warnings.
  - *Fallback*: If omitted, shortlists are automatically derived based on student CGPA and company `min_cgpa` eligibility.

### D. Rooms (`rooms.csv`) — *Optional*
- **Headers**: `room_id`, `room_number`, `building`, `is_available`
- **Validation**:
  - `room_number`: Non-empty string (e.g., `A-101`, `Lab-3`).
  - *Fallback*: If omitted, rooms are provisioned based on `PlacementConfig.roomCount`.

### E. Panels (`panels.csv`) — *Optional*
- **Headers**: `panel_id`, `company_id`, `panel_name`, `is_available`
- **Validation**:
  - `company_id`: Must reference a valid company from `companies.csv`.
  - *Fallback*: If omitted, standard panels per company are provisioned according to company tier.

---

## 3. Architecture & Data Flow

```
[User Uploads CSV Files / Pastes Text / Loads Sample Template]
                            ↓
             [csvImporter.ts / parseCsvRows]
         (RFC 4180 Lexer: Quotes, Commas, Escapes)
                            ↓
               [Entity-Level Row Parsers]
  (parseStudentsCsv, parseCompaniesCsv, parseShortlistsCsv, etc.)
                            ↓
          [Referential Integrity & Cross-File Checks]
(Foreign keys, duplicate IDs, cutoff bounds, availability flags)
                            ↓
              [buildImportedDataset()]
      ┌─────────────────────┴─────────────────────┐
   [Errors > 0]                                [Errors = 0]
        ↓                                           ↓
[Display Diagnostic Table]               [Generate Full Dataset Object]
[Disable "Apply" Button]                            ↓
                                   [SchedulerContext.importCsvDataset()]
                                                    ↓
                                         [Switch DataSourceMode to IMPORTED]
                                                    ↓
                                    [SchedulingEngine.generateSchedule()]
                                                    ↓
                                     [Zero-Clash Interview Schedule & Metrics]
```

---

## 4. Discrepancy Reconciliation

When imported CSV counts differ from the active `PlacementConfig` (e.g. CSV has 3,782 students while config is set to 4,000):
1. **Zero Silent Overwrites**: The application highlights the exact count discrepancy in the validation summary panel.
2. **Explicit Sync Action**: A dedicated button `[Sync Configuration with CSV Counts]` is provided in `CsvImportSection.tsx` to automatically align `PlacementConfig.studentCount`, `companyCount`, and `roomCount` with the imported dataset upon explicit user intent.

---

## 5. Verification & Test Results

The CSV Import module is verified by `tests/csv_import.test.ts` alongside all previous modules:

- **Module 2 (Scheduler Engine)**: 8/8 Tests Passed
- **Module 3 (Replanning Engine)**: 7/7 Tests Passed
- **Module 4 (Metrics Engine)**: 8/8 Tests Passed
- **Module 6 (Configuration Engine)**: 9/9 Tests Passed
- **Module 7 (Configuration UI)**: 12/12 Tests Passed
- **Module 8 (CSV Import & Real Data)**: 7/7 Tests Passed
- **TOTAL: 51 / 51 TESTS PASSED**
