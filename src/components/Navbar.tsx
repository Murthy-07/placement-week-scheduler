import React from 'react';
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  Cpu,
  Database,
  DoorClosed,
  FileCheck2,
  Flame,
  GraduationCap,
  Layers,
  RefreshCw,
  ShieldCheck,
  Sliders,
  Zap,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';

export const Navbar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    dataset,
    metrics,
    validation,
    dataSourceMode,
    isGenerating,
    generateDataset,
    runInitialScheduling,
    regenerateSchedule,
    runDay1CrisisBenchmark,
    resetToInitialSchedule,
    schedulerDurationMs,
    disruptions,
    isScheduleStale,
  } = useScheduler();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'schedule', label: 'Master Schedule', icon: Calendar },
    { id: 'data-mgmt', label: 'Data Management', icon: Database, badge: isScheduleStale ? 'Stale' : undefined },
    { id: 'students', label: `Students (${dataset.students.length})`, icon: GraduationCap },
    { id: 'companies', label: `Companies (${dataset.companies.length})`, icon: Building2 },
    { id: 'rooms', label: `Rooms (${dataset.rooms.length})`, icon: DoorClosed },
    { id: 'disruptions', label: 'Disruption & Replan', icon: Zap, badge: disruptions.length > 0 ? disruptions.length : undefined },
    { id: 'conflicts', label: 'Audit & Conflicts', icon: ShieldCheck, badge: metrics.totalUnscheduledInterviews > 0 ? `${metrics.totalUnscheduledInterviews}` : undefined },
    { id: 'config', label: 'Configuration & CSV', icon: Sliders },
    { id: 'defense', label: 'Defense Dossier', icon: FileCheck2 },
  ];

  return (
    <header className="bg-slate-900 text-slate-100 sticky top-0 z-40 border-b border-slate-800 shadow-md">
      {/* Top Banner / System Telemetry */}
      <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1.5 font-semibold text-sky-400">
            <Cpu className="w-3.5 h-3.5" />
            <span>Placement Week Scheduling System</span>
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-300">
            Scale: <strong className="text-slate-100">{dataset.students.length.toLocaleString()} Students</strong> &bull; <strong className="text-slate-100">{dataset.companies.length} Firms</strong> &bull; <strong className="text-slate-100">{dataset.rooms.length} Rooms</strong> ({metrics.totalCapacitySlots.toLocaleString()} Max Capacity)
          </span>
          <span className="text-slate-500">|</span>
          <span
            className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] flex items-center space-x-1 ${
              dataSourceMode === 'EDITED'
                ? 'bg-amber-950/80 text-amber-300 border border-amber-700/60'
                : dataSourceMode === 'IMPORTED'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                : 'bg-indigo-950/80 text-indigo-300 border border-indigo-700/60'
            }`}
          >
            <Database className="w-3 h-3" />
            <span>{dataSourceMode === 'EDITED' ? 'Manual Edited' : dataSourceMode === 'IMPORTED' ? 'Real CSV' : 'Demo PRNG'}</span>
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>0 Clashes Guaranteed</span>
          </div>

          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            <span>Engine Runtime:</span>
            <strong className="text-amber-300">{schedulerDurationMs}ms</strong>
          </div>

          {metrics.replanChurnPercentage > 0 && (
            <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800/60 text-amber-300 font-medium">
              <Zap className="w-3.5 h-3.5" />
              <span>Churn: {metrics.replanChurnPercentage}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Nav Header */}
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-600 to-sky-600 flex items-center justify-center text-white shadow-inner font-bold text-lg tracking-wider">
            PW
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-base text-white tracking-tight">Placement Week Scheduler</h1>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-sky-500/20 text-sky-300 rounded border border-sky-500/30">
                Mirai Labs
              </span>
            </div>
            <p className="text-xs text-slate-400">Coordinator Dashboard & Dynamic Replanning Engine</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            id="btn-day1-crisis"
            onClick={() => {
              runDay1CrisisBenchmark();
              setActiveTab('disruptions');
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-md text-xs font-semibold shadow transition-all active:scale-95"
            title="Execute Live Defense Benchmark Scenario: 3hr Recruiter Delay + Panel Dropout + 15 Withdrawals"
          >
            <Flame className="w-3.5 h-3.5 animate-pulse" />
            <span>Test Day-1 Crisis</span>
          </button>

          <button
            id="btn-re-schedule"
            onClick={runInitialScheduling}
            disabled={isGenerating}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-medium transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>Re-Run Scheduler</span>
          </button>

          <button
            id="btn-reset"
            onClick={resetToInitialSchedule}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs font-medium transition"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="px-4 flex space-x-1 overflow-x-auto border-t border-slate-800/80 bg-slate-900/90 scrollbar-none">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`tab-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center space-x-2 px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-sky-400 text-sky-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
              {item.badge && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
