# 🚀 QueueMaster: Smart Booking, Order Lifecycle & Queue SaaS

**QueueMaster** — xizmat ko'rsatish markazlari, servis provayderlari va mijozlar oqimini boshqarishga mo'ljallangan zamonaviy, real-vaqt rejimida (real-time) ishlovchi SaaS platformasi. Loyiha administratorlar uchun kuchli boshqaruv paneli (Admin Dashboard) va mijozlar uchun qulay interaktiv veb-ilovadan (Client PWA) tashkil topgan.

---

## ✨ Loyihaning Asosiy Imkoniyatlari (Features)

### 📊 1. Admin Dashboard (Boshqaruv Paneli)
* **SaaS Analytics Hub:** Markazning umumiy daromadi, faol navbatlar, band qilingan vaqtlar va xizmat unumdorligini ko'rsatuvchi interaktiv grafiklar (Charts).
* **Live Kanban Board:** Buyurtmalarning butun hayotiy siklini (*Awaiting Intake -> Repairs Active -> Ready for Pickup*) real vaqt rejimida kuzatish va "Drag-and-Drop" orqali boshqarish.
* **Technician & Service Management:** Yangi ustalarni qo'shish, ularning bandlik holatini kuzatish va taqdim etilayotgan xizmatlar ro'yxatini boshqarish.

### 🤖 2. QueueBot Counselor & Client PWA (Mijozlar Bo'limi)
* **Interactive AI Chat-Bot:** Mijozlar o'ng tomondagi interaktiv chat-bot orqali xizmat turini va mutaxassisni osongina tanlashlari mumkin.
* **Gemini Smart Queue Optimizer:** Navbatlarni optimallashtirish va mijozlarga eng mos vaqt va mutaxassisni tavsiya etish uchun integratsiya qilingan aqlli tizim.
* **Real-time Validation & Alerts:** Buyurtma berish jarayonida xatoliklarning oldini oluvchi va mijozni navbati kelganda ogohlantiruvchi aqlli interfeys.

---

## 🛠 Texnologiyalar Strukturasi (Tech Stack)

### Frontend (Mijoz & Admin qismi)
* **Next.js / React** — Yuqori tezlik va barqarorlik uchun.
* **Tailwind CSS** — Zamonaviy va moslashuvchan (responsive) UI dizayn.
* **Lucide React** — Chiroyli va minimalistik piktogrammalar (icons) to'plami.

### Backend & Ma'lumotlar Bazasi
* **Node.js & TypeScript** — Xavfsiz va kengayuvchan backend arxitekturasi.
* **Supabase** — Real-time ma'lumotlar almashinuvi va foydalanuvchilar bazasi.
* **Render / Netlify** — Loyihani bulutli platformalarga (Cloud) muvaffaqiyatli yuklash uchun.

---

## 🚀 Loyihani Mahalliy Kompyuterda Ishga Tushirish (Installation)

### 1. Loyihani yuklab olish (Clone)
```bash
git clone [https://github.com/username/queuemaster.git](https://github.com/username/queuemaster.git)
cd queuemaster