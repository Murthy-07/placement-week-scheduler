export type InterviewStatus = 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'DELAYED' | 'MOVED';

export type DisruptionType = 'PANEL_DELAY' | 'PANEL_DROPOUT' | 'STUDENT_WITHDRAWAL' | 'ROOM_UNAVAILABLE' | 'DAY1_CRISIS';

export type CompanyTier = 1 | 2 | 3;

export interface Student {
  id: number;
  name: string;
  email: string;
  cgpa: number;
  branch: 'CS' | 'IT' | 'ECE' | 'EE' | 'ME';
  shortlistedCompanyIds: number[];
  status: 'AVAILABLE' | 'SCHEDULED' | 'PLACED' | 'WITHDRAWN';
}

export interface CompanyPanel {
  id: number;
  companyId: number;
  panelName: string;
  isAvailable: boolean;
}

export interface Company {
  id: number;
  name: string;
  minCgpa: number;
  tier: CompanyTier;
  interviewDurationMinutes: number; // 30, 60, etc.
  panels: CompanyPanel[];
  shortlistedStudentIds: number[];
}

export interface Room {
  id: number;
  roomNumber: string;
  building: string;
  isAvailable: boolean;
  maintenanceReason?: string;
}

export interface PlacementDay {
  id: number;
  dayNumber: number;
  date: string;
  description: string;
}

export interface Timeslot {
  id: number;
  dayId: number;
  slotIndex: number;
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "09:30"
  displayTime: string; // e.g. "09:00 AM - 09:30 AM"
}

export interface Interview {
  id: number;
  studentId: number;
  studentName: string;
  studentCgpa: number;
  studentBranch: string;
  companyId: number;
  companyName: string;
  companyTier: CompanyTier;
  panelId: number;
  panelName: string;
  roomId: number;
  roomNumber: string;
  timeslotId: number;
  dayId: number;
  dayNumber: number;
  startTime: string;
  endTime: string;
  status: InterviewStatus;
  notes?: string;
  durationMinutes: number;
}

export interface UnscheduledReport {
  studentId: number;
  studentName: string;
  studentCgpa: number;
  studentBranch: string;
  companyId: number;
  companyName: string;
  companyTier: CompanyTier;
  reason: string;
  conflictingResource: 'STUDENT_BUSY' | 'ROOM_SCARCITY' | 'PANEL_BUSY' | 'SLOT_EXHAUSTION' | 'CGPA_MISMATCH';
}

export interface InterviewChange {
  interviewId: number;
  studentId: number;
  studentName: string;
  companyName: string;
  panelName: string;
  oldTime: string;
  newTime: string;
  oldRoom?: string;
  newRoom?: string;
  status: 'MOVED' | 'CANCELLED' | 'UNCHANGED' | 'NEWLY_SCHEDULED';
  reason: string;
}

export interface ReplanResult {
  id: string;
  disruptionType: DisruptionType;
  description: string;
  timestamp: string;
  movedInterviewsCount: number;
  cancelledInterviewsCount: number;
  unchangedInterviewsCount: number;
  newlyScheduledCount: number;
  churnPercentage: number;
  affectedStudentsCount: number;
  affectedCompaniesCount: number;
  affectedRoomsCount: number;
  affectedPanelsCount: number;
  affectedStudents: string[];
  affectedCompanies: string[];
  changes: InterviewChange[];
}

export interface ScheduleMetrics {
  totalShortlists: number;
  totalScheduledInterviews: number;
  totalUnscheduledInterviews: number;
  schedulingSuccessRate: number; // percentage
  studentClashes: number;        // must be 0
  roomConflicts: number;         // must be 0
  panelConflicts: number;        // must be 0
  totalCapacitySlots: number;    // 20 rooms * 80 slots = 1600
  roomUtilizationRate: number;   // percentage
  averageWaitTimeMinutes: number;
  maxWaitTimeMinutes: number;
  replanChurnPercentage: number;
  activeDisruptionsCount: number;
}

export interface DisruptionLog {
  id: string;
  type: DisruptionType;
  reportedAt: string;
  description: string;
  parameters: {
    panelId?: number;
    companyId?: number;
    roomId?: number;
    studentIds?: number[];
    delayMinutes?: number;
    timeSlotIndex?: number;
  };
  replanResult?: ReplanResult;
}

export interface FilterParams {
  dayId?: number;
  companyId?: number;
  studentSearch?: string;
  roomId?: number;
  panelId?: number;
  status?: InterviewStatus | 'ALL';
  tier?: CompanyTier | 'ALL';
}

export interface PlacementConfig {
  studentCount: number;
  companyCount: number;
  roomCount: number;
  panelCount?: number;
  placementDays: number;
  startTime: string; // "HH:MM" 24h format, e.g. "09:00"
  endTime: string;   // "HH:MM" 24h format, e.g. "17:00"
  interviewDurationMinutes: number; // e.g. 30, 45, 60
  breakDurationMinutes?: number;    // e.g. 0, 5, 10
  seed: number;
}

export const DEFAULT_PLACEMENT_CONFIG: PlacementConfig = {
  studentCount: 800,
  companyCount: 35,
  roomCount: 20,
  placementDays: 5,
  startTime: '09:00',
  endTime: '17:00',
  interviewDurationMinutes: 30,
  breakDurationMinutes: 0,
  seed: 42,
};

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validatePlacementConfig(config: Partial<PlacementConfig>): ConfigValidationResult {
  const errors: string[] = [];

  if (config.studentCount !== undefined) {
    if (config.studentCount <= 0) errors.push('Student count must be greater than 0.');
    if (config.studentCount > 10000) errors.push('Student count exceeds maximum supported limit of 10,000.');
  }

  if (config.companyCount !== undefined) {
    if (config.companyCount <= 0) errors.push('Company count must be greater than 0.');
    if (config.companyCount > 500) errors.push('Company count exceeds maximum supported limit of 500.');
  }

  if (config.roomCount !== undefined) {
    if (config.roomCount <= 0) errors.push('Room count must be greater than 0.');
    if (config.roomCount > 200) errors.push('Room count exceeds maximum supported limit of 200.');
  }

  if (config.panelCount !== undefined) {
    if (config.panelCount <= 0) errors.push('Panel count must be greater than 0.');
    if (config.panelCount > 1000) errors.push('Panel count exceeds maximum supported limit of 1,000.');
  }

  if (config.placementDays !== undefined) {
    if (config.placementDays <= 0) errors.push('Placement days must be greater than 0.');
    if (config.placementDays > 30) errors.push('Placement days exceeds maximum supported limit of 30.');
  }

  if (config.interviewDurationMinutes !== undefined) {
    if (config.interviewDurationMinutes <= 0) errors.push('Interview duration must be greater than 0 minutes.');
    if (config.interviewDurationMinutes > 480) errors.push('Interview duration exceeds maximum supported limit of 480 minutes.');
  }

  if (config.breakDurationMinutes !== undefined) {
    if (config.breakDurationMinutes < 0) errors.push('Break duration cannot be negative.');
    if (config.breakDurationMinutes > 120) errors.push('Break duration exceeds maximum supported limit of 120 minutes.');
  }

  if (config.startTime && config.endTime) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(config.startTime)) errors.push('Start time must be a valid HH:MM 24-hour string.');
    if (!timeRegex.test(config.endTime)) errors.push('End time must be a valid HH:MM 24-hour string.');

    if (timeRegex.test(config.startTime) && timeRegex.test(config.endTime)) {
      const [sh, sm] = config.startTime.split(':').map(Number);
      const [eh, em] = config.endTime.split(':').map(Number);
      const startMins = sh * 60 + sm;
      const endMins = eh * 60 + em;
      if (endMins <= startMins) {
        errors.push(`End time (${config.endTime}) must be strictly after start time (${config.startTime}).`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
