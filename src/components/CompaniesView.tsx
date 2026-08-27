import React, { useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle,
  Filter,
  Search,
  Sliders,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { useScheduler } from '../context/SchedulerContext';
import { Company, CompanyTier } from '../types';

export const CompaniesView: React.FC = () => {
  const { dataset, interviews, setActiveTab } = useScheduler();
  const { companies } = dataset;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<CompanyTier | 'ALL'>('ALL');

  // Precompute scheduled count per company
  const companyScheduledMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of interviews) {
      if (item.status !== 'CANCELLED') {
        map.set(item.companyId, (map.get(item.companyId) || 0) + 1);
      }
    }
    return map;
  }, [interviews]);

  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      if (selectedTier !== 'ALL' && c.tier !== selectedTier) return false;
      if (searchQuery.trim() !== '') {
        if (!c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      }
      return true;
    });
  }, [companies, selectedTier, searchQuery]);

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <span>Participating Companies & Interview Panels ({companies.length} Firms)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Recruiter profiles, priority tiers, minimum CGPA thresholds, panel structures, and candidate shortlist demands.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Tier filter pill buttons */}
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setSelectedTier('ALL')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                selectedTier === 'ALL' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              All ({companies.length})
            </button>
            <button
              onClick={() => setSelectedTier(1)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                selectedTier === 1 ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Tier 1 ({companies.filter(c => c.tier === 1).length})
            </button>
            <button
              onClick={() => setSelectedTier(2)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                selectedTier === 2 ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Tier 2 ({companies.filter(c => c.tier === 2).length})
            </button>
            <button
              onClick={() => setSelectedTier(3)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                selectedTier === 3 ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600'
              }`}
            >
              Tier 3 ({companies.filter(c => c.tier === 3).length})
            </button>
          </div>

          <button
            id="btn-goto-company-mgmt"
            onClick={() => setActiveTab('data-mgmt')}
            className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold border border-indigo-200 transition"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Manage Firms</span>
          </button>
        </div>
      </div>

      {/* Search Filter */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search company by name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCompanies.map(comp => {
          const scheduledCount = companyScheduledMap.get(comp.id) || 0;
          const shortlistCount = comp.shortlistedStudentIds.length;
          const fulfillmentRate = shortlistCount > 0 ? Math.round((scheduledCount / shortlistCount) * 100) : 0;

          const tierColor = {
            1: 'border-purple-200 bg-purple-50/20 text-purple-900',
            2: 'border-sky-200 bg-sky-50/20 text-sky-900',
            3: 'border-slate-200 bg-white text-slate-900',
          }[comp.tier];

          const badgeColor = {
            1: 'bg-purple-100 text-purple-800 border-purple-200',
            2: 'bg-sky-100 text-sky-800 border-sky-200',
            3: 'bg-slate-100 text-slate-700 border-slate-200',
          }[comp.tier];

          return (
            <div
              key={comp.id}
              className={`p-5 rounded-xl border ${tierColor} shadow-xs flex flex-col justify-between space-y-4`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                      Tier {comp.tier} {comp.tier === 1 ? 'Tech Giant' : comp.tier === 2 ? 'Product' : 'Enterprise'}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-2">{comp.name}</h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Min CGPA Cutoff</span>
                    <strong className="text-slate-800 font-bold">{comp.minCgpa.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Active Panels</span>
                    <strong className="text-slate-800 font-bold">{comp.panels.length} Teams</strong>
                  </div>
                </div>

                <div className="mt-3">
                  <span className="text-slate-400 block text-[11px] mb-1">Interview Panel Rosters</span>
                  <div className="flex flex-wrap gap-1">
                    {comp.panels.map(p => (
                      <span
                        key={p.id}
                        className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-medium text-slate-700"
                      >
                        {p.panelName.split(' ')[1] || p.panelName}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Progress fulfillment bar */}
              <div className="pt-3 border-t border-slate-100 text-xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span>Demand Fulfillment</span>
                  <strong className="text-slate-800 font-bold">
                    {scheduledCount} / {shortlistCount} ({fulfillmentRate}%)
                  </strong>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      comp.tier === 1 ? 'bg-purple-600' : comp.tier === 2 ? 'bg-sky-600' : 'bg-indigo-600'
                    }`}
                    style={{ width: `${Math.min(100, fulfillmentRate)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
