import {
  Company,
  CompanyPanel,
  DisruptionType,
  Interview,
  InterviewChange,
  ReplanResult,
  Room,
  Student,
  Timeslot,
} from '../types';
import { Dataset } from './dataGenerator';
import { SchedulingEngine } from './scheduler';

export interface PanelDelayParams {
  panelId: number;
  dayId: number;
  delayMinutes: number;
  startHour: number; // e.g. 9 for 09:00
}

export interface PanelDropoutParams {
  panelId: number;
  reason?: string;
}

export interface StudentWithdrawalParams {
  studentIds: number[];
  reason?: string;
}

export interface RoomUnavailableParams {
  roomId: number;
  dayId?: number;
  reason?: string;
}

export class ReplanningEngine {
  /**
   * Rebuilds the resource busy maps from current active interviews
   */
  private rebuildBusyMaps(
    interviews: Interview[],
    scheduler: SchedulingEngine
  ): void {
    // Reset scheduler maps
    scheduler.resetBusyMaps();

    for (const item of interviews) {
      if (item.status === 'SCHEDULED' || item.status === 'MOVED') {
        scheduler.bookResource('student', item.studentId, item.timeslotId);
        scheduler.bookResource('room', item.roomId, item.timeslotId);
        scheduler.bookResource('panel', item.panelId, item.timeslotId);
      }
    }
  }

  /**
   * Scenario 1: Panel Delay (Local Push-Forward Slide)
   */
  public handlePanelDelay(
    currentInterviews: Interview[],
    dataset: Dataset,
    params: PanelDelayParams,
    scheduler: SchedulingEngine = new SchedulingEngine()
  ): { updatedInterviews: Interview[]; replanResult: ReplanResult } {
    const { panelId, dayId, delayMinutes, startHour } = params;
    const { timeslots, rooms, companies } = dataset;
    const slotMap = new Map<number, Timeslot>(timeslots.map(t => [t.id, t]));

    // Find panel and company
    let targetPanel: CompanyPanel | null = null;
    let targetCompany: Company | null = null;
    for (const c of companies) {
      const p = c.panels.find(p => p.id === panelId);
      if (p) {
        targetPanel = p;
        targetCompany = c;
        break;
      }
    }

    const panelName = targetPanel?.panelName || `Panel #${panelId}`;
    const companyName = targetCompany?.name || 'Recruiter';

    // Clone interviews list
    const updatedInterviews: Interview[] = currentInterviews.map(i => ({ ...i }));
    this.rebuildBusyMaps(updatedInterviews, scheduler);

    // Calculate cutoff time
    const startMins = startHour * 60;
    const delayEndMins = startMins + delayMinutes;

    // Identify affected interviews on that day for this panel that fall within the delay period
    const affectedIndices: number[] = [];
    for (let idx = 0; idx < updatedInterviews.length; idx++) {
      const item = updatedInterviews[idx];
      if (
        item.panelId === panelId &&
        item.dayId === dayId &&
        (item.status === 'SCHEDULED' || item.status === 'MOVED')
      ) {
        const [h, m] = item.startTime.split(':').map(Number);
        const itemMins = h * 60 + m;
        if (itemMins < delayEndMins) {
          affectedIndices.push(idx);
        }
      }
    }

    // Free resources for affected interviews
    for (const idx of affectedIndices) {
      const item = updatedInterviews[idx];
      scheduler.releaseResource('student', item.studentId, item.timeslotId);
      scheduler.releaseResource('room', item.roomId, item.timeslotId);
      scheduler.releaseResource('panel', item.panelId, item.timeslotId);
    }

    const changes: InterviewChange[] = [];
    const affectedStudentsSet = new Set<string>();
    const affectedCompaniesSet = new Set<string>([companyName]);
    let movedCount = 0;
    let cancelledCount = 0;

    // Filter future candidate timeslots (on same day after delayEndMins, or subsequent days)
    const validCandidateSlots = timeslots.filter(t => {
      if (t.dayId < dayId) return false;
      if (t.dayId === dayId) {
        const [h, m] = t.startTime.split(':').map(Number);
        return h * 60 + m >= delayEndMins;
      }
      return true;
    });

    for (const idx of affectedIndices) {
      const item = updatedInterviews[idx];
      const oldTime = `Day ${item.dayNumber} ${item.startTime} - ${item.endTime}`;
      affectedStudentsSet.add(item.studentName);

      let rescheduled = false;

      for (const slot of validCandidateSlots) {
        // 1. Is student free?
        if (scheduler.isResourceBusy('student', item.studentId, slot.id)) continue;
        // 2. Is target panel free?
        if (scheduler.isResourceBusy('panel', targetPanel!.id, slot.id)) continue;
        // 3. Is any room free?
        let chosenRoom: Room | null = null;
        // Try same room first for minimal friction
        const currentRoom = rooms.find(r => r.id === item.roomId);
        if (currentRoom && currentRoom.isAvailable && !scheduler.isResourceBusy('room', currentRoom.id, slot.id)) {
          chosenRoom = currentRoom;
        } else {
          for (const room of rooms) {
            if (room.isAvailable && !scheduler.isResourceBusy('room', room.id, slot.id)) {
              chosenRoom = room;
              break;
            }
          }
        }

        if (!chosenRoom) continue;

        // Found valid slot! Book it
        scheduler.bookResource('student', item.studentId, slot.id);
        scheduler.bookResource('panel', targetPanel!.id, slot.id);
        scheduler.bookResource('room', chosenRoom.id, slot.id);

        item.timeslotId = slot.id;
        item.dayId = slot.dayId;
        item.dayNumber = slot.dayId;
        item.startTime = slot.startTime;
        item.endTime = slot.endTime;
        item.roomId = chosenRoom.id;
        item.roomNumber = chosenRoom.roomNumber;
        item.status = 'MOVED';
        item.notes = `Delayed by ${delayMinutes}m (Local push-forward)`;

        movedCount++;
        rescheduled = true;

        changes.push({
          interviewId: item.id,
          studentId: item.studentId,
          studentName: item.studentName,
          companyName: item.companyName,
          panelName: item.panelName,
          oldTime,
          newTime: `Day ${slot.dayId} ${slot.startTime} - ${slot.endTime}`,
          oldRoom: item.roomNumber,
          newRoom: chosenRoom.roomNumber,
          status: 'MOVED',
          reason: `Pushed forward due to ${delayMinutes}-minute recruiter delay starting at ${String(startHour).padStart(2, '0')}:00`,
        });
        break;
      }

      if (!rescheduled) {
        item.status = 'CANCELLED';
        item.notes = `Cancelled: No conflict-free slot found after ${delayMinutes}m delay.`;
        cancelledCount++;

        changes.push({
          interviewId: item.id,
          studentId: item.studentId,
          studentName: item.studentName,
          companyName: item.companyName,
          panelName: item.panelName,
          oldTime,
          newTime: 'Cancelled (No open slot)',
          status: 'CANCELLED',
          reason: `No mutual vacancy found for student and panel after ${delayMinutes}m delay.`,
        });
      }
    }

    const totalCount = updatedInterviews.length;
    const unchangedCount = totalCount - (movedCount + cancelledCount);
    const churn = totalCount > 0 ? Number(((affectedIndices.length / totalCount) * 100).toFixed(2)) : 0;

    const replanResult: ReplanResult = {
      id: `replan-${Date.now()}`,
      disruptionType: 'PANEL_DELAY',
      description: `${companyName} (${panelName}) arrived ${delayMinutes} minutes late on Day ${dayId}.`,
      timestamp: new Date().toLocaleTimeString(),
      movedInterviewsCount: movedCount,
      cancelledInterviewsCount: cancelledCount,
      unchangedInterviewsCount: unchangedCount,
      newlyScheduledCount: 0,
      churnPercentage: churn,
      affectedStudentsCount: affectedStudentsSet.size,
      affectedCompaniesCount: affectedCompaniesSet.size,
      affectedRoomsCount: new Set(changes.map(c => c.newRoom).filter(Boolean)).size,
      affectedPanelsCount: 1,
      affectedStudents: Array.from(affectedStudentsSet),
      affectedCompanies: Array.from(affectedCompaniesSet),
      changes,
    };

    return { updatedInterviews, replanResult };
  }

  /**
   * Scenario 2: Panel Dropout
   */
  public handlePanelDropout(
    currentInterviews: Interview[],
    dataset: Dataset,
    params: PanelDropoutParams,
    scheduler: SchedulingEngine = new SchedulingEngine()
  ): { updatedInterviews: Interview[]; replanResult: ReplanResult } {
    const { panelId, reason = 'Panel member fell ill/withdrew' } = params;
    const { timeslots, rooms, companies } = dataset;

    let targetPanel: CompanyPanel | null = null;
    let targetCompany: Company | null = null;
    for (const c of companies) {
      const p = c.panels.find(p => p.id === panelId);
      if (p) {
        targetPanel = p;
        targetCompany = c;
        break;
      }
    }

    const panelName = targetPanel?.panelName || `Panel #${panelId}`;
    const companyName = targetCompany?.name || 'Company';

    const updatedInterviews: Interview[] = currentInterviews.map(i => ({ ...i }));
    this.rebuildBusyMaps(updatedInterviews, scheduler);

    const affectedIndices: number[] = [];
    for (let i = 0; i < updatedInterviews.length; i++) {
      const item = updatedInterviews[i];
      if (item.panelId === panelId && (item.status === 'SCHEDULED' || item.status === 'MOVED')) {
        affectedIndices.push(i);
      }
    }

    // Free resources
    for (const idx of affectedIndices) {
      const item = updatedInterviews[idx];
      scheduler.releaseResource('student', item.studentId, item.timeslotId);
      scheduler.releaseResource('room', item.roomId, item.timeslotId);
      scheduler.releaseResource('panel', item.panelId, item.timeslotId);
    }

    const siblingPanels = targetCompany ? targetCompany.panels.filter(p => p.id !== panelId && p.isAvailable) : [];

    const changes: InterviewChange[] = [];
    const affectedStudentsSet = new Set<string>();
    let movedCount = 0;
    let cancelledCount = 0;

    for (const idx of affectedIndices) {
      const item = updatedInterviews[idx];
      const oldTime = `Day ${item.dayNumber} ${item.startTime} - ${item.endTime}`;
      affectedStudentsSet.add(item.studentName);

      let reassigned = false;

      // First, try same timeslot with a sibling panel!
      for (const sib of siblingPanels) {
        if (!scheduler.isResourceBusy('panel', sib.id, item.timeslotId)) {
          // Can keep same room and same timeslot!
          if (!scheduler.isResourceBusy('student', item.studentId, item.timeslotId) &&
              !scheduler.isResourceBusy('room', item.roomId, item.timeslotId)) {
            scheduler.bookResource('student', item.studentId, item.timeslotId);
            scheduler.bookResource('panel', sib.id, item.timeslotId);
            scheduler.bookResource('room', item.roomId, item.timeslotId);

            item.panelId = sib.id;
            item.panelName = sib.panelName;
            item.status = 'MOVED';
            item.notes = `Transferred to ${sib.panelName} (Zero-time disruption)`;

            movedCount++;
            reassigned = true;

            changes.push({
              interviewId: item.id,
              studentId: item.studentId,
              studentName: item.studentName,
              companyName: item.companyName,
              panelName: sib.panelName,
              oldTime,
              newTime: oldTime,
              status: 'MOVED',
              reason: `Seamlessly reassigned to ${sib.panelName} at same time slot after original panel dropout`,
            });
            break;
          }
        }
      }

      // If same slot not possible, find any future open slot with any sibling panel
      if (!reassigned) {
        for (const slot of timeslots) {
          if (scheduler.isResourceBusy('student', item.studentId, slot.id)) continue;

          for (const sib of siblingPanels) {
            if (scheduler.isResourceBusy('panel', sib.id, slot.id)) continue;

            for (const room of rooms) {
              if (room.isAvailable && !scheduler.isResourceBusy('room', room.id, slot.id)) {
                scheduler.bookResource('student', item.studentId, slot.id);
                scheduler.bookResource('panel', sib.id, slot.id);
                scheduler.bookResource('room', room.id, slot.id);

                item.timeslotId = slot.id;
                item.dayId = slot.dayId;
                item.dayNumber = slot.dayId;
                item.startTime = slot.startTime;
                item.endTime = slot.endTime;
                item.panelId = sib.id;
                item.panelName = sib.panelName;
                item.roomId = room.id;
                item.roomNumber = room.roomNumber;
                item.status = 'MOVED';
                item.notes = `Reallocated to ${sib.panelName} in Room ${room.roomNumber}`;

                movedCount++;
                reassigned = true;

                changes.push({
                  interviewId: item.id,
                  studentId: item.studentId,
                  studentName: item.studentName,
                  companyName: item.companyName,
                  panelName: sib.panelName,
                  oldTime,
                  newTime: `Day ${slot.dayId} ${slot.startTime} - ${slot.endTime}`,
                  oldRoom: item.roomNumber,
                  newRoom: room.roomNumber,
                  status: 'MOVED',
                  reason: `Reassigned to sibling panel ${sib.panelName} in alternate slot`,
                });
                break;
              }
            }
            if (reassigned) break;
          }
          if (reassigned) break;
        }
      }

      if (!reassigned) {
        item.status = 'CANCELLED';
        item.notes = `Cancelled: Panel dropout with no capacity in sibling panels.`;
        cancelledCount++;

        changes.push({
          interviewId: item.id,
          studentId: item.studentId,
          studentName: item.studentName,
          companyName: item.companyName,
          panelName: item.panelName,
          oldTime,
          newTime: 'Cancelled',
          status: 'CANCELLED',
          reason: `Panel dropped out; all sibling panels fully saturated.`,
        });
      }
    }

    const totalCount = updatedInterviews.length;
    const unchangedCount = totalCount - (movedCount + cancelledCount);
    const churn = totalCount > 0 ? Number(((affectedIndices.length / totalCount) * 100).toFixed(2)) : 0;

    const replanResult: ReplanResult = {
      id: `replan-${Date.now()}`,
      disruptionType: 'PANEL_DROPOUT',
      description: `${companyName} (${panelName}) dropped out (${reason}).`,
      timestamp: new Date().toLocaleTimeString(),
      movedInterviewsCount: movedCount,
      cancelledInterviewsCount: cancelledCount,
      unchangedInterviewsCount: unchangedCount,
      newlyScheduledCount: 0,
      churnPercentage: churn,
      affectedStudentsCount: affectedStudentsSet.size,
      affectedCompaniesCount: 1,
      affectedRoomsCount: new Set(changes.map(c => c.newRoom).filter(Boolean)).size,
      affectedPanelsCount: 1,
      affectedStudents: Array.from(affectedStudentsSet),
      affectedCompanies: [companyName],
      changes,
    };

    return { updatedInterviews, replanResult };
  }

  /**
   * Scenario 3: Student Withdrawal
   */
  public handleStudentWithdrawal(
    currentInterviews: Interview[],
    dataset: Dataset,
    params: StudentWithdrawalParams,
    scheduler: SchedulingEngine = new SchedulingEngine()
  ): { updatedInterviews: Interview[]; replanResult: ReplanResult } {
    const { studentIds, reason = 'Accepted PPO / Off-campus offer' } = params;
    const studentIdSet = new Set(studentIds);

    const updatedInterviews: Interview[] = currentInterviews.map(i => ({ ...i }));
    this.rebuildBusyMaps(updatedInterviews, scheduler);

    const changes: InterviewChange[] = [];
    const affectedStudentsSet = new Set<string>();
    const affectedCompaniesSet = new Set<string>();
    let cancelledCount = 0;

    for (const item of updatedInterviews) {
      if (studentIdSet.has(item.studentId) && (item.status === 'SCHEDULED' || item.status === 'MOVED')) {
        // Release resources
        scheduler.releaseResource('student', item.studentId, item.timeslotId);
        scheduler.releaseResource('room', item.roomId, item.timeslotId);
        scheduler.releaseResource('panel', item.panelId, item.timeslotId);

        item.status = 'CANCELLED';
        item.notes = `Student withdrawn: ${reason}`;
        cancelledCount++;

        affectedStudentsSet.add(item.studentName);
        affectedCompaniesSet.add(item.companyName);

        changes.push({
          interviewId: item.id,
          studentId: item.studentId,
          studentName: item.studentName,
          companyName: item.companyName,
          panelName: item.panelName,
          oldTime: `Day ${item.dayNumber} ${item.startTime} - ${item.endTime}`,
          newTime: 'Released Slot',
          status: 'CANCELLED',
          reason: `Student withdrew from placement drive (${reason})`,
        });
      }
    }

    const totalCount = updatedInterviews.length;
    const churn = totalCount > 0 ? Number(((cancelledCount / totalCount) * 100).toFixed(2)) : 0;

    const replanResult: ReplanResult = {
      id: `replan-${Date.now()}`,
      disruptionType: 'STUDENT_WITHDRAWAL',
      description: `${studentIds.length} students withdrew from placement drive (${reason}).`,
      timestamp: new Date().toLocaleTimeString(),
      movedInterviewsCount: 0,
      cancelledInterviewsCount: cancelledCount,
      unchangedInterviewsCount: totalCount - cancelledCount,
      newlyScheduledCount: 0,
      churnPercentage: churn,
      affectedStudentsCount: affectedStudentsSet.size,
      affectedCompaniesCount: affectedCompaniesSet.size,
      affectedRoomsCount: 0,
      affectedPanelsCount: 0,
      affectedStudents: Array.from(affectedStudentsSet),
      affectedCompanies: Array.from(affectedCompaniesSet),
      changes,
    };

    return { updatedInterviews, replanResult };
  }

  /**
   * Scenario 4: Room Outage
   */
  public handleRoomUnavailable(
    currentInterviews: Interview[],
    dataset: Dataset,
    params: RoomUnavailableParams,
    scheduler: SchedulingEngine = new SchedulingEngine()
  ): { updatedInterviews: Interview[]; replanResult: ReplanResult } {
    const { roomId, dayId, reason = 'Air conditioning failure / Maintenance' } = params;
    const { rooms, timeslots } = dataset;
    const targetRoom = rooms.find(r => r.id === roomId);
    const roomName = targetRoom?.roomNumber || `Room #${roomId}`;

    const updatedInterviews: Interview[] = currentInterviews.map(i => ({ ...i }));
    this.rebuildBusyMaps(updatedInterviews, scheduler);

    const affectedIndices: number[] = [];
    for (let i = 0; i < updatedInterviews.length; i++) {
      const item = updatedInterviews[i];
      if (
        item.roomId === roomId &&
        (dayId === undefined || item.dayId === dayId) &&
        (item.status === 'SCHEDULED' || item.status === 'MOVED')
      ) {
        affectedIndices.push(i);
      }
    }

    // Free resources
    for (const idx of affectedIndices) {
      const item = updatedInterviews[idx];
      scheduler.releaseResource('room', item.roomId, item.timeslotId);
    }

    const availableRooms = rooms.filter(r => r.id !== roomId && r.isAvailable);
    const changes: InterviewChange[] = [];
    const affectedStudentsSet = new Set<string>();
    const affectedCompaniesSet = new Set<string>();
    let movedCount = 0;
    let cancelledCount = 0;

    for (const idx of affectedIndices) {
      const item = updatedInterviews[idx];
      const oldTime = `Day ${item.dayNumber} ${item.startTime} - ${item.endTime}`;
      affectedStudentsSet.add(item.studentName);
      affectedCompaniesSet.add(item.companyName);

      let relocated = false;

      // 1. Try to find alternate room at the EXACT SAME TIMESLOT (Zero-time disruption)
      for (const altRoom of availableRooms) {
        if (!scheduler.isResourceBusy('room', altRoom.id, item.timeslotId)) {
          scheduler.bookResource('room', altRoom.id, item.timeslotId);

          const oldRoomNum = item.roomNumber;
          item.roomId = altRoom.id;
          item.roomNumber = altRoom.roomNumber;
          item.status = 'MOVED';
          item.notes = `Relocated from ${oldRoomNum} to ${altRoom.roomNumber} (${reason})`;

          movedCount++;
          relocated = true;

          changes.push({
            interviewId: item.id,
            studentId: item.studentId,
            studentName: item.studentName,
            companyName: item.companyName,
            panelName: item.panelName,
            oldTime,
            newTime: oldTime,
            oldRoom: oldRoomNum,
            newRoom: altRoom.roomNumber,
            status: 'MOVED',
            reason: `Relocated to spare room ${altRoom.roomNumber} at same time slot due to ${oldRoomNum} outage`,
          });
          break;
        }
      }

      // 2. If no room free at same slot, shift to alternate open slot
      if (!relocated) {
        scheduler.releaseResource('student', item.studentId, item.timeslotId);
        scheduler.releaseResource('panel', item.panelId, item.timeslotId);

        for (const slot of timeslots) {
          if (slot.dayId < item.dayId) continue;
          if (scheduler.isResourceBusy('student', item.studentId, slot.id)) continue;
          if (scheduler.isResourceBusy('panel', item.panelId, slot.id)) continue;

          for (const altRoom of availableRooms) {
            if (!scheduler.isResourceBusy('room', altRoom.id, slot.id)) {
              scheduler.bookResource('student', item.studentId, slot.id);
              scheduler.bookResource('panel', item.panelId, slot.id);
              scheduler.bookResource('room', altRoom.id, slot.id);

              const oldRoomNum = item.roomNumber;
              item.timeslotId = slot.id;
              item.dayId = slot.dayId;
              item.dayNumber = slot.dayId;
              item.startTime = slot.startTime;
              item.endTime = slot.endTime;
              item.roomId = altRoom.id;
              item.roomNumber = altRoom.roomNumber;
              item.status = 'MOVED';
              item.notes = `Shifted to Day ${slot.dayId} in ${altRoom.roomNumber}`;

              movedCount++;
              relocated = true;

              changes.push({
                interviewId: item.id,
                studentId: item.studentId,
                studentName: item.studentName,
                companyName: item.companyName,
                panelName: item.panelName,
                oldTime,
                newTime: `Day ${slot.dayId} ${slot.startTime} - ${slot.endTime}`,
                oldRoom: oldRoomNum,
                newRoom: altRoom.roomNumber,
                status: 'MOVED',
                reason: `Moved time and room due to ${roomName} unavailability`,
              });
              break;
            }
          }
          if (relocated) break;
        }
      }

      if (!relocated) {
        item.status = 'CANCELLED';
        cancelledCount++;

        changes.push({
          interviewId: item.id,
          studentId: item.studentId,
          studentName: item.studentName,
          companyName: item.companyName,
          panelName: item.panelName,
          oldTime,
          newTime: 'Cancelled',
          status: 'CANCELLED',
          reason: `No spare rooms or alternate slots available.`,
        });
      }
    }

    const totalCount = updatedInterviews.length;
    const churn = totalCount > 0 ? Number(((affectedIndices.length / totalCount) * 100).toFixed(2)) : 0;

    const replanResult: ReplanResult = {
      id: `replan-${Date.now()}`,
      disruptionType: 'ROOM_UNAVAILABLE',
      description: `Room ${roomName} declared unavailable (${reason}).`,
      timestamp: new Date().toLocaleTimeString(),
      movedInterviewsCount: movedCount,
      cancelledInterviewsCount: cancelledCount,
      unchangedInterviewsCount: totalCount - (movedCount + cancelledCount),
      newlyScheduledCount: 0,
      churnPercentage: churn,
      affectedStudentsCount: affectedStudentsSet.size,
      affectedCompaniesCount: affectedCompaniesSet.size,
      affectedRoomsCount: 1,
      affectedPanelsCount: new Set(changes.map(c => c.panelName)).size,
      affectedStudents: Array.from(affectedStudentsSet),
      affectedCompanies: Array.from(affectedCompaniesSet),
      changes,
    };

    return { updatedInterviews, replanResult };
  }

  /**
   * Scenario 5: Day-1 Recruiter Crisis (Live Defense Demonstration Scenario)
   * - Top Day-1 Recruiter (Google Panel A) is 3 hours (180 mins) late
   * - One panel (Microsoft Panel B) dropped out completely
   * - 15 high-demand students withdrew from the drive
   */
  public handleDay1Crisis(
    currentInterviews: Interview[],
    dataset: Dataset
  ): { updatedInterviews: Interview[]; replanResult: ReplanResult } {
    const scheduler = new SchedulingEngine();

    // 1. Pass 1: Student withdrawal (15 students)
    const withdrawStudentIds = dataset.students.slice(0, 15).map(s => s.id);
    const pass1 = this.handleStudentWithdrawal(
      currentInterviews,
      dataset,
      { studentIds: withdrawStudentIds, reason: 'Accepted Off-Campus Offers (Day-1 Crisis)' },
      scheduler
    );

    // 2. Pass 2: Top recruiter 3-hour delay (Google Panel A, panelId = 1)
    const googlePanel = dataset.companies[0]?.panels[0]?.id || 1;
    const pass2 = this.handlePanelDelay(
      pass1.updatedInterviews,
      dataset,
      { panelId: googlePanel, dayId: 1, delayMinutes: 180, startHour: 9 },
      scheduler
    );

    // 3. Pass 3: Panel dropout (Microsoft Panel B, panelId = 5)
    const msftPanel = dataset.companies[1]?.panels[1]?.id || 5;
    const pass3 = this.handlePanelDropout(
      pass2.updatedInterviews,
      dataset,
      { panelId: msftPanel, reason: 'Technical interviewer medical emergency' },
      scheduler
    );

    // Aggregate changes
    const allChanges: InterviewChange[] = [
      ...pass1.replanResult.changes,
      ...pass2.replanResult.changes,
      ...pass3.replanResult.changes,
    ];

    const affectedStudentsSet = new Set<string>([
      ...pass1.replanResult.affectedStudents,
      ...pass2.replanResult.affectedStudents,
      ...pass3.replanResult.affectedStudents,
    ]);

    const affectedCompaniesSet = new Set<string>([
      ...pass1.replanResult.affectedCompanies,
      ...pass2.replanResult.affectedCompanies,
      ...pass3.replanResult.affectedCompanies,
    ]);

    const movedCount = pass1.replanResult.movedInterviewsCount + pass2.replanResult.movedInterviewsCount + pass3.replanResult.movedInterviewsCount;
    const cancelledCount = pass1.replanResult.cancelledInterviewsCount + pass2.replanResult.cancelledInterviewsCount + pass3.replanResult.cancelledInterviewsCount;
    const totalCount = pass3.updatedInterviews.length;
    const unchangedCount = totalCount - (movedCount + cancelledCount);
    const churn = totalCount > 0 ? Number((((movedCount + cancelledCount) / totalCount) * 100).toFixed(2)) : 0;

    const replanResult: ReplanResult = {
      id: `replan-crisis-${Date.now()}`,
      disruptionType: 'DAY1_CRISIS',
      description: 'Day-1 Recruiter Crisis: Google Panel A 3-hr delay + Microsoft Panel B dropout + 15 student withdrawals',
      timestamp: new Date().toLocaleTimeString(),
      movedInterviewsCount: movedCount,
      cancelledInterviewsCount: cancelledCount,
      unchangedInterviewsCount: unchangedCount,
      newlyScheduledCount: 0,
      churnPercentage: churn,
      affectedStudentsCount: affectedStudentsSet.size,
      affectedCompaniesCount: affectedCompaniesSet.size,
      affectedRoomsCount: new Set(allChanges.map(c => c.newRoom).filter(Boolean)).size,
      affectedPanelsCount: new Set(allChanges.map(c => c.panelName).filter(Boolean)).size,
      affectedStudents: Array.from(affectedStudentsSet),
      affectedCompanies: Array.from(affectedCompaniesSet),
      changes: allChanges,
    };

    return { updatedInterviews: pass3.updatedInterviews, replanResult };
  }
}
