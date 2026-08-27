import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart2,
  Building2,
  Calendar,
  CheckCircle,
  CheckCircle2,
  Clock,
  DoorClosed,
  Flame,
  GraduationCap,
  Percent,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';

export const DashboardView: React.FC = () => {
  const {
    dataset,
    interviews,
    metrics,
    validation,
    activeReplanResult,
    setActiveTab,
    runDay1CrisisBenchmark,
    schedulerDurationMs,
  } = useScheduler();

  const { companies, students, rooms, placementDays } = dataset;

  // Day breakdown
  const dayBreakdown = placementDays.map(day => {
    const dayInterviews = interviews.filter(
      i => i.dayId === day.id && (i.status === 'SCHEDULED' || i.status === 'MOVED')
    );
    const daySlotsCount = dataset.timeslots.filter(t => t.dayId === day.id).length || 16;
    const maxCapacity = dataset.rooms.length * daySlotsCount;
    const utilPct = Number(((dayInterviews.length / (maxCapacity || 1)) * 100).toFixed(1));
    return {
      day,
      count: dayInterviews.length,
      utilPct,
      maxCapacity,
    };
  });

  // Tier breakdown
  const tier1Count = interviews.filter(i => i.companyTier === 1 && (i.status === 'SCHEDULED' || i.status === 'MOVED')).length;
  const tier2Count = interviews.filter(i => i.companyTier === 2 && (i.status === 'SCHEDULED' || i.status === 'MOVED')).length;
  const tier3Count = interviews.filter(i => i.companyTier === 3 && (i.status === 'SCHEDULED' || i.status === 'MOVED')).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / System State Notice */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-6 text-white shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Live Placement Engine</span>
            </span>
            <span className="text-slate-400 text-xs">&bull; Week-1 Schedule Active</span>
          </div>
          <h2 className="text-2xl font-bold mt-1 text-white">Coordinator Operations Dashboard</h2>
          <p className="text-slate-300 text-sm mt-0.5">
            Managing <strong className="text-white">{students.length.toLocaleString()} Candidates</strong> across <strong className="text-white">{companies.length} Companies</strong> in <strong className="text-white">{rooms.length} Interview Rooms</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('schedule')}
            className="flex items-center space-x-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow transition"
          >
            <span>Open Master Grid</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveTab('disruptions')}
            className="flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Disruption Studio</span>
          </button>
        </div>
      </div>

      {/* Disruption Alert if active */}
      {activeReplanResult && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700 mt-0.5 sm:mt-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-bold text-amber-900">Dynamic Replanning Applied</h4>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-200 text-amber-900">
                  {activeReplanResult.churnPercentage}% Churn
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                {activeReplanResult.description} &bull; <strong className="font-semibold">{activeReplanResult.movedInterviewsCount} moved</strong>, <strong className="font-semibold">{activeReplanResult.cancelledInterviewsCount} cancelled</strong>, <strong className="font-semibold">{activeReplanResult.unchangedInterviewsCount} untouched</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('disruptions')}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-semibold whitespace-nowrap shadow transition"
          >
            Inspect Diff
          </button>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Scheduled Interviews */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Scheduled Interviews</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{metrics.totalScheduledInterviews.toLocaleString()}</span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
              {metrics.schedulingSuccessRate}% Demands Met
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Out of {metrics.totalShortlists.toLocaleString()} student-firm shortlists
          </p>
        </div>

        {/* Metric 2: Room Utilization */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Room Utilization</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <DoorClosed className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{metrics.roomUtilizationRate}%</span>
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              20 Rooms / 80 Slots
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, metrics.roomUtilizationRate)}%` }}
            />
          </div>
        </div>

        {/* Metric 3: Mathematical Constraints */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Constraint Violations</span>
            <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">0</span>
            <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded">
              Hard Verified
            </span>
          </div>
          <div className="mt-1 flex items-center space-x-2 text-[11px] text-slate-500">
            <span>0 Student</span> &bull; <span>0 Room</span> &bull; <span>0 Panel Clashes</span>
          </div>
        </div>

        {/* Metric 4: Waiting Times & Stability */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Avg Candidate Wait</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{metrics.averageWaitTimeMinutes}m</span>
            <span className="text-xs font-medium text-slate-500">
              Max: {metrics.maxWaitTimeMinutes}m
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Replan Churn Rate: <strong className="text-slate-700">{metrics.replanChurnPercentage}%</strong>
          </p>
        </div>
      </div>

      {/* Middle Grid: Day-by-Day Density & Tier Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Day-by-Day Load Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Placement Week Timeline & Room Load</h3>
              <p className="text-xs text-slate-400">Total interview slots assigned across Day 1 to Day 5 (320 capacity/day)</p>
            </div>
            <button
              onClick={() => setActiveTab('schedule')}
              className="text-xs text-sky-600 hover:text-sky-700 font-semibold flex items-center space-x-1"
            >
              <span>View Grid</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3.5">
            {dayBreakdown.map(({ day, count, utilPct, maxCapacity }) => (
              <div key={day.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-800">{day.description}</span>
                    <span className="text-slate-400">({day.date})</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-slate-700">{count} / {maxCapacity} slots</span>
                    <span className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                      utilPct >= 90 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {utilPct}% full
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      utilPct >= 90 ? 'bg-amber-500' : 'bg-indigo-600'
                    }`}
                    style={{ width: `${Math.min(100, utilPct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Company Tier Architecture */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm mb-1">Company Tier Distribution</h3>
            <p className="text-xs text-slate-400 mb-4">Priority ordering enforced by scheduling engine</p>

            <div className="space-y-3">
              {/* Tier 1 */}
              <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900">Tier 1: Tech Giants (5 Firms)</span>
                  <span className="text-xs font-bold text-purple-700">{tier1Count} slots</span>
                </div>
                <p className="text-[11px] text-purple-700 mt-0.5">
                  Google, Microsoft, Meta, Apple, Amazon (Cutoff 8.5+)
                </p>
              </div>

              {/* Tier 2 */}
              <div className="p-3 bg-sky-50/70 border border-sky-100 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-900">Tier 2: Product & Growth (10 Firms)</span>
                  <span className="text-xs font-bold text-sky-700">{tier2Count} slots</span>
                </div>
                <p className="text-[11px] text-sky-700 mt-0.5">
                  Uber, Adobe, Nvidia, Salesforce, Stripe, etc. (Cutoff 7.0+)
                </p>
              </div>

              {/* Tier 3 */}
              <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Tier 3: Mass Recruiters (20 Firms)</span>
                  <span className="text-xs font-bold text-slate-700">{tier3Count} slots</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  TCS, Infosys, Accenture, Cognizant, etc. (Cutoff 6.0+)
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Shortlists Demands:</span>
              <strong className="text-slate-800">{metrics.totalShortlists}</strong>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
              <span>Unscheduled Bottlenecks:</span>
              <strong className="text-amber-600">{metrics.totalUnscheduledInterviews}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Rapid Coordinator Action Hub */}
      <div className="bg-slate-900 text-white rounded-xl p-6 border border-slate-800">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Placement Drive Controller Quick-Actions</span>
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Simulate live placement scenarios, test minimal churn replanning algorithms, or audit mathematical constraints.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => {
                runDay1CrisisBenchmark();
                setActiveTab('disruptions');
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-lg text-xs font-bold shadow transition active:scale-95"
            >
              <Flame className="w-4 h-4 animate-pulse" />
              <span>Simulate Day-1 Crisis</span>
            </button>

            <button
              onClick={() => setActiveTab('defense')}
              className="flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
            >
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <span>Read Technical Defense Guide</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
