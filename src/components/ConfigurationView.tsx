import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Database,
  DoorClosed,
  FileSpreadsheet,
  GraduationCap,
  Info,
  Layers,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { DEFAULT_PLACEMENT_CONFIG, PlacementConfig, validatePlacementConfig } from '../types';
import { CsvImportSection } from './CsvImportSection';

export const ConfigurationView: React.FC = () => {
  const {
    config: currentConfig,
    dataset,
    metrics,
    dataSourceMode,
    isGenerating,
    updateConfig,
    resetConfig,
    setActiveTab,
  } = useScheduler();

  // Local form state
  const [configSubTab, setConfigSubTab] = useState<'params' | 'csv'>('params');
  const [formState, setFormState] = useState<PlacementConfig>({ ...currentConfig });
  const [showAppliedToast, setShowAppliedToast] = useState(false);

  // Sync local form state when external currentConfig changes
  React.useEffect(() => {
    setFormState({ ...currentConfig });
  }, [currentConfig]);

  // Validation
  const validation = useMemo(() => {
    return validatePlacementConfig(formState);
  }, [formState]);

  // Calculated Capacity Preview
  const capacityPreview = useMemo(() => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(formState.startTime) || !timeRegex.test(formState.endTime)) {
      return {
        dailyOperatingHours: 0,
        slotsPerRoomPerDay: 0,
        dailyCapacitySlots: 0,
        totalCapacitySlots: 0,
        estimatedDemand: (formState.studentCount || 0) * 2,
        isValidTime: false,
      };
    }

    const [sh, sm] = formState.startTime.split(':').map(Number);
    const [eh, em] = formState.endTime.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    const dailyOperatingMins = Math.max(0, endMins - startMins);
    const slotCycle = (formState.interviewDurationMinutes || 30) + (formState.breakDurationMinutes || 0);
    const slotsPerRoomPerDay = slotCycle > 0 ? Math.floor(dailyOperatingMins / slotCycle) : 0;
    const dailyCapacity = (formState.roomCount || 0) * slotsPerRoomPerDay;
    const totalCapacity = dailyCapacity * (formState.placementDays || 0);
    const estimatedDemand = (formState.studentCount || 0) * 2;

    return {
      dailyOperatingHours: Number((dailyOperatingMins / 60).toFixed(1)),
      slotsPerRoomPerDay,
      dailyCapacitySlots: dailyCapacity,
      totalCapacitySlots: totalCapacity,
      estimatedDemand,
      isValidTime: endMins > startMins,
    };
  }, [formState]);

  // Large input detection
  const isLargeDataset = useMemo(() => {
    return (
      formState.studentCount >= 2500 ||
      formState.placementDays > 10 ||
      formState.roomCount > 50 ||
      formState.companyCount > 100
    );
  }, [formState]);

  // Check if form differs from active context
  const isDirty = useMemo(() => {
    return (
      formState.studentCount !== currentConfig.studentCount ||
      formState.companyCount !== currentConfig.companyCount ||
      formState.roomCount !== currentConfig.roomCount ||
      formState.panelCount !== currentConfig.panelCount ||
      formState.placementDays !== currentConfig.placementDays ||
      formState.startTime !== currentConfig.startTime ||
      formState.endTime !== currentConfig.endTime ||
      formState.interviewDurationMinutes !== currentConfig.interviewDurationMinutes ||
      (formState.breakDurationMinutes || 0) !== (currentConfig.breakDurationMinutes || 0) ||
      formState.seed !== currentConfig.seed
    );
  }, [formState, currentConfig]);

  const handleApply = () => {
    if (!validation.isValid) return;
    updateConfig(formState);
    setShowAppliedToast(true);
    setTimeout(() => setShowAppliedToast(false), 4000);
  };

  const handleReset = () => {
    setFormState({ ...DEFAULT_PLACEMENT_CONFIG });
    resetConfig();
    setShowAppliedToast(true);
    setTimeout(() => setShowAppliedToast(false), 4000);
  };

  const handlePreset = (preset: Partial<PlacementConfig>) => {
    setFormState(prev => ({ ...prev, ...preset }));
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-6 text-white shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center space-x-1">
              <Sliders className="w-3.5 h-3.5" />
              <span>System Parameterization</span>
            </span>
            <span className="text-slate-400 text-xs">&bull; Module 7 Configuration Interface</span>
          </div>
          <h2 className="text-2xl font-bold mt-1 text-white">Placement Week Configuration</h2>
          <p className="text-slate-300 text-sm mt-0.5 max-w-3xl">
            Configure student cohort sizing, recruiter catalogue, interview room infrastructure, operating hours, and PRNG seed.
            Changes apply directly across the end-to-end data generator, scheduler, validator, and metrics pipelines.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-apply-config"
            onClick={handleApply}
            disabled={!validation.isValid || isGenerating}
            className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-lg text-sm shadow-md transition active:scale-95 cursor-pointer disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Generating Schedule...' : 'Apply & Generate Schedule'}</span>
          </button>

          <button
            id="btn-reset-default-config"
            onClick={handleReset}
            disabled={isGenerating}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg text-sm border border-slate-700 transition active:scale-95"
            title="Restore Assignment A default parameters (800 Students, 35 Companies, 20 Rooms, 5 Days)"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
            <span>Reset to Default</span>
          </button>
        </div>
      </div>

      {/* Applied Toast Feedback */}
      {showAppliedToast && (
        <div className="bg-emerald-900/40 border border-emerald-500/40 text-emerald-200 px-4 py-3 rounded-xl flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-medium">
              Configuration applied successfully! Schedule regenerated with 0 clashes.
            </span>
          </div>
          <button
            onClick={() => setActiveTab('schedule')}
            className="text-xs bg-emerald-700/60 hover:bg-emerald-600/80 text-white px-3 py-1 rounded font-medium transition"
          >
            View Master Schedule &rarr;
          </button>
        </div>
      )}

      {/* Warning if Large Dataset */}
      {isLargeDataset && (
        <div className="bg-amber-950/40 border border-amber-500/40 text-amber-200 px-4 py-3.5 rounded-xl flex items-start space-x-3 shadow-md">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <strong className="font-semibold block text-amber-300">Large Scheduling Scale Detected</strong>
            You have configured a large placement workload ({formState.studentCount.toLocaleString()} candidates, {formState.placementDays} placement days).
            The constraint satisfaction engine and bipartite matching optimizer will process all shortlists and guarantee 0 hard clashes; dataset generation and scheduling may take a few moments.
          </div>
        </div>
      )}

      {/* Validation Errors Box if Invalid */}
      {!validation.isValid && (
        <div className="bg-red-950/40 border border-red-500/40 text-red-200 px-4 py-3.5 rounded-xl flex items-start space-x-3 shadow-md">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <strong className="font-semibold block text-red-300">Configuration Validation Errors ({validation.errors.length})</strong>
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-red-200/90 text-xs">
              {validation.errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Sub-navigation between Parameters & CSV Import */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center space-x-2">
          <button
            id="tab-btn-params"
            type="button"
            onClick={() => setConfigSubTab('params')}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-semibold rounded-lg transition ${
              configSubTab === 'params'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>1. Parameters & Demo Generator</span>
          </button>

          <button
            id="tab-btn-csv"
            type="button"
            onClick={() => setConfigSubTab('csv')}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-semibold rounded-lg transition ${
              configSubTab === 'csv'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>2. Real-World Data & CSV Import</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center space-x-2 text-xs">
          <span className="text-slate-500 font-medium">Active Data Source:</span>
          <span
            className={`px-2.5 py-1 rounded-full font-bold uppercase text-[11px] flex items-center space-x-1 ${
              dataSourceMode === 'IMPORTED'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-amber-100 text-amber-800 border border-amber-300'
            }`}
          >
            <Database className="w-3 h-3" />
            <span>{dataSourceMode === 'IMPORTED' ? 'Real CSV Data' : 'Demo PRNG Data'}</span>
          </span>
        </div>
      </div>

      {configSubTab === 'csv' ? (
        <CsvImportSection />
      ) : (
        <>
          {/* Preset Quick Actions */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>Quick Scale Presets:</span>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handlePreset(DEFAULT_PLACEMENT_CONFIG)}
            className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-300 transition"
          >
            Assignment A Baseline (800 Students, 35 Companies, 5 Days)
          </button>
          <button
            type="button"
            onClick={() =>
              handlePreset({
                studentCount: 4000,
                companyCount: 50,
                roomCount: 30,
                panelCount: 40,
                placementDays: 10,
                startTime: '09:00',
                endTime: '18:00',
                interviewDurationMinutes: 30,
                breakDurationMinutes: 0,
              })
            }
            className="px-2.5 py-1 text-xs font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded border border-indigo-200 transition"
          >
            Mega Campus (4,000 Students, 50 Companies, 10 Days)
          </button>
          <button
            type="button"
            onClick={() =>
              handlePreset({
                studentCount: 1500,
                companyCount: 40,
                roomCount: 25,
                placementDays: 7,
                startTime: '08:30',
                endTime: '17:30',
                interviewDurationMinutes: 30,
                breakDurationMinutes: 5,
              })
            }
            className="px-2.5 py-1 text-xs font-medium bg-sky-50 hover:bg-sky-100 text-sky-700 rounded border border-sky-200 transition"
          >
            Mid-Tier Drive (1,500 Students, 7 Days, 5m Breaks)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Sections (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* SECTION 1: DATASET SPECIFICATION */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Dataset Specification
                </h3>
                <p className="text-xs text-slate-500">Candidate cohort and recruiting companies catalogue</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="input-student-count">
                  Number of Students
                </label>
                <div className="relative">
                  <input
                    id="input-student-count"
                    type="number"
                    min={1}
                    max={10000}
                    value={formState.studentCount}
                    onChange={e =>
                      setFormState(prev => ({ ...prev, studentCount: parseInt(e.target.value) || 0 }))
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 font-medium"
                    placeholder="e.g. 800 or 4000"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400">candidates</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Generates realistic student profiles with Gaussian CGPA distributions and branch shortlists.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="input-company-count">
                  Number of Companies
                </label>
                <div className="relative">
                  <input
                    id="input-company-count"
                    type="number"
                    min={1}
                    max={500}
                    value={formState.companyCount}
                    onChange={e =>
                      setFormState(prev => ({ ...prev, companyCount: parseInt(e.target.value) || 0 }))
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 font-medium"
                    placeholder="e.g. 35 or 50"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400">firms</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Distributed across Tier 1 (Dream/Super-Dream), Tier 2 (Core), and Tier 3 (Mass Recruiters).
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 2: RESOURCES */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg">
                <DoorClosed className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Resources & Infrastructure
                </h3>
                <p className="text-xs text-slate-500">Physical interview rooms and recruiter panel allocations</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="input-room-count">
                  Number of Rooms
                </label>
                <div className="relative">
                  <input
                    id="input-room-count"
                    type="number"
                    min={1}
                    max={200}
                    value={formState.roomCount}
                    onChange={e =>
                      setFormState(prev => ({ ...prev, roomCount: parseInt(e.target.value) || 0 }))
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 font-medium"
                    placeholder="e.g. 20 or 30"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400">rooms</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Auto-mapped across Academic Blocks A, B, C... (up to 20 rooms per building block).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="input-panel-count">
                  Total Interview Panels (Optional Override)
                </label>
                <div className="relative">
                  <input
                    id="input-panel-count"
                    type="number"
                    min={1}
                    max={1000}
                    value={formState.panelCount || ''}
                    onChange={e => {
                      const val = e.target.value ? parseInt(e.target.value) : undefined;
                      setFormState(prev => ({ ...prev, panelCount: val }));
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 font-medium"
                    placeholder="Default (derived per company tier)"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400">panels</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Leave blank for standard tier-based allocation (2 for T1, 3 for T2, 4-8 for T3).
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 3: SCHEDULE & OPERATING WINDOW */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Schedule & Operating Parameters
                </h3>
                <p className="text-xs text-slate-500">Placement horizon, daily time boundaries, and slot lengths</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="input-placement-days">
                  Placement Days
                </label>
                <div className="relative">
                  <input
                    id="input-placement-days"
                    type="number"
                    min={1}
                    max={30}
                    value={formState.placementDays}
                    onChange={e =>
                      setFormState(prev => ({ ...prev, placementDays: parseInt(e.target.value) || 0 }))
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 font-medium"
                    placeholder="e.g. 5 or 10"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400">days</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="input-start-time">
                  Daily Start Time (24h)
                </label>
                <input
                  id="input-start-time"
                  type="text"
                  value={formState.startTime}
                  onChange={e => setFormState(prev => ({ ...prev, startTime: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 font-medium"
                  placeholder="09:00"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="input-end-time">
                  Daily End Time (24h)
                </label>
                <input
                  id="input-end-time"
                  type="text"
                  value={formState.endTime}
                  onChange={e => setFormState(prev => ({ ...prev, endTime: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 font-medium"
                  placeholder="17:00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="input-interview-duration">
                  Interview Duration (Minutes)
                </label>
                <select
                  id="input-interview-duration"
                  value={formState.interviewDurationMinutes}
                  onChange={e =>
                    setFormState(prev => ({ ...prev, interviewDurationMinutes: parseInt(e.target.value) }))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 font-medium bg-white"
                >
                  <option value={15}>15 Minutes</option>
                  <option value={20}>20 Minutes</option>
                  <option value={30}>30 Minutes (Default Assignment A)</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes</option>
                  <option value={90}>90 Minutes</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="input-break-duration">
                  Inter-Interview Break (Minutes)
                </label>
                <select
                  id="input-break-duration"
                  value={formState.breakDurationMinutes || 0}
                  onChange={e =>
                    setFormState(prev => ({ ...prev, breakDurationMinutes: parseInt(e.target.value) }))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 font-medium bg-white"
                >
                  <option value={0}>0 Minutes (Continuous back-to-back)</option>
                  <option value={5}>5 Minutes</option>
                  <option value={10}>10 Minutes</option>
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 4: DETERMINISM & SEED */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Determinism & Reproducibility
                </h3>
                <p className="text-xs text-slate-500">PRNG seed for bit-exact repeatable data generation</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1 w-full">
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="input-seed">
                  Pseudo-Random Generator Seed
                </label>
                <input
                  id="input-seed"
                  type="number"
                  value={formState.seed}
                  onChange={e =>
                    setFormState(prev => ({ ...prev, seed: parseInt(e.target.value) || 0 }))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 font-medium font-mono"
                  placeholder="42"
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  setFormState(prev => ({ ...prev, seed: Math.floor(Math.random() * 1000000) }))
                }
                className="mt-5 px-3 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition shrink-0"
              >
                Randomize Seed
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Capacity Preview & Status (Span 1) */}
        <div className="space-y-6">
          {/* Live Capacity Preview Card */}
          <div className="bg-slate-900 text-slate-100 rounded-xl p-5 border border-slate-800 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Live Capacity Preview
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Formula Preview
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Operating Window:</span>
                <strong className="text-slate-200">
                  {formState.startTime} &ndash; {formState.endTime} ({capacityPreview.dailyOperatingHours} hrs)
                </strong>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Slot Cycle:</span>
                <strong className="text-slate-200">
                  {formState.interviewDurationMinutes}m + {formState.breakDurationMinutes || 0}m break
                </strong>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Slots / Room / Day:</span>
                <strong className="text-indigo-400 font-mono text-sm">
                  {capacityPreview.slotsPerRoomPerDay} slots
                </strong>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Daily Campus Capacity:</span>
                <strong className="text-slate-200">
                  {capacityPreview.dailyCapacitySlots.toLocaleString()} slots/day
                </strong>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Available Room-Slot Capacity:</span>
                  <span className="text-lg font-bold text-sky-400 font-mono">
                    {capacityPreview.totalCapacitySlots.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Estimated Candidate Demand:</span>
                  <span className="text-slate-300 font-mono">
                    ~{capacityPreview.estimatedDemand.toLocaleString()} interviews
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-1">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                <strong className="text-slate-300">Note:</strong> Capacity is calculated as{' '}
                <code className="text-sky-300">Rooms &times; Slots/Day &times; Days</code>. The scheduler
                optimizes within this boundary subject to panel availability and 0-student-clash invariants.
              </p>
            </div>
          </div>

          {/* Active vs Staged State Comparison */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Current Active Runtime</span>
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Active Cohort:</span>
                <strong className="text-slate-900">{dataset.students.length.toLocaleString()} Students</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Active Companies:</span>
                <strong className="text-slate-900">{dataset.companies.length} Firms</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Active Rooms:</span>
                <strong className="text-slate-900">{dataset.rooms.length} Rooms</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Active Days:</span>
                <strong className="text-slate-900">{dataset.placementDays.length} Days</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Scheduled Interviews:</span>
                <strong className="text-emerald-700 font-semibold">{metrics.totalScheduledInterviews.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Hard Clashes:</span>
                <strong className="text-emerald-700 font-semibold">0 Guaranteed</strong>
              </div>
            </div>

            {isDirty && (
              <div className="mt-3 p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-800 text-xs">
                <span className="font-semibold block">Unapplied Changes Staged</span>
                Click <strong>"Apply & Generate Schedule"</strong> to regenerate the master schedule using these parameters.
              </div>
            )}
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
