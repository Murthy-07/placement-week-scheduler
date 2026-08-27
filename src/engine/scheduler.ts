import { Company, CompanyPanel, Interview, PlacementDay, Room, Student, Timeslot, UnscheduledReport } from '../types';
import { Dataset } from './dataGenerator';

export interface ScheduleResult {
  interviews: Interview[];
  unscheduledReports: UnscheduledReport[];
  durationMs: number;
}

export class SchedulingEngine {
  private studentBusyMap = new Set<string>(); // "studentId-slotId"
  private roomBusyMap = new Set<string>();    // "roomId-slotId"
  private panelBusyMap = new Set<string>();   // "panelId-slotId"

  public resetBusyMaps(): void {
    this.studentBusyMap.clear();
    this.roomBusyMap.clear();
    this.panelBusyMap.clear();
  }

  public generateSchedule(dataset: Dataset): ScheduleResult {
    const startTime = performance.now();
    this.resetBusyMaps();

    const { companies, students, rooms, timeslots, placementDays } = dataset;
    const effectivePlacementDays = placementDays && placementDays.length > 0
      ? placementDays
      : Array.from(new Set(timeslots.map(t => t.dayId))).map(d => ({ id: d, dayNumber: d, date: '', description: `Day ${d}` }));
    const studentMap = new Map<number, Student>(students.map(s => [s.id, s]));
    const timeslotMap = new Map<number, Timeslot>(timeslots.map(t => [t.id, t]));

    const interviews: Interview[] = [];
    const unscheduledReports: UnscheduledReport[] = [];
    let interviewIdCounter = 1;

    // 1. Sort companies by Tier (Tier 1 -> Tier 2 -> Tier 3)
    const sortedCompanies = [...companies].sort((a, b) => a.tier - b.tier);

    // Preferential slot ordering by tier to simulate natural Day 1/2/3 placement hierarchy
    const slotsByDay = new Map<number, Timeslot[]>();
    for (const slot of timeslots) {
      if (!slotsByDay.has(slot.dayId)) {
        slotsByDay.set(slot.dayId, []);
      }
      slotsByDay.get(slot.dayId)!.push(slot);
    }

    for (const company of sortedCompanies) {
      // 2. Sort shortlisted students by CGPA descending
      const shortlistedStudents: Student[] = company.shortlistedStudentIds
        .map(id => studentMap.get(id)!)
        .filter(Boolean)
        .sort((a, b) => b.cgpa - a.cgpa);

      // Determine preferred timeslot sequence based on tier and available placement days
      const allDayIds = effectivePlacementDays.map(d => d.id).sort((a, b) => a - b);
      let dayOrder: number[] = [];

      if (allDayIds.length <= 2) {
        dayOrder = [...allDayIds];
      } else if (allDayIds.length === 5) {
        if (company.tier === 1) {
          dayOrder = [1, 2, 3, 4, 5];
        } else if (company.tier === 2) {
          dayOrder = [2, 3, 1, 4, 5];
        } else {
          dayOrder = [3, 4, 5, 1, 2];
        }
      } else {
        const n = allDayIds.length;
        const t1End = Math.max(1, Math.round(n * 0.4));
        const t2End = Math.max(t1End + 1, Math.round(n * 0.7));

        if (company.tier === 1) {
          const early = allDayIds.slice(0, t1End);
          const rest = allDayIds.slice(t1End);
          dayOrder = [...early, ...rest];
        } else if (company.tier === 2) {
          const early = allDayIds.slice(0, t1End);
          const mid = allDayIds.slice(t1End, t2End);
          const late = allDayIds.slice(t2End);
          dayOrder = [...mid, ...early, ...late];
        } else {
          const early = allDayIds.slice(0, t1End);
          const mid = allDayIds.slice(t1End, t2End);
          const late = allDayIds.slice(t2End);
          dayOrder = [...late, ...early, ...mid];
        }
      }

      const candidateSlots: Timeslot[] = dayOrder.flatMap(dayId => slotsByDay.get(dayId) || []);

      for (const student of shortlistedStudents) {
        // Hard constraint: CGPA cutoff check
        if (student.cgpa < company.minCgpa) {
          unscheduledReports.push({
            studentId: student.id,
            studentName: student.name,
            studentCgpa: student.cgpa,
            studentBranch: student.branch,
            companyId: company.id,
            companyName: company.name,
            companyTier: company.tier,
            reason: `Student CGPA (${student.cgpa.toFixed(2)}) is below company cutoff (${company.minCgpa.toFixed(2)})`,
            conflictingResource: 'CGPA_MISMATCH',
          });
          continue;
        }

        let scheduled = false;
        let failureReason = 'No overlapping free resources (Student, Room, Panel) found across all available timeslots.';
        let conflictType: UnscheduledReport['conflictingResource'] = 'SLOT_EXHAUSTION';

        // Check if student is totally booked across all candidate slots
        let studentBusyCount = 0;
        let roomScarcityCount = 0;
        let panelBusyCount = 0;

        for (const slot of candidateSlots) {
          // Constraint 1: Is Student Free?
          if (this.isResourceBusy('student', student.id, slot.id)) {
            studentBusyCount++;
            continue;
          }

          // Constraint 2: Is any Panel for this company Free?
          let availablePanel: CompanyPanel | null = null;
          for (const panel of company.panels) {
            if (panel.isAvailable && !this.isResourceBusy('panel', panel.id, slot.id)) {
              availablePanel = panel;
              break;
            }
          }

          if (!availablePanel) {
            panelBusyCount++;
            continue;
          }

          // Constraint 3: Is any Room Free?
          let availableRoom: Room | null = null;
          for (const room of rooms) {
            if (room.isAvailable && !this.isResourceBusy('room', room.id, slot.id)) {
              availableRoom = room;
              break;
            }
          }

          if (!availableRoom) {
            roomScarcityCount++;
            continue;
          }

          // ALL CONSTRAINTS SATISFIED: BOOK RESOURCES
          this.bookResource('student', student.id, slot.id);
          this.bookResource('panel', availablePanel.id, slot.id);
          this.bookResource('room', availableRoom.id, slot.id);

          interviews.push({
            id: interviewIdCounter++,
            studentId: student.id,
            studentName: student.name,
            studentCgpa: student.cgpa,
            studentBranch: student.branch,
            companyId: company.id,
            companyName: company.name,
            companyTier: company.tier,
            panelId: availablePanel.id,
            panelName: availablePanel.panelName,
            roomId: availableRoom.id,
            roomNumber: availableRoom.roomNumber,
            timeslotId: slot.id,
            dayId: slot.dayId,
            dayNumber: slot.dayId,
            startTime: slot.startTime,
            endTime: slot.endTime,
            status: 'SCHEDULED',
            durationMinutes: company.interviewDurationMinutes,
          });

          scheduled = true;
          break;
        }

        if (!scheduled) {
          if (studentBusyCount > candidateSlots.length * 0.4) {
            failureReason = `Student has ${studentBusyCount} conflicting interviews in overlapping time windows.`;
            conflictType = 'STUDENT_BUSY';
          } else if (roomScarcityCount > candidateSlots.length * 0.4) {
            failureReason = `All ${rooms.length} interview rooms are fully occupied in candidate slots.`;
            conflictType = 'ROOM_SCARCITY';
          } else if (panelBusyCount > candidateSlots.length * 0.4) {
            failureReason = `All panels for ${company.name} are concurrently conducting interviews.`;
            conflictType = 'PANEL_BUSY';
          }

          unscheduledReports.push({
            studentId: student.id,
            studentName: student.name,
            studentCgpa: student.cgpa,
            studentBranch: student.branch,
            companyId: company.id,
            companyName: company.name,
            companyTier: company.tier,
            reason: failureReason,
            conflictingResource: conflictType,
          });
        }
      }
    }

    const durationMs = Math.round(performance.now() - startTime);

    return {
      interviews,
      unscheduledReports,
      durationMs,
    };
  }

  public isResourceBusy(type: 'student' | 'room' | 'panel', resourceId: number, slotId: number): boolean {
    const key = `${type}-${resourceId}-${slotId}`;
    if (type === 'student') return this.studentBusyMap.has(key);
    if (type === 'room') return this.roomBusyMap.has(key);
    return this.panelBusyMap.has(key);
  }

  public bookResource(type: 'student' | 'room' | 'panel', resourceId: number, slotId: number): void {
    const key = `${type}-${resourceId}-${slotId}`;
    if (type === 'student') this.studentBusyMap.add(key);
    else if (type === 'room') this.roomBusyMap.add(key);
    else this.panelBusyMap.add(key);
  }

  public releaseResource(type: 'student' | 'room' | 'panel', resourceId: number, slotId: number): void {
    const key = `${type}-${resourceId}-${slotId}`;
    if (type === 'student') this.studentBusyMap.delete(key);
    else if (type === 'room') this.roomBusyMap.delete(key);
    else this.panelBusyMap.delete(key);
  }
}
