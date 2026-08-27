# ASSUMPTIONS: Placement Week Scheduler

## 1. Operating Assumptions
1. **Timeslot Resolution**: Each timeslot is exactly 30 minutes in duration, with 16 continuous slots per placement day (09:00 to 17:00).
2. **Placement Horizon**: The drive spans exactly 5 days (Monday to Friday, Day 1 to Day 5), providing 80 discrete timeslots per interview room.
3. **Room Capacity**: 20 interview rooms are allocated for the placement drive (A-101 through A-120 in Academic Block A). Each room accommodates at most 1 panel/interview per timeslot.
4. **Deterministic Reproducibility**: Using a seeded PRNG (`Mulberry32`), student CGPAs, branch distributions, and company shortlists are 100% reproducible for benchmark consistency.
5. **Hard Constraints**:
   - Zero student double-booking.
   - Zero room double-booking.
   - Zero panel double-booking.
   - CGPA cutoff strictly enforced ($CGPA_{student} \ge MinCGPA_{company}$).
6. **Tier Priorities**:
   - Tier 1 companies have highest priority on Days 1–2.
   - Tier 2 companies occupy Days 2–4.
   - Tier 3 companies occupy Days 3–5.
7. **Disruption Locality**: Replanning algorithms seek to minimize churn percentage and preserve unchanged interview timeslots for unaffected students whenever feasible.
