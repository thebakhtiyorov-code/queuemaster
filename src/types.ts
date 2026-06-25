/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'customer';
  createdAt: string;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  price: number;
  isAvailable: boolean;
  category: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  serviceId: string;
  assignedStaffId?: string; // technician Staff id
  status: 'pending' | 'in_progress' | 'ready' | 'completed';
  scheduledTime: string; // ISO Datetime string
  totalPrice: number;
  updatedAt: string; // ISO Datetime string
  notes?: string;
}

export interface Staff {
  id: string;
  name: string;
  role: 'admin' | 'staff';
  specialty: string;
  isAvailable: boolean;
  email: string;
  imageUrl?: string;
}

export interface AnalyticsSummary {
  revenueToday: number;
  revenueTotal: number;
  activeOrdersCount: number;
  readyOrdersCount: number;
  completedOrdersCount: number;
  avgDurationMinutes: number;
  dailyRevenue: { date: string; amount: number; bookings: number }[];
  servicePopularity: { name: string; value: number; revenue: number }[];
  hourlyActivity: { hour: string; count: number }[];
}
