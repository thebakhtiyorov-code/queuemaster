/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, AlertTriangle, RefreshCw, UserCheck, Check } from 'lucide-react';

interface OptimizerAction {
  orderId: string;
  suggestedStaffId: string;
  reason: string;
}

interface TechUtilization {
  name: string;
  activeOrders: number;
  status: 'Busy' | 'Balanced' | 'Available';
}

interface OptimizerData {
  recommendationText?: string;
  technicianUtilization?: TechUtilization[];
  isBottleneckDetected?: boolean;
  bottleneckDetail?: string;
  suggestedActions?: OptimizerAction[];
  error?: string;
}

interface AIOptimizerCardProps {
  onReassignAction: (orderId: string, staffId: string) => Promise<void>;
  staffList: { id: string; name: string }[];
}

export default function AIOptimizerCard({ onReassignAction, staffList }: AIOptimizerCardProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<OptimizerData | null>(null);
  const [appliedActions, setAppliedActions] = useState<string[]>([]);

  const runOptimizer = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/gemini/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      setData(result);
    } catch (e) {
      console.error(e);
      setData({ error: 'Failed to reach AI Engine. Make sure server is alive and Gemini Key is set.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runOptimizer();
  }, []);

  const handleApply = async (orderId: string, staffId: string, actionIndex: number) => {
    await onReassignAction(orderId, staffId);
    setAppliedActions((prev) => [...prev, `${orderId}-${staffId}`]);
  };

  return (
    <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl shadow-lg border border-slate-800 space-y-6 relative overflow-hidden">
      {/* Background neon blur */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-indigo-500/15 text-indigo-400 rounded-lg">
            <Sparkles size={18} className={loading ? 'animate-pulse' : ''} />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Gemini Smart Queue Optimizer</h3>
            <p className="text-xs text-slate-400">Heuristic bottleneck checks & automated work assignment balancing</p>
          </div>
        </div>

        <button
          onClick={runOptimizer}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800/50 text-xs text-slate-300 hover:text-slate-100 rounded-lg font-medium transition cursor-pointer"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>{loading ? 'Optimizing...' : 'Recalculate'}</span>
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <Sparkles className="animate-spin text-indigo-400" size={32} />
          <p className="text-xs text-slate-400 animate-pulse font-mono">Running high-order graph heuristic reviews...</p>
        </div>
      ) : data?.error ? (
        <div className="bg-rose-950/40 border border-rose-900/60 p-4 rounded-xl space-y-1">
          <div className="flex items-center space-x-2 text-rose-400 font-medium text-xs">
            <AlertTriangle size={15} />
            <span>Key Setup Needed</span>
          </div>
          <p className="text-xs text-slate-400">{data.error}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Recommendation summary text */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
            <p className="font-semibold text-slate-100 mb-1 flex items-center space-x-1">
              <Sparkles size={13} className="text-amber-400" />
              <span>AI Dispatcher Advice:</span>
            </p>
            {data?.recommendationText || 'No current recommendations.'}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tech load ratios */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Technician Workloads</h4>
              <div className="space-y-2">
                {data?.technicianUtilization && data.technicianUtilization.length > 0 ? (
                  data.technicianUtilization.map((tech) => {
                    const statusColors = {
                      Busy: 'bg-rose-500/20 text-rose-400 border-rose-500/20',
                      Balanced: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20',
                      Available: 'bg-blue-500/20 text-blue-400 border-blue-500/20',
                    };
                    return (
                      <div
                        key={tech.name}
                        className="bg-slate-950/30 px-3 py-2 rounded-lg border border-slate-800/40 flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-slate-300">{tech.name}</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-slate-400">{tech.activeOrders} active task(s)</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                              statusColors[tech.status] || ''
                            }`}
                          >
                            {tech.status}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-500">No staff workload information compiled</p>
                )}
              </div>
            </div>

            {/* Bottlenecks warnings */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Queue Critical Status</h4>
              <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-800/40 min-h-24 flex flex-col justify-center">
                {data?.isBottleneckDetected ? (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-1.5 text-amber-400 text-xs font-bold">
                      <AlertTriangle size={14} />
                      <span>Bottleneck Warnings Active</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-normal">{data.bottleneckDetail}</p>
                  </div>
                ) : (
                  <div className="text-center py-4 space-y-1 text-slate-400">
                    <UserCheck size={20} className="mx-auto text-emerald-500" />
                    <p className="text-xs font-medium">Flow Rate: Optimal</p>
                    <p className="text-[10px] text-slate-500">Current resources match open checkout workloads.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick optimization dispatch actions */}
          {data?.suggestedActions && data.suggestedActions.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Recommended Adjustments</h4>
              <div className="divide-y divide-slate-800/50 space-y-2">
                {data.suggestedActions.map((action, index) => {
                  const targetStaff = staffList.find((s) => s.id === action.suggestedStaffId);
                  const isApplied = appliedActions.includes(`${action.orderId}-${action.suggestedStaffId}`);

                  return (
                    <div
                      key={`${action.orderId}-${index}`}
                      className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs"
                    >
                      <div className="space-y-0.5">
                        <p className="text-slate-300 font-semibold">
                          Reassign Ticket <span className="font-mono text-indigo-400">{action.orderId}</span> to{' '}
                          <span className="text-amber-400">{targetStaff?.name || action.suggestedStaffId}</span>
                        </p>
                        <p className="text-[11px] text-slate-400 italic">"{action.reason}"</p>
                      </div>

                      <button
                        onClick={() => handleApply(action.orderId, action.suggestedStaffId, index)}
                        disabled={isApplied || !targetStaff}
                        className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold self-start sm:self-center transition ${
                          isApplied
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/60 cursor-default'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
                        }`}
                      >
                        {isApplied ? <Check size={12} /> : <UserCheck size={12} />}
                        <span>{isApplied ? 'Balanced' : 'Apply Balance'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
