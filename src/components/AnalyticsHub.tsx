/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { AnalyticsSummary } from '../types';
import { BarChart3, TrendingUp, Clock, Layers } from 'lucide-react';

interface AnalyticsHubProps {
  analytics: AnalyticsSummary;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6'];

export default function AnalyticsHub({ analytics }: AnalyticsHubProps) {
  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Today's Revenue</p>
            <p className="text-xl font-bold text-gray-900">${analytics.revenueToday}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <BarChart3 size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">SaaS Total Earnings</p>
            <p className="text-xl font-bold text-gray-900">${analytics.revenueTotal}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Layers size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">In-Queue Orders</p>
            <p className="text-xl font-bold text-gray-900">
              {analytics.activeOrdersCount + analytics.readyOrdersCount}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Avg Cycle Duration</p>
            <p className="text-xl font-bold text-gray-900">{analytics.avgDurationMinutes} mins</p>
          </div>
        </div>
      </div>

      {/* Recharts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Revenue Trend Chart */}
        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-gray-50">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Financial Revenue & Volume Tracker</h3>
              <p className="text-xs text-gray-500">Trailing completed booking totals grouped daily</p>
            </div>
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
              Live updates
            </span>
          </div>

          <div className="h-64 mt-4 text-xs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.dailyRevenue}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ background: '#0f172a', color: '#fff', borderRadius: '8px', border: 'none' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorAmount)"
                  name="Revenue ($)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Popularity Share Donut Chart */}
        <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 space-y-4">
          <div className="pb-2 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Service Category Share</h3>
            <p className="text-xs text-gray-500">Relative booking frequency per core service</p>
          </div>

          <div className="h-48 mt-4 flex items-center justify-center">
            {analytics.servicePopularity.length === 0 ? (
              <p className="text-xs text-gray-400">No active bookings recorded</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.servicePopularity}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {analytics.servicePopularity.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#0f172a', color: '#fff', borderRadius: '8px', border: 'none' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
            {analytics.servicePopularity.slice(0, 4).map((entry, idx) => (
              <div key={entry.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 truncate">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="text-gray-600 truncate">{entry.name}</span>
                </div>
                <span className="font-mono text-gray-500 font-semibold">{entry.value} bookings</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Peak Activity Hours Bar Chart */}
      <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 space-y-4">
        <div className="pb-2 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">Hourly Intake Peak Load Density</h3>
          <p className="text-xs text-gray-500">Peak appointment hours to optimize coordinator staff shifts</p>
        </div>

        <div className="h-48 text-xs font-mono">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.hourlyActivity}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="hour" stroke="#94a3b8" />
              <YAxis allowDecimals={false} stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ background: '#0f172a', color: '#fff', borderRadius: '8px', border: 'none' }}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Orders Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
