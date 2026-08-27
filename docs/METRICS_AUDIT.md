# METRICS, TELEMETRY & END-TO-END VERIFICATION AUDIT

**Audit Date**: August 25, 2026  
**Module**: Module 4 — Metrics, Telemetry & End-to-End Verification  
**Status**: VERIFIED & FULLY PASSING (0 Discrepancies, 100% Cross-Checked)

---

## 1. Domain Terminology & Distinctions

To ensure clarity across reports and dashboards, terms are strictly distinguished:

| Term | Formal Definition | Seed 42 Measured Value |
| :--- | :--- | :--- |
| **Shortlisted Candidate Pairing** | A $(Candidate, Company)$ pair expressing eligibility and recruitment interest. | 10,350 total shortlists across 800 candidates |
| **Theoretical Building Capacity** | $\text{Total Rooms} \times \text{Total Timeslots} = 20 \times 80$. Maximum physical slots available. | 1,600 maximum interview slots |
| **Scheduled Interviews** | Active assignments ($Status \in \{\text{'SCHEDULED'}, \text{'MOVED'}\}$) with conflict-free $(Student, Panel, Room, Timeslot)$ tuples. | 1,600 scheduled interviews |
| **Unscheduled Shortlists** | Eligible shortlist pairings that could not be assigned due to physical room-slot capacity constraints ($10,350 - 1,600$). | 8,750 unscheduled shortlists |
| **Room-Slot Utilization Rate** | Proportion of available room-time occupied by active interviews ($\frac{1600}{1600} \times 100$). | **100.0%** (Full building capacity) |
| **Shortlist Fulfillment Rate** | Proportion of total candidate demand fulfilled within campus capacity ($\frac{1600}{10350} \times 100$). | **15.5%** |

---

## 2. Metric Formulas & Implementation Specifications

All metrics are calculated dynamically in `src/engine/metricsEngine.ts` from the active interview list and dataset entities:

### 2.1 Inventory & Volume Metrics
- **`totalShortlists`**:
  $$\sum_{s \in \text{Students}} |s.\text{shortlistedCompanyIds}|$$
- **`totalCapacitySlots`**:
  $$|\text{Rooms}| \times |\text{Timeslots}| = 20 \times 80 = 1,600$$
- **`totalScheduledInterviews`**:
  $$|\{i \in \text{Interviews} \mid i.\text{status} \in \{\text{'SCHEDULED'}, \text{'MOVED'}\}\}|$$
- **`totalUnscheduledInterviews`**:
  $$\max(0, \text{totalShortlists} - \text{totalScheduledInterviews})$$

### 2.2 Capacity & Success Rates
- **`roomUtilizationRate`**:
  $$\text{roomUtilizationRate} = \begin{cases} \left(\frac{\text{totalScheduledInterviews}}{\text{totalCapacitySlots}} \times 100\right), & \text{if } \text{totalCapacitySlots} > 0 \\ 0, & \text{otherwise} \end{cases}$$
- **`schedulingSuccessRate`** (Shortlist Fulfillment Rate):
  $$\text{schedulingSuccessRate} = \begin{cases} \left(\frac{\text{totalScheduledInterviews}}{\text{totalShortlists}} \times 100\right), & \text{if } \text{totalShortlists} > 0 \\ 0, & \text{otherwise} \end{cases}$$

### 2.3 Hard Invariant Audits
- **`studentClashes`**:
  Count of $(studentId, timeslotId)$ keys where frequency $\ge 2$. (Verified **0**).
- **`roomConflicts`**:
  Count of $(roomId, timeslotId)$ keys where frequency $\ge 2$. (Verified **0**).
- **`panelConflicts`**:
  Count of $(panelId, timeslotId)$ keys where frequency $\ge 2$. (Verified **0**).

### 2.4 Candidate Waiting Time Dynamics
- **Definition of Idle Waiting Gap**:
  Waiting time is calculated exclusively between a candidate's consecutive interviews *on the same placement day*.
  - For candidate $s$ with ordered interviews $[i_1, i_2, \dots, i_k]$ on Day $D$:
    $$\text{Gap}_j = \text{StartTime}(i_{j+1}) - \text{EndTime}(i_j)$$
  - If interviews are back-to-back (e.g. 09:00–09:30 and 09:30–10:00), $\text{Gap} = 0 \text{ minutes}$.
  - Gaps before a student's first interview or after their last interview on a day are *not* counted as idle waiting between interviews.
  - Multi-day intervals (e.g. Day 1 afternoon to Day 2 morning) are *not* aggregated into daytime waiting gaps.
- **`averageWaitTimeMinutes`**:
  $$\text{averageWaitTimeMinutes} = \begin{cases} \text{round}\left(\frac{\sum \text{Gap}_j}{|\text{Gaps}|}\right), & \text{if } |\text{Gaps}| > 0 \\ 0, & \text{otherwise} \end{cases}$$
- **`maxWaitTimeMinutes`**:
  $$\text{maxWaitTimeMinutes} = \begin{cases} \max(\{\text{Gap}_j\}), & \text{if } |\text{Gaps}| > 0 \\ 0, & \text{otherwise} \end{cases}$$

### 2.5 Disruption Churn
- **`replanChurnPercentage`**:
  $$\text{replanChurnPercentage} = \frac{|\text{Changed Assignments}|}{|\text{Original Scheduled Assignments}|} \times 100$$
  where $\text{Changed Assignments} = \text{Moved} + \text{Cancelled}$.

---

## 3. Independent Cross-Check Verification (`scripts/verifyMetrics.ts`)

An independent calculation algorithm was executed on the default dataset (Seed 42) and compared side-by-side against `metricsEngine.ts`:

| Metric | `metricsEngine.ts` | Independent Script | Match Status |
| :--- | :--- | :--- | :--- |
| **Total Shortlists** | 10,350 | 10,350 | **EXACT MATCH (100%)** |
| **Total Scheduled** | 1,600 | 1,600 | **EXACT MATCH (100%)** |
| **Total Unscheduled** | 8,750 | 8,750 | **EXACT MATCH (100%)** |
| **Scheduling Success Rate** | 15.5% | 15.5% | **EXACT MATCH (100%)** |
| **Room Utilization Rate** | 100.0% | 100.0% | **EXACT MATCH (100%)** |
| **Student Clashes** | 0 | 0 | **EXACT MATCH (100%)** |
| **Room Conflicts** | 0 | 0 | **EXACT MATCH (100%)** |
| **Panel Conflicts** | 0 | 0 | **EXACT MATCH (100%)** |
| **Average Wait Time** | 102 min | 102 min | **EXACT MATCH (100%)** |
| **Max Wait Time** | 390 min | 390 min | **EXACT MATCH (100%)** |

---

## 4. Edge-Case Verification

The metrics engine was subjected to edge cases in `tests/metrics.test.ts`:
1. **Empty Schedule**: Verified zero division-by-zero, no `NaN`, no `Infinity` ($0\%$ rates, $0$ wait times).
2. **Single Interview**: Correctly computes $0$ wait time (no second interview to wait for).
3. **Adjacent Interviews**: Confirms back-to-back interviews yield exactly $0$ minutes idle wait.
4. **Specific Non-Zero Gap**: Verified 60-min gap (09:00–09:30 and 10:30–11:00) computes exactly $60$ min average and max.
5. **Multi-Day Schedule**: Verified gaps across separate calendar days are not conflated into waiting time.
6. **Zero Room Capacity**: Handles $|\text{Rooms}| = 0$ safely without `NaN` or unhandled exceptions.
7. **Synthetic Clashes**: Injected intentional duplicates and confirmed $100\%$ precision in reporting student, room, and panel conflicts.

---

## 5. Automated Test Suite Summary (`npm test`)

```
====================================================
STARTING PLACEMENT SCHEDULER TEST SUITE (MODULE 2)
====================================================
[PASS] Test 1: Default Dataset (Seed 42) - Hard Invariants & 0 Clashes
[PASS] Test 2: Multi-Seed Invariant Integrity across Diverse Seeds
[PASS] Test 3: Strict CGPA Cutoff Enforcement (No Ineligible Student Scheduled)
[PASS] Test 4: Explicit Unscheduled Candidate Reports and Classification
[PASS] Test 5: High-Conflict Stress Test: 1 Student with 20 Shortlists
[PASS] Test 6: Resource Scarcity Test: Restricted to 2 Rooms
[PASS] Test 7: Impossible Scheduling: Low CGPA Student on High-Cutoff Company
[PASS] Test 8: Timeslot Boundaries and 30-Minute Duration Conformity
====================================================
TEST RUN COMPLETE: 8 / 8 PASSED
====================================================

====================================================
STARTING REPLANNING ENGINE TEST SUITE (MODULE 3)
====================================================
[PASS] Test 1: Scenario 1: Panel Delay (120 min delay on Day 1)
[PASS] Test 2: Scenario 2: Panel Dropout (Dropout of Google Panel A)
[PASS] Test 3: Scenario 3: Student Withdrawal (10 Top Candidates Withdraw)
[PASS] Test 4: Scenario 4: Room Outage (Room A-101 AC Breakdown on Day 1)
[PASS] Test 5: Scenario 5: Combined Day-1 Crisis (Multi-Disruption Stress Test)
[PASS] Test 6: Edge Case: Double Sequential Replanning (Delay followed by Dropout)
[PASS] Test 7: Before/After Diff Contract Verification
====================================================
REPLANNING TEST RUN COMPLETE: 7 / 7 PASSED
====================================================

====================================================
STARTING METRICS ENGINE TEST SUITE (MODULE 4)
====================================================
[PASS] Test 1: Empty Schedule Edge Case: No NaN, No Division by Zero
[PASS] Test 2: Single Scheduled Interview Metric Accuracy
[PASS] Test 3: Student with Adjacent Interviews: 0 min Idle Wait
[PASS] Test 4: Student with 60-Minute Gap (09:00-09:30 and 10:30-11:00)
[PASS] Test 5: Interviews on Different Days (Day 1 vs Day 2): Gaps Not Aggregated
[PASS] Test 6: Clash Metric Accuracy upon Intentional Violations
[PASS] Test 7: Zero Room Capacity: Safe Handling without NaN
[PASS] Test 8: Replan Churn and Disruption Count Telemetry Pass-Through
====================================================
METRICS TEST RUN COMPLETE: 8 / 8 PASSED
====================================================
```

---

## 6. Conclusions & Module 4 Sign-Off
1. All telemetry calculations in `metricsEngine.ts` are mathematically consistent, robust against edge cases, and $100\%$ verified by independent cross-checks.
2. The entire test suite consists of **23 automated tests (8 Scheduler + 7 Replanning + 8 Metrics)** with a **100% pass rate**.
3. Zero UI modifications were made; all existing components and navigation remain intact and functional.
