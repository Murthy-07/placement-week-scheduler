import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  DoorClosed,
  Flame,
  GraduationCap,
  History,
  RotateCcw,
  ShieldAlert,
  UserX,
  Zap,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { DisruptionType } from '../types';

export const DisruptionsView: React.FC = () => {
  const {
    dataset,
    disruptions,
    activeReplanResult,
    applyPanelDelay,
    applyPanelDropout,
    applyStudentWithdrawal,
    applyRoomUnavailable,
    runDay1CrisisBenchmark,
    resetToInitialSchedule,
    selectedDayId,
  } = useScheduler();

  const { companies, rooms, students } = dataset;

  const [activeFormTab, setActiveFormTab] = useState<DisruptionType>('PANEL_DELAY');

  // Form states
  const [delayPanelId, setDelayPanelId] = useState<number>(companies[0]?.panels[0]?.id || 1);
  const [delayMinutes, setDelayMinutes] = useState<number>(60);
  const [delayStartHour, setDelayStartHour] = useState<number>(9);
  const [delayDayId, setDelayDayId] = useState<number>(1);

  const [dropoutPanelId, setDropoutPanelId] = useState<number>(companies[0]?.panels[1]?.id || 2);
  const [dropoutReason, setDropoutReason] = useState<string>('Interviewer medical emergency');

  const [withdrawStudentCount, setWithdrawStudentCount] = useState<number>(5);
  const [withdrawReason, setWithdrawReason] = useState<string>('Accepted Off-Campus Tech Offer');

  const [outageRoomId, setOutageRoomId] = useState<number>(1);
  const [outageReason, setOutageReason] = useState<string>('Air conditioning failure & power outage');

  const handleApplyDelay = (e: React.FormEvent) => {
    e.preventDefault();
    applyPanelDelay({
      panelId: Number(delayPanelId),
      dayId: Number(delayDayId),
      delayMinutes: Number(delayMinutes),
      startHour: Number(delayStartHour),
    });
  };

  const handleApplyDropout = (e: React.FormEvent) => {
    e.preventDefault();
    applyPanelDropout({
      panelId: Number(dropoutPanelId),
      reason: dropoutReason,
    });
  };

  const handleApplyWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    const targetStudents = students.slice(0, withdrawStudentCount).map(s => s.id);
    applyStudentWithdrawal({
      studentIds: targetStudents,
      reason: withdrawReason,
    });
  };

  const handleApplyOutage = (e: React.FormEvent) => {
    e.preventDefault();
    applyRoomUnavailable({
      roomId: Number(outageRoomId),
      dayId: selectedDayId,
      reason: outageReason,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <span>Disruption & Dynamic Replanning Studio</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Inject real-world operational disruptions and trigger local ripple repair algorithms designed to minimize schedule churn.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={resetToInitialSchedule}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Schedule</span>
          </button>
        </div>
      </div>

      {/* Disruption Injector Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">
            Simulate Disruption Event
          </span>
          <span className="text-[11px] text-slate-400">Zero whole-schedule reset &bull; Local minimal repair</span>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-200 overflow-x-auto bg-slate-100/50">
          <button
            onClick={() => setActiveFormTab('PANEL_DELAY')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
              activeFormTab === 'PANEL_DELAY'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            1. Panel / Recruiter Delay
          </button>
          <button
            onClick={() => setActiveFormTab('PANEL_DROPOUT')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
              activeFormTab === 'PANEL_DROPOUT'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            2. Panel Dropout
          </button>
          <button
            onClick={() => setActiveFormTab('STUDENT_WITHDRAWAL')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
              activeFormTab === 'STUDENT_WITHDRAWAL'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            3. Student Withdrawal
          </button>
          <button
            onClick={() => setActiveFormTab('ROOM_UNAVAILABLE')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
              activeFormTab === 'ROOM_UNAVAILABLE'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            4. Room Outage
          </button>
          <button
            onClick={() => setActiveFormTab('DAY1_CRISIS')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition flex items-center space-x-1.5 ${
              activeFormTab === 'DAY1_CRISIS'
                ? 'border-red-600 text-red-700 bg-white font-bold'
                : 'border-transparent text-red-600 hover:text-red-700'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-red-500" />
            <span>5. Day-1 Crisis Benchmark</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {/* TAB 1: PANEL DELAY */}
          {activeFormTab === 'PANEL_DELAY' && (
            <form onSubmit={handleApplyDelay} className="space-y-4">
              <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-100 text-xs text-indigo-900">
                <strong>Local Push-Forward Slide:</strong> When a panel arrives late, the engine isolates only the affected downstream interviews on that day, and slides them into the earliest mutual vacancies without disturbing other companies.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Recruiter Panel</label>
                  <select
                    value={delayPanelId}
                    onChange={e => setDelayPanelId(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    {companies.flatMap(c =>
                      c.panels.map(p => (
                        <option key={p.id} value={p.id}>
                          {c.name} - {p.panelName}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Placement Day</label>
                  <select
                    value={delayDayId}
                    onChange={e => setDelayDayId(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    {[1, 2, 3, 4, 5].map(d => (
                      <option key={d} value={d}>
                        Day {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Delay Duration</label>
                  <select
                    value={delayMinutes}
                    onChange={e => setDelayMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white font-bold text-amber-700"
                  >
                    <option value={30}>30 Minutes</option>
                    <option value={60}>60 Minutes (1 Hour)</option>
                    <option value={120}>120 Minutes (2 Hours)</option>
                    <option value={180}>180 Minutes (3 Hours)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Starting From Hour</label>
                  <select
                    value={delayStartHour}
                    onChange={e => setDelayStartHour(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value={9}>09:00 AM (Start of Day)</option>
                    <option value={10}>10:00 AM</option>
                    <option value={11}>11:00 AM</option>
                    <option value={13}>01:00 PM</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow transition active:scale-95"
                >
                  Apply Delay & Calculate Minimal Churn Replan
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: PANEL DROPOUT */}
          {activeFormTab === 'PANEL_DROPOUT' && (
            <form onSubmit={handleApplyDropout} className="space-y-4">
              <div className="p-3 bg-purple-50/60 rounded-lg border border-purple-100 text-xs text-purple-900">
                <strong>Sibling Panel Reallocation:</strong> The engine automatically transfers candidates to sibling interview panels within the same company first, preserving their scheduled time block wherever possible.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Withdrawing Panel</label>
                  <select
                    value={dropoutPanelId}
                    onChange={e => setDropoutPanelId(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    {companies.flatMap(c =>
                      c.panels.map(p => (
                        <option key={p.id} value={p.id}>
                          {c.name} - {p.panelName}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dropout Reason</label>
                  <input
                    type="text"
                    value={dropoutReason}
                    onChange={e => setDropoutReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold shadow transition active:scale-95"
                >
                  Execute Panel Dropout & Reallocate
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: STUDENT WITHDRAWAL */}
          {activeFormTab === 'STUDENT_WITHDRAWAL' && (
            <form onSubmit={handleApplyWithdrawal} className="space-y-4">
              <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 text-xs text-slate-700">
                <strong>Slot Release & Zero-Churn:</strong> When candidates withdraw (e.g. accepted external offers), the engine cancels only their assigned slots, freeing up interview capacity for waiting recruiters.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Number of High-Demand Candidates Withdrawing
                  </label>
                  <select
                    value={withdrawStudentCount}
                    onChange={e => setWithdrawStudentCount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value={5}>5 Students (Top Rankers)</option>
                    <option value={10}>10 Students</option>
                    <option value={15}>15 Students (Defense Benchmark)</option>
                    <option value={25}>25 Students</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reason</label>
                  <input
                    type="text"
                    value={withdrawReason}
                    onChange={e => setWithdrawReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold shadow transition active:scale-95"
                >
                  Withdraw Candidates & Release Capacity
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: ROOM OUTAGE */}
          {activeFormTab === 'ROOM_UNAVAILABLE' && (
            <form onSubmit={handleApplyOutage} className="space-y-4">
              <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200 text-xs text-amber-900">
                <strong>Zero-Time Room Relocation:</strong> Interviews occurring in the failed room are relocated to other vacant rooms in the same time slot first, keeping student time schedules 100% stable.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Room Undergoing Outage</label>
                  <select
                    value={outageRoomId}
                    onChange={e => setOutageRoomId(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>
                        Room {r.roomNumber} ({r.building})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Outage Reason</label>
                  <input
                    type="text"
                    value={outageReason}
                    onChange={e => setOutageReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow transition active:scale-95"
                >
                  Relocate Interviews & Evacuate Room
                </button>
              </div>
            </form>
          )}

          {/* TAB 5: DAY-1 CRISIS BENCHMARK */}
          {activeFormTab === 'DAY1_CRISIS' && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded-xl border border-red-200 text-xs text-red-950 space-y-2">
                <div className="flex items-center space-x-2 font-bold text-sm text-red-900">
                  <Flame className="w-4 h-4 text-red-600" />
                  <span>Live Defense Scenario Benchmark: "The Day-1 Recruiter Crisis"</span>
                </div>
                <p>
                  Tests the system against the exact 3-disruption compound stress scenario specified in the Mirai Labs assessment:
                </p>
                <ul className="list-disc list-inside space-y-1 text-red-900 font-medium">
                  <li><strong>Biggest Day-1 Recruiter</strong> (Google Panel A) is 3 hours (180 mins) late starting from 9:00 AM.</li>
                  <li><strong>Panel Dropout:</strong> Microsoft Panel B drops out due to medical emergency.</li>
                  <li><strong>15 Top Candidates</strong> withdraw simultaneously after receiving off-campus offers.</li>
                </ul>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={runDay1CrisisBenchmark}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-lg text-xs font-bold shadow-lg transition active:scale-95 flex items-center space-x-2"
                >
                  <Flame className="w-4 h-4" />
                  <span>Execute Day-1 Compound Crisis Benchmark</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Replan Results & Diff Inspector */}
      {activeReplanResult && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-400 text-slate-950">
                  Replanning Audit Diff
                </span>
                <span className="text-slate-400 text-xs">{activeReplanResult.timestamp}</span>
              </div>
              <h3 className="text-base font-bold mt-1 text-white">{activeReplanResult.description}</h3>
            </div>

            <div className="flex items-center space-x-3 text-xs">
              <span className="px-3 py-1 bg-slate-800 rounded-lg text-amber-300 font-bold border border-slate-700">
                Schedule Churn: {activeReplanResult.churnPercentage}%
              </span>
            </div>
          </div>

          {/* Impact Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-slate-50/50 border-b border-slate-200">
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-400 text-[11px] block">Moved Interviews</span>
              <strong className="text-xl font-bold text-amber-600">{activeReplanResult.movedInterviewsCount}</strong>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-400 text-[11px] block">Cancelled Slots</span>
              <strong className="text-xl font-bold text-red-600">{activeReplanResult.cancelledInterviewsCount}</strong>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-400 text-[11px] block">Untouched & Stable</span>
              <strong className="text-xl font-bold text-emerald-600">{activeReplanResult.unchangedInterviewsCount}</strong>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-400 text-[11px] block">Affected Students</span>
              <strong className="text-xl font-bold text-slate-900">{activeReplanResult.affectedStudentsCount}</strong>
            </div>
          </div>

          {/* Detailed Before/After Changes Diff Table */}
          <div className="p-5 space-y-3">
            <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
              Itemized Modifications ({activeReplanResult.changes.length} Changes)
            </h4>

            {activeReplanResult.changes.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No modifications were required for this event.</p>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[10.5px]">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Candidate</th>
                      <th className="px-4 py-2.5 font-semibold">Company & Panel</th>
                      <th className="px-4 py-2.5 font-semibold">Original Slot</th>
                      <th className="px-4 py-2.5 font-semibold">New Allotment</th>
                      <th className="px-4 py-2.5 font-semibold">Action Status</th>
                      <th className="px-4 py-2.5 font-semibold">Algorithmic Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeReplanResult.changes.map((ch, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-2.5 font-bold text-slate-900">{ch.studentName}</td>
                        <td className="px-4 py-2.5 text-slate-700">
                          <span className="font-semibold text-indigo-700">{ch.companyName}</span> ({ch.panelName})
                        </td>
                        <td className="px-4 py-2.5 text-slate-400 line-through">{ch.oldTime}</td>
                        <td className="px-4 py-2.5 font-bold text-indigo-900">{ch.newTime}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              ch.status === 'MOVED'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-red-100 text-red-900'
                            }`}
                          >
                            {ch.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 text-[11px]">{ch.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
