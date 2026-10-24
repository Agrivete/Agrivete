# Agrivet — Retail POS, FEFO Inventory & Supplier Management System

[![Next.js 15](https://img.shields.io/badge/Next.js-15.5-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.0-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-4.1-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas%208.9-green?style=flat&logo=mongodb)](https://www.mongodb.com/atlas)
[![Security Tests](https://img.shields.io/badge/Security%20Tests-37%20Passed-emerald)](https://github.com/Agrivete/Agrivete)

Enterprise-grade retail Point-of-Sale (POS), First-Expired, First-Out (FEFO) batch lot inventory, and supplier procurement system built specifically for agricultural and veterinary supply retailers.

Developed as the capstone software deliverable for **BAM-285**.

---

## 📑 Table of Contents
1. [System Architecture & Core Principles](#system-architecture--core-principles)
2. [Evaluator Demo Accounts](#evaluator-demo-accounts)
3. [Step-by-Step Local Setup Guide](#step-by-step-local-setup-guide)
4. [Testing & Zero-Drift Audit Verification](#testing--zero-drift-audit-verification)
5. [Step-by-Step Production Deployment Guide (Vercel + Atlas)](#step-by-step-production-deployment-guide-vercel--atlas)
6. [Academic Thesis Deliverables](#academic-thesis-deliverables)
7. [Repository Layout](#repository-layout)

---

## System Architecture & Core Principles

Agrivet resolves operational breakdowns common to retail agricultural counters (discrepant feed bag counts, unnoticed expired antibiotics, cost leaks to cashiers, and rural internet dropouts) through five foundational invariants:

- **Zero-Drift Atomic Inventory (`BR01`–`BR03`):** All sales stock decrements, intake increments, and inventory adjustments execute within MongoDB multi-document ACID transactions with conditional `$gte` quantity guards (`lib/inventory.js`). Stock balances can never drop below zero.
- **Commercial Financial Privacy (`BR06`):** Product purchase costs (`buyingCost`), supplier invoice totals, and profit margins are strictly redacted at the server serialization layer (`lib/sanitize.ts`) for all non-owner roles (`manager`, `staff`).
- **Proactive Shelf-Life Traceability (`BR02`, `BR05`):** Incoming veterinary biologicals, vaccines, and medicated feeds mandate manufacturer lot numbers and expiration dates on receiving intake, automatically populating a 30-day chronological FEFO advance alert schedule (`/expiration`).
- **Operational Offline Continuity (`BR08`):** Cashiers can process counter sales offline via browser IndexedDB (`lib/offlineQueue.js`); reconnecting triggers idempotent batch synchronization using unique `localId` keys (`LOCAL-<ts>-<rand>`), preventing duplicate stock decrements.
- **POS Thermal Receipt Printing:** Integrated 80mm standard thermal receipt preview with 1-click print support (`window.print()`), quick-add barcode scan lookup, and receipt reprinting for historical audits.

---

## Evaluator Demo Accounts

The database includes pre-configured, deterministic seed accounts for evaluation:

| Role | Email | Password | Access Boundary & Scope |
|---|---|---|---|
| **Platform Admin** | `admin@agrivet.local` | `admin123` | Platform custodian tier. Onboards and approves new store business registrations (`/admin/businesses`). **Strictly barred from store operational pages.** |
| **Business Owner** | `owner@agrivet.local` | `owner123` | Store proprietor tier (Agrivet Demo Store). Full operational control, product catalog CRUD, staff provisioning (`/users`), and **exclusive access to profit margins**. |
| **Store Manager** | *(Provision via `/users`)* | *(Custom)* | Daily operations lead. Can record receiving, adjust stock, and view inventory. **Buying costs and profit margins are completely redacted.** |
| **Counter Staff** | *(Provision via `/users`)* | *(Custom)* | Counter cashier. Restricted to POS sales, stock lookups, and offline sync. Cannot adjust stock or view financial costs. |

---

## Step-by-Step Local Setup Guide

Follow these steps to run Agrivet locally from scratch:

### 1. Prerequisites
- **Node.js:** v20.x or higher (Node.js 22+ recommended).
- **npm:** v10.x or higher.
- **MongoDB Atlas:** Free M0 cluster or local MongoDB instance (MongoDB 6.0+ required for multi-document ACID transactions).

### 2. Clone Repository
```bash
git clone https://github.com/Agrivete/Agrivete.git
cd Agrivete
```

### 3. Configure Environment Variables
Create a `.env.local` file in the project root:
```env
# MongoDB Atlas Connection String (with replica set enabled for transactions)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/agrivet?retryWrites=true&w=majority

# Cryptographic JWT Secret (minimum 32 characters)
JWT_SECRET=your_super_secret_cryptographic_jwt_signing_key_at_least_32_characters

# Token Lifespans
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=7d

# Application Configuration
NEXT_PUBLIC_APP_NAME=Agrivet System
NODE_ENV=development
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Seed Demonstration Database
Seed the catalog with agricultural feeds, veterinary medicines, fertilizers, suppliers, and default administrator accounts:
```bash
npm run seed
```

### 6. Start the Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## Testing & Zero-Drift Audit Verification

Agrivet includes native test runners and auditing scripts to verify security invariants and data integrity prior to defense:

### 1. Run Automated Security & RBAC Test Suite
Executes all 37 unit and integration tests covering multi-tenant tier boundaries, cost privacy redactions, NoSQL operator injection defense, and append-only ledger immutability:
```bash
npm test
```
*Expected Output:* `37 tests, 15 suites, 37 passed, 0 failed` (~600ms execution).

### 2. Run Zero-Drift Balance Reconciliation Audit (`DB-02` / `IR-08`)
Mathematically audits every product in the catalog to verify that current on-hand stock (`InventoryBalance.quantityOnHand`) matches the sum of historical movements (`InventoryMovement`):
```bash
npm run reconcile
```
*Optional Auto-Repair:* `npm run reconcile -- --fix` automatically posts audited compensating movements for any discovered drift.

### 3. Production Build Type-Check
Compiles all 41 routes with strict TypeScript validation:
```bash
npm run build
```
*Expected Output:* `✓ Generating static pages (41/41) - Compiled successfully with 0 errors.`

---

## Step-by-Step Production Deployment Guide (Vercel + Atlas)

Agrivet is designed for zero-config, highly-available deployment on **Vercel** paired with **MongoDB Atlas**:

### Step A: Configure MongoDB Atlas
1. Log in to [MongoDB Atlas](https://www.mongodb.com/atlas) and create or select an **M0 (Free)** or **M10+** cluster.
2. In **Security > Database Access**, create a database user with `readWrite` permissions on database `agrivet`.
3. In **Security > Network Access**, add IP address `0.0.0.0/0` (Allow Access from Anywhere) to permit connections from Vercel's dynamic serverless IP pool.
4. Obtain your connection string: `mongodb+srv://<user>:<password>@cluster.mongodb.net/agrivet?retryWrites=true&w=majority`.

### Step B: Deploy to Vercel
1. Log in to [Vercel](https://vercel.com) and click **"Add New Project"**.
2. Connect your GitHub account and import repository `Agrivete/Agrivete`.
3. In **Project Settings**:
   - **Framework Preset:** `Next.js`
   - **Root Directory:** `./`
4. Under **Environment Variables**, add:
   - `MONGODB_URI`: Your MongoDB Atlas URI.
   - `JWT_SECRET`: A secure, random 64-byte string.
   - `JWT_EXPIRES_IN`: `8h`
   - `JWT_REFRESH_EXPIRES_IN`: `7d`
   - `NEXT_PUBLIC_APP_NAME`: `Agrivet System`
   - `NODE_ENV`: `production`
5. Click **"Deploy"**. Vercel will build and deploy the application in ~1 minute.
6. Once deployed, run `npm run seed` locally targeting your Atlas URI (or trigger the admin initialization route) to seed the initial accounts.

---

## Academic Thesis Deliverables

The primary capstone manuscript and evaluation deliverables:

| Document | Description | Location |
|---|---|---|
| **Complete Capstone Manuscript** | Full academic thesis manuscript for BAM-285 | [`docs/BAM-285-COMPLETE-MANUSCRIPT.md`](docs/BAM-285-COMPLETE-MANUSCRIPT.md) |
| **System Security Test Suite** | 37 automated tests validating RBAC and data boundaries | [`tests/security/`](tests/security/) |
| **Zero-Drift Invariant Script** | Automated mathematical stock balance reconciliation | [`scripts/reconcile-balances.js`](scripts/reconcile-balances.js) |

---

## Repository Layout

```
agrivet-next/
├── app/                      # Next.js 15 App Router pages & API routes
│   ├── (public)/             # Landing (/), Login (/login), Register (/register)
│   ├── admin/                # Platform Admin Tier (/admin, /admin/businesses)
│   ├── dashboard/            # Executive KPI Cards & Recharts
│   ├── sales/                # POS Terminal, Quick-Add Search & Thermal Receipts
│   ├── inventory/            # Real-Time Stock Balances & Audited Adjustments
│   ├── receiving/            # Stock Intake, Supplier Linkage & Lot/Expiry Capture
│   ├── expiration/           # 30-Day Proactive FEFO Expiration Schedule
│   ├── suppliers/            # Vendor Directory & Alternative Suppliers
│   ├── replenishments/       # Purchase Orders & PO Confirmation Modals
│   ├── reports/              # PDF & CSV Binary Data Export
│   ├── settings/             # Offline Queue & Zero-Drift Reconciliation (DB-02)
│   └── users/                # Store User Provisioning (Owner Exclusive)
├── components/               # UI Primitives & POS Receipt Components
├── docs/                     # Capstone Thesis Manuscript (BAM-285)
├── lib/                      # Core Transactions, Offline Queue, Auth, & Validators
├── models/                   # Mongoose Invariants & Append-Only Schemas
├── scripts/                  # Seed, Backup, Restore, & Balance Reconciliation CLI
└── tests/                    # Automated Security & RBAC Test Suite (npm test)
```

---

## License

This software is developed and submitted for academic evaluation under the College of Information and Communications Technology, West Visayas State University (WVSU). All rights reserved.
