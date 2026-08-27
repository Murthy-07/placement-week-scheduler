import { Interview } from '../types';
import { Dataset } from './dataGenerator';

export interface ValidationIssue {
  type: 'STUDENT_CLASH' | 'ROOM_OVERLAP' | 'PANEL_OVERLAP' | 'CGPA_VIOLATION' | 'ROOM_INACTIVE';
  severity: 'CRITICAL' | 'WARNING';
  message: string;
  interviewId: number;
  conflictingInterviewId?: number;
  details: {
    studentName?: string;
    roomNumber?: string;
    panelName?: string;
    timeSlot?: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  totalAudited: number;
  criticalIssuesCount: number;
  warningsCount: number;
  issues: ValidationIssue[];
}

export function validateSchedule(
  interviews: Interview[],
  dataset: Dataset
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const active = interviews.filter(
    i => i.status === 'SCHEDULED' || i.status === 'MOVED'
  );

  const studentSlotMap = new Map<string, Interview>();
  const roomSlotMap = new Map<string, Interview>();
  const panelSlotMap = new Map<string, Interview>();
  const companyMap = new Map(dataset.companies.map(c => [c.id, c]));

  for (const item of active) {
    const sKey = `${item.studentId}-${item.timeslotId}`;
    const rKey = `${item.roomId}-${item.timeslotId}`;
    const pKey = `${item.panelId}-${item.timeslotId}`;

    // 1. Student Double-Booking Check
    if (studentSlotMap.has(sKey)) {
      const prev = studentSlotMap.get(sKey)!;
      issues.push({
        type: 'STUDENT_CLASH',
        severity: 'CRITICAL',
        message: `Student ${item.studentName} is double-booked across ${prev.companyName} and ${item.companyName} at slot ${item.startTime}-${item.endTime}`,
        interviewId: item.id,
        conflictingInterviewId: prev.id,
        details: {
          studentName: item.studentName,
          timeSlot: `${item.startTime} - ${item.endTime}`,
        },
      });
    } else {
      studentSlotMap.set(sKey, item);
    }

    // 2. Room Overlap Check
    if (roomSlotMap.has(rKey)) {
      const prev = roomSlotMap.get(rKey)!;
      issues.push({
        type: 'ROOM_OVERLAP',
        severity: 'CRITICAL',
        message: `Room ${item.roomNumber} is double-booked by ${prev.panelName} and ${item.panelName} at slot ${item.startTime}-${item.endTime}`,
        interviewId: item.id,
        conflictingInterviewId: prev.id,
        details: {
          roomNumber: item.roomNumber,
          timeSlot: `${item.startTime} - ${item.endTime}`,
        },
      });
    } else {
      roomSlotMap.set(rKey, item);
    }

    // 3. Panel Overlap Check
    if (panelSlotMap.has(pKey)) {
      const prev = panelSlotMap.get(pKey)!;
      issues.push({
        type: 'PANEL_OVERLAP',
        severity: 'CRITICAL',
        message: `Panel ${item.panelName} is concurrently assigned to ${prev.studentName} and ${item.studentName} at slot ${item.startTime}-${item.endTime}`,
        interviewId: item.id,
        conflictingInterviewId: prev.id,
        details: {
          panelName: item.panelName,
          timeSlot: `${item.startTime} - ${item.endTime}`,
        },
      });
    } else {
      panelSlotMap.set(pKey, item);
    }

    // 4. CGPA Cutoff Compliance Check
    const comp = companyMap.get(item.companyId);
    if (comp && item.studentCgpa < comp.minCgpa) {
      issues.push({
        type: 'CGPA_VIOLATION',
        severity: 'CRITICAL',
        message: `Student ${item.studentName} (CGPA: ${item.studentCgpa}) scheduled with ${comp.name} which requires min CGPA ${comp.minCgpa}`,
        interviewId: item.id,
        details: {
          studentName: item.studentName,
        },
      });
    }
  }

  const criticalCount = issues.filter(i => i.severity === 'CRITICAL').length;
  const warningCount = issues.filter(i => i.severity === 'WARNING').length;

  return {
    isValid: criticalCount === 0,
    totalAudited: active.length,
    criticalIssuesCount: criticalCount,
    warningsCount: warningCount,
    issues,
  };
}
