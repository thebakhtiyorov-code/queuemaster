/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Service, Order, Staff, AnalyticsSummary } from './types';
import AdminTracker from './components/AdminTracker';
import CustomerMobileApp from './components/CustomerMobileApp';
import AnalyticsHub from './components/AnalyticsHub';
import AIOptimizerCard from './components/AIOptimizerCard';
import {
  Sparkles,
  BarChart3,
  Layers,
  Wrench,
  RefreshCw,
  Clock,
  ShieldAlert,
  Smartphone,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';

export default function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [errorStatus, setErrorStatus] = useState<string>('');
  const [syncCount, setSyncCount] = useState<number>(0);

  // Toggle active view mode on the Admin side: 'analytics' | 'kanban'
  const [adminViewMode, setAdminViewMode] = useState<'analytics' | 'kanban'>('kanban');

  // Backend jonli manzili
  const BASE_URL = 'https://queuemaster-system.onrender.com';

  // Load backend data
  const fetchAllData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [srvRes, stfRes, ordRes, alyRes] = await Promise.all([
        fetch(`${BASE_URL}/api/services`),
        fetch(`${BASE_URL}/api/staff`),
        fetch(`${BASE_URL}/api/orders`),
        fetch(`${BASE_URL}/api/analytics`),
      ]);

      if (!srvRes.ok || !stfRes.ok || !ordRes.ok || !alyRes.ok) {
        throw new Error('Some API resources failed to load from full-stack server.');
      }

      const [servicesData, staffData, ordersData, analyticsData] = await Promise.all([
        srvRes.json(),
        stfRes.json(),
        ordRes.json(),
        alyRes.json(),
      ]);

      setServices(servicesData);
      setStaff(staffData);
      setOrders(ordersData);
      setAnalytics(analyticsData);
      setErrorStatus('');
    } catch (e: any) {
      console.error(e);
      setErrorStatus('Failed to sync backend DB. Verify your Express node server configuration is active on Render.');
    } finally {
      setLoading(false);
      setSyncCount((prev) => prev + 1);
    }
  };

  useEffect(() => {
    fetchAllData();
    // Enable active polling every 7 seconds for realtime multi-view testing!
    const interval = setInterval(() => {
      fetchAllData(true);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  // CRUD API Actions
  const handleUpdateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      const res = await fetch(`${BASE_URL}/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await fetchAllData(true);
      }
    } catch (err) {
      console.error('Failed to transition order status', err);
    }
  };

  const handleAssignStaff = async (orderId: string, staffId: string | undefined) => {
    try {
      const res = await fetch(`${BASE_URL}/api/orders/${orderId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedStaffId: staffId }),
      });
      if (res.ok) {
        await fetchAllData(true);
      }
    } catch (err) {
      console.error('Failed to assign staff to order', err);
    }
  };

  const handleSaveService = async (servicePayload: Partial<Service>) => {
    try {
      const res = await fetch(`${BASE_URL}/api/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(servicePayload),
      });
      if (res.ok) {
        await fetchAllData(true);
      }
    } catch (err) {
      console.error('Failed to save service offer', err);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/services/${serviceId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchAllData(true);
      }
    } catch (err) {
      console.error('Failed to delete service offer', err);
    }
  };

  const handleSaveStaff = async (staffPayload: Partial<Staff>) => {
    try {
      const res = await fetch(`${BASE_URL}/api/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffPayload),
      });
      if (res.ok) {
        await fetchAllData(true);
      }
    } catch (err) {
      console.error('Failed to save staff member', err);
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/staff/${staffId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchAllData(true);
      }
    } catch (err) {
      console.error('Failed to delete staff specialist', err);
    }
  };

  // Called when customer books a slot from simulated mobile view
  const handleBookingCompleted = async (bookingData: any) => {
    // Reload local dashboard states immediately to show enqueued order!
    await fetchAllData(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800 antialiased font-sans flex flex-col justify-between">
      {/* SaaS Main Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 px-6 py-4 shadow-3xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-mono shadow-sm">
            <Layers size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">QueueMaster</h1>
            <p className="text-xs text-gray-500 font-medium">Smart Booking, Order Lifecycle & Queue SaaS</p>
          </div>
        </div>

        {/* Global actions & info */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center space-x-1.5 bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium">Express DB Sync</span>
          </div>

          <button
            onClick={() => fetchAllData()}
            className="flex items-center space-x-1.5 px-3 py-1.5 hover:bg-gray-100 text-gray-600 rounded-lg font-semibold transition cursor-pointer border border-gray-200 bg-white"
          >
            <RefreshCw size={13} />
            <span>Force Reload</span>
          </button>
        </div>
      </header>

      {/* Primary Layout Frame */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">
        {loading && (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="animate-spin text-blue-600 mx-auto" size={36} />
            <p className="text-sm font-semibold text-gray-600 animate-pulse">
              Verifying real-time data integrations...
            </p>
          </div>
        )}

        {errorStatus && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl leading-relaxed text-xs max-w-2xl mx-auto mb-8 flex items-start space-x-2.5">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <p>{errorStatus}</p>
          </div>
        )}

        {!loading && !errorStatus && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Lg:col-span-8 : Admin Workspaces & Operations panel */}
            <div className="lg:col-span-8 space-y-8">
              {/* Operations Toggle controls */}
              <div className="bg-white p-2 border border-gray-200/80 rounded-xl flex space-x-2 shadow-2xs">
                <button
                  onClick={() => setAdminViewMode('kanban')}
                  className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    adminViewMode === 'kanban'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'hover:bg-gray-100 text-gray-650'
                  }`}
                >
                  <Wrench size={14} />
                  <span>Interactive Command Board</span>
                </button>
                <button
                  onClick={() => setAdminViewMode('analytics')}
                  className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    adminViewMode === 'analytics'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'hover:bg-gray-100 text-gray-650'
                  }`}
                >
                  <BarChart3 size={14} />
                  <span>SaaS Analytics Hub</span>
                </button>
              </div>

              {/* Dynamic View container */}
              {adminViewMode === 'kanban' ? (
                <AdminTracker
                  orders={orders}
                  services={services}
                  staff={staff}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onAssignStaff={handleAssignStaff}
                  onSaveService={handleSaveService}
                  onDeleteService={handleDeleteService}
                  onSaveStaff={handleSaveStaff}
                  onDeleteStaff={handleDeleteStaff}
                />
              ) : (
                analytics && <AnalyticsHub analytics={analytics} />
              )}

              {/* Operations AI Balancer card */}
              <AIOptimizerCard
                onReassignAction={handleAssignStaff}
                staffList={staff.map((s) => ({ id: s.id, name: s.name }))}
              />
            </div>

            {/* Lg:col-span-4 : Simulated PWA Companion Frame */}
            <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-3xs space-y-3.5">
                <div className="flex items-center space-x-2 text-blue-700">
                  <Smartphone size={16} />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Dual-Actor Sandbox</h4>
                </div>
                <p className="text-xs text-gray-500 leading-normal">
                  Toggle or use both panels simultaneously! Schedule a slot on the simulated mobile phone to the right,
                  and watch it immediately propagate onto the Admin list on the left. Changing Kanban repair stages
                  instantly triggers live updates for the client.
                </p>
              </div>

              <CustomerMobileApp
                services={services}
                staff={staff}
                orders={orders}
                onBookAppointment={handleBookingCompleted}
              />
            </div>
          </div>
        )}
      </main>

      {/* SaaS footer metadata */}
      <footer className="bg-white border-t border-gray-200 px-6 py-5 text-center text-xs text-gray-400 font-medium select-none mt-16">
        <p>© 2026 QueueMaster SaaS Inc. Full-Stack Realtime Operations Console.</p>
      </footer>
    </div>
  );
}