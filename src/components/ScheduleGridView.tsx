import React, { useMemo, useState } from 'react';
import {
  Building2,
  Calendar,
  Clock,
  DoorClosed,
  Eye,
  Filter,
  GraduationCap,
  Grid,
  List,
  Search,
  Users,
  Zap,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { Interview, InterviewStatus } from '../types';
import { Modal } from './Modal';

export const ScheduleGridView: React.FC = () => {
  const {
    dataset,
    interviews,
    selectedDayId,
    setSelectedDayId,
  } = useScheduler();

  const { companies, rooms, timeslots, placementDays } = dataset;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | 'ALL'>('ALL');
  const [selectedRoomId, setSelectedRoomId] = useState<number | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<InterviewStatus | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [inspectedInterview, setInspectedInterview] = useState<Interview | null>(null);

  // Filtered day timeslots
  const dayTimeslots = useMemo(() => {
    return timeslots.filter(t => t.dayId === selectedDayId);
  }, [timeslots, selectedDayId]);

  // Filtered interviews for the selected day and criteria
  const filteredInterviews = useMemo(() => {
    return interviews.filter(item => {
      if (item.dayId !== selectedDayId) return false;

      if (selectedCompanyId !== 'ALL' && item.companyId !== selectedCompanyId) return false;
      if (selectedRoomId !== 'ALL' && item.roomId !== selectedRoomId) return false;
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false;

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchStudent = item.studentName.toLowerCase().includes(q);
        const matchCompany = item.companyName.toLowerCase().includes(q);
        const matchPanel = item.panelName.toLowerCase().includes(q);
        const matchRoom = item.roomNumber.toLowerCase().includes(q);
        if (!matchStudent && !matchCompany && !matchPanel && !matchRoom) return false;
      }

      return true;
    });
  }, [interviews, selectedDayId, selectedCompanyId, selectedRoomId, selectedStatus, searchQuery]);

  // Fast map for Room-Slot matrix lookup: "roomId-timeslotId" -> Interview
  const interviewMatrixMap = useMemo(() => {
    const map = new Map<string, Interview>();
    for (const item of interviews) {
      if (item.dayId === selectedDayId && item.status !== 'CANCELLED') {
        map.set(`${item.roomId}-${item.timeslotId}`, item);
      }
    }
    return map;
  }, [interviews, selectedDayId]);

  return (
    <div className="space-y-5 pb-12">
      {/* Top Header & Day Selector Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <span>Placement Master Timetable Grid</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time allocation across 20 interview rooms & 16 daily time windows
          </p>
        </div>

        {/* Day Tabs */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg">
          {placementDays.map(day => (
            <button
              key={day.id}
              id={`day-tab-${day.id}`}
              onClick={() => setSelectedDayId(day.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                selectedDayId === day.id
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {day.description}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search candidate, firm, panel..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Company Filter */}
          <div>
            <select
              value={selectedCompanyId}
              onChange={e => setSelectedCompanyId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="ALL">All Companies ({companies.length})</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} (Tier {c.tier})
                </option>
              ))}
            </select>
          </div>

          {/* Room Filter */}
          <div>
            <select
              value={selectedRoomId}
              onChange={e => setSelectedRoomId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="ALL">All Rooms ({rooms.length})</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>
                  Room {r.roomNumber}
                </option>
              ))}
            </select>
          </div>

          {/* Status & View Mode */}
          <div className="flex items-center space-x-2">
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value as InterviewStatus | 'ALL')}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="MOVED">Moved (Replanned)</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded text-xs ${viewMode === 'grid' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500'}`}
                title="Matrix View"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded text-xs ${viewMode === 'table' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500'}`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-800 font-semibold">{filteredInterviews.length}</strong> active interviews for Day {selectedDayId}
          </span>
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span>Scheduled</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Moved (Replan)</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-slate-300" />
              <span>Vacant</span>
            </span>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: MATRIX GRID */}
      {viewMode === 'grid' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs min-w-[1400px]">
              {/* Header Row: Room Columns */}
              <thead className="bg-slate-900 text-white sticky top-0 z-20">
                <tr>
                  <th className="p-3 font-semibold border-r border-slate-800 w-32 sticky left-0 bg-slate-900 z-30">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                      <span>Time Slot</span>
                    </div>
                  </th>
                  {rooms.map(room => (
                    <th key={room.id} className="p-2.5 font-semibold text-center border-r border-slate-800 min-w-[120px]">
                      <div className="text-[11px] text-sky-300">Room {room.roomNumber}</div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Body: Timeslot Rows */}
              <tbody className="divide-y divide-slate-100">
                {dayTimeslots.map((slot, sIdx) => (
                  <tr key={slot.id} className={sIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                    {/* Time Header */}
                    <td className="p-2.5 font-bold text-slate-700 bg-slate-100/80 border-r border-slate-200 sticky left-0 z-10 whitespace-nowrap">
                      {slot.startTime} - {slot.endTime}
                    </td>

                    {/* Room Columns */}
                    {rooms.map(room => {
                      const item = interviewMatrixMap.get(`${room.id}-${slot.id}`);

                      if (!item) {
                        return (
                          <td
                            key={room.id}
                            className="p-1 border-r border-slate-100 text-center text-slate-300 hover:bg-slate-100/50 transition cursor-default"
                          >
                            <span className="text-[10px] text-slate-300">&bull;</span>
                          </td>
                        );
                      }

                      const isMoved = item.status === 'MOVED';

                      return (
                        <td
                          key={room.id}
                          onClick={() => setInspectedInterview(item)}
                          className="p-1 border-r border-slate-100 cursor-pointer transition hover:scale-[1.02]"
                        >
                          <div
                            className={`p-1.5 rounded-md border text-[10.5px] leading-tight flex flex-col justify-between h-14 ${
                              isMoved
                                ? 'bg-amber-50/90 border-amber-300 text-amber-900 shadow-xs'
                                : 'bg-indigo-50/80 border-indigo-200 text-indigo-950'
                            }`}
                          >
                            <div className="font-bold truncate" title={item.studentName}>
                              {item.studentName}
                            </div>
                            <div className="text-[9.5px] truncate font-medium text-slate-600" title={item.companyName}>
                              {item.companyName.split(' ')[0]} ({item.panelName.split(' ')[1] || 'P'})
                            </div>
                            <div className="flex items-center justify-between text-[9px] mt-0.5">
                              <span className="font-semibold text-slate-500">CG: {item.studentCgpa}</span>
                              {isMoved && (
                                <span className="px-1 py-0.2 rounded font-bold text-[8px] bg-amber-200 text-amber-900">
                                  Moved
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: SEARCHABLE TABLE */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Time</th>
                  <th className="px-4 py-3 font-semibold">Candidate</th>
                  <th className="px-4 py-3 font-semibold">Branch & CGPA</th>
                  <th className="px-4 py-3 font-semibold">Company</th>
                  <th className="px-4 py-3 font-semibold">Panel</th>
                  <th className="px-4 py-3 font-semibold">Room</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInterviews.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {item.startTime} - {item.endTime}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">{item.studentName}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="font-medium text-slate-800">{item.studentBranch}</span> &bull; {item.studentCgpa}
                    </td>
                    <td className="px-4 py-3 font-medium text-indigo-700">{item.companyName}</td>
                    <td className="px-4 py-3 text-slate-700">{item.panelName}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">Room {item.roomNumber}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          item.status === 'MOVED'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setInspectedInterview(item)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Inspection Modal */}
      {inspectedInterview && (
        <Modal
          isOpen={true}
          onClose={() => setInspectedInterview(null)}
          title={`Interview #${inspectedInterview.id} - ${inspectedInterview.studentName}`}
          subtitle={`Day ${inspectedInterview.dayNumber} \u2022 ${inspectedInterview.startTime} to ${inspectedInterview.endTime}`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 font-medium block">Candidate</span>
                <strong className="text-slate-900 text-sm">{inspectedInterview.studentName}</strong>
                <p className="text-slate-600 mt-0.5">
                  {inspectedInterview.studentBranch} Branch &bull; CGPA: {inspectedInterview.studentCgpa}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 font-medium block">Company & Tier</span>
                <strong className="text-indigo-900 text-sm">{inspectedInterview.companyName}</strong>
                <p className="text-slate-600 mt-0.5">Tier {inspectedInterview.companyTier} Priority Recruiter</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 font-medium block">Allocated Panel</span>
                <strong className="text-slate-900">{inspectedInterview.panelName}</strong>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-400 font-medium block">Assigned Room</span>
                <strong className="text-slate-900">Room {inspectedInterview.roomNumber}</strong>
              </div>
            </div>

            {inspectedInterview.notes && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900">
                <span className="font-bold block">Replan / System Notes:</span>
                <p className="mt-0.5">{inspectedInterview.notes}</p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInspectedInterview(null)}
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
