import { Interview, ScheduleMetrics, Timeslot } from '../types';
import { Dataset } from './dataGenerator';

export function calculateMetrics(
  interviews: Interview[],
  dataset: Dataset,
  replanChurnPercentage: number = 0,
  activeDisruptionsCount: number = 0
): ScheduleMetrics {
  const activeInterviews = interviews.filter(
    i => i.status === 'SCHEDULED' || i.status === 'MOVED'
  );

  // Total shortlists from students
  const totalShortlists = dataset.students.reduce(
    (acc, s) => acc + s.shortlistedCompanyIds.length,
    0
  );

  const totalCapacitySlots = dataset.rooms.length * dataset.timeslots.length; // 20 * 80 = 1600
  const totalScheduled = activeInterviews.length;
  const totalUnscheduled = Math.max(0, totalShortlists - totalScheduled);

  const schedulingSuccessRate =
    totalShortlists > 0
      ? Number(((totalScheduled / totalShortlists) * 100).toFixed(1))
      : 0;

  const roomUtilizationRate =
    totalCapacitySlots > 0
      ? Number(((totalScheduled / totalCapacitySlots) * 100).toFixed(1))
      : 0;

  // 1. Check for Student Clashes (Should be 0)
  const studentSlotMap = new Map<string, number>();
  let studentClashes = 0;
  for (const item of activeInterviews) {
    const key = `${item.studentId}-${item.timeslotId}`;
    const count = (studentSlotMap.get(key) || 0) + 1;
    studentSlotMap.set(key, count);
    if (count === 2) studentClashes++;
  }

  // 2. Check for Room Conflicts (Should be 0)
  const roomSlotMap = new Map<string, number>();
  let roomConflicts = 0;
  for (const item of activeInterviews) {
    const key = `${item.roomId}-${item.timeslotId}`;
    const count = (roomSlotMap.get(key) || 0) + 1;
    roomSlotMap.set(key, count);
    if (count === 2) roomConflicts++;
  }

  // 3. Check for Panel Conflicts (Should be 0)
  const panelSlotMap = new Map<string, number>();
  let panelConflicts = 0;
  for (const item of activeInterviews) {
    const key = `${item.panelId}-${item.timeslotId}`;
    const count = (panelSlotMap.get(key) || 0) + 1;
    panelSlotMap.set(key, count);
    if (count === 2) panelConflicts++;
  }

  // 4. Calculate Student Waiting Times (Idle gaps between interviews on the same day)
  const studentDayMap = new Map<string, Interview[]>();
  for (const item of activeInterviews) {
    const key = `${item.studentId}-${item.dayId}`;
    if (!studentDayMap.has(key)) {
      studentDayMap.set(key, []);
    }
    studentDayMap.get(key)!.push(item);
  }

  const waitGapsMinutes: number[] = [];
  for (const dayItems of studentDayMap.values()) {
    if (dayItems.length < 2) continue;

    // Sort by startTime
    dayItems.sort((a, b) => a.startTime.localeCompare(b.startTime));

    for (let i = 0; i < dayItems.length - 1; i++) {
      const curEnd = dayItems[i].endTime;
      const nextStart = dayItems[i + 1].startTime;

      const [eh, em] = curEnd.split(':').map(Number);
      const [sh, sm] = nextStart.split(':').map(Number);

      const gap = sh * 60 + sm - (eh * 60 + em);
      if (gap > 0) {
        waitGapsMinutes.push(gap);
      }
    }
  }

  const averageWaitTimeMinutes =
    waitGapsMinutes.length > 0
      ? Math.round(
          waitGapsMinutes.reduce((acc, v) => acc + v, 0) / waitGapsMinutes.length
        )
      : 0;

  const maxWaitTimeMinutes =
    waitGapsMinutes.length > 0 ? Math.max(...waitGapsMinutes) : 0;

  return {
    totalShortlists,
    totalScheduledInterviews: totalScheduled,
    totalUnscheduledInterviews: totalUnscheduled,
    schedulingSuccessRate,
    studentClashes,
    roomConflicts,
    panelConflicts,
    totalCapacitySlots,
    roomUtilizationRate,
    averageWaitTimeMinutes,
    maxWaitTimeMinutes,
    replanChurnPercentage,
    activeDisruptionsCount,
  };
}
