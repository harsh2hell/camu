# DBS Global University Portal (Camu-Next) 🎓
> High-performance, modern in-house academic ERP, student portal, and faculty suite built as an alternative to legacy MyCamu for DBS Global University (Dehradun).

[![Author: Harendra Pratap Singh](https://img.shields.io/badge/Author-Harendra%20Pratap%20Singh-blue?style=for-the-badge)](https://github.com/harsh2hell)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-purple?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)

---

## 🌟 Overview & Core Motivations
Universities relying on legacy MyCamu frequently suffer from slow page load times, session timeouts, rigid attendance calculators, and complex multi-step OD/leave approvals. 

**Camu-Next** reimagines the university ERP experience from first principles:
- **Instant Latency:** Sub-100ms client and SSR interactions.
- **Role-Based Access (RBAC):** Switch seamlessly between Student and Faculty/Staff dashboards.
- **Zero App Store Barrier:** PWA-ready web application designed for mobile phones and desktops alike.

---

## 🚀 Key Modules & Features

### 1. Attendance & 75% Bunk Simulator 🧮
- **Mathematical Safety Calculator:** Students can simulate *"What if I miss $X$ classes?"* or *"How many classes must I attend to cross 75%?"* before skipping.
- **Subject-Wise Analytics:** Real-time percentage tracking factoring in conducted lectures, attended classes, and official university On-Duty (OD) credits.

### 2. 1-Click Faculty Attendance Marker ⚡
- Replaces the 10-minute roll-call process with a single **"Mark All Present"** button.
- 1-click state toggling (`PRESENT` &rarr; `ABSENT` &rarr; `ON_DUTY`).
- Live defaulter flags highlighting students falling below the 75% debarment threshold.

### 3. Digital Hostel Gate Pass & Security QR 🚪
- Dynamic animated security QR code with curfew countdown timer (*"Return by 08:30 PM"*).
- Instant Day Outing and Home Visit applications with automated parent mobile SMS verification simulation.
- Audit trail for campus security gate checkpoints.

### 4. Continuous Evaluation & Gradebook (CIA) 📊
- Sessional 1 (20) + Mid-Term (30) + Sessional 2 (20) internal grading matrix (70% weightage).
- Credit-weighted projected **SGPA** and **CGPA** calculator.
- Downloadable semester grade transcripts.

### 5. Fee Ledger & No-Dues Clearance 💳
- Category breakdown for Tuition, Lab, Hostel, and Examination fees.
- 1-Click UPI/Card clearance simulator.
- Official PDF receipt generator with university cryptographic seal.
- Automated No-Dues clearance certificate for exam hall ticket release.

### 6. On-Duty (OD) & Leave Pipeline 📝
- Streamlined 2-tier approval workflow (Faculty Mentor &rarr; Department HOD) for hackathons, sports tournaments, and medical exemptions.

---

## 🏗️ Architecture & Database Schemas
- **PostgreSQL DDL & Composite Indexes:** [`docs/database/schema.sql`](./docs/database/schema.sql)
- **Prisma ORM Schema:** [`docs/database/schema.prisma`](./docs/database/schema.prisma)
- **Technical Architecture Document:** [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)

---

## 🛠️ Getting Started Locally

```bash
# Clone the repository
git clone https://github.com/harsh2hell/camu.git

# Navigate into the project directory
cd camu

# Install dependencies
npm install

# Start the local development server
npm run dev

# Build production bundle
npm run build
```

---

## 👤 Author & Team
**Harendra Pratap Singh** ([@harsh2hell](https://github.com/harsh2hell))  
*DBS Global University (Dehradun)*  
Email: [harendrapratap5828@gmail.com](mailto:harendrapratap5828@gmail.com) / [harendra.0251btcs097@dgu.ac.in](mailto:harendra.0251btcs097@dgu.ac.in)
