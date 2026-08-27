import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  Company,
  CompanyPanel,
  DEFAULT_PLACEMENT_CONFIG,
  DisruptionLog,
  DisruptionType,
  FilterParams,
  Interview,
  PlacementConfig,
  ReplanResult,
  Room,
  ScheduleMetrics,
  Student,
  UnscheduledReport,
} from '../types';
import { Dataset, generatePlacementDataset } from '../engine/dataGenerator';
import { SchedulingEngine } from '../engine/scheduler';
import {
  PanelDelayParams,
  PanelDropoutParams,
  ReplanningEngine,
  RoomUnavailableParams,
  StudentWithdrawalParams,
} from '../engine/replanningEngine';
import { calculateMetrics } from '../engine/metricsEngine';
import { validateSchedule, ValidationResult } from '../engine/validator';
import {
  buildImportedDataset,
  ImportedDatasetSummary,
  RawCsvPayloads,
} from '../engine/csvImporter';
import {
  addCompanyRecord,
  addPanelRecord,
  addRoomRecord,
  addShortlistRecord,
  addStudentRecord,
  deleteCompanyRecord,
  deletePanelRecord,
  deleteRoomRecord,
  deleteStudentRecord,
  removeShortlistRecord,
  updateCompanyRecord,
  updatePanelRecord,
  updateRoomRecord,
  updateStudentRecord,
} from '../engine/recordManager';

export type DataSourceMode = 'DEMO' | 'IMPORTED' | 'EDITED';

interface SchedulerContextType {
  dataset: Dataset;
  config: PlacementConfig;
  interviews: Interview[];
  initialInterviews: Interview[];
  unscheduledReports: UnscheduledReport[];
  metrics: ScheduleMetrics;
  validation: ValidationResult;
  disruptions: DisruptionLog[];
  activeReplanResult: ReplanResult | null;
  filters: FilterParams;
  isGenerating: boolean;
  selectedDayId: number;
  activeTab: string;
  schedulerDurationMs: number;

  // Stale Schedule Detection
  isScheduleStale: boolean;
  scheduleStaleReason: string | null;

  // Data Source & CSV Import State
  dataSourceMode: DataSourceMode;
  importedPayloads: RawCsvPayloads;
  importedSummary: ImportedDatasetSummary | null;
  importedDataset: Dataset | null;

  // Actions
  setActiveTab: (tab: string) => void;
  setSelectedDayId: (dayId: number) => void;
  setFilters: React.Dispatch<React.SetStateAction<FilterParams>>;
  generateDataset: (seedOrConfig?: number | Partial<PlacementConfig>) => void;
  updateConfig: (newConfig: Partial<PlacementConfig>) => void;
  resetConfig: () => void;
  runInitialScheduling: () => void;
  regenerateSchedule: () => void;
  applyPanelDelay: (params: PanelDelayParams) => ReplanResult;
  applyPanelDropout: (params: PanelDropoutParams) => ReplanResult;
  applyStudentWithdrawal: (params: StudentWithdrawalParams) => ReplanResult;
  applyRoomUnavailable: (params: RoomUnavailableParams) => ReplanResult;
  runDay1CrisisBenchmark: () => ReplanResult;
  resetToInitialSchedule: () => void;
  resetToDefaultDemoData: () => void;
  setActiveReplanResult: (result: ReplanResult | null) => void;

  // Manual Record Mutations (Module 9)
  addStudent: (data: { id?: number; name: string; cgpa: number; branch?: 'CS' | 'IT' | 'ECE' | 'EE' | 'ME'; email?: string; shortlistedCompanyIds?: number[] }) => { success: boolean; error?: string };
  updateStudent: (studentId: number, updates: Partial<Omit<Student, 'id'>>) => { success: boolean; error?: string };
  deleteStudent: (studentId: number) => { success: boolean; error?: string };
  addCompany: (data: { id?: number; name: string; tier: 1 | 2 | 3; minCgpa: number; interviewDurationMinutes?: number; panelCount?: number }) => { success: boolean; error?: string };
  updateCompany: (companyId: number, updates: Partial<Omit<Company, 'id' | 'panels' | 'shortlistedStudentIds'>>) => { success: boolean; error?: string };
  deleteCompany: (companyId: number) => { success: boolean; error?: string };
  addShortlist: (studentId: number, companyId: number) => { success: boolean; error?: string; warning?: string };
  removeShortlist: (studentId: number, companyId: number) => { success: boolean; error?: string };
  addRoom: (data: { id?: number; roomNumber: string; building: string; isAvailable?: boolean }) => { success: boolean; error?: string };
  updateRoom: (roomId: number, updates: Partial<Omit<Room, 'id'>>) => { success: boolean; error?: string };
  deleteRoom: (roomId: number) => { success: boolean; error?: string };
  addPanel: (companyId: number, panelName: string, id?: number, isAvailable?: boolean) => { success: boolean; error?: string };
  updatePanel: (panelId: number, updates: Partial<Omit<CompanyPanel, 'id' | 'companyId'>>) => { success: boolean; error?: string };
  deletePanel: (panelId: number) => { success: boolean; error?: string };

  // CSV Import Actions
  setDataSourceMode: (mode: DataSourceMode) => void;
  importCsvPayloads: (payloads: RawCsvPayloads) => { success: boolean; summary: ImportedDatasetSummary };
  clearImportedData: () => void;
  syncConfigWithImportedCounts: () => void;
}

const SchedulerContext = createContext<SchedulerContextType | undefined>(undefined);

export const SchedulerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<PlacementConfig>(DEFAULT_PLACEMENT_CONFIG);
  const [dataSourceMode, setDataSourceModeState] = useState<DataSourceMode>('DEMO');
  const [demoDataset, setDemoDataset] = useState<Dataset>(() => generatePlacementDataset(DEFAULT_PLACEMENT_CONFIG));
  const [importedDataset, setImportedDataset] = useState<Dataset | null>(null);
  const [editedDataset, setEditedDataset] = useState<Dataset | null>(null);
  const [importedPayloads, setImportedPayloads] = useState<RawCsvPayloads>({});
  const [importedSummary, setImportedSummary] = useState<ImportedDatasetSummary | null>(null);

  // Stale Schedule Tracking
  const [isScheduleStale, setIsScheduleStale] = useState<boolean>(false);
  const [scheduleStaleReason, setScheduleStaleReason] = useState<string | null>(null);

  const dataset = useMemo(() => {
    if (dataSourceMode === 'EDITED' && editedDataset) {
      return editedDataset;
    }
    if (dataSourceMode === 'IMPORTED' && importedDataset) {
      return importedDataset;
    }
    return demoDataset;
  }, [dataSourceMode, editedDataset, importedDataset, demoDataset]);

  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [initialInterviews, setInitialInterviews] = useState<Interview[]>([]);
  const [unscheduledReports, setUnscheduledReports] = useState<UnscheduledReport[]>([]);
  const [disruptions, setDisruptions] = useState<DisruptionLog[]>([]);
  const [activeReplanResult, setActiveReplanResult] = useState<ReplanResult | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [selectedDayId, setSelectedDayId] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [schedulerDurationMs, setSchedulerDurationMs] = useState<number>(0);

  const [filters, setFilters] = useState<FilterParams>({
    status: 'ALL',
    tier: 'ALL',
  });

  const replanningEngine = useMemo(() => new ReplanningEngine(), []);

  // Initialize schedule on mount or dataset change
  useEffect(() => {
    const engine = new SchedulingEngine();
    const result = engine.generateSchedule(dataset);
    setInterviews(result.interviews);
    setInitialInterviews(result.interviews);
    setUnscheduledReports(result.unscheduledReports);
    setSchedulerDurationMs(result.durationMs);
  }, [dataset]);

  // Compute metrics dynamically
  const metrics = useMemo(() => {
    const churn = activeReplanResult?.churnPercentage || 0;
    return calculateMetrics(interviews, dataset, churn, disruptions.length);
  }, [interviews, dataset, activeReplanResult, disruptions]);

  // Compute validation dynamically
  const validation = useMemo(() => {
    return validateSchedule(interviews, dataset);
  }, [interviews, dataset]);

  const generateDatasetHandler = (seedOrConfig: number | Partial<PlacementConfig> = 42) => {
    setIsGenerating(true);
    setTimeout(() => {
      let targetConfig: PlacementConfig;
      if (typeof seedOrConfig === 'number') {
        targetConfig = { ...config, seed: seedOrConfig };
      } else {
        targetConfig = { ...config, ...seedOrConfig };
      }
      setConfig(targetConfig);
      const newDataset = generatePlacementDataset(targetConfig);
      setDemoDataset(newDataset);
      setDataSourceModeState('DEMO');
      setDisruptions([]);
      setActiveReplanResult(null);
      setIsGenerating(false);
    }, 150);
  };

  const updateConfig = (newConfig: Partial<PlacementConfig>) => {
    const merged = { ...config, ...newConfig };
    setConfig(merged);
    if (dataSourceMode === 'DEMO') {
      generateDatasetHandler(merged);
    } else if (importedPayloads.studentsCsv && importedPayloads.companiesCsv) {
      // Re-apply config parameters (like days, hours) to imported dataset
      const res = buildImportedDataset(importedPayloads, merged);
      if (res.dataset) {
        setImportedDataset(res.dataset);
        setImportedSummary(res.summary);
      }
    }
  };

  const resetConfig = () => {
    setConfig(DEFAULT_PLACEMENT_CONFIG);
    generateDatasetHandler(DEFAULT_PLACEMENT_CONFIG);
  };

  const setDataSourceMode = (mode: DataSourceMode) => {
    if (mode === 'IMPORTED' && !importedDataset) {
      // Cannot switch to imported if no valid dataset exists
      return;
    }
    setDataSourceModeState(mode);
    setDisruptions([]);
    setActiveReplanResult(null);
  };

  const importCsvPayloads = (payloads: RawCsvPayloads): { success: boolean; summary: ImportedDatasetSummary } => {
    setIsGenerating(true);
    const result = buildImportedDataset(payloads, config);
    setImportedPayloads(payloads);
    setImportedSummary(result.summary);

    if (result.dataset && result.summary.isValid) {
      setImportedDataset(result.dataset);
      setDataSourceModeState('IMPORTED');
      setDisruptions([]);
      setActiveReplanResult(null);
      setIsGenerating(false);
      return { success: true, summary: result.summary };
    } else {
      setIsGenerating(false);
      return { success: false, summary: result.summary };
    }
  };

  const clearImportedData = () => {
    setImportedDataset(null);
    setImportedPayloads({});
    setImportedSummary(null);
    setDataSourceModeState('DEMO');
    setDisruptions([]);
    setActiveReplanResult(null);
  };

  const syncConfigWithImportedCounts = () => {
    if (!importedSummary) return;
    const syncedConfig: PlacementConfig = {
      ...config,
      studentCount: importedSummary.studentCount || config.studentCount,
      companyCount: importedSummary.companyCount || config.companyCount,
      roomCount: importedSummary.roomCount || config.roomCount,
      panelCount: importedSummary.panelCount || config.panelCount,
    };
    setConfig(syncedConfig);
  };

  const runInitialScheduling = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const engine = new SchedulingEngine();
      const result = engine.generateSchedule(dataset);
      setInterviews(result.interviews);
      setInitialInterviews(result.interviews);
      setUnscheduledReports(result.unscheduledReports);
      setSchedulerDurationMs(result.durationMs);
      setDisruptions([]);
      setActiveReplanResult(null);
      setIsGenerating(false);
    }, 100);
  };

  const applyPanelDelay = (params: PanelDelayParams): ReplanResult => {
    const { updatedInterviews, replanResult } = replanningEngine.handlePanelDelay(
      interviews,
      dataset,
      params
    );
    setInterviews(updatedInterviews);
    setActiveReplanResult(replanResult);
    setDisruptions(prev => [
      {
        id: replanResult.id,
        type: 'PANEL_DELAY',
        reportedAt: new Date().toLocaleTimeString(),
        description: replanResult.description,
        parameters: {
          panelId: params.panelId,
          delayMinutes: params.delayMinutes,
        },
        replanResult,
      },
      ...prev,
    ]);
    return replanResult;
  };

  const applyPanelDropout = (params: PanelDropoutParams): ReplanResult => {
    const { updatedInterviews, replanResult } = replanningEngine.handlePanelDropout(
      interviews,
      dataset,
      params
    );
    setInterviews(updatedInterviews);
    setActiveReplanResult(replanResult);
    setDisruptions(prev => [
      {
        id: replanResult.id,
        type: 'PANEL_DROPOUT',
        reportedAt: new Date().toLocaleTimeString(),
        description: replanResult.description,
        parameters: { panelId: params.panelId },
        replanResult,
      },
      ...prev,
    ]);
    return replanResult;
  };

  const applyStudentWithdrawal = (params: StudentWithdrawalParams): ReplanResult => {
    const { updatedInterviews, replanResult } = replanningEngine.handleStudentWithdrawal(
      interviews,
      dataset,
      params
    );
    setInterviews(updatedInterviews);
    setActiveReplanResult(replanResult);
    setDisruptions(prev => [
      {
        id: replanResult.id,
        type: 'STUDENT_WITHDRAWAL',
        reportedAt: new Date().toLocaleTimeString(),
        description: replanResult.description,
        parameters: { studentIds: params.studentIds },
        replanResult,
      },
      ...prev,
    ]);
    return replanResult;
  };

  const applyRoomUnavailable = (params: RoomUnavailableParams): ReplanResult => {
    const { updatedInterviews, replanResult } = replanningEngine.handleRoomUnavailable(
      interviews,
      dataset,
      params
    );
    setInterviews(updatedInterviews);
    setActiveReplanResult(replanResult);
    setDisruptions(prev => [
      {
        id: replanResult.id,
        type: 'ROOM_UNAVAILABLE',
        reportedAt: new Date().toLocaleTimeString(),
        description: replanResult.description,
        parameters: { roomId: params.roomId, delayMinutes: 0 },
        replanResult,
      },
      ...prev,
    ]);
    return replanResult;
  };

  const runDay1CrisisBenchmark = (): ReplanResult => {
    const { updatedInterviews, replanResult } = replanningEngine.handleDay1Crisis(
      interviews,
      dataset
    );
    setInterviews(updatedInterviews);
    setActiveReplanResult(replanResult);
    setDisruptions(prev => [
      {
        id: replanResult.id,
        type: 'DAY1_CRISIS',
        reportedAt: new Date().toLocaleTimeString(),
        description: replanResult.description,
        parameters: {},
        replanResult,
      },
      ...prev,
    ]);
    return replanResult;
  };

  const resetToInitialSchedule = () => {
    setInterviews(initialInterviews);
    setActiveReplanResult(null);
    setDisruptions([]);
  };

  const regenerateSchedule = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const engine = new SchedulingEngine();
      const result = engine.generateSchedule(dataset);
      setInterviews(result.interviews);
      setInitialInterviews(result.interviews);
      setUnscheduledReports(result.unscheduledReports);
      setSchedulerDurationMs(result.durationMs);
      setIsScheduleStale(false);
      setScheduleStaleReason(null);
      setIsGenerating(false);
    }, 100);
  };

  const resetToDefaultDemoData = () => {
    setConfig(DEFAULT_PLACEMENT_CONFIG);
    const pristine = generatePlacementDataset(DEFAULT_PLACEMENT_CONFIG);
    setDemoDataset(pristine);
    setEditedDataset(null);
    setImportedDataset(null);
    setImportedPayloads({});
    setImportedSummary(null);
    setDataSourceModeState('DEMO');
    setIsScheduleStale(false);
    setScheduleStaleReason(null);
    setDisruptions([]);
    setActiveReplanResult(null);

    const engine = new SchedulingEngine();
    const result = engine.generateSchedule(pristine);
    setInterviews(result.interviews);
    setInitialInterviews(result.interviews);
    setUnscheduledReports(result.unscheduledReports);
    setSchedulerDurationMs(result.durationMs);
  };

  // Helper for applying dataset mutations
  const applyDatasetMutation = (
    mutator: (current: Dataset) => { dataset: Dataset; error?: string },
    reason: string
  ): { success: boolean; error?: string } => {
    const currentBase = dataset;
    const res = mutator(currentBase);
    if (res.error) {
      return { success: false, error: res.error };
    }
    setEditedDataset(res.dataset);
    setDataSourceModeState('EDITED');
    setIsScheduleStale(true);
    setScheduleStaleReason(reason);
    return { success: true };
  };

  const addStudent = (data: {
    id?: number;
    name: string;
    cgpa: number;
    branch?: 'CS' | 'IT' | 'ECE' | 'EE' | 'ME';
    email?: string;
    shortlistedCompanyIds?: number[];
  }) => {
    return applyDatasetMutation(
      cur => addStudentRecord(cur, data),
      `Added candidate: ${data.name} (CGPA: ${data.cgpa})`
    );
  };

  const updateStudent = (studentId: number, updates: Partial<Omit<Student, 'id'>>) => {
    return applyDatasetMutation(
      cur => updateStudentRecord(cur, studentId, updates),
      `Updated candidate details (ID: ${studentId})`
    );
  };

  const deleteStudent = (studentId: number) => {
    return applyDatasetMutation(
      cur => deleteStudentRecord(cur, studentId),
      `Removed candidate (ID: ${studentId})`
    );
  };

  const addCompany = (data: {
    id?: number;
    name: string;
    tier: 1 | 2 | 3;
    minCgpa: number;
    interviewDurationMinutes?: number;
    panelCount?: number;
  }) => {
    return applyDatasetMutation(
      cur => addCompanyRecord(cur, data),
      `Added recruiting company: ${data.name} (Tier ${data.tier}, Cutoff: ${data.minCgpa})`
    );
  };

  const updateCompany = (
    companyId: number,
    updates: Partial<Omit<Company, 'id' | 'panels' | 'shortlistedStudentIds'>>
  ) => {
    return applyDatasetMutation(
      cur => updateCompanyRecord(cur, companyId, updates),
      `Updated company parameters (ID: ${companyId})`
    );
  };

  const deleteCompany = (companyId: number) => {
    return applyDatasetMutation(
      cur => deleteCompanyRecord(cur, companyId),
      `Removed recruiting company (ID: ${companyId})`
    );
  };

  const addShortlist = (studentId: number, companyId: number) => {
    const student = dataset.students.find(s => s.id === studentId);
    const company = dataset.companies.find(c => c.id === companyId);
    const res = applyDatasetMutation(
      cur => addShortlistRecord(cur, studentId, companyId),
      `Added shortlist: ${student?.name || studentId} ➔ ${company?.name || companyId}`
    );
    return res;
  };

  const removeShortlist = (studentId: number, companyId: number) => {
    const student = dataset.students.find(s => s.id === studentId);
    const company = dataset.companies.find(c => c.id === companyId);
    return applyDatasetMutation(
      cur => removeShortlistRecord(cur, studentId, companyId),
      `Removed shortlist: ${student?.name || studentId} ✕ ${company?.name || companyId}`
    );
  };

  const addRoom = (data: { id?: number; roomNumber: string; building: string; isAvailable?: boolean }) => {
    return applyDatasetMutation(
      cur => addRoomRecord(cur, data),
      `Added interview venue: Room ${data.roomNumber} (${data.building})`
    );
  };

  const updateRoom = (roomId: number, updates: Partial<Omit<Room, 'id'>>) => {
    return applyDatasetMutation(
      cur => updateRoomRecord(cur, roomId, updates),
      `Updated room specifications (ID: ${roomId})`
    );
  };

  const deleteRoom = (roomId: number) => {
    return applyDatasetMutation(
      cur => deleteRoomRecord(cur, roomId),
      `Removed interview venue (ID: ${roomId})`
    );
  };

  const addPanel = (companyId: number, panelName: string, id?: number, isAvailable = true) => {
    const company = dataset.companies.find(c => c.id === companyId);
    return applyDatasetMutation(
      cur => addPanelRecord(cur, companyId, panelName, id, isAvailable),
      `Added panel "${panelName}" for ${company?.name || companyId}`
    );
  };

  const updatePanel = (
    panelId: number,
    updates: Partial<Omit<CompanyPanel, 'id' | 'companyId'>>
  ) => {
    return applyDatasetMutation(
      cur => updatePanelRecord(cur, panelId, updates),
      `Updated panel configurations (ID: ${panelId})`
    );
  };

  const deletePanel = (panelId: number) => {
    return applyDatasetMutation(
      cur => deletePanelRecord(cur, panelId),
      `Removed interview panel (ID: ${panelId})`
    );
  };

  return (
    <SchedulerContext.Provider
      value={{
        dataset,
        config,
        interviews,
        initialInterviews,
        unscheduledReports,
        metrics,
        validation,
        disruptions,
        activeReplanResult,
        filters,
        isGenerating,
        selectedDayId,
        activeTab,
        schedulerDurationMs,
        isScheduleStale,
        scheduleStaleReason,
        dataSourceMode,
        importedPayloads,
        importedSummary,
        importedDataset,
        setActiveTab,
        setSelectedDayId,
        setFilters,
        generateDataset: generateDatasetHandler,
        updateConfig,
        resetConfig,
        runInitialScheduling,
        regenerateSchedule,
        applyPanelDelay,
        applyPanelDropout,
        applyStudentWithdrawal,
        applyRoomUnavailable,
        runDay1CrisisBenchmark,
        resetToInitialSchedule,
        resetToDefaultDemoData,
        setActiveReplanResult,
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
        setDataSourceMode,
        importCsvPayloads,
        clearImportedData,
        syncConfigWithImportedCounts,
      }}
    >
      {children}
    </SchedulerContext.Provider>
  );
};

export const useScheduler = () => {
  const context = useContext(SchedulerContext);
  if (!context) {
    throw new Error('useScheduler must be used within a SchedulerProvider');
  }
  return context;
};
