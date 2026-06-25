/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Service, Order, Staff } from '../types';
import {
  Clock,
  User,
  CheckCircle,
  Plus,
  Trash,
  ArrowRight,
  UserMinus,
  Edit2,
  Check,
  AlertCircle,
  Wrench,
  Sparkles,
  Phone,
  Mail,
  Layers,
  X,
} from 'lucide-react';

interface AdminTrackerProps {
  orders: Order[];
  services: Service[];
  staff: Staff[];
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  onAssignStaff: (orderId: string, staffId: string | undefined) => Promise<void>;
  onSaveService: (service: Partial<Service>) => Promise<void>;
  onDeleteService: (serviceId: string) => Promise<void>;
  onSaveStaff: (technician: Partial<Staff>) => Promise<void>;
  onDeleteStaff: (staffId: string) => Promise<void>;
}

export default function AdminTracker({
  orders,
  services,
  staff,
  onUpdateOrderStatus,
  onAssignStaff,
  onSaveService,
  onDeleteService,
  onSaveStaff,
  onDeleteStaff,
}: AdminTrackerProps) {
  // Tabs: 'kanban' | 'services' | 'staff'
  const [activeTab, setActiveTab] = useState<'kanban' | 'services' | 'staff'>('kanban');

  // Search filter
  const [filterQuery, setFilterQuery] = useState('');

  // Modals / forms state
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);

  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Partial<Staff> | null>(null);

  // Manage Order assignment dropdown state
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);

  // Filtered orders with safe optional checks
  const filteredOrders = orders.filter((o) => {
    const q = filterQuery.toLowerCase();
    const nameMatch = o.customerName ? o.customerName.toLowerCase().includes(q) : false;
    const idMatch = o.id ? o.id.toLowerCase().includes(q) : false;
    const emailMatch = o.customerEmail ? o.customerEmail.toLowerCase().includes(q) : false;
    return nameMatch || idMatch || emailMatch;
  });

  // Helper arrays for Kanban lists
  const pendingOrders = filteredOrders.filter((o) => o.status === 'pending');
  const inProgressOrders = filteredOrders.filter((o) => o.status === 'in_progress');
  const readyOrders = filteredOrders.filter((o) => o.status === 'ready');
  const completedOrders = filteredOrders.filter((o) => o.status === 'completed');

  // Next status transition mapping
  const nextStatusMap: { [key in Order['status']]: Order['status'] | null } = {
    pending: 'in_progress',
    in_progress: 'ready',
    ready: 'completed',
    completed: null,
  };

  const statusLabels: { [key in Order['status']]: string } = {
    pending: 'Awaiting Intake',
    in_progress: 'Repairs Active',
    ready: 'Ready for Pickup',
    completed: 'Concluded',
  };

  const handleOpenServiceModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
    } else {
      setEditingService({ title: '', description: '', price: 60, durationMinutes: 30, category: 'Device Repair', isAvailable: true });
    }
    setServiceModalOpen(true);
  };

  const handleSaveServiceClick = async () => {
    if (editingService && editingService.title && editingService.price) {
      await onSaveService(editingService);
      setServiceModalOpen(false);
      setEditingService(null);
    }
  };

  const handleOpenStaffModal = (member?: Staff) => {
    if (member) {
      setEditingStaff(member);
    } else {
      setEditingStaff({ name: '', specialty: '', isAvailable: true, email: '', role: 'staff' });
    }
    setStaffModalOpen(true);
  };

  const handleSaveStaffClick = async () => {
    if (editingStaff && editingStaff.name) {
      await onSaveStaff(editingStaff);
      setStaffModalOpen(false);
      setEditingStaff(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
      {/* Sub-Header Tabs */}
      <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex space-x-1 bg-gray-200/60 p-1 rounded-xl self-start">
          <button
            onClick={() => setActiveTab('kanban')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
              activeTab === 'kanban'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Live Kanban
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
              activeTab === 'services'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Service Offers ({services.length})
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
              activeTab === 'staff'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Technician Roster
          </button>
        </div>

        {/* Dynamic Controls */}
        {activeTab === 'kanban' && (
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <input
              type="text"
              placeholder="Search user, ticket id..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="px-3.5 py-1.5 border border-gray-200 rounded-lg text-xs w-full md:w-56 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white shadow-2xs"
            />
          </div>
        )}

        {activeTab === 'services' && (
          <button
            onClick={() => handleOpenServiceModal()}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs hover:shadow-md transition cursor-pointer"
          >
            <Plus size={14} />
            <span>Create Service Offer</span>
          </button>
        )}

        {activeTab === 'staff' && (
          <button
            onClick={() => handleOpenStaffModal()}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs hover:shadow-md transition cursor-pointer"
          >
            <Plus size={14} />
            <span>Hire Staff Specialist</span>
          </button>
        )}
      </div>

      {/* Main Body Grid */}
      <div className="p-6">
        {/* TAB 1: LIVE KANBAN BOARD */}
        {activeTab === 'kanban' && (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Column 1: Pending */}
            <div className="flex flex-col space-y-3.5">
              <div className="flex justify-between items-center bg-amber-50/80 px-3 py-2 rounded-lg border border-amber-100/60">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wide flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>Awaiting Intake</span>
                </span>
                <span className="font-mono text-xs bg-amber-100/80 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                  {pendingOrders.length}
                </span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {pendingOrders.map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    services={services}
                    staff={staff}
                    onStatusUpdate={onUpdateOrderStatus}
                    nextStatus={nextStatusMap[o.status]}
                    assigningOrderId={assigningOrderId}
                    setAssigningOrderId={setAssigningOrderId}
                    onAssign={onAssignStaff}
                  />
                ))}
                {pendingOrders.length === 0 && <EmptyColumn />}
              </div>
            </div>

            {/* Column 2: In Progress */}
            <div className="flex flex-col space-y-3.5">
              <div className="flex justify-between items-center bg-blue-50/80 px-3 py-2 rounded-lg border border-blue-100/60">
                <span className="text-xs font-bold text-blue-800 uppercase tracking-wide flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Repairs Active</span>
                </span>
                <span className="font-mono text-xs bg-blue-100/80 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                  {inProgressOrders.length}
                </span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {inProgressOrders.map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    services={services}
                    staff={staff}
                    onStatusUpdate={onUpdateOrderStatus}
                    nextStatus={nextStatusMap[o.status]}
                    assigningOrderId={assigningOrderId}
                    setAssigningOrderId={setAssigningOrderId}
                    onAssign={onAssignStaff}
                  />
                ))}
                {inProgressOrders.length === 0 && <EmptyColumn />}
              </div>
            </div>

            {/* Column 3: Ready */}
            <div className="flex flex-col space-y-3.5">
              <div className="flex justify-between items-center bg-emerald-50/80 px-3 py-2 rounded-lg border border-emerald-100/60">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Ready for Pickup</span>
                </span>
                <span className="font-mono text-xs bg-emerald-100/80 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  {readyOrders.length}
                </span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {readyOrders.map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    services={services}
                    staff={staff}
                    onStatusUpdate={onUpdateOrderStatus}
                    nextStatus={nextStatusMap[o.status]}
                    assigningOrderId={assigningOrderId}
                    setAssigningOrderId={setAssigningOrderId}
                    onAssign={onAssignStaff}
                  />
                ))}
                {readyOrders.length === 0 && <EmptyColumn />}
              </div>
            </div>

            {/* Column 4: Completed */}
            <div className="flex flex-col space-y-3.5">
              <div className="flex justify-between items-center bg-gray-100 px-3 py-2 rounded-lg border border-gray-200">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-gray-400" />
                  <span>Completed & Closed</span>
                </span>
                <span className="font-mono text-xs bg-gray-200 text-gray-750 font-bold px-2 py-0.5 rounded-full">
                  {completedOrders.length}
                </span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {completedOrders.map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    services={services}
                    staff={staff}
                    onStatusUpdate={onUpdateOrderStatus}
                    nextStatus={nextStatusMap[o.status]}
                    assigningOrderId={assigningOrderId}
                    setAssigningOrderId={setAssigningOrderId}
                    onAssign={onAssignStaff}
                  />
                ))}
                {completedOrders.length === 0 && <EmptyColumn />}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SERVICE OFFER MANAGEMENT (CRUD) */}
        {activeTab === 'services' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((srv) => (
              <div
                key={srv.id}
                className="bg-white border border-gray-150 p-5 rounded-2xl shadow-3xs hover:shadow-xs transition duration-200 relative flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md">
                      {srv.category}
                    </span>
                    <span className="text-lg font-bold text-blue-600">${srv.price}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">{srv.title}</h4>
                    <p className="text-xs text-gray-500 mt-1 leading-normal line-clamp-2 h-8">
                      {srv.description}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-gray-100/80 flex justify-between items-center">
                  <div className="flex items-center space-x-1.5 text-xs text-gray-450 font-medium">
                    <Clock size={13} />
                    <span>{srv.durationMinutes} minutes duration</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenServiceModal(srv)}
                      className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-800 transition cursor-pointer"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => onDeleteService(srv.id)}
                      className="p-1.5 hover:bg-rose-50 rounded text-gray-400 hover:text-rose-600 transition cursor-pointer"
                    >
                      <Trash size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: STAFF SCHEDULING ROSTER (CRUD) */}
        {activeTab === 'staff' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {staff.map((member) => (
              <div
                key={member.id}
                className="bg-white border border-gray-150 p-5 rounded-2xl text-center space-y-4 hover:shadow-2xs transition"
              >
                <div className="relative inline-block">
                  <img
                    src={member.imageUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120'}
                    alt={member.name}
                    className="w-16 h-16 rounded-full mx-auto object-cover border-2 border-gray-50 shadow-2xs"
                    referrerPolicy="no-referrer"
                  />
                  <span
                    className={`absolute bottom-0 right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                      member.isAvailable ? 'bg-emerald-500' : 'bg-gray-300'
                    }`}
                  />
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-900">{member.name}</h4>
                  <p className="text-xs text-blue-600 font-medium mt-0.5">{member.specialty}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{member.email}</p>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-gray-400">{member.role}</span>
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleOpenStaffModal(member)}
                      className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-800 transition cursor-pointer"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={() => onDeleteStaff(member.id)}
                      className="p-1 hover:bg-rose-50 rounded text-gray-400 hover:text-rose-600 transition cursor-pointer"
                    >
                      <Trash size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL 1: SERVICE SAVE MODAL */}
      {serviceModalOpen && editingService && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-gray-100 relative">
            <button
              onClick={() => setServiceModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={16} />
            </button>
            <h3 className="text-sm font-bold text-gray-950">
              {editingService.id ? 'Edit Service Offer' : 'Create Service Offer'}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Engine Calibration"
                  value={editingService.title || ''}
                  onChange={(e) => setEditingService({ ...editingService, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Category</label>
                <select
                  value={editingService.category || 'Device Repair'}
                  onChange={(e) => setEditingService({ ...editingService, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-250 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Device Repair">Device Repair</option>
                  <option value="Auto Care">Auto Care</option>
                  <option value="Hair & Salon">Hair & Salon</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Price ($)</label>
                  <input
                    type="number"
                    value={editingService.price || 0}
                    onChange={(e) => setEditingService({ ...editingService, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-250 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    value={editingService.durationMinutes || 0}
                    onChange={(e) =>
                      setEditingService({ ...editingService, durationMinutes: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-250 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Service details..."
                  value={editingService.description || ''}
                  onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-250 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="srv_avail"
                  checked={editingService.isAvailable || false}
                  onChange={(e) => setEditingService({ ...editingService, isAvailable: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="srv_avail" className="text-xs text-gray-600 font-medium">
                  Service active and bookable
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => setServiceModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold hover:bg-gray-150 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveServiceClick}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-500 cursor-pointer"
              >
                Save Offer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: STAFF SAVE MODAL */}
      {staffModalOpen && editingStaff && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-gray-100 relative">
            <button
              onClick={() => setStaffModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={16} />
            </button>
            <h3 className="text-sm font-bold text-gray-950">
              {editingStaff.id ? 'Edit Specialist' : 'Hire New Specialist'}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Name</label>
                <input
                  type="text"
                  placeholder="e.g. Liam Sterling"
                  value={editingStaff.name || ''}
                  onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-250 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Specialty</label>
                <input
                  type="text"
                  placeholder="e.g. Electronics & Micro-soldering"
                  value={editingStaff.specialty || ''}
                  onChange={(e) => setEditingStaff({ ...editingStaff, specialty: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-250 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Staff Email</label>
                <input
                  type="email"
                  placeholder="staff-email@queuemaster.com"
                  value={editingStaff.email || ''}
                  onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-250 rounded-lg focus:outline-none animate-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Assigned Role</label>
                <select
                  value={editingStaff.role || 'staff'}
                  onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value as Staff['role'] })}
                  className="w-full px-3 py-2 border border-gray-250 rounded-lg bg-white"
                >
                  <option value="staff">Technician (Staff)</option>
                  <option value="admin">SaaS Coordinator (Admin)</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="tech_avail"
                  checked={editingStaff.isAvailable || false}
                  onChange={(e) => setEditingStaff({ ...editingStaff, isAvailable: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="tech_avail" className="text-xs text-gray-600 font-medium">
                  Roster active and available for intake
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => setStaffModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold hover:bg-gray-150 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStaffClick}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-500 cursor-pointer"
              >
                Hire Specialist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Kanban helper card component */
interface OrderCardProps {
  key?: string;
  order: Order;
  services: Service[];
  staff: Staff[];
  onStatusUpdate: (orderId: string, status: Order['status']) => Promise<void>;
  nextStatus: Order['status'] | null;
  assigningOrderId: string | null;
  setAssigningOrderId: (id: string | null) => void;
  onAssign: (orderId: string, staffId: string | undefined) => Promise<void>;
}

function OrderCard({
  order,
  services,
  staff,
  onStatusUpdate,
  nextStatus,
  assigningOrderId,
  setAssigningOrderId,
  onAssign,
}: OrderCardProps) {
  const selectedSrv = services.find((s) => s.id === order.serviceId);
  const assignedMember = staff.find((st) => st.id === order.assignedStaffId);

  const statusLabel = {
    pending: 'Awaiting Intake',
    in_progress: 'Repairs Active',
    ready: 'Ready for Pickup',
    completed: 'Concluded',
  }[order.status];

  return (
    <div className="bg-white border border-gray-150 hover:border-gray-250 p-4 rounded-xl shadow-3xs hover:shadow-2xs transition group space-y-3 relative">
      {/* Title & Price Header */}
      <div className="flex justify-between items-start gap-2">
        <span className="font-mono text-[10px] font-bold text-gray-400 uppercase tracking-wider block bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded">
          {order.id}
        </span>
        <span className="text-xs font-bold text-gray-800">${order.totalPrice}</span>
      </div>

      <div className="space-y-1">
        <h4 className="text-xs font-semibold text-gray-900 leading-snug">
          {selectedSrv?.title || 'Unknown Service'}
        </h4>
        <p className="text-[11px] text-gray-400 capitalize bg-slate-50 px-1.5 py-0.5 rounded-md inline-block">
          {selectedSrv?.category}
        </p>
      </div>

      {/* Customer Info row */}
      <div className="bg-gray-50/50 p-2 rounded-lg border border-gray-100/50 space-y-1 text-[10px] text-gray-500">
        <div className="flex items-center space-x-1.5 font-semibold text-gray-700">
          <User size={11} className="text-gray-400" />
          <span>{order.customerName}</span>
        </div>
        {order.notes && (
          <p className="text-[10px] text-gray-405 leading-normal italic line-clamp-2 mt-1">
            "{order.notes}"
          </p>
        )}
      </div>

      {/* Specialty Status indicators */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {/* Assigned tech block */}
        {assignedMember ? (
          <div className="flex items-center space-x-1 text-[10px] bg-blue-50 text-blue-700 border border-blue-100/60 font-semibold px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span>{assignedMember.name}</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1 text-[10px] bg-amber-50 text-amber-700 border border-amber-100/60 font-bold px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Unassigned</span>
          </div>
        )}
      </div>

      {/* Actions footer */}
      <div className="pt-2 mt-2 border-t border-gray-100/80 flex items-center justify-between gap-1.5">
        {/* Assign Staff action */}
        {assigningOrderId === order.id ? (
          <div className="flex items-center space-x-1 w-full">
            <select
              value={order.assignedStaffId || ''}
              onChange={(e) => {
                onAssign(order.id, e.target.value || undefined);
                setAssigningOrderId(null);
              }}
              className="text-[10px] bg-slate-50 border border-gray-200 outline-none p-1 rounded-md text-gray-800 w-full font-medium"
            >
              <option value="">Unassign</option>
              {staff
                .filter((st) => st.isAvailable)
                .map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({(st.specialty || '').split(' ')[0] || 'Tech'})
                  </option>
                ))}
            </select>
            <button
              onClick={() => setAssigningOrderId(null)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded bg-gray-100 cursor-pointer"
            >
              <X size={10} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAssigningOrderId(order.id)}
            className="flex items-center space-x-1 text-[10px] font-bold text-gray-500 hover:text-blue-600 cursor-pointer transition border border-gray-100 px-2 py-1 rounded hover:bg-gray-50"
          >
            <Wrench size={10} />
            <span>{assignedMember ? 'Reassign' : 'Assign Tech'}</span>
          </button>
        )}

        {/* Status transition action */}
        {nextStatus && (
          <button
            onClick={() => onStatusUpdate(order.id, nextStatus)}
            className="flex items-center space-x-1 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100/60 hover:bg-blue-600 hover:text-white hover:border-blue-600 px-2.5 py-1 rounded transition cursor-pointer"
          >
            <span>Intake</span>
            <ArrowRight size={10} />
          </button>
        )}

        {order.status === 'ready' && (
          <button
            onClick={() => onStatusUpdate(order.id, 'completed')}
            className="flex items-center space-x-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-600 hover:text-white px-2.5 py-1 rounded transition cursor-pointer"
          >
            <CheckCircle size={10} />
            <span>Complete</span>
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyColumn() {
  return (
    <div className="flex flex-col items-center justify-center p-8 border border-dashed border-gray-150 rounded-xl text-center bg-gray-50/30 text-gray-400 space-y-1">
      <Check size={18} className="text-gray-300" />
      <span className="text-[11px] font-medium font-mono uppercase tracking-wider">Column Free</span>
    </div>
  );
}
