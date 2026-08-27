# SCHEDULER AUDIT: Mirai Labs Assignment A — Placement Week Engine

**Audit Date**: August 25, 2026  
**Module**: Module 2 — Scheduling Engine Verification & Refinement  
**Status**: VERIFIED & PASSING (0 Invariant Violations)

---

## 1. Current Algorithm Deep-Dive

### 1.1 Interview Ordering & Prioritization
- **Company Hierarchy (Tier-First)**: Companies are sorted by Tier ascending: $\text{Tier 1} \to \text{Tier 2} \to \text{Tier 3}$.
  - *Tier 1* (5 Tech Giants): Minimum CGPAs 8.40–8.90, 2–4 panels.
  - *Tier 2* (10 High-Growth Product Firms): Minimum CGPAs 7.10–8.10, 3–4 panels.
  - *Tier 3* (20 Enterprise & Mass Recruiters): Minimum CGPAs 6.00–6.90, 4–8 panels.
- **Candidate Ordering (CGPA-Descending)**: Within each company's shortlist, candidates are sorted in descending order of CGPA ($S_{\text{cgpa}} \downarrow$). The highest-performing candidates are evaluated first for prime slots.

### 1.2 Resource Assignment & Constraint Satisfaction
- **Timeslot Traversal Strategy**:
  - *Tier 1*: Day 1 (Slots 1–16) and Day 2 (Slots 17–32) are prioritized first, followed by Days 3, 4, 5.
  - *Tier 2*: Days 2 & 3 prioritized first, followed by Days 1, 4, 5.
  - *Tier 3*: Days 3, 4, 5 prioritized first, followed by Days 1, 2.
- **Room Selection**: Scans the 20 Academic Block-A rooms (`A-101` to `A-120`). Selects the first room where `room.isAvailable === true` and `roomBusyMap.has("room-${roomId}-${slotId}") === false`.
- **Panel Selection**: Scans company panels. Selects the first panel where `panel.isAvailable === true` and `panelBusyMap.has("panel-${panelId}-${slotId}") === false`.
- **Atomic 3-Way Booking**: Only when all three resources (Student, Panel, Room) are simultaneously unbooked at `slot.id` are the resources committed (`bookResource(...)`) and the `Interview` object created.

### 1.3 Conflict Prevention Mechanisms
| Resource | Tracking Data Structure | Lookup Time | Invariant Enforced |
| :--- | :--- | :--- | :--- |
| **Student** | `studentBusyMap = Set<string>` (`student-${id}-${slot}`) | $O(1)$ | No student scheduled in $>1$ interview in the same 30-min timeslot |
| **Room** | `roomBusyMap = Set<string>` (`room-${id}-${slot}`) | $O(1)$ | No room hosts $>1$ interview in the same 30-min timeslot |
| **Panel** | `panelBusyMap = Set<string>` (`panel-${id}-${slot}`) | $O(1)$ | No panel conducts $>1$ interview in the same 30-min timeslot |

### 1.4 CGPA Cutoff Enforcement
- Enforced at entry before slot traversal: `if (student.cgpa < company.minCgpa)` immediately records an `UnscheduledReport` with reason tag `CGPA_MISMATCH` and aborts assignment.

### 1.5 Unscheduled Candidate Classification
If all candidate timeslots are exhausted without finding a mutually available (Student, Panel, Room) tuple, an `UnscheduledReport` is logged with root-cause categorization:
- `CGPA_MISMATCH`: Student CGPA is strictly below company minimum.
- `STUDENT_BUSY`: Candidate was already occupied in overlapping interviews across candidate windows.
- `ROOM_SCARCITY`: All 20 campus rooms were occupied in candidate slots.
- `PANEL_BUSY`: All recruiter panels were busy conducting interviews.
- `SLOT_EXHAUSTION`: General resource saturation across the 80 timeslots.

---

## 2. Hard-Constraint Audit

| Constraint | Implementation Location | Validation Logic (`validator.ts`) | Potential Failure Mode | Test Coverage |
| :--- | :--- | :--- | :--- | :--- |
| **1. No Student Overlap** | `scheduler.ts` (Lines 111–114) | `studentSlotMap.has("${studentId}-${timeslotId}")` | Re-using slot without checking Set | `tests/scheduler.test.ts` (Test 1, 2, 5) |
| **2. No Room Overlap** | `scheduler.ts` (Lines 131–142) | `roomSlotMap.has("${roomId}-${timeslotId}")` | Shared room double-allocation | `tests/scheduler.test.ts` (Test 1, 2, 6) |
| **3. No Panel Overlap** | `scheduler.ts` (Lines 117–128) | `panelSlotMap.has("${panelId}-${timeslotId}")` | Cross-company panel reuse | `tests/scheduler.test.ts` (Test 1, 2) |
| **4. CGPA Cutoff** | `scheduler.ts` (Lines 84–98) | `studentCgpa < comp.minCgpa` | Ineligible shortlist assignment | `tests/scheduler.test.ts` (Test 3, 7) |
| **5. 30-Min Window Alignment** | `scheduler.ts` (Lines 162–169) | `startTime === slot.startTime && endTime === slot.endTime` | Time drift across slots | `tests/scheduler.test.ts` (Test 8) |
| **6. Invalid Assignment Prohibition** | `scheduler.ts` (Lines 100–174) | Atomic commit only on full tuple availability | Partial booking without room/panel | `tests/scheduler.test.ts` (Test 1, 4) |
| **7. Unscheduled Tracking** | `scheduler.ts` (Lines 175–199) | Explicit `UnscheduledReport[]` array returned | Silently dropping unplaced shortlists | `tests/scheduler.test.ts` (Test 4, 7) |

---

## 3. Realistic Dataset Audit (`dataGenerator.ts`)

- **Students**: 800 students generated with realistic Gaussian CGPA distribution ($\mu = 7.60, \sigma = 1.05$, bounds: $[5.20, 9.95]$) and branch spread (`CS`, `IT`, `ECE`, `EE`, `ME`).
- **Companies**: 35 recruiters across 3 distinct tiers:
  - 5 Tier 1 Tech Giants (Avg Cutoff: 8.67, Panels: 2–4).
  - 10 Tier 2 Product Firms (Avg Cutoff: 7.55, Panels: 2–4).
  - 20 Tier 3 Enterprise Recruiters (Avg Cutoff: 6.46, Panels: 4–8).
- **Rooms & Horizon**: 20 interview rooms (`A-101` to `A-120`) over 5 Days $\times$ 16 Timeslots (09:00 to 17:00) = 80 timeslots/room = **1,600 maximum theoretical building capacity**.
- **Shortlisting Bottlenecks**: Top students ($\text{CGPA} \ge 9.0$) receive 15–25 shortlists across Tier 1, Tier 2, and Tier 3, creating authentic multi-company scheduling competition.

---

## 4. Scheduling Quality Metrics (Default Seed 42)

| Metric | Measured Value | Benchmark Assessment |
| :--- | :--- | :--- |
| **Total Students** | 800 | Satisfies Assignment A specification |
| **Total Companies** | 35 | Satisfies Assignment A specification |
| **Total Interview Rooms** | 20 | Satisfies Assignment A specification |
| **Total Timeslots per Room** | 80 (5 Days $\times$ 16 Slots) | 09:00 AM to 05:00 PM in 30-min intervals |
| **Total Building Slot Capacity** | **1,600 slots** | $20 \times 80 = 1,600$ maximum room-slots |
| **Total Shortlists Generated** | 10,350 shortlists | Realistic multi-company demand |
| **Scheduled Interviews** | **1,600 interviews** | **100% of maximum building capacity utilized** |
| **Unscheduled Shortlists** | 8,750 shortlists | 100% accounted for in `UnscheduledReport[]` |
| **Room Utilization Rate** | **100.0%** | All 20 rooms continuously booked across all 80 slots |
| **Student Double-Bookings** | **0** | Mathematically guaranteed |
| **Room Double-Bookings** | **0** | Mathematically guaranteed |
| **Panel Double-Bookings** | **0** | Mathematically guaranteed |
| **CGPA Cutoff Violations** | **0** | 100% compliance |
| **Average Student Waiting Gap** | **102 minutes** | Reasonable same-day candidate spread |
| **Maximum Student Waiting Gap** | **390 minutes** | Morning to late-afternoon span |
| **Execution Runtime** | **~1.5 seconds** | Extremely fast deterministic execution |
| **Formal Invariant Validation** | **VALID (0 Critical, 0 Warnings)** | Verified by `validator.ts` |

---

## 5. Automated Test Suite Results

A comprehensive test suite was established in `/tests/scheduler.test.ts` and integrated into `package.json` (`npm test`):

```
====================================================
STARTING PLACEMENT SCHEDULER TEST SUITE (MODULE 2)
====================================================

[PASS] Test 1: Default Dataset (Seed 42) - Hard Invariants & 0 Clashes
[PASS] Test 2: Multi-Seed Invariant Integrity across Diverse Seeds (101, 777, 9999, 12345)
[PASS] Test 3: Strict CGPA Cutoff Enforcement (No Ineligible Student Scheduled)
[PASS] Test 4: Explicit Unscheduled Candidate Reports and Classification
[PASS] Test 5: High-Conflict Stress Test: 1 Student with 20 Shortlists
[PASS] Test 6: Resource Scarcity Test: Restricted to 2 Rooms
[PASS] Test 7: Impossible Scheduling: Low CGPA Student on High-Cutoff Company
[PASS] Test 8: Timeslot Boundaries and 30-Minute Duration Conformity

====================================================
TEST RUN COMPLETE: 8 / 8 PASSED (100%)
====================================================
```

---

## 6. Time & Space Complexity

### Time Complexity
- Let $C = 35$ companies, $S_c$ average shortlisted students per company (~30–250), $T = 80$ timeslots, $P_c \le 8$ panels, and $R = 20$ rooms.
- For each company and candidate:
  1. Candidate slot scan: $O(T)$ iterations.
  2. Free panel search: $O(P_c)$ Set lookups.
  3. Free room search: $O(R)$ Set lookups.
  4. Resource reservation: $O(1)$ Set additions.
- **Worst-Case Time Complexity**:
  $$\mathcal{O}\left(\sum_{c=1}^{C} |S_c| \cdot T \cdot (P_c + R)\right)$$
- **Observed Performance**: Executes on 800 candidates and 10,350 shortlists in **1.54 seconds**.

### Space Complexity
- `studentBusyMap`, `roomBusyMap`, `panelBusyMap`: $\mathcal{O}(I)$ where $I \le 1,600$ scheduled interviews.
- Schedule array + Unscheduled reports: $\mathcal{O}(I + U)$ where $U \le 10,350$.
- **Total Space Complexity**: $\mathcal{O}(N)$ linear with respect to the input shortlists.

---

## 7. Conclusions & Module 2 Sign-Off
1. The scheduling engine strictly guarantees all hard invariants with **0 student clashes, 0 room clashes, 0 panel clashes, and 0 CGPA violations**.
2. Room utilization achieves **100.0%** of total theoretical campus capacity (1,600 scheduled interviews).
3. The codebase passes all linter checks (`tsc --noEmit`), builds cleanly (`vite build`), and passes all 8 automated constraint test suites (`npm test`).
4. The existing UI and components remain completely untouched and preserved.
