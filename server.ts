/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import path from 'path';
import 'dotenv/config'; 
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import express from 'express';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { Service, Order, Staff, AnalyticsSummary } from './src/types';

// Endi log tekshiruvini qilsak bo'ladi, chunki dotenv allaqachon yuklandi
console.log("API Key tekshirilmoqda:", process.env.GEMINI_API_KEY ? "TOPILDI ✅" : "TOPILMADI ❌");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000; 
const DATA_FILE = path.join(process.cwd(), 'data.json');

// Utility to cleanly parse JSON returned by LLM models
function parseCleanJson(text: string): any {
  if (!text) return {};
  let cleaned = text.trim();

  // Clean markdown code blocks if any
  if (cleaned.includes('```')) {
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      cleaned = match[1].trim();
    }
  }

  // Isolate the outermost JSON object or array block
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');

  let jsonStart = -1;
  let jsonEnd = -1;

  if (firstBrace !== -1 && lastBrace !== -1) {
    if (firstBracket !== -1 && firstBracket < firstBrace && lastBracket > lastBrace) {
      jsonStart = firstBracket;
      jsonEnd = lastBracket;
    } else {
      jsonStart = firstBrace;
      jsonEnd = lastBrace;
    }
  } else if (firstBracket !== -1 && lastBracket !== -1) {
    jsonStart = firstBracket;
    jsonEnd = lastBracket;
  }

  if (jsonStart !== -1 && jsonEnd !== -1) {
    cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
  }

  return JSON.parse(cleaned);
}

// Initialize Gemini Client Lazily
let aiClient: any = null;
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Robust fallback model execution helper
async function generateContentWithFallback(ai: any, prompt: string, config?: any) {
  const models = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config,
      });
      return response;
    } catch (err: any) {
      console.log(`[AI fallback] Model ${model} was temporarily rate-limited or unavailable.`);
      lastError = err;
    }
  }

  throw lastError || new Error('All models in fallback chain failed.');
}

// ----------------------------------------------------
// HEURISTIC RULE-BASED OPTIMIZATION & CHAT FALLBACKS
// ----------------------------------------------------
function generateRuleBasedOptimization(db: DbSchema, isOfflineMode = false) {
  const activeOrders = db.orders.filter(o => o.status !== 'completed');
  
  // Calculate technician utilization
  const technicianUtilization = db.staff.map(st => {
    const listActive = activeOrders.filter(o => o.assignedStaffId === st.id);
    const count = listActive.length;
    let status: 'Busy' | 'Balanced' | 'Available' = 'Available';
    if (count >= 3) {
      status = 'Busy';
    } else if (count >= 1) {
      status = 'Balanced';
    }
    return {
      name: st.name,
      activeOrders: count,
      status
    };
  });

  // Is bottleneck detected?
  const busyStaff = technicianUtilization.filter(t => t.status === 'Busy');
  const isBottleneckDetected = busyStaff.length > 0;
  
  let bottleneckDetail = 'All queues are operating within safety parameters. Queue rates are balanced.';
  if (isBottleneckDetected) {
    const list = busyStaff.map(b => b.name).join(', ');
    bottleneckDetail = `Technician workload overload detected at: ${list}. Active diagnostic timelines may experience performance latency.`;
  }

  // Suggest actions
  const suggestedActions: any[] = [];
  
  // Find pending tasks assigned to 'Busy' staff
  const pendingWithBusyStaff = activeOrders.filter(
    o => o.status === 'pending' && o.assignedStaffId
  );

  for (const ord of pendingWithBusyStaff) {
    const currentTech = db.staff.find(s => s.id === ord.assignedStaffId);
    if (!currentTech) continue;
    
    const currentTechUtil = technicianUtilization.find(u => u.name === currentTech.name);
    if (currentTechUtil && currentTechUtil.activeOrders >= 2) {
      // Find eligible available techs
      const potentialTechs = db.staff.filter(
        st => st.id !== ord.assignedStaffId && st.isAvailable && st.role !== 'admin'
      );
      
      let bestTech = potentialTechs[0];
      let minTasks = 999;
      for (const t of potentialTechs) {
        const util = technicianUtilization.find(u => u.name === t.name);
        const activeCount = util ? util.activeOrders : 0;
        if (activeCount < minTasks) {
          minTasks = activeCount;
          bestTech = t;
        }
      }

      if (bestTech && minTasks < currentTechUtil.activeOrders) {
        suggestedActions.push({
          orderId: ord.id,
          suggestedStaffId: bestTech.id,
          reason: `Balance loading: ${bestTech.name} has fewer pending assignments (${minTasks} tasks) compared to ${currentTech.name} (${currentTechUtil.activeOrders} tasks).`
        });
      }
    }
  }

  // Suggest routing for unassigned pending tasks
  const unassignedPending = activeOrders.filter(o => o.status === 'pending' && !o.assignedStaffId);
  for (const ord of unassignedPending) {
    const service = db.services.find(s => s.id === ord.serviceId);
    if (!service) continue;
    
    // Find eligible staff
    const eligibleStaff = db.staff.filter(st => st.isAvailable && st.role !== 'admin');
    if (eligibleStaff.length > 0) {
      // Find least busy
      let bestTech = eligibleStaff[0];
      let minTasks = 999;
      for (const t of eligibleStaff) {
        const util = technicianUtilization.find(u => u.name === t.name);
        const activeCount = util ? util.activeOrders : 0;
        if (activeCount < minTasks) {
          minTasks = activeCount;
          bestTech = t;
        }
      }

      suggestedActions.push({
        orderId: ord.id,
        suggestedStaffId: bestTech.id,
        reason: `Auto-routing: Ticket ${ord.id} is unassigned. Routely route this intake slot to ${bestTech.name} to balance the load.`
      });
    }
  }

  // Create a pleasant recommendationText
  let modeNote = isOfflineMode 
    ? ' (Note: Operating in local Heuristic Rule-Based Mode. To activate full generative multi-dimensional reasoning, add a Gemini API key to Settings.)'
    : ' (AI Engine Fallback Active: Temporarily serving high-fidelity local heuristics while the live model is under heavy load.)';

  let recommendationText = `The operations queue is currently in tip-top shape. Customer diagnostics are distributed evenly among active staff.${modeNote}`;
  if (isBottleneckDetected) {
    recommendationText = `Intensive queue loads detected. We recommend re-routing non-started bookings from over-scheduled staff like ${busyStaff.map(b => b.name).join(', ')} to ensure high throughput and minimize intake delays.${modeNote}`;
  } else if (unassignedPending.length > 0) {
    recommendationText = `We detected ${unassignedPending.length} unassigned tickets awaiting intake processor. Please dispatch them to available specialists to maintain SLAs.${modeNote}`;
  }

  return {
    recommendationText,
    technicianUtilization,
    isBottleneckDetected,
    bottleneckDetail,
    suggestedActions
  };
}

function generateRuleBasedChatReply(message: string, db: DbSchema, isOfflineMode = false): string {
  const msg = message.toLowerCase();
  
  const offlineDisclaimer = isOfflineMode 
    ? ' [SaaS Smart Concierge: Operating in speed-optimized direct matching mode.]'
    : ' [SaaS Smart Concierge: Generative service currently busy; utilizing high-speed local agent fallback.]';

  // 1. Search for customer name or order number
  let foundOrder: Order | null = null;
  for (const o of db.orders) {
    const oName = o.customerName ? o.customerName.toLowerCase() : '';
    const oId = o.id ? o.id.toLowerCase() : '';
    const oEmail = o.customerEmail ? o.customerEmail.toLowerCase() : '';
    if (
      (oName && msg.includes(oName)) ||
      (oId && msg.includes(oId)) ||
      (oEmail && msg.includes(oEmail))
    ) {
      foundOrder = o;
      break;
    }
  }

  if (foundOrder) {
    const service = db.services.find(s => s.id === foundOrder!.serviceId);
    const tech = db.staff.find(st => st.id === foundOrder!.assignedStaffId);
    const statusMap: Record<string, string> = {
      pending: 'Waiting in Intake Queue (needs assignment/schedule confirmation)',
      in_progress: 'Active Diagnostic Service (our specialist is performing physical repairs)',
      ready: 'Service Complete & Verified (waiting in the dispatch room for your pickup)',
      completed: 'Handover Concluded & Paid.'
    };
    const friendlyStatus = statusMap[foundOrder.status] || foundOrder.status;
    const techText = tech ? `Specialist ${tech.name}` : 'an assigned expert';

    return `I found order #${foundOrder.id} for ${foundOrder.customerName}. Your active ${service ? service.title : 'service'} is currently in stage: "${friendlyStatus}", handled by ${techText}. ${foundOrder.status === 'ready' ? 'You can proceed to pick it up!' : 'We are finishing up as scheduled.'}${offlineDisclaimer}`;
  }

  // 2. Search for Services or Price
  if (msg.includes('service') || msg.includes('price') || msg.includes('cost') || msg.includes('diagnostic') || msg.includes('repair') || msg.includes('hair') || msg.includes('auto')) {
    const categories = Array.from(new Set(db.services.map(s => s.category)));
    const servicesList = db.services.slice(0, 4).map(s => `${s.title} ($${s.price})`).join(', ');
    return `QueueMaster centers support multiple service categories: ${categories.join(', ')}. Leading packages include: ${servicesList}. Use the "Book Slot" tab to check out live timeslots!${offlineDisclaimer}`;
  }

  // 3. Search for Staff or Technician or Expert
  if (msg.includes('staff') || msg.includes('tech') || msg.includes('expert') || msg.includes('people') || msg.includes('specialist')) {
    const staffNames = db.staff.map(s => `${s.name} (${s.specialty})`).join(', ');
    return `Our certified technician roster includes: ${staffNames}. They are fully equipped to handle advanced diagnostics.${offlineDisclaimer}`;
  }

  // 4. Default helpful guidance
  return `Hello! I am 'QueueBot', your QueueMaster concierge. I can track repair progress, list services, or check technician schedules. Try asking "What services do you have?" or tracking standard profiles like "Ada Lovelace" or "Marcus Aurelius"!${offlineDisclaimer}`;
}

// ----------------------------------------------------
// DB SETUP WITH SEED DATA
// ----------------------------------------------------
interface DbSchema {
  services: Service[];
  orders: Order[];
  staff: Staff[];
}

const defaultSeedData: DbSchema = {
  services: [
    {
      id: 'srv-1',
      title: 'OLED Screen Replacement',
      description: 'Replace cracked display glass and touch digitization layer with OEM original unit.',
      durationMinutes: 45,
      price: 149,
      isAvailable: true,
      category: 'Device Repair',
    },
    {
      id: 'srv-2',
      title: 'Full Vehicle Diagnostic Scan',
      description: 'Comprehensive digital computer OBD-II analysis of ECU, transmission, and power systems.',
      durationMinutes: 30,
      price: 59,
      isAvailable: true,
      category: 'Auto Care',
    },
    {
      id: 'srv-3',
      title: 'Precision Haircut & Trim',
      description: 'Signature hair styling with hot towel neck shave, styling pomade, and wash.',
      durationMinutes: 40,
      price: 45,
      isAvailable: true,
      category: 'Hair & Salon',
    },
    {
      id: 'srv-4',
      title: 'High-Capacity Battery Swap',
      description: 'Certified replacement of deteriorating smartphone or laptop battery, with seal renewal.',
      durationMinutes: 20,
      price: 79,
      isAvailable: true,
      category: 'Device Repair',
    },
    {
      id: 'srv-5',
      title: 'Synthetic Oil & Filter Service',
      description: 'Flush old motor lubricants and replace with Castrol synthetic blend oil and premium filter.',
      durationMinutes: 40,
      price: 89,
      isAvailable: true,
      category: 'Auto Care',
    },
    {
      id: 'srv-6',
      title: 'Aura Refreshing Hydrafacial',
      description: 'Skincare nourishment involving extraction, cleansing, exfoliation, and custom hydration.',
      durationMinutes: 50,
      price: 95,
      isAvailable: true,
      category: 'Hair & Salon',
    },
  ],
  staff: [
    {
      id: 'stf-1',
      name: 'John Doe',
      role: 'staff',
      specialty: 'Device Hardware Repair',
      isAvailable: true,
      email: 'john@queuemaster.com',
      imageUrl: 'https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?w=120&auto=format&fit=crop&q=70',
    },
    {
      id: 'stf-2',
      name: 'Sarah Connor',
      role: 'staff',
      specialty: 'Automotive Electrical & ECUs',
      isAvailable: true,
      email: 'sarah@queuemaster.com',
      imageUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=70',
    },
    {
      id: 'stf-3',
      name: 'Alex Rivera',
      role: 'staff',
      specialty: 'Cosmetology & Styling Specialist',
      isAvailable: true,
      email: 'alex@queuemaster.com',
      imageUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&auto=format&fit=crop&q=70',
    },
    {
      id: 'stf-4',
      name: 'Emily Vance',
      role: 'admin',
      specialty: 'Operations Manager & Senior Dispatcher',
      isAvailable: true,
      email: 'emily@queuemaster.com',
      imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=70',
    },
  ],
  orders: [
    {
      id: 'ord-101',
      customerId: 'cust-1',
      customerName: 'Marcus Aurelius',
      customerEmail: 'marcus@classical.org',
      customerPhone: '+1 (555) 124-5555',
      serviceId: 'srv-1',
      assignedStaffId: 'stf-1',
      status: 'in_progress',
      scheduledTime: new Date(new Date().setHours(new Date().getHours() - 1)).toISOString(),
      totalPrice: 149,
      updatedAt: new Date().toISOString(),
      notes: 'Cracked phone glass. Keep existing motherboard.',
    },
    {
      id: 'ord-102',
      customerId: 'cust-2',
      customerName: 'Ada Lovelace',
      customerEmail: 'ada@analytical.net',
      customerPhone: '+1 (555) 789-2321',
      serviceId: 'srv-2',
      assignedStaffId: 'stf-2',
      status: 'ready',
      scheduledTime: new Date(new Date().setHours(new Date().getHours() - 2)).toISOString(),
      totalPrice: 59,
      updatedAt: new Date().toISOString(),
      notes: 'Car check engine light. Diagnose O2 sensors.',
    },
    {
      id: 'ord-103',
      customerId: 'cust-3',
      customerName: 'Grace Hopper',
      customerEmail: 'grace@nanoseconds.edu',
      customerPhone: '+1 (555) 456-9911',
      serviceId: 'srv-3',
      assignedStaffId: 'stf-3',
      status: 'pending',
      scheduledTime: new Date(new Date().setHours(new Date().getHours() + 1)).toISOString(),
      totalPrice: 45,
      updatedAt: new Date().toISOString(),
      notes: 'High fade haircut appointment at 9am.',
    },
    {
      id: 'ord-104',
      customerId: 'cust-4',
      customerName: 'Alan Turing',
      customerEmail: 'alan@bletchley.gov',
      customerPhone: '+1 (555) 987-1941',
      serviceId: 'srv-4',
      assignedStaffId: 'stf-1',
      status: 'completed',
      scheduledTime: '2026-06-15T14:30:00Z',
      totalPrice: 79,
      updatedAt: '2026-06-15T15:10:00Z',
      notes: 'Laptop battery swollen. Disposed of safely.',
    },
    {
      id: 'ord-105',
      customerId: 'cust-5',
      customerName: 'Nikola Tesla',
      customerEmail: 'nikola@alternating.co',
      customerPhone: '+1 (555) 369-3693',
      serviceId: 'srv-5',
      assignedStaffId: 'stf-2',
      status: 'completed',
      scheduledTime: '2026-06-14T10:00:00Z',
      totalPrice: 89,
      updatedAt: '2026-06-14T10:45:00Z',
      notes: 'Synthetic premium replacement pack and filter wash.',
    },
    {
      id: 'ord-106',
      customerId: 'cust-6',
      customerName: 'Katherine Johnson',
      customerEmail: 'katherine@nasa.gov',
      customerPhone: '+1 (555) 111-2222',
      serviceId: 'srv-6',
      assignedStaffId: 'stf-3',
      status: 'completed',
      scheduledTime: '2026-06-15T11:00:00Z',
      totalPrice: 95,
      updatedAt: '2026-06-15T11:55:00Z',
      notes: 'Requested organic skin cooling spray.',
    },
    {
      id: 'ord-107',
      customerId: 'cust-7',
      customerName: 'Marie Curie',
      customerEmail: 'marie@radium.paris',
      customerPhone: '+1 (555) 888-9999',
      serviceId: 'srv-1',
      assignedStaffId: 'stf-1',
      status: 'completed',
      scheduledTime: '2026-06-13T16:00:00Z',
      totalPrice: 149,
      updatedAt: '2026-06-13T17:15:00Z',
    },
    {
      id: 'ord-108',
      customerId: 'cust-8',
      customerName: 'Steve Jobs',
      customerEmail: 'steve@apple.com',
      customerPhone: '+1 (555) 800-1984',
      serviceId: 'srv-4',
      assignedStaffId: 'stf-1',
      status: 'pending',
      scheduledTime: new Date(new Date().setHours(new Date().getHours() + 3)).toISOString(),
      totalPrice: 79,
      updatedAt: new Date().toISOString(),
      notes: 'iPad Battery refresh. Must check sleep sensor.',
    },
    {
      id: 'ord-109',
      customerId: 'cust-9',
      customerName: 'Richard Feynman',
      customerEmail: 'feynman@caltech.edu',
      customerPhone: '+1 (555) 303-3030',
      serviceId: 'srv-5',
      assignedStaffId: 'stf-2',
      status: 'completed',
      scheduledTime: '2026-06-12T09:30:00Z',
      totalPrice: 89,
      updatedAt: '2026-06-12T10:10:00Z',
    }
  ],
};

// Database utility functions
function readDb(): DbSchema {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(defaultSeedData, null, 2));
      return defaultSeedData;
    }
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to read database, falling back to seed memory data', error);
    return defaultSeedData;
  }
}

function writeDb(data: DbSchema) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Failed to write database file', error);
  }
}

// Ensure the DB exists on boot
readDb();

// ----------------------------------------------------
// EXPRESS API ENDPOINTS
// ----------------------------------------------------
app.use(express.json());

// Services APIs
app.get('/api/services', (req, res) => {
  const db = readDb();
  res.json(db.services);
});

app.post('/api/services', (req, res) => {
  const db = readDb();
  const serviceData = req.body;
  if (!serviceData.title || !serviceData.price) {
    return res.status(400).json({ error: 'Title and Price are required' });
  }

  if (serviceData.id) {
    // Edit
    const index = db.services.findIndex((s) => s.id === serviceData.id);
    if (index !== -1) {
      db.services[index] = { ...db.services[index], ...serviceData };
    } else {
      return res.status(404).json({ error: 'Service not found' });
    }
  } else {
    // Create
    const newService: Service = {
      ...serviceData,
      id: `srv-${Date.now().toString().slice(-4)}`,
      isAvailable: serviceData.isAvailable !== undefined ? serviceData.isAvailable : true,
    };
    db.services.push(newService);
  }
  writeDb(db);
  res.json({ success: true, services: db.services });
});

app.delete('/api/services/:id', (req, res) => {
  const db = readDb();
  db.services = db.services.filter((s) => s.id !== req.params.id);
  writeDb(db);
  res.json({ success: true, services: db.services });
});

// Staff APIs
app.get('/api/staff', (req, res) => {
  const db = readDb();
  res.json(db.staff);
});

app.post('/api/staff', (req, res) => {
  const db = readDb();
  const staffData = req.body;
  if (!staffData.name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  if (staffData.id) {
    // Edit
    const index = db.staff.findIndex((s) => s.id === staffData.id);
    if (index !== -1) {
      db.staff[index] = { ...db.staff[index], ...staffData };
    } else {
      return res.status(404).json({ error: 'Staff member not found' });
    }
  } else {
    // Create
    const newStaff: Staff = {
      ...staffData,
      id: `stf-${Date.now().toString().slice(-4)}`,
      isAvailable: staffData.isAvailable !== undefined ? staffData.isAvailable : true,
      role: staffData.role || 'staff',
    };
    db.staff.push(newStaff);
  }
  writeDb(db);
  res.json({ success: true, staff: db.staff });
});

app.delete('/api/staff/:id', (req, res) => {
  const db = readDb();
  db.staff = db.staff.filter((s) => s.id !== req.params.id);
  writeDb(db);
  res.json({ success: true, staff: db.staff });
});

// Orders APIs
app.get('/api/orders', (req, res) => {
  const db = readDb();
  res.json(db.orders);
});

// Create or update order
app.post('/api/orders', (req, res) => {
  const db = readDb();
  const orderData = req.body;

  if (!orderData.customerName || !orderData.serviceId) {
    return res.status(400).json({ error: 'Customer Name and Service ID are required.' });
  }

  const selectedService = db.services.find((s) => s.id === orderData.serviceId);
  const totalPrice = selectedService ? selectedService.price : 45;

  if (orderData.id) {
    // Edit existing
    const index = db.orders.findIndex((o) => o.id === orderData.id);
    if (index !== -1) {
      db.orders[index] = {
        ...db.orders[index],
        ...orderData,
        totalPrice: totalPrice,
        updatedAt: new Date().toISOString(),
      };
    } else {
      return res.status(404).json({ error: 'Order not found' });
    }
  } else {
    // Create new booking
    const newOrder: Order = {
      id: `ord-${Math.floor(100 + Math.random() * 900)}`,
      customerId: orderData.customerId || `cust-${Date.now().toString().slice(-4)}`,
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail || 'demo-customer@example.com',
      customerPhone: orderData.customerPhone || '+1 (555) 000-0000',
      serviceId: orderData.serviceId,
      assignedStaffId: orderData.assignedStaffId || undefined,
      status: orderData.status || 'pending',
      scheduledTime: orderData.scheduledTime || new Date().toISOString(),
      totalPrice: totalPrice,
      updatedAt: new Date().toISOString(),
      notes: orderData.notes || '',
    };
    db.orders.push(newOrder);
  }
  writeDb(db);
  res.json({ success: true, orders: db.orders });
});

// Update single order's status
app.post('/api/orders/:id/status', (req, res) => {
  const db = readDb();
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  const index = db.orders.findIndex((o) => o.id === req.params.id);
  if (index !== -1) {
    db.orders[index].status = status;
    db.orders[index].updatedAt = new Date().toISOString();
    writeDb(db);
    return res.json({ success: true, order: db.orders[index] });
  }
  res.status(404).json({ error: 'Order not found' });
});

// Assign staff
app.post('/api/orders/:id/assign', (req, res) => {
  const db = readDb();
  const { assignedStaffId } = req.body;

  const index = db.orders.findIndex((o) => o.id === req.params.id);
  if (index !== -1) {
    db.orders[index].assignedStaffId = assignedStaffId || undefined;
    db.orders[index].updatedAt = new Date().toISOString();
    writeDb(db);
    return res.json({ success: true, order: db.orders[index] });
  }
  res.status(404).json({ error: 'Order not found' });
});

// ----------------------------------------------------
// ANALYTICS CALCULATION API
// ----------------------------------------------------
app.get('/api/analytics', (req, res) => {
  const db = readDb();
  const orders = db.orders;
  const services = db.services;

  // Calculate high-level values
  const todayStr = new Date().toISOString().split('T')[0];

  let revenueToday = 0;
  let revenueTotal = 0;
  let activeCount = 0;
  let readyCount = 0;
  let completedCount = 0;

  orders.forEach((o) => {
    if (o.status === 'completed') {
      revenueTotal += o.totalPrice;
      completedCount++;
      const orderDateStr = o.updatedAt.split('T')[0];
      if (orderDateStr === todayStr) {
        revenueToday += o.totalPrice;
      }
    } else if (o.status === 'in_progress') {
      activeCount++;
    } else if (o.status === 'ready') {
      readyCount++;
    }
  });

  // Calculate average duration
  const activeSrvs = orders.map((o) => services.find((s) => s.id === o.serviceId)).filter(Boolean);
  const totalMinutes = activeSrvs.reduce((acc, s) => acc + (s?.durationMinutes || 30), 0);
  const avgDurationMinutes = activeSrvs.length > 0 ? Math.round(totalMinutes / activeSrvs.length) : 35;

  // Group revenue by date (last 7 days)
  const last7Days: { [date: string]: { amount: number; bookings: number } } = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split('T')[0];
    last7Days[dateKey] = { amount: 0, bookings: 0 };
  }

  orders.forEach((o) => {
    if (o.status === 'completed') {
      const oDate = o.updatedAt.split('T')[0];
      if (last7Days[oDate] !== undefined) {
        last7Days[oDate].amount += o.totalPrice;
        last7Days[oDate].bookings += 1;
      }
    }
  });

  const dailyRevenue = Object.keys(last7Days).map((date) => {
    const [_, m, d] = date.split('-');
    return {
      date: `${m}/${d}`,
      amount: last7Days[date].amount,
      bookings: last7Days[date].bookings,
    };
  });

  // Service popularity breakdown
  const serviceStats: { [name: string]: { count: number; revenue: number } } = {};
  orders.forEach((o) => {
    const srv = services.find((s) => s.id === o.serviceId);
    if (srv) {
      if (!serviceStats[srv.title]) {
        serviceStats[srv.title] = { count: 0, revenue: 0 };
      }
      serviceStats[srv.title].count += 1;
      serviceStats[srv.title].revenue += o.totalPrice;
    }
  });

  const servicePopularity = Object.keys(serviceStats).map((name) => ({
    name,
    value: serviceStats[name].count,
    revenue: serviceStats[name].revenue,
  }));

  // Hourly Activity - peak density load
  // We'll generate a peak business hours distribution representing order check-ins
  const hourBuckets: { [hour: string]: number } = {
    '08:00': 0, '10:00': 0, '12:00': 0, '14:00': 0, '16:00': 0, '18:00': 0, '20:00': 0,
  };

  orders.forEach((o) => {
    const schedDate = new Date(o.scheduledTime);
    const hour = schedDate.getHours();
    if (hour >= 8 && hour < 10) hourBuckets['08:00']++;
    else if (hour >= 10 && hour < 12) hourBuckets['10:00']++;
    else if (hour >= 12 && hour < 14) hourBuckets['12:00']++;
    else if (hour >= 14 && hour < 16) hourBuckets['14:00']++;
    else if (hour >= 16 && hour < 18) hourBuckets['16:00']++;
    else if (hour >= 18 && hour < 20) hourBuckets['18:00']++;
    else if (hour >= 20) hourBuckets['20:00']++;
  });

  const hourlyActivity = Object.keys(hourBuckets).map((hour) => ({
    hour,
    count: hourBuckets[hour],
  }));

  const summary: AnalyticsSummary = {
    revenueToday,
    revenueTotal,
    activeOrdersCount: activeCount,
    readyOrdersCount: readyCount,
    completedOrdersCount: completedCount,
    avgDurationMinutes,
    dailyRevenue,
    servicePopularity,
    hourlyActivity,
  };

  res.json(summary);
});

// ----------------------------------------------------
// AI GEMINI SERVICES (Optimization & Booking Chatbot)
// ----------------------------------------------------
app.post('/api/gemini/optimize', async (req, res) => {
  const db = readDb();
  const ai = getGeminiClient();

  if (!ai) {
    const fallbackResults = generateRuleBasedOptimization(db, true);
    return res.json(fallbackResults);
  }

  try {
    const prompt = `
You are the QueueMaster AI Scheduling Engine. 
Below are the services, the technicians (staff), and the current active queue status (orders that are pending, in progress, or ready).
Your task is to analyze current technician workloads and suggest optimizations, warnings (e.g. overloads, bottlenecks), scheduling recommendations, and automated assignment plans.

DATA AND CURRENT QUEUE STATUS:
${JSON.stringify({ staff: db.staff, services: db.services, orders: db.orders.filter(o => o.status !== 'completed') }, null, 2)}

Provide your output strictly in a formatted JSON structure:
{
  "recommendationText": "A detailed human-written paragraph summarizing queue health, staff loading, and quick action ideas.",
  "technicianUtilization": [
     { "name": "staff member name", "activeOrders": 2, "status": "Busy" | "Balanced"| "Available" }
  ],
  "isBottleneckDetected": true/false,
  "bottleneckDetail": "Description of any delays or bottleneck services",
  "suggestedActions": [
     { "orderId": "order ID", "suggestedStaffId": "staff ID to swap to", "reason": "why swap is recommended" }
  ]
}
Return only valid JSON. Do not include markdown code block syntax inside your returned text, or if you do, wrap it cleanly.
`;

    const optimizeConfig = {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          recommendationText: {
            type: Type.STRING,
            description: 'A detailed summary paragraph explaining queue health, tech load, and ideas.',
          },
          technicianUtilization: {
            type: Type.ARRAY,
            description: 'Utilization list for all technicans.',
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                activeOrders: { type: Type.INTEGER },
                status: { type: Type.STRING },
              },
              required: ['name', 'activeOrders', 'status'],
            },
          },
          isBottleneckDetected: {
            type: Type.BOOLEAN,
            description: 'True if there are overload bottlenecks.',
          },
          bottleneckDetail: {
            type: Type.STRING,
            description: 'Details of any bottleneck.',
          },
          suggestedActions: {
            type: Type.ARRAY,
            description: 'List of specific staff reassignments or actions.',
            items: {
              type: Type.OBJECT,
              properties: {
                orderId: { type: Type.STRING },
                suggestedStaffId: { type: Type.STRING },
                reason: { type: Type.STRING },
              },
              required: ['orderId', 'suggestedStaffId', 'reason'],
            },
          },
        },
        required: [
          'recommendationText',
          'technicianUtilization',
          'isBottleneckDetected',
          'bottleneckDetail',
          'suggestedActions',
        ],
      },
    };

    const response = await generateContentWithFallback(ai, prompt, optimizeConfig);

    const parsedData = parseCleanJson(response.text || '{}');
    res.json(parsedData);
  } catch (error: any) {
    console.log('[AI fallback] Gemini Optimization model is temporarily busy or unavailable; operating in fallback rule-based heuristics.');
    const fallbackResults = generateRuleBasedOptimization(db, false);
    res.json(fallbackResults);
  }
});

// Customer Interactive Booking & Inquiry Assistant
app.post('/api/gemini/customer-chat', async (req, res) => {
  const { message } = req.body;
  const db = readDb();
  const ai = getGeminiClient();

  if (!ai) {
    const chatReply = generateRuleBasedChatReply(message, db, true);
    return res.json({ reply: chatReply });
  }

  try {
    const prompt = `
You are 'QueueBot', the voice of QueueMaster Smart Business Assistant for a business offering Device Repair, Auto Care, and Hair/Salon packages. 
You can help customers:
1. Inquire about available services & prices.
2. Check the real-time lifecycle progress of their order if they mention their name or order numbers.
3. Guide them to select a technician.

THE SYSTEM DATA FOR REFERENCE:
Services Available:
${db.services.map(s => `- ${s.title} (${s.category}): $${s.price}, takes ${s.durationMinutes} mins`).join('\n')}

Active Technicians:
${db.staff.map(st => `- ${st.name}: specialist in ${st.specialty} (${st.isAvailable ? 'Available' : 'Unavailable'})`).join('\n')}

Active In-Flight Orders and Bookings:
${db.orders.map(o => `Order ${o.id}: for ${o.customerName}, Service: ${o.serviceId}, Tech: ${o.assignedStaffId || 'Unassigned'}, Current Status: ${o.status}, Scheduled: ${o.scheduledTime}`).join('\n')}

INSTRUCTIONS:
- Answer in a supportive, polite, and brief manner.
- If they ask about the status of their repair, search the list above (e.g., matching Ada Lovelace or Marcus Aurelius) and report the exact current state clearly ("Your device screen replacement is currently In Progress / Ready for pickup!").
- Keep replies within 3 sentences for easy mobile readability.

Customer Chat Message: "${message}"
`;

    const response = await generateContentWithFallback(ai, prompt);

    res.json({ reply: response.text });
  } catch (error: any) {
    console.log('[AI fallback] Customer assistant chat model temporarily unavailable; gracefully falling back to offline rule-based agent.');
    const chatReply = generateRuleBasedChatReply(message, db, false);
    res.json({ reply: chatReply });
  }
});


// ----------------------------------------------------
// VITE INTEGRATION / STATIC SERVING
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    // Mount Vite middleware
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`QueueMaster server booted on http://localhost:${PORT}`);
  });
}

startServer();
