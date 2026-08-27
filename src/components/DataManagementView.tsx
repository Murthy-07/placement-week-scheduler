import React, { useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  DoorClosed,
  Edit2,
  GraduationCap,
  Layers,
  Link,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Sliders,
  Trash2,
  Unlink,
  UserCheck,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { Company, CompanyPanel, Room, Student } from '../types';

export const DataManagementView: React.FC = () => {
  const {
    dataset,
    dataSourceMode,
    isScheduleStale,
    scheduleStaleReason,
    regenerateSchedule,
    resetToDefaultDemoData,
    addStudent,
    updateStudent,
    deleteStudent,
    addCompany,
    updateCompany,
    deleteCompany,
    addShortlist,
    removeShortlist,
    addRoom,
    updateRoom,
    deleteRoom,
    addPanel,
    updatePanel,
    deletePanel,
  } = useScheduler();

  const [activeSubTab, setActiveSubTab] = useState<'students' | 'companies' | 'shortlists' | 'rooms'>('students');
  const [searchTerm, setSearchTerm] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  // Student Form State
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentForm, setStudentForm] = useState<{
    id?: number;
    name: string;
    cgpa: string;
    branch: 'CS' | 'IT' | 'ECE' | 'EE' | 'ME';
    email: string;
  }>({
    name: '',
    cgpa: '8.50',
    branch: 'CS',
    email: '',
  });

  // Company Form State
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState<{
    id?: number;
    name: string;
    tier: 1 | 2 | 3;
    minCgpa: string;
    interviewDurationMinutes: number;
    panelCount: number;
  }>({
    name: '',
    tier: 1,
    minCgpa: '7.50',
    interviewDurationMinutes: 30,
    panelCount: 2,
  });

  // Panel Form State
  const [isPanelModalOpen, setIsPanelModalOpen] = useState(false);
  const [editingPanel, setEditingPanel] = useState<CompanyPanel | null>(null);
  const [panelCompanyId, setPanelCompanyId] = useState<number>(dataset.companies[0]?.id || 1);
  const [panelForm, setPanelForm] = useState<{ panelName: string; isAvailable: boolean }>({
    panelName: '',
    isAvailable: true,
  });

  // Shortlist Form State
  const [shortlistStudentId, setShortlistStudentId] = useState<number>(dataset.students[0]?.id || 1);
  const [shortlistCompanyId, setShortlistCompanyId] = useState<number>(dataset.companies[0]?.id || 1);

  // Room Form State
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomForm, setRoomForm] = useState<{
    id?: number;
    roomNumber: string;
    building: string;
    isAvailable: boolean;
  }>({
    roomNumber: '',
    building: 'Block-A',
    isAvailable: true,
  });

  const showFeedback = (type: 'success' | 'error' | 'warning', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => {
      setFeedbackMsg(prev => (prev?.text === text ? null : prev));
    }, 5000);
  };

  // ---------------------------------------------------------------------------
  // Student Actions
  // ---------------------------------------------------------------------------
  const handleOpenAddStudent = () => {
    setEditingStudent(null);
    setStudentForm({
      name: '',
      cgpa: '8.50',
      branch: 'CS',
      email: '',
    });
    setIsStudentModalOpen(true);
  };

  const handleOpenEditStudent = (student: Student) => {
    setEditingStudent(student);
    setStudentForm({
      id: student.id,
      name: student.name,
      cgpa: student.cgpa.toString(),
      branch: student.branch,
      email: student.email,
    });
    setIsStudentModalOpen(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedCgpa = parseFloat(studentForm.cgpa);
    if (isNaN(parsedCgpa) || parsedCgpa < 0 || parsedCgpa > 10) {
      showFeedback('error', 'CGPA must be a valid number between 0.00 and 10.00.');
      return;
    }

    if (!editingStudent) {
      const res = addStudent({
        name: studentForm.name,
        cgpa: parsedCgpa,
        branch: studentForm.branch,
        email: studentForm.email || undefined,
      });
      if (res.success) {
        showFeedback('success', `Candidate "${studentForm.name}" added successfully.`);
        setIsStudentModalOpen(false);
      } else {
        showFeedback('error', res.error || 'Failed to add student.');
      }
    } else {
      const res = updateStudent(editingStudent.id, {
        name: studentForm.name,
        cgpa: parsedCgpa,
        branch: studentForm.branch,
        email: studentForm.email,
      });
      if (res.success) {
        showFeedback('success', `Candidate #${editingStudent.id} updated successfully.`);
        setIsStudentModalOpen(false);
      } else {
        showFeedback('error', res.error || 'Failed to update student.');
      }
    }
  };

  const handleDeleteStudent = (studentId: number, studentName: string) => {
    if (window.confirm(`Are you sure you want to delete candidate ${studentName} (ID: ${studentId})?`)) {
      const res = deleteStudent(studentId);
      if (res.success) {
        showFeedback('success', `Candidate #${studentId} deleted.`);
      } else {
        showFeedback('error', res.error || 'Failed to delete student.');
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Company Actions
  // ---------------------------------------------------------------------------
  const handleOpenAddCompany = () => {
    setEditingCompany(null);
    setCompanyForm({
      name: '',
      tier: 1,
      minCgpa: '7.50',
      interviewDurationMinutes: 30,
      panelCount: 2,
    });
    setIsCompanyModalOpen(true);
  };

  const handleOpenEditCompany = (company: Company) => {
    setEditingCompany(company);
    setCompanyForm({
      id: company.id,
      name: company.name,
      tier: company.tier,
      minCgpa: company.minCgpa.toString(),
      interviewDurationMinutes: company.interviewDurationMinutes,
      panelCount: company.panels.length,
    });
    setIsCompanyModalOpen(true);
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedMinCgpa = parseFloat(companyForm.minCgpa);
    if (isNaN(parsedMinCgpa) || parsedMinCgpa < 0 || parsedMinCgpa > 10) {
      showFeedback('error', 'Minimum CGPA cutoff must be between 0.00 and 10.00.');
      return;
    }

    if (!editingCompany) {
      const res = addCompany({
        name: companyForm.name,
        tier: companyForm.tier,
        minCgpa: parsedMinCgpa,
        interviewDurationMinutes: companyForm.interviewDurationMinutes,
        panelCount: companyForm.panelCount,
      });
      if (res.success) {
        showFeedback('success', `Company "${companyForm.name}" added successfully.`);
        setIsCompanyModalOpen(false);
      } else {
        showFeedback('error', res.error || 'Failed to add company.');
      }
    } else {
      const res = updateCompany(editingCompany.id, {
        name: companyForm.name,
        tier: companyForm.tier,
        minCgpa: parsedMinCgpa,
        interviewDurationMinutes: companyForm.interviewDurationMinutes,
      });
      if (res.success) {
        showFeedback('success', `Company #${editingCompany.id} updated successfully.`);
        setIsCompanyModalOpen(false);
      } else {
        showFeedback('error', res.error || 'Failed to update company.');
      }
    }
  };

  const handleDeleteCompany = (companyId: number, companyName: string) => {
    if (window.confirm(`Delete company "${companyName}" and its panels? Shortlists will be cleaned up.`)) {
      const res = deleteCompany(companyId);
      if (res.success) {
        showFeedback('success', `Company #${companyId} removed.`);
      } else {
        showFeedback('error', res.error || 'Failed to delete company.');
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Panel Actions
  // ---------------------------------------------------------------------------
  const handleOpenAddPanel = (companyId: number) => {
    setEditingPanel(null);
    setPanelCompanyId(companyId);
    const comp = dataset.companies.find(c => c.id === companyId);
    setPanelForm({
      panelName: `${comp?.name || 'Company'} Panel ${String.fromCharCode(65 + (comp?.panels.length || 0))}`,
      isAvailable: true,
    });
    setIsPanelModalOpen(true);
  };

  const handleOpenEditPanel = (panel: CompanyPanel, companyId: number) => {
    setEditingPanel(panel);
    setPanelCompanyId(companyId);
    setPanelForm({
      panelName: panel.panelName,
      isAvailable: panel.isAvailable,
    });
    setIsPanelModalOpen(true);
  };

  const handleSavePanel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!panelForm.panelName.trim()) {
      showFeedback('error', 'Panel name cannot be blank.');
      return;
    }

    if (!editingPanel) {
      const res = addPanel(panelCompanyId, panelForm.panelName, undefined, panelForm.isAvailable);
      if (res.success) {
        showFeedback('success', `Panel "${panelForm.panelName}" added.`);
        setIsPanelModalOpen(false);
      } else {
        showFeedback('error', res.error || 'Failed to add panel.');
      }
    } else {
      const res = updatePanel(editingPanel.id, {
        panelName: panelForm.panelName,
        isAvailable: panelForm.isAvailable,
      });
      if (res.success) {
        showFeedback('success', `Panel #${editingPanel.id} updated.`);
        setIsPanelModalOpen(false);
      } else {
        showFeedback('error', res.error || 'Failed to update panel.');
      }
    }
  };

  const handleDeletePanel = (panelId: number, panelName: string) => {
    if (window.confirm(`Delete interview panel "${panelName}"?`)) {
      const res = deletePanel(panelId);
      if (res.success) {
        showFeedback('success', `Panel #${panelId} deleted.`);
      } else {
        showFeedback('error', res.error || 'Failed to delete panel.');
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Shortlist Actions
  // ---------------------------------------------------------------------------
  const handleAddShortlist = (e: React.FormEvent) => {
    e.preventDefault();
    const res = addShortlist(Number(shortlistStudentId), Number(shortlistCompanyId));
    if (res.success) {
      if (res.warning) {
        showFeedback('warning', `Shortlist added with notice: ${res.warning}`);
      } else {
        showFeedback('success', 'Shortlist linkage created successfully.');
      }
    } else {
      showFeedback('error', res.error || 'Failed to create shortlist.');
    }
  };

  const handleRemoveShortlist = (studentId: number, companyId: number) => {
    const res = removeShortlist(studentId, companyId);
    if (res.success) {
      showFeedback('success', 'Shortlist linkage removed.');
    } else {
      showFeedback('error', res.error || 'Failed to remove shortlist.');
    }
  };

  // ---------------------------------------------------------------------------
  // Room Actions
  // ---------------------------------------------------------------------------
  const handleOpenAddRoom = () => {
    setEditingRoom(null);
    setRoomForm({
      roomNumber: '',
      building: 'Block-A',
      isAvailable: true,
    });
    setIsRoomModalOpen(true);
  };

  const handleOpenEditRoom = (room: Room) => {
    setEditingRoom(room);
    setRoomForm({
      id: room.id,
      roomNumber: room.roomNumber,
      building: room.building,
      isAvailable: room.isAvailable,
    });
    setIsRoomModalOpen(true);
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomForm.roomNumber.trim()) {
      showFeedback('error', 'Room number is required.');
      return;
    }

    if (!editingRoom) {
      const res = addRoom({
        roomNumber: roomForm.roomNumber,
        building: roomForm.building,
        isAvailable: roomForm.isAvailable,
      });
      if (res.success) {
        showFeedback('success', `Room ${roomForm.roomNumber} created.`);
        setIsRoomModalOpen(false);
      } else {
        showFeedback('error', res.error || 'Failed to create room.');
      }
    } else {
      const res = updateRoom(editingRoom.id, {
        roomNumber: roomForm.roomNumber,
        building: roomForm.building,
        isAvailable: roomForm.isAvailable,
      });
      if (res.success) {
        showFeedback('success', `Room #${editingRoom.id} updated.`);
        setIsRoomModalOpen(false);
      } else {
        showFeedback('error', res.error || 'Failed to update room.');
      }
    }
  };

  const handleDeleteRoom = (roomId: number, roomNumber: string) => {
    if (window.confirm(`Delete Room ${roomNumber}?`)) {
      const res = deleteRoom(roomId);
      if (res.success) {
        showFeedback('success', `Room ${roomNumber} deleted.`);
      } else {
        showFeedback('error', res.error || 'Failed to delete room.');
      }
    }
  };

  // Filtered lists
  const filteredStudents = dataset.students.filter(
    s =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id.toString().includes(searchTerm) ||
      s.branch.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCompanies = dataset.companies.filter(
    c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toString().includes(searchTerm)
  );

  const filteredRooms = dataset.rooms.filter(
    r =>
      r.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.building.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Status Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Manual Data Management</h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${
                dataSourceMode === 'EDITED'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : dataSourceMode === 'IMPORTED'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
              }`}
            >
              Mode: {dataSourceMode}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Perform live record modifications with domain invariant validation and stale schedule safety.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {isScheduleStale && (
            <button
              id="btn-regenerate-stale"
              onClick={regenerateSchedule}
              className="flex items-center space-x-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition animate-pulse"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Regenerate Schedule</span>
            </button>
          )}

          <button
            id="btn-reset-default-demo"
            onClick={() => {
              if (window.confirm('Reset all manual and imported edits to default placement demo data?')) {
                resetToDefaultDemoData();
                showFeedback('success', 'Reset system to default demo state.');
              }
            }}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>

      {/* Stale Schedule Notice if Dirty */}
      {isScheduleStale && (
        <div
          id="stale-schedule-banner"
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3 text-amber-900 shadow-sm"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <p className="font-bold text-amber-800">Schedule is Stale (Pending Re-run)</p>
            <p className="text-amber-700 mt-0.5">
              Underlying placement master records were altered ({scheduleStaleReason || 'manual record modification'}).
              Interviews and clash checks will reflect the updated dataset once regenerated.
            </p>
          </div>
          <button
            onClick={regenerateSchedule}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium text-xs shadow-xs"
          >
            Apply & Re-generate
          </button>
        </div>
      )}

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div
          id="data-mgmt-feedback"
          className={`p-3 rounded-lg text-xs font-medium flex items-center space-x-2 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : feedbackMsg.type === 'warning'
              ? 'bg-amber-50 text-amber-800 border border-amber-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-600" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Sub-Tabs and Search Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-1 border border-slate-200 rounded-lg p-1 bg-slate-50">
            <button
              id="subtab-students"
              onClick={() => {
                setActiveSubTab('students');
                setSearchTerm('');
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeSubTab === 'students' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Candidates ({dataset.students.length})</span>
            </button>

            <button
              id="subtab-companies"
              onClick={() => {
                setActiveSubTab('companies');
                setSearchTerm('');
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeSubTab === 'companies' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Companies & Panels ({dataset.companies.length})</span>
            </button>

            <button
              id="subtab-shortlists"
              onClick={() => {
                setActiveSubTab('shortlists');
                setSearchTerm('');
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeSubTab === 'shortlists' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Link className="w-3.5 h-3.5" />
              <span>Shortlists ({dataset.students.reduce((acc, s) => acc + s.shortlistedCompanyIds.length, 0)})</span>
            </button>

            <button
              id="subtab-rooms"
              onClick={() => {
                setActiveSubTab('rooms');
                setSearchTerm('');
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeSubTab === 'rooms' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <DoorClosed className="w-3.5 h-3.5" />
              <span>Venues / Rooms ({dataset.rooms.length})</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="mgmt-search-input"
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Filter records..."
                className="pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs w-48 md:w-64 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {activeSubTab === 'students' && (
              <button
                id="btn-add-student"
                onClick={handleOpenAddStudent}
                className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Candidate</span>
              </button>
            )}

            {activeSubTab === 'companies' && (
              <button
                id="btn-add-company"
                onClick={handleOpenAddCompany}
                className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Firm</span>
              </button>
            )}

            {activeSubTab === 'rooms' && (
              <button
                id="btn-add-room"
                onClick={handleOpenAddRoom}
                className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Venue</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Candidates Management */}
        {activeSubTab === 'students' && (
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-4 font-semibold text-slate-600">ID</th>
                  <th className="py-2.5 px-4 font-semibold text-slate-600">Name</th>
                  <th className="py-2.5 px-4 font-semibold text-slate-600">Branch</th>
                  <th className="py-2.5 px-4 font-semibold text-slate-600">CGPA</th>
                  <th className="py-2.5 px-4 font-semibold text-slate-600">Shortlisted In</th>
                  <th className="py-2.5 px-4 font-semibold text-slate-600">Email</th>
                  <th className="py-2.5 px-4 font-semibold text-slate-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-slate-900">#{student.id}</td>
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-800">{student.name}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {student.branch}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-800">
                      {student.cgpa.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 font-sans">
                      <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 font-medium text-[11px]">
                        {student.shortlistedCompanyIds.length} Companies
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 font-sans text-[11px] truncate max-w-[150px]">
                      {student.email}
                    </td>
                    <td className="py-2.5 px-4 text-right space-x-1 font-sans">
                      <button
                        id={`btn-edit-student-${student.id}`}
                        onClick={() => handleOpenEditStudent(student)}
                        className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded"
                        title="Edit Candidate"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id={`btn-del-student-${student.id}`}
                        onClick={() => handleDeleteStudent(student.id, student.name)}
                        className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete Candidate"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Companies & Panels Management */}
        {activeSubTab === 'companies' && (
          <div className="p-4 space-y-4 max-h-[650px] overflow-y-auto">
            {filteredCompanies.map(company => (
              <div key={company.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-2 py-0.5 text-xs font-bold rounded ${
                        company.tier === 1
                          ? 'bg-purple-100 text-purple-700'
                          : company.tier === 2
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      Tier {company.tier}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">{company.name}</h4>
                    <span className="text-xs text-slate-500">
                      Min CGPA: <strong>{company.minCgpa.toFixed(2)}</strong> &bull; Shortlisted Candidates: <strong>{company.shortlistedStudentIds.length}</strong>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      id={`btn-add-panel-comp-${company.id}`}
                      onClick={() => handleOpenAddPanel(company.id)}
                      className="flex items-center space-x-1 px-2.5 py-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded text-xs font-medium"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Panel</span>
                    </button>
                    <button
                      id={`btn-edit-comp-${company.id}`}
                      onClick={() => handleOpenEditCompany(company)}
                      className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-white rounded border border-slate-200"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id={`btn-del-comp-${company.id}`}
                      onClick={() => handleDeleteCompany(company.id, company.name)}
                      className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded border border-slate-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Company Panels List */}
                <div className="mt-3 pt-3 border-t border-slate-200/80">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Active Interview Panels ({company.panels.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {company.panels.map(panel => (
                      <div
                        key={panel.id}
                        className="bg-white border border-slate-200 rounded p-2 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              panel.isAvailable ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                          />
                          <span className="font-medium text-slate-800">{panel.panelName}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleOpenEditPanel(panel, company.id)}
                            className="p-0.5 text-slate-400 hover:text-indigo-600"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeletePanel(panel.id, panel.panelName)}
                            className="p-0.5 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Shortlists Management */}
        {activeSubTab === 'shortlists' && (
          <div className="p-4 space-y-6">
            {/* Quick Add Shortlist Form */}
            <form
              onSubmit={handleAddShortlist}
              className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row items-end gap-3"
            >
              <div className="flex-1 w-full">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Candidate</label>
                <select
                  id="select-shortlist-student"
                  value={shortlistStudentId}
                  onChange={e => setShortlistStudentId(Number(e.target.value))}
                  className="w-full text-xs border border-slate-300 rounded p-1.5 bg-white"
                >
                  {dataset.students.map(s => (
                    <option key={s.id} value={s.id}>
                      #{s.id} - {s.name} ({s.branch}, CGPA: {s.cgpa.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 w-full">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Company</label>
                <select
                  id="select-shortlist-company"
                  value={shortlistCompanyId}
                  onChange={e => setShortlistCompanyId(Number(e.target.value))}
                  className="w-full text-xs border border-slate-300 rounded p-1.5 bg-white"
                >
                  {dataset.companies.map(c => (
                    <option key={c.id} value={c.id}>
                      Tier {c.tier} - {c.name} (Min CGPA: {c.minCgpa.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <button
                id="btn-submit-shortlist"
                type="submit"
                className="w-full md:w-auto px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium flex items-center justify-center space-x-1 shadow-xs"
              >
                <Link className="w-3.5 h-3.5" />
                <span>Link Shortlist</span>
              </button>
            </form>

            {/* Existing Shortlist Matrix Preview */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Active Shortlist Links
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {dataset.students.flatMap(student =>
                  student.shortlistedCompanyIds.map(companyId => {
                    const comp = dataset.companies.find(c => c.id === companyId);
                    if (!comp) return null;
                    const belowCutoff = student.cgpa < comp.minCgpa;
                    return (
                      <div
                        key={`${student.id}-${companyId}`}
                        className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                          belowCutoff
                            ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                            : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <div>
                          <div className="font-semibold flex items-center space-x-1.5">
                            <span>{student.name}</span>
                            <span className="text-slate-400 font-normal">➔</span>
                            <span>{comp.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            CGPA: {student.cgpa.toFixed(2)} | Cutoff: {comp.minCgpa.toFixed(2)}{' '}
                            {belowCutoff && <span className="text-amber-600 font-bold">(Below Cutoff)</span>}
                          </div>
                        </div>

                        <button
                          id={`btn-unlink-${student.id}-${companyId}`}
                          onClick={() => handleRemoveShortlist(student.id, companyId)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded"
                          title="Remove Shortlist Link"
                        >
                          <Unlink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Rooms Management */}
        {activeSubTab === 'rooms' && (
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-4 font-semibold text-slate-600">Room ID</th>
                  <th className="py-2.5 px-4 font-semibold text-slate-600">Room Number</th>
                  <th className="py-2.5 px-4 font-semibold text-slate-600">Building</th>
                  <th className="py-2.5 px-4 font-semibold text-slate-600">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-slate-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRooms.map(room => (
                  <tr key={room.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-900">#{room.id}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-800">{room.roomNumber}</td>
                    <td className="py-2.5 px-4 text-slate-600">{room.building}</td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          room.isAvailable
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {room.isAvailable ? 'Operational' : 'Maintenance / Outage'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right space-x-1">
                      <button
                        id={`btn-edit-room-${room.id}`}
                        onClick={() => handleOpenEditRoom(room)}
                        className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded"
                        title="Edit Venue"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id={`btn-del-room-${room.id}`}
                        onClick={() => handleDeleteRoom(room.id, room.roomNumber)}
                        className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete Venue"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Student Add/Edit */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingStudent ? `Edit Candidate #${editingStudent.id}` : 'Add New Candidate'}
              </h3>
              <button
                onClick={() => setIsStudentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  id="input-student-name"
                  type="text"
                  required
                  value={studentForm.name}
                  onChange={e => setStudentForm({ ...studentForm, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Branch *</label>
                  <select
                    id="input-student-branch"
                    value={studentForm.branch}
                    onChange={e =>
                      setStudentForm({
                        ...studentForm,
                        branch: e.target.value as 'CS' | 'IT' | 'ECE' | 'EE' | 'ME',
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="CS">CS</option>
                    <option value="IT">IT</option>
                    <option value="ECE">ECE</option>
                    <option value="EE">EE</option>
                    <option value="ME">ME</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">CGPA (0.0 - 10.0) *</label>
                  <input
                    id="input-student-cgpa"
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    required
                    value={studentForm.cgpa}
                    onChange={e => setStudentForm({ ...studentForm, cgpa: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  id="input-student-email"
                  type="email"
                  value={studentForm.email}
                  onChange={e => setStudentForm({ ...studentForm, email: e.target.value })}
                  placeholder="name@campus.edu"
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-student"
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-xs"
                >
                  Save Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Company Add/Edit */}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingCompany ? `Edit Company #${editingCompany.id}` : 'Add New Firm'}
              </h3>
              <button
                onClick={() => setIsCompanyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCompany} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company Name *</label>
                <input
                  id="input-company-name"
                  type="text"
                  required
                  value={companyForm.name}
                  onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })}
                  placeholder="e.g. Google, Goldman Sachs"
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tier *</label>
                  <select
                    id="input-company-tier"
                    value={companyForm.tier}
                    onChange={e =>
                      setCompanyForm({
                        ...companyForm,
                        tier: Number(e.target.value) as 1 | 2 | 3,
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value={1}>Tier 1 (Dream / High Priority)</option>
                    <option value={2}>Tier 2 (Core)</option>
                    <option value={3}>Tier 3 (Mass / Open)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min CGPA Cutoff *</label>
                  <input
                    id="input-company-mincgpa"
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    required
                    value={companyForm.minCgpa}
                    onChange={e => setCompanyForm({ ...companyForm, minCgpa: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Interview Duration (min)</label>
                  <input
                    id="input-company-duration"
                    type="number"
                    min="15"
                    step="5"
                    value={companyForm.interviewDurationMinutes}
                    onChange={e =>
                      setCompanyForm({
                        ...companyForm,
                        interviewDurationMinutes: Number(e.target.value),
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {!editingCompany && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Initial Panels</label>
                    <input
                      id="input-company-panels"
                      type="number"
                      min="1"
                      max="10"
                      value={companyForm.panelCount}
                      onChange={e =>
                        setCompanyForm({
                          ...companyForm,
                          panelCount: Number(e.target.value),
                        })
                      }
                      className="w-full border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCompanyModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-company"
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-xs"
                >
                  Save Firm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Panel Add/Edit */}
      {isPanelModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingPanel ? `Edit Panel #${editingPanel.id}` : 'Add Interview Panel'}
              </h3>
              <button
                onClick={() => setIsPanelModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePanel} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Panel Name *</label>
                <input
                  id="input-panel-name"
                  type="text"
                  required
                  value={panelForm.panelName}
                  onChange={e => setPanelForm({ ...panelForm, panelName: e.target.value })}
                  placeholder="e.g. Google Panel Alpha"
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  id="input-panel-available"
                  type="checkbox"
                  checked={panelForm.isAvailable}
                  onChange={e => setPanelForm({ ...panelForm, isAvailable: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="input-panel-available" className="font-medium text-slate-700">
                  Panel is available for scheduling
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPanelModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-panel"
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-xs"
                >
                  Save Panel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Room Add/Edit */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingRoom ? `Edit Room #${editingRoom.id}` : 'Add Interview Venue / Room'}
              </h3>
              <button
                onClick={() => setIsRoomModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Room Number / Identifier *</label>
                <input
                  id="input-room-number"
                  type="text"
                  required
                  value={roomForm.roomNumber}
                  onChange={e => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
                  placeholder="e.g. A-101, LH-2"
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Building *</label>
                <input
                  id="input-room-building"
                  type="text"
                  required
                  value={roomForm.building}
                  onChange={e => setRoomForm({ ...roomForm, building: e.target.value })}
                  placeholder="e.g. Block-A, Academic Complex"
                  className="w-full border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  id="input-room-available"
                  type="checkbox"
                  checked={roomForm.isAvailable}
                  onChange={e => setRoomForm({ ...roomForm, isAvailable: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="input-room-available" className="font-medium text-slate-700">
                  Venue is operational (Uncheck if under maintenance)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsRoomModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-room"
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-xs"
                >
                  Save Venue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
