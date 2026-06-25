/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Service, Order, Staff } from '../types';
import {
  Smartphone,
  Search,
  Calendar,
  Sparkles,
  Bot,
  User,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle,
  Clock,
  ArrowRight,
  MessageSquare,
  AlertCircle,
  RefreshCw,
  Send,
} from 'lucide-react';

interface CustomerMobileAppProps {
  services: Service[];
  staff: Staff[];
  orders: Order[];
  onBookAppointment: (bookingData: any) => Promise<void>;
}

export default function CustomerMobileApp({
  services,
  staff,
  orders,
  onBookAppointment,
}: CustomerMobileAppProps) {
  // Mobile app tab: 'track' | 'book' | 'ai-chat'
  const [mobileTab, setMobileTab] = useState<'track' | 'book' | 'ai-chat'>('track');

  // Customer search lookup status
  const [searchQuery, setSearchQuery] = useState('');
  const [matchedOrder, setMatchedOrder] = useState<Order | null>(null);
  const [lookupError, setLookupError] = useState('');

  // Booking Form State
  const [bookingCategory, setBookingCategory] = useState('Device Repair');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [scheduledHours, setScheduledHours] = useState('10:30');
  const [notes, setNotes] = useState('');
  const [isBookedSuccessfully, setIsBookedSuccessfully] = useState(false);
  const [newlyBookedId, setNewlyBookedId] = useState('');
  const [bookingError, setBookingError] = useState('');

  // AI Chat Bot State
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    {
      role: 'bot',
      text: "Hello! I am 'QueueBot', your Smart SaaS Concierge. Ask me about our services, technicians, or the status of your repair!",
    },
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // Auto-fill selected service default when category shifts
  const categoryServices = services.filter((s) => s.category === bookingCategory && s.isAvailable);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError('');
    setMatchedOrder(null);

    if (!searchQuery.trim()) return;

    // Search by name, orderId, or email with safe optional checks
    const found = orders.find((o) => {
      const nameMatch = o.customerName ? o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) : false;
      const idMatch = o.id ? o.id.toLowerCase() === searchQuery.toLowerCase() : false;
      const emailMatch = o.customerEmail ? o.customerEmail.toLowerCase() === searchQuery.toLowerCase() : false;
      return nameMatch || idMatch || emailMatch;
    });

    if (found) {
      setMatchedOrder(found);
    } else {
      setLookupError('No matching in-queue order profile found. Try: Marcus Aurelius, Ada Lovelace, or Steve Jobs');
    }
  };

  const submitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError('');
    if (!customerName || !selectedServiceId) {
      setBookingError('Please fill in your name and select a service.');
      return;
    }

    const bookingPayload = {
      customerName,
      customerEmail: customerEmail || 'demo-customer@example.com',
      customerPhone: customerPhone || '+1 (555) 000-0000',
      serviceId: selectedServiceId,
      assignedStaffId: selectedStaffId || undefined,
      scheduledTime: new Date(new Date().setHours(parseInt(scheduledHours.split(':')[0]), parseInt(scheduledHours.split(':')[1]))).toISOString(),
      notes,
      status: 'pending',
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload),
      });
      const data = await res.json();
      if (data.success) {
        setIsBookedSuccessfully(true);
        const newest = data.orders[data.orders.length - 1];
        setNewlyBookedId(newest.id);
        // Instant trigger refresh back on parent
        await onBookAppointment(bookingPayload);
      } else {
        setBookingError('Could not submit booking.');
      }
    } catch (err) {
      console.error(err);
      setBookingError('Could not submit booking.');
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const userText = chatMessage;
    setChatMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setChatMessage('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/gemini/customer-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
      });
      const data = await res.json();
      setChatMessages((prev) => [...prev, { role: 'bot', text: data.reply }]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'bot', text: "I'm having trouble routing your request right now. Try check-out booking manually!" },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const resetForm = () => {
    setIsBookedSuccessfully(false);
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setSelectedServiceId('');
    setSelectedStaffId('');
    setNotes('');
    setNewlyBookedId('');
    setBookingError('');
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-slate-950 p-3 rounded-[3rem] border-[12px] border-slate-900 shadow-2xl relative select-none">
      {/* Phone notches, details and screen header */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-32 h-4.5 bg-slate-900 rounded-full z-25 flex items-center justify-center">
        <span className="w-2.5 h-2.5 rounded-full bg-slate-950 mr-8" />
        <span className="w-16 h-1 bg-slate-800 rounded-full" />
      </div>

      {/* Screen Frame */}
      <div className="bg-slate-50 rounded-[2.3rem] min-h-[580px] flex flex-col justify-between overflow-hidden relative border border-slate-800">
        {/* Status Bar */}
        <div className="bg-slate-950 text-white text-[10px] font-mono px-6 pt-3 pb-1 flex justify-between items-center select-none">
          <span>09:41</span>
          <div className="flex items-center space-x-1.5 font-sans font-bold">
            <span>5G</span>
            <span>100%</span>
          </div>
        </div>

        {/* Small simulated banner */}
        <div className="bg-blue-600 text-white py-2 px-4 shadow-sm flex items-center justify-between select-none">
          <div className="flex items-center space-x-1.5">
            <Smartphone size={13} />
            <h4 className="text-[11px] font-bold tracking-tight">QueueMaster Client PWA</h4>
          </div>
          <span className="text-[9px] bg-blue-700 font-semibold px-2 py-0.5 rounded-full font-mono uppercase">
            Simulated PWA
          </span>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[460px]">
          {/* TAB 1: LIVE LIFECYCLE ORDER TRACKER */}
          {mobileTab === 'track' && (
            <div className="space-y-4">
              <div className="text-center space-y-1 py-1">
                <h3 className="text-sm font-bold text-gray-900">Live Repair & Booking Status</h3>
                <p className="text-[11px] text-gray-500">Track task lifecycles in real-time</p>
              </div>

              {/* SEARCH TICKET */}
              <form onSubmit={handleLookup} className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Enter Name, Email or ord-XXX"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer shrink-0"
                >
                  Track
                </button>
              </form>

              {lookupError && (
                <div className="bg-amber-50 text-amber-800 border border-amber-100 p-3 rounded-xl flex items-start space-x-2 text-[11px] leading-relaxed select-text">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <p>{lookupError}</p>
                </div>
              )}

              {/* ACTIVE PROGRESS TRACKER CARDS */}
              {matchedOrder ? (
                <div className="bg-white border border-gray-150 p-4 rounded-2xl shadow-3xs space-y-4">
                  <div className="flex justify-between items-start border-b border-gray-100 pb-2.5">
                    <div>
                      <span className="font-mono text-[9px] text-gray-450 font-bold block">{matchedOrder.id}</span>
                      <h4 className="text-xs font-bold text-gray-900">
                        {services.find((s) => s.id === matchedOrder.serviceId)?.title || 'Service Repair'}
                      </h4>
                    </div>
                    <span className="text-xs font-bold text-blue-600">${matchedOrder.totalPrice}</span>
                  </div>

                  {/* STAGES BAR */}
                  <div className="space-y-3.5">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Progress Stage Model</p>

                    <div className="space-y-4">
                      {/* STAGE Pending */}
                      <StageStep
                        title="Intake & Scheduling Confirmed"
                        desc="Your slot has been recorded. Technicians are reviewing intake parameters."
                        isActive={['pending', 'in_progress', 'ready', 'completed'].includes(matchedOrder.status)}
                        isCompleted={['in_progress', 'ready', 'completed'].includes(matchedOrder.status)}
                      />

                      {/* STAGE In Progress */}
                      <StageStep
                        title="Specialist Diagnostic Active"
                        desc="Our technician is physically servicing your asset. Diagnostics and replacement parts are in process."
                        isActive={['in_progress', 'ready', 'completed'].includes(matchedOrder.status)}
                        isCompleted={['ready', 'completed'].includes(matchedOrder.status)}
                        isFlash={matchedOrder.status === 'in_progress'}
                      />

                      {/* STAGE Ready */}
                      <StageStep
                        title="Work Verification & Ready!"
                        desc="Verification audits passed. Completed and waiting in the dispatch room for your pickup."
                        isActive={['ready', 'completed'].includes(matchedOrder.status)}
                        isCompleted={['completed'].includes(matchedOrder.status)}
                        isFlash={matchedOrder.status === 'ready'}
                      />

                      {/* STAGE Completed */}
                      <StageStep
                        title="Order Handover Concluded"
                        desc="Payment processed, asset successfully collected. All logs completed."
                        isActive={matchedOrder.status === 'completed'}
                        isCompleted={matchedOrder.status === 'completed'}
                      />
                    </div>
                  </div>

                  {/* Tech specs info */}
                  {matchedOrder.assignedStaffId && (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-gray-100 flex items-center space-x-2.5 select-text">
                      <img
                        src={staff.find((st) => st.id === matchedOrder.assignedStaffId)?.imageUrl}
                        className="w-8 h-8 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="text-[10px]">
                        <p className="font-semibold text-gray-800">
                          Handled by {staff.find((st) => st.id === matchedOrder.assignedStaffId)?.name}
                        </p>
                        <p className="text-slate-500">
                          {staff.find((st) => st.id === matchedOrder.assignedStaffId)?.specialty}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-10 space-y-2 select-text text-gray-400">
                  <Clock size={32} className="mx-auto text-gray-300" />
                  <p className="text-xs font-semibold">Ready to Check Active Tracking?</p>
                  <p className="text-[10px] text-gray-500 px-6 leading-relaxed">
                    Look up with customer details to view live stage transitions. Use 'Ada Lovelace' or 'Steve Jobs' to test.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SELF CHECKOUT BOOKING PORTAL */}
          {mobileTab === 'book' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h3 className="text-sm font-bold text-gray-900">Self-Checkout Booking Slot</h3>
                <p className="text-[11px] text-gray-500">Secure available diagnostic times instantly</p>
              </div>

              {isBookedSuccessfully ? (
                <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-3xs text-center space-y-4">
                  <div className="mx-auto w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                    <CheckCircle size={24} />
                  </div>
                  <div className="space-y-1 select-text">
                    <h4 className="text-xs font-bold text-gray-900">Appointment Booked!</h4>
                    <p className="text-[10px] text-gray-550 leading-relaxed px-2">
                      Your booking has been compiled and is in our admin intake queue.
                    </p>
                    <div className="bg-slate-50 border border-slate-100 p-2 rounded-lg text-[10px] mt-2 font-mono text-gray-600">
                      Ticket ID: <span className="font-bold text-blue-600">{newlyBookedId}</span>
                    </div>
                  </div>
                  <button
                    onClick={resetForm}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2 text-xs font-bold cursor-pointer"
                  >
                    Intake Another Asset
                  </button>
                </div>
              ) : (
                <form onSubmit={submitBooking} className="space-y-3.5 text-xs">
                  {bookingError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-xl flex items-start space-x-1.5 animate-fadeIn">
                      <AlertCircle size={14} className="shrink-0 mt-0.5 text-rose-600" />
                      <span className="text-[10px] leading-tight">{bookingError}</span>
                    </div>
                  )}
                  {/* Category Selection */}
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                      Business Domain
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {['Device Repair', 'Auto Care', 'Hair & Salon'].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setBookingCategory(cat);
                            setSelectedServiceId('');
                          }}
                          className={`py-2 px-1 text-[10px] font-semibold rounded-lg border text-center transition cursor-pointer ${
                            bookingCategory === cat
                              ? 'bg-blue-50 text-blue-700 border-blue-400'
                              : 'bg-white text-gray-600 border-gray-150 hover:bg-gray-50'
                          }`}
                        >
                          {cat.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Service Offers */}
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                      Select Service Offer
                    </label>
                    <select
                      value={selectedServiceId}
                      onChange={(e) => setSelectedServiceId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none"
                      required
                    >
                      <option value="">-- Pick active service --</option>
                      {categoryServices.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title} (${s.price})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Team Specialists choice */}
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                      Preferred Specialist (Optional)
                    </label>
                    <select
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none"
                    >
                      <option value="">Assign any available expert</option>
                      {staff
                        .filter((st) => st.isAvailable)
                        .map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.name} ({(st.specialty || '').split(' ')[0] || 'Tech'})
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Scheduled clock hours */}
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                      Timeslot Target (Today/Tomorrow)
                    </label>
                    <select
                      value={scheduledHours}
                      onChange={(e) => setScheduledHours(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none font-mono text-xs"
                    >
                      <option value="09:00">09:00 AM</option>
                      <option value="10:30">10:30 AM</option>
                      <option value="12:00">12:00 PM</option>
                      <option value="13:30">01:30 PM</option>
                      <option value="15:00">03:00 PM</option>
                      <option value="16:30">04:30 PM</option>
                      <option value="18:00">06:00 PM</option>
                    </select>
                  </div>

                  {/* Customer personal details */}
                  <div className="space-y-2 pt-1 border-t border-gray-100">
                    <input
                      type="text"
                      placeholder="Your Full Name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none"
                      required
                    />
                    <input
                      type="email"
                      placeholder="Your Email (for updates)"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none"
                    />
                    <input
                      type="tel"
                      placeholder="Phone (+1 (555) 124-5555)"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none"
                    />
                    <textarea
                      placeholder="Diagnostic note context (e.g. cracked display glass)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2.5 text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <span>Submit & Enqueue Appointment</span>
                    <ArrowRight size={13} />
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: CONSULT QUEUEBOT SMART COUNSELOR */}
          {mobileTab === 'ai-chat' && (
            <div className="space-y-4 flex flex-col justify-between h-[360px]">
              <div className="text-center space-y-1">
                <h3 className="text-sm font-bold text-gray-900 flex items-center justify-center space-x-1.5">
                  <Bot size={15} className="text-indigo-600" />
                  <span>QueueBot Counselor</span>
                </h3>
                <p className="text-[11px] text-gray-500">Query active repairs & bookings in real-time</p>
              </div>

              {/* Chat Thread Container */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-3 p-1.5 bg-gray-100/50 rounded-xl max-h-[250px] min-h-[180px] border border-gray-200/40">
                {chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`p-2.5 rounded-xl text-[10px] leading-relaxed max-w-[85%] ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white ml-auto rounded-tr-none'
                        : 'bg-white text-gray-800 mr-auto shadow-2xs border border-gray-150 rounded-tl-none select-text'
                    }`}
                  >
                    {msg.text}
                  </div>
                ))}
                {chatLoading && (
                  <div className="bg-white border mr-auto p-2.5 rounded-xl text-[10px] flex items-center space-x-1.5 max-w-[85%]">
                    <RefreshCw size={11} className="animate-spin text-indigo-500" />
                    <span className="text-gray-400 font-mono">QueueBot thinking...</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleSendChat} className="flex gap-1.5 pt-1">
                <input
                  type="text"
                  placeholder="Ask QueueBot..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={chatLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 rounded-xl cursor-pointer flex items-center justify-center shrink-0 transition"
                >
                  <Send size={12} />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Navigation Tab bar */}
        <div className="bg-white border-t border-gray-150 p-2 flex justify-around select-none">
          <button
            onClick={() => setMobileTab('track')}
            className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition cursor-pointer ${
              mobileTab === 'track' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            <Search size={16} />
            <span className="text-[9px] font-bold mt-1">Live Track</span>
          </button>

          <button
            onClick={() => setMobileTab('book')}
            className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition cursor-pointer ${
              mobileTab === 'book' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            <Calendar size={16} />
            <span className="text-[9px] font-bold mt-1">Book Slot</span>
          </button>

          <button
            onClick={() => setMobileTab('ai-chat')}
            className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition cursor-pointer ${
              mobileTab === 'ai-chat' ? 'text-indigo-600 bg-indigo-50/50' : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            <Bot size={16} />
            <span className="text-[9px] font-bold mt-1">AI Chat</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* Helper stage step card */
interface StageStepProps {
  title: string;
  desc: string;
  isActive: boolean;
  isCompleted: boolean;
  isFlash?: boolean;
}

function StageStep({ title, desc, isActive, isCompleted, isFlash }: StageStepProps) {
  return (
    <div className={`flex space-x-3 text-xs select-text ${isActive ? 'opacity-100' : 'opacity-40'}`}>
      <div className="flex flex-col items-center shrink-0">
        <div
          className={`w-5 h-5 rounded-full flex items-center justify-center border-2 text-[9px] font-bold transition duration-200 ${
            isCompleted
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : isActive
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-white border-gray-300 text-gray-400'
          } ${isFlash ? 'animate-pulse ring-4 ring-blue-500/15' : ''}`}
        >
          {isCompleted ? <span className="font-sans text-[10px]">✓</span> : '●'}
        </div>
        <div className="w-[1.5px] h-10 bg-gray-200/80 mt-1" />
      </div>

      <div className="space-y-0.5">
        <h4 className={`font-semibold tracking-tight ${isFlash ? 'text-blue-600' : 'text-gray-800'}`}>
          {title}
        </h4>
        <p className="text-[10px] text-gray-500 leading-normal line-clamp-2">{desc}</p>
      </div>
    </div>
  );
}
