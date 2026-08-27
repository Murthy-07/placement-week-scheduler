import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  GraduationCap,
  Mail,
  Plus,
  Search,
  Sliders,
  UserCheck,
  UserPlus,
  UserX,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { Interview, Student } from '../types';
import { Modal } from './Modal';

export const StudentsView: React.FC = () => {
  const { dataset, interviews, unscheduledReports, setActiveTab, addStudent } = useScheduler();
  const { students, companies } = dataset;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [minCgpaFilter, setMinCgpaFilter] = useState<number>(5.0);
  const [inspectedStudent, setInspectedStudent] = useState<Student | null>(null);

  // Add Student Modal & Form State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [studentIdInput, setStudentIdInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [cgpaInput, setCgpaInput] = useState('');
  const [branchInput, setBranchInput] = useState<'CS' | 'IT' | 'ECE' | 'EE' | 'ME'>('CS');
  const [emailInput, setEmailInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const companyMap = useMemo(() => new Map(companies.map(c => [c.id, c])), [companies]);

  // Pre-calculate student interview itinerary map
  const studentInterviewsMap = useMemo(() => {
    const map = new Map<number, Interview[]>();
    for (const item of interviews) {
      if (item.status !== 'CANCELLED') {
        if (!map.has(item.studentId)) {
          map.set(item.studentId, []);
        }
        map.get(item.studentId)!.push(item);
      }
    }
    return map;
  }, [interviews]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (selectedBranch !== 'ALL' && s.branch !== selectedBranch) return false;
      if (s.cgpa < minCgpaFilter) return false;

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchId = `s${s.id}`.includes(q) || `${s.id}`.includes(q);
        const matchName = s.name.toLowerCase().includes(q);
        const matchEmail = s.email.toLowerCase().includes(q);
        if (!matchId && !matchName && !matchEmail) return false;
      }

      return true;
    });
  }, [students, selectedBranch, minCgpaFilter, searchQuery]);

  // Aggregate stats
  const totalScheduledStudents = useMemo(() => {
    return students.filter(s => (studentInterviewsMap.get(s.id)?.length || 0) > 0).length;
  }, [students, studentInterviewsMap]);

  const avgCgpa = useMemo(() => {
    if (students.length === 0) return '0.00';
    const sum = students.reduce((acc, s) => acc + s.cgpa, 0);
    return (sum / students.length).toFixed(2);
  }, [students]);

  // ---------------------------------------------------------------------------
  // Add Student Handlers
  // ---------------------------------------------------------------------------
  const handleOpenAddStudent = () => {
    const maxId = students.length > 0 ? Math.max(...students.map(s => s.id)) : 0;
    setStudentIdInput(`S${maxId + 1}`);
    setNameInput('');
    setCgpaInput('');
    setBranchInput('CS');
    setEmailInput('');
    setValidationError(null);
    setIsAddModalOpen(true);
  };

  const handleCloseAddStudent = () => {
    setIsAddModalOpen(false);
    setStudentIdInput('');
    setNameInput('');
    setCgpaInput('');
    setBranchInput('CS');
    setEmailInput('');
    setValidationError(null);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const rawId = studentIdInput.trim();
    if (!rawId) {
      setValidationError('Student ID is required.');
      return;
    }

    // Extract numeric portion if prefix S/s/# is provided
    const numericPart = rawId.replace(/^[sS#]/, '');
    const parsedId = parseInt(numericPart, 10);
    if (isNaN(parsedId) || parsedId <= 0) {
      setValidationError(`Student ID ${rawId} must be a valid positive number.`);
      return;
    }

    // Check uniqueness against current dataset
    const isDuplicate = students.some(s => s.id === parsedId);
    if (isDuplicate) {
      setValidationError(`Student ID ${rawId} already exists.`);
      return;
    }

    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      setValidationError('Student name is required.');
      return;
    }

    const trimmedCgpa = cgpaInput.trim();
    if (!trimmedCgpa) {
      setValidationError('CGPA is required.');
      return;
    }

    const parsedCgpa = parseFloat(trimmedCgpa);
    if (isNaN(parsedCgpa)) {
      setValidationError('CGPA must be a valid number.');
      return;
    }

    if (parsedCgpa < 0.0 || parsedCgpa > 10.0) {
      setValidationError(`CGPA must be between 0.00 and 10.00 (received ${parsedCgpa}).`);
      return;
    }

    const autoEmail = emailInput.trim() || `${trimmedName.toLowerCase().replace(/\s+/g, '.')}${parsedId}@campus.edu`;

    const result = addStudent({
      id: parsedId,
      name: trimmedName,
      cgpa: Number(parsedCgpa.toFixed(2)),
      branch: branchInput,
      email: autoEmail,
      shortlistedCompanyIds: [],
    });

    if (!result.success) {
      setValidationError(result.error || 'Failed to add student.');
      return;
    }

    // Successful Addition
    setIsAddModalOpen(false);
    setSuccessToast(`Student S${parsedId} (${trimmedName}) added to active dataset.`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Toast Notification */}
      {successToast && (
        <div
          id="student-success-toast"
          className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200"
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold ml-4"
          >
            &times;
          </button>
        </div>
      )}

      {/* Header & Stats Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            <span>Students ({students.length.toLocaleString()} Candidates)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Placement candidate directory with academic records, shortlists, and scheduled itineraries.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          <div className="flex items-center space-x-4 text-xs bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-400 block">Total Pool</span>
              <strong className="text-slate-900 text-sm">{students.length.toLocaleString()}</strong>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <span className="text-slate-400 block">Scheduled</span>
              <strong className="text-emerald-700 text-sm">{totalScheduledStudents.toLocaleString()}</strong>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <span className="text-slate-400 block">Average CGPA</span>
              <strong className="text-indigo-700 text-sm">{avgCgpa}</strong>
            </div>
          </div>

          <button
            id="btn-add-student"
            onClick={handleOpenAddStudent}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Student</span>
          </button>

          <button
            id="btn-goto-student-mgmt"
            onClick={() => setActiveTab('data-mgmt')}
            className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold border border-indigo-200 transition"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Manage Candidates</span>
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by ID (e.g. S4001), name, or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="ALL">All Branches (CS, IT, ECE, EE, ME)</option>
              <option value="CS">Computer Science (CS)</option>
              <option value="IT">Information Tech (IT)</option>
              <option value="ECE">Electronics (ECE)</option>
              <option value="EE">Electrical (EE)</option>
              <option value="ME">Mechanical (ME)</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 whitespace-nowrap">Min CGPA:</span>
            <input
              type="range"
              min="5.0"
              max="9.5"
              step="0.5"
              value={minCgpaFilter}
              onChange={e => setMinCgpaFilter(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <span className="text-xs font-bold text-indigo-700 w-8">{minCgpaFilter.toFixed(1)}</span>
          </div>
        </div>

        <div className="text-xs text-slate-400 mt-2">
          Showing <strong className="text-slate-700 font-semibold">{filteredStudents.length}</strong> matching candidate records
        </div>
      </div>

      {/* Candidate Table List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Student ID</th>
                <th className="px-4 py-3 font-semibold">Candidate Name</th>
                <th className="px-4 py-3 font-semibold">Branch</th>
                <th className="px-4 py-3 font-semibold">CGPA</th>
                <th className="px-4 py-3 font-semibold">Shortlists</th>
                <th className="px-4 py-3 font-semibold">Assigned Interviews</th>
                <th className="px-4 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.slice(0, 100).map(s => {
                const assigned = studentInterviewsMap.get(s.id) || [];
                const isHighDemand = s.shortlistedCompanyIds.length >= 8;

                return (
                  <tr key={s.id} id={`student-row-${s.id}`} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-950">S{s.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{s.name}</div>
                      <div className="text-[11px] text-slate-400">{s.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {s.branch}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${s.cgpa >= 8.5 ? 'text-indigo-700' : 'text-slate-800'}`}>
                        {s.cgpa.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        isHighDemand ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {s.shortlistedCompanyIds.length} Companies
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {assigned.length === 0 ? (
                          <span className="text-slate-400 italic">No assigned slots</span>
                        ) : (
                          assigned.map(item => (
                            <span
                              key={item.id}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-900 border border-indigo-100 font-medium"
                              title={`${item.companyName} on Day ${item.dayNumber} at ${item.startTime}`}
                            >
                              Day {item.dayNumber} {item.startTime} ({item.companyName.split(' ')[0]})
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setInspectedStudent(s)}
                        className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-semibold transition"
                      >
                        View Itinerary
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredStudents.length > 100 && (
          <div className="p-3 bg-slate-50 text-center text-xs text-slate-500 border-t border-slate-200">
            Showing first 100 candidates (use search to find specific students among all {filteredStudents.length})
          </div>
        )}
      </div>

      {/* Add Student Modal Form */}
      {isAddModalOpen && (
        <Modal
          isOpen={true}
          onClose={handleCloseAddStudent}
          title="Add Student"
          subtitle="Create a new candidate in the active placement dataset."
          maxWidth="md"
        >
          <form onSubmit={handleSaveStudent} className="space-y-4 text-xs">
            {validationError && (
              <div
                id="student-form-error"
                className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-start space-x-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{validationError}</span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Student ID <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-student-id"
                type="text"
                value={studentIdInput}
                onChange={e => setStudentIdInput(e.target.value)}
                placeholder="S4001"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                autoFocus
              />
              <p className="text-[11px] text-slate-400 mt-1">
                e.g. S4001 or 4001. Must be unique across all students.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-student-name"
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder="Rahul Kumar"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  CGPA <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-student-cgpa"
                  type="number"
                  step="0.01"
                  min="0.00"
                  max="10.00"
                  value={cgpaInput}
                  onChange={e => setCgpaInput(e.target.value)}
                  placeholder="8.4"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">Scale 0.00 to 10.00</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Branch</label>
                <select
                  id="select-student-branch"
                  value={branchInput}
                  onChange={e => setBranchInput(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-xs"
                >
                  <option value="CS">CS (Computer Science)</option>
                  <option value="IT">IT (Information Tech)</option>
                  <option value="ECE">ECE (Electronics)</option>
                  <option value="EE">EE (Electrical)</option>
                  <option value="ME">ME (Mechanical)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Email Address <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                id="input-student-email"
                type="email"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                placeholder="rahul.kumar4001@campus.edu"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                id="btn-cancel-student"
                onClick={handleCloseAddStudent}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-save-student"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs transition"
              >
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Student Itinerary Modal */}
      {inspectedStudent && (
        <Modal
          isOpen={true}
          onClose={() => setInspectedStudent(null)}
          title={`Placement Itinerary: ${inspectedStudent.name}`}
          subtitle={`${inspectedStudent.branch} \u2022 CGPA: ${inspectedStudent.cgpa} \u2022 ${inspectedStudent.email}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            {/* Scheduled Interviews Timeline */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2 flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Scheduled Interview Slots</span>
              </h4>

              {(studentInterviewsMap.get(inspectedStudent.id) || []).length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-lg text-center text-slate-500 border border-slate-200">
                  No active interviews scheduled yet for this student.
                </div>
              ) : (
                <div className="space-y-2">
                  {(studentInterviewsMap.get(inspectedStudent.id) || []).map(item => (
                    <div
                      key={item.id}
                      className="p-3 bg-indigo-50/70 rounded-lg border border-indigo-100 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{item.companyName}</div>
                        <div className="text-slate-500 mt-0.5">
                          {item.panelName} &bull; Room {item.roomNumber}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-indigo-900 bg-indigo-100 px-2 py-0.5 rounded">
                          Day {item.dayNumber}: {item.startTime} - {item.endTime}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1">{item.durationMinutes} mins duration</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shortlisted Companies List */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2 flex items-center space-x-1.5">
                <Building2 className="w-4 h-4 text-sky-600" />
                <span>All Shortlisted Firms ({inspectedStudent.shortlistedCompanyIds.length})</span>
              </h4>

              <div className="grid grid-cols-2 gap-2">
                {inspectedStudent.shortlistedCompanyIds.map(cId => {
                  const comp = companyMap.get(cId);
                  if (!comp) return null;
                  const isScheduled = (studentInterviewsMap.get(inspectedStudent.id) || []).some(
                    i => i.companyId === cId
                  );

                  return (
                    <div
                      key={cId}
                      className={`p-2.5 rounded-lg border flex items-center justify-between ${
                        isScheduled ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{comp.name}</div>
                        <div className="text-[10px] text-slate-400">Tier {comp.tier} &bull; Cutoff {comp.minCgpa}</div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isScheduled ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {isScheduled ? 'Scheduled' : 'Waitlisted'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInspectedStudent(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

