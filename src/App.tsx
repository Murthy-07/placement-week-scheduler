/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SchedulerProvider, useScheduler } from './context/SchedulerContext';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { ScheduleGridView } from './components/ScheduleGridView';
import { StudentsView } from './components/StudentsView';
import { CompaniesView } from './components/CompaniesView';
import { RoomsView } from './components/RoomsView';
import { DisruptionsView } from './components/DisruptionsView';
import { ConflictsView } from './components/ConflictsView';
import { DefenseDossierView } from './components/DefenseDossierView';
import { ConfigurationView } from './components/ConfigurationView';
import { DataManagementView } from './components/DataManagementView';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const MainContent: React.FC = () => {
  const { activeTab, isScheduleStale, scheduleStaleReason, regenerateSchedule } = useScheduler();

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      {isScheduleStale && activeTab !== 'data-mgmt' && (
        <div
          id="global-stale-banner"
          className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-center justify-between gap-3 text-amber-900 bg-amber-50 shadow-xs"
        >
          <div className="flex items-center space-x-2.5 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Schedule is Stale:</strong> Underlying records were modified ({scheduleStaleReason}). Run the scheduler to refresh itineraries.
            </span>
          </div>
          <button
            id="btn-global-regenerate"
            onClick={regenerateSchedule}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs shrink-0 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Regenerate Schedule</span>
          </button>
        </div>
      )}

      {activeTab === 'dashboard' && <DashboardView />}
      {activeTab === 'schedule' && <ScheduleGridView />}
      {activeTab === 'data-mgmt' && <DataManagementView />}
      {activeTab === 'students' && <StudentsView />}
      {activeTab === 'companies' && <CompaniesView />}
      {activeTab === 'rooms' && <RoomsView />}
      {activeTab === 'disruptions' && <DisruptionsView />}
      {activeTab === 'conflicts' && <ConflictsView />}
      {activeTab === 'config' && <ConfigurationView />}
      {activeTab === 'defense' && <DefenseDossierView />}
    </main>
  );
};

export default function App() {
  return (
    <SchedulerProvider>
      <div className="min-h-screen bg-slate-100 text-slate-900 font-sans antialiased flex flex-col selection:bg-indigo-500 selection:text-white">
        <Navbar />
        <div className="flex-1">
          <MainContent />
        </div>
      </div>
    </SchedulerProvider>
  );
}
