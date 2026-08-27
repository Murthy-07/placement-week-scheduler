import { Company, CompanyPanel, CompanyTier, Room, Student, Interview } from '../types';
import { Dataset } from './dataGenerator';

export interface RecordValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// -----------------------------------------------------------------------------
// VALIDATION FUNCTIONS (Identical rules as CSV Import)
// -----------------------------------------------------------------------------

export function validateStudentRecord(
  student: Partial<Student>,
  existingStudents: Student[],
  isEdit = false,
  originalId?: number
): RecordValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (student.id === undefined || isNaN(Number(student.id)) || Number(student.id) <= 0) {
    errors.push('Student ID must be a valid positive number.');
  } else {
    const numericId = Number(student.id);
    const isDuplicate = existingStudents.some(
      s => s.id === numericId && (!isEdit || s.id !== originalId)
    );
    if (isDuplicate) {
      errors.push(`Student ID ${numericId} is already assigned to another student.`);
    }
  }

  if (!student.name || student.name.trim().length === 0) {
    errors.push('Student name is required.');
  }

  if (student.cgpa === undefined || isNaN(Number(student.cgpa))) {
    errors.push('CGPA is required and must be a number.');
  } else {
    const cgpa = Number(student.cgpa);
    if (cgpa < 0.0 || cgpa > 10.0) {
      errors.push(`CGPA must be between 0.00 and 10.00 (received ${cgpa}).`);
    }
  }

  const validBranches = ['CS', 'IT', 'ECE', 'EE', 'ME'];
  if (student.branch && !validBranches.includes(student.branch)) {
    errors.push(`Branch must be one of: ${validBranches.join(', ')}.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateCompanyRecord(
  company: Partial<Company>,
  existingCompanies: Company[],
  isEdit = false,
  originalId?: number
): RecordValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (company.id === undefined || isNaN(Number(company.id)) || Number(company.id) <= 0) {
    errors.push('Company ID must be a valid positive number.');
  } else {
    const numericId = Number(company.id);
    const isDuplicate = existingCompanies.some(
      c => c.id === numericId && (!isEdit || c.id !== originalId)
    );
    if (isDuplicate) {
      errors.push(`Company ID ${numericId} is already in use by another company.`);
    }
  }

  if (!company.name || company.name.trim().length === 0) {
    errors.push('Company name is required.');
  }

  if (!company.tier || ![1, 2, 3].includes(Number(company.tier))) {
    errors.push('Company tier must be 1 (Dream/Super Dream), 2 (Core), or 3 (Mass/Open).');
  }

  if (company.minCgpa === undefined || isNaN(Number(company.minCgpa))) {
    errors.push('Minimum CGPA cutoff is required.');
  } else {
    const minCgpa = Number(company.minCgpa);
    if (minCgpa < 0.0 || minCgpa > 10.0) {
      errors.push(`Minimum CGPA cutoff must be between 0.00 and 10.00 (received ${minCgpa}).`);
    }
  }

  if (
    company.interviewDurationMinutes !== undefined &&
    (isNaN(Number(company.interviewDurationMinutes)) || Number(company.interviewDurationMinutes) <= 0)
  ) {
    errors.push('Interview duration must be a positive integer in minutes.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateShortlistRelationship(
  studentId: number,
  companyId: number,
  students: Student[],
  companies: Company[]
): RecordValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const student = students.find(s => s.id === studentId);
  if (!student) {
    errors.push(`Student with ID ${studentId} does not exist.`);
  }

  const company = companies.find(c => c.id === companyId);
  if (!company) {
    errors.push(`Company with ID ${companyId} does not exist.`);
  }

  if (student && company) {
    if (student.shortlistedCompanyIds.includes(companyId)) {
      errors.push(`Student ${student.name} (ID: ${student.id}) is already shortlisted for ${company.name}.`);
    }

    if (student.cgpa < company.minCgpa) {
      warnings.push(
        `Student CGPA (${student.cgpa.toFixed(2)}) is below ${company.name}'s minimum cutoff (${company.minCgpa.toFixed(2)}).`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateRoomRecord(
  room: Partial<Room>,
  existingRooms: Room[],
  isEdit = false,
  originalId?: number
): RecordValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (room.id === undefined || isNaN(Number(room.id)) || Number(room.id) <= 0) {
    errors.push('Room ID must be a valid positive number.');
  } else {
    const numericId = Number(room.id);
    const isDuplicateId = existingRooms.some(
      r => r.id === numericId && (!isEdit || r.id !== originalId)
    );
    if (isDuplicateId) {
      errors.push(`Room ID ${numericId} already exists.`);
    }
  }

  if (!room.roomNumber || room.roomNumber.trim().length === 0) {
    errors.push('Room number/identifier is required.');
  } else {
    const num = room.roomNumber.trim().toUpperCase();
    const isDuplicateNumber = existingRooms.some(
      r => r.roomNumber.toUpperCase() === num && (!isEdit || r.id !== originalId)
    );
    if (isDuplicateNumber) {
      errors.push(`Room number "${room.roomNumber}" is already registered.`);
    }
  }

  if (!room.building || room.building.trim().length === 0) {
    errors.push('Building name is required.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validatePanelRecord(
  panel: Partial<CompanyPanel>,
  companyId: number,
  existingPanels: CompanyPanel[],
  existingCompanies: Company[],
  isEdit = false,
  originalId?: number
): RecordValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (panel.id === undefined || isNaN(Number(panel.id)) || Number(panel.id) <= 0) {
    errors.push('Panel ID must be a valid positive number.');
  } else {
    const numericId = Number(panel.id);
    const isDuplicateId = existingPanels.some(
      p => p.id === numericId && (!isEdit || p.id !== originalId)
    );
    if (isDuplicateId) {
      errors.push(`Panel ID ${numericId} already exists.`);
    }
  }

  const company = existingCompanies.find(c => c.id === companyId);
  if (!company) {
    errors.push(`Referenced Company with ID ${companyId} does not exist.`);
  }

  if (!panel.panelName || panel.panelName.trim().length === 0) {
    errors.push('Panel name is required.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// -----------------------------------------------------------------------------
// DATASET MUTATION OPERATORS (Pure functions returning new Dataset copies)
// -----------------------------------------------------------------------------

export function addStudentRecord(
  dataset: Dataset,
  data: {
    id?: number;
    name: string;
    cgpa: number;
    branch?: 'CS' | 'IT' | 'ECE' | 'EE' | 'ME';
    email?: string;
    shortlistedCompanyIds?: number[];
  }
): { dataset: Dataset; student?: Student; error?: string } {
  const nextId = data.id !== undefined ? Number(data.id) : (Math.max(0, ...dataset.students.map(s => s.id)) + 1);
  const branch = data.branch || 'CS';
  const email = data.email || `${data.name.toLowerCase().replace(/\s+/g, '.')}${nextId}@campus.edu`;

  const newStudent: Student = {
    id: nextId,
    name: data.name.trim(),
    cgpa: Number(Number(data.cgpa).toFixed(2)),
    branch,
    email,
    shortlistedCompanyIds: data.shortlistedCompanyIds || [],
    status: 'AVAILABLE',
  };

  const validation = validateStudentRecord(newStudent, dataset.students);
  if (!validation.isValid) {
    return { dataset, error: validation.errors.join(' ') };
  }

  // Update companies shortlistedStudentIds if any were passed
  const updatedCompanies = dataset.companies.map(c => {
    if (newStudent.shortlistedCompanyIds.includes(c.id) && !c.shortlistedStudentIds.includes(newStudent.id)) {
      return { ...c, shortlistedStudentIds: [...c.shortlistedStudentIds, newStudent.id] };
    }
    return c;
  });

  return {
    dataset: {
      ...dataset,
      students: [...dataset.students, newStudent],
      companies: updatedCompanies,
    },
    student: newStudent,
  };
}

export function updateStudentRecord(
  dataset: Dataset,
  studentId: number,
  updates: Partial<Omit<Student, 'id'>>
): { dataset: Dataset; student?: Student; error?: string } {
  const target = dataset.students.find(s => s.id === studentId);
  if (!target) {
    return { dataset, error: `Student with ID ${studentId} not found.` };
  }

  const updated: Student = {
    ...target,
    name: updates.name !== undefined ? updates.name.trim() : target.name,
    cgpa: updates.cgpa !== undefined ? Number(Number(updates.cgpa).toFixed(2)) : target.cgpa,
    branch: updates.branch !== undefined ? updates.branch : target.branch,
    email: updates.email !== undefined ? updates.email.trim() : target.email,
    shortlistedCompanyIds: updates.shortlistedCompanyIds !== undefined ? updates.shortlistedCompanyIds : target.shortlistedCompanyIds,
    status: updates.status !== undefined ? updates.status : target.status,
  };

  const validation = validateStudentRecord(updated, dataset.students, true, studentId);
  if (!validation.isValid) {
    return { dataset, error: validation.errors.join(' ') };
  }

  return {
    dataset: {
      ...dataset,
      students: dataset.students.map(s => (s.id === studentId ? updated : s)),
    },
    student: updated,
  };
}

export function deleteStudentRecord(
  dataset: Dataset,
  studentId: number
): { dataset: Dataset; removedStudent?: Student; error?: string } {
  const target = dataset.students.find(s => s.id === studentId);
  if (!target) {
    return { dataset, error: `Student with ID ${studentId} not found.` };
  }

  // Cascade remove from company shortlists
  const updatedCompanies = dataset.companies.map(c => ({
    ...c,
    shortlistedStudentIds: c.shortlistedStudentIds.filter(id => id !== studentId),
  }));

  return {
    dataset: {
      ...dataset,
      students: dataset.students.filter(s => s.id !== studentId),
      companies: updatedCompanies,
    },
    removedStudent: target,
  };
}

export function addCompanyRecord(
  dataset: Dataset,
  data: {
    id?: number;
    name: string;
    tier: CompanyTier;
    minCgpa: number;
    interviewDurationMinutes?: number;
    panelCount?: number;
  }
): { dataset: Dataset; company?: Company; error?: string } {
  const nextId = data.id !== undefined ? Number(data.id) : (Math.max(0, ...dataset.companies.map(c => c.id)) + 1);
  const numPanels = data.panelCount || (data.tier === 1 ? 3 : data.tier === 2 ? 2 : 1);

  // Generate initial panels for new company
  const allExistingPanels = dataset.companies.flatMap(c => c.panels);
  let startPanelId = Math.max(0, ...allExistingPanels.map(p => p.id)) + 1;

  const panels: CompanyPanel[] = [];
  for (let i = 0; i < numPanels; i++) {
    panels.push({
      id: startPanelId++,
      companyId: nextId,
      panelName: `${data.name.trim()} Panel ${String.fromCharCode(65 + i)}`,
      isAvailable: true,
    });
  }

  const newCompany: Company = {
    id: nextId,
    name: data.name.trim(),
    tier: Number(data.tier) as CompanyTier,
    minCgpa: Number(Number(data.minCgpa).toFixed(2)),
    interviewDurationMinutes: data.interviewDurationMinutes || 30,
    panels,
    shortlistedStudentIds: [],
  };

  const validation = validateCompanyRecord(newCompany, dataset.companies);
  if (!validation.isValid) {
    return { dataset, error: validation.errors.join(' ') };
  }

  return {
    dataset: {
      ...dataset,
      companies: [...dataset.companies, newCompany],
    },
    company: newCompany,
  };
}

export function updateCompanyRecord(
  dataset: Dataset,
  companyId: number,
  updates: Partial<Omit<Company, 'id' | 'panels' | 'shortlistedStudentIds'>>
): { dataset: Dataset; company?: Company; error?: string } {
  const target = dataset.companies.find(c => c.id === companyId);
  if (!target) {
    return { dataset, error: `Company with ID ${companyId} not found.` };
  }

  const updated: Company = {
    ...target,
    name: updates.name !== undefined ? updates.name.trim() : target.name,
    tier: updates.tier !== undefined ? (Number(updates.tier) as CompanyTier) : target.tier,
    minCgpa: updates.minCgpa !== undefined ? Number(Number(updates.minCgpa).toFixed(2)) : target.minCgpa,
    interviewDurationMinutes:
      updates.interviewDurationMinutes !== undefined
        ? Number(updates.interviewDurationMinutes)
        : target.interviewDurationMinutes,
  };

  const validation = validateCompanyRecord(updated, dataset.companies, true, companyId);
  if (!validation.isValid) {
    return { dataset, error: validation.errors.join(' ') };
  }

  return {
    dataset: {
      ...dataset,
      companies: dataset.companies.map(c => (c.id === companyId ? updated : c)),
    },
    company: updated,
  };
}

export function deleteCompanyRecord(
  dataset: Dataset,
  companyId: number
): { dataset: Dataset; removedCompany?: Company; error?: string } {
  const target = dataset.companies.find(c => c.id === companyId);
  if (!target) {
    return { dataset, error: `Company with ID ${companyId} not found.` };
  }

  // Cascade remove from student shortlists
  const updatedStudents = dataset.students.map(s => ({
    ...s,
    shortlistedCompanyIds: s.shortlistedCompanyIds.filter(id => id !== companyId),
  }));

  return {
    dataset: {
      ...dataset,
      companies: dataset.companies.filter(c => c.id !== companyId),
      students: updatedStudents,
    },
    removedCompany: target,
  };
}

export function addShortlistRecord(
  dataset: Dataset,
  studentId: number,
  companyId: number
): { dataset: Dataset; error?: string; warning?: string } {
  const validation = validateShortlistRelationship(
    studentId,
    companyId,
    dataset.students,
    dataset.companies
  );

  if (!validation.isValid) {
    return { dataset, error: validation.errors.join(' ') };
  }

  const updatedStudents = dataset.students.map(s => {
    if (s.id === studentId && !s.shortlistedCompanyIds.includes(companyId)) {
      return { ...s, shortlistedCompanyIds: [...s.shortlistedCompanyIds, companyId] };
    }
    return s;
  });

  const updatedCompanies = dataset.companies.map(c => {
    if (c.id === companyId && !c.shortlistedStudentIds.includes(studentId)) {
      return { ...c, shortlistedStudentIds: [...c.shortlistedStudentIds, studentId] };
    }
    return c;
  });

  return {
    dataset: {
      ...dataset,
      students: updatedStudents,
      companies: updatedCompanies,
    },
    warning: validation.warnings.length > 0 ? validation.warnings.join(' ') : undefined,
  };
}

export function removeShortlistRecord(
  dataset: Dataset,
  studentId: number,
  companyId: number
): { dataset: Dataset; error?: string } {
  const student = dataset.students.find(s => s.id === studentId);
  const company = dataset.companies.find(c => c.id === companyId);

  if (!student) {
    return { dataset, error: `Student with ID ${studentId} does not exist.` };
  }
  if (!company) {
    return { dataset, error: `Company with ID ${companyId} does not exist.` };
  }

  const updatedStudents = dataset.students.map(s => {
    if (s.id === studentId) {
      return { ...s, shortlistedCompanyIds: s.shortlistedCompanyIds.filter(id => id !== companyId) };
    }
    return s;
  });

  const updatedCompanies = dataset.companies.map(c => {
    if (c.id === companyId) {
      return { ...c, shortlistedStudentIds: c.shortlistedStudentIds.filter(id => id !== studentId) };
    }
    return c;
  });

  return {
    dataset: {
      ...dataset,
      students: updatedStudents,
      companies: updatedCompanies,
    },
  };
}

export function addRoomRecord(
  dataset: Dataset,
  data: {
    id?: number;
    roomNumber: string;
    building: string;
    isAvailable?: boolean;
  }
): { dataset: Dataset; room?: Room; error?: string } {
  const nextId = data.id !== undefined ? Number(data.id) : (Math.max(0, ...dataset.rooms.map(r => r.id)) + 1);
  const newRoom: Room = {
    id: nextId,
    roomNumber: data.roomNumber.trim().toUpperCase(),
    building: data.building.trim(),
    isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
  };

  const validation = validateRoomRecord(newRoom, dataset.rooms);
  if (!validation.isValid) {
    return { dataset, error: validation.errors.join(' ') };
  }

  return {
    dataset: {
      ...dataset,
      rooms: [...dataset.rooms, newRoom],
    },
    room: newRoom,
  };
}

export function updateRoomRecord(
  dataset: Dataset,
  roomId: number,
  updates: Partial<Omit<Room, 'id'>>
): { dataset: Dataset; room?: Room; error?: string } {
  const target = dataset.rooms.find(r => r.id === roomId);
  if (!target) {
    return { dataset, error: `Room with ID ${roomId} not found.` };
  }

  const updated: Room = {
    ...target,
    roomNumber: updates.roomNumber !== undefined ? updates.roomNumber.trim().toUpperCase() : target.roomNumber,
    building: updates.building !== undefined ? updates.building.trim() : target.building,
    isAvailable: updates.isAvailable !== undefined ? updates.isAvailable : target.isAvailable,
    maintenanceReason: updates.maintenanceReason !== undefined ? updates.maintenanceReason : target.maintenanceReason,
  };

  const validation = validateRoomRecord(updated, dataset.rooms, true, roomId);
  if (!validation.isValid) {
    return { dataset, error: validation.errors.join(' ') };
  }

  return {
    dataset: {
      ...dataset,
      rooms: dataset.rooms.map(r => (r.id === roomId ? updated : r)),
    },
    room: updated,
  };
}

export function deleteRoomRecord(
  dataset: Dataset,
  roomId: number
): { dataset: Dataset; removedRoom?: Room; error?: string } {
  const target = dataset.rooms.find(r => r.id === roomId);
  if (!target) {
    return { dataset, error: `Room with ID ${roomId} not found.` };
  }

  return {
    dataset: {
      ...dataset,
      rooms: dataset.rooms.filter(r => r.id !== roomId),
    },
    removedRoom: target,
  };
}

export function addPanelRecord(
  dataset: Dataset,
  companyId: number,
  panelName: string,
  id?: number,
  isAvailable = true
): { dataset: Dataset; panel?: CompanyPanel; error?: string } {
  const company = dataset.companies.find(c => c.id === companyId);
  if (!company) {
    return { dataset, error: `Company with ID ${companyId} does not exist.` };
  }

  const allExistingPanels = dataset.companies.flatMap(c => c.panels);
  const nextId = id !== undefined ? Number(id) : (Math.max(0, ...allExistingPanels.map(p => p.id)) + 1);

  const newPanel: CompanyPanel = {
    id: nextId,
    companyId,
    panelName: panelName.trim(),
    isAvailable,
  };

  const validation = validatePanelRecord(newPanel, companyId, allExistingPanels, dataset.companies);
  if (!validation.isValid) {
    return { dataset, error: validation.errors.join(' ') };
  }

  const updatedCompanies = dataset.companies.map(c => {
    if (c.id === companyId) {
      return { ...c, panels: [...c.panels, newPanel] };
    }
    return c;
  });

  return {
    dataset: {
      ...dataset,
      companies: updatedCompanies,
    },
    panel: newPanel,
  };
}

export function updatePanelRecord(
  dataset: Dataset,
  panelId: number,
  updates: Partial<Omit<CompanyPanel, 'id' | 'companyId'>>
): { dataset: Dataset; panel?: CompanyPanel; error?: string } {
  let foundCompany: Company | undefined;
  let targetPanel: CompanyPanel | undefined;

  for (const c of dataset.companies) {
    const p = c.panels.find(panel => panel.id === panelId);
    if (p) {
      foundCompany = c;
      targetPanel = p;
      break;
    }
  }

  if (!foundCompany || !targetPanel) {
    return { dataset, error: `Panel with ID ${panelId} not found.` };
  }

  const updated: CompanyPanel = {
    ...targetPanel,
    panelName: updates.panelName !== undefined ? updates.panelName.trim() : targetPanel.panelName,
    isAvailable: updates.isAvailable !== undefined ? updates.isAvailable : targetPanel.isAvailable,
  };

  const allPanels = dataset.companies.flatMap(c => c.panels);
  const validation = validatePanelRecord(updated, foundCompany.id, allPanels, dataset.companies, true, panelId);
  if (!validation.isValid) {
    return { dataset, error: validation.errors.join(' ') };
  }

  const updatedCompanies = dataset.companies.map(c => {
    if (c.id === foundCompany!.id) {
      return {
        ...c,
        panels: c.panels.map(p => (p.id === panelId ? updated : p)),
      };
    }
    return c;
  });

  return {
    dataset: {
      ...dataset,
      companies: updatedCompanies,
    },
    panel: updated,
  };
}

export function deletePanelRecord(
  dataset: Dataset,
  panelId: number
): { dataset: Dataset; removedPanel?: CompanyPanel; error?: string } {
  let found = false;
  let removedPanel: CompanyPanel | undefined;

  const updatedCompanies = dataset.companies.map(c => {
    const p = c.panels.find(panel => panel.id === panelId);
    if (p) {
      found = true;
      removedPanel = p;
      return {
        ...c,
        panels: c.panels.filter(panel => panel.id !== panelId),
      };
    }
    return c;
  });

  if (!found) {
    return { dataset, error: `Panel with ID ${panelId} not found.` };
  }

  return {
    dataset: {
      ...dataset,
      companies: updatedCompanies,
    },
    removedPanel,
  };
}
