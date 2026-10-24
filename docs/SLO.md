# Agrivet: Service Level Objectives (SLO) & Reliability Matrix
**Document ID:** `SD-03-SLO`  
**Standard:** `SD-03` / `SD-04`  
**Owning Agent:** `systemsdesignagent.md` (`SD`)  
**Status:** `Approved`  
**Target Environment:** Vercel Serverless (Region: `sin1` Singapore) + MongoDB Atlas Replica Set

---

## 1. High-Level Availability & Durability Objectives

| Service Objective | Target Target | Permissible Error Budget | Measurement Source |
|---|---|---|---|
| **System Availability** | **99.9%** (Three Nines) | 43.8 minutes downtime / month | Vercel Function Uptime & Status Checks |
| **Recovery Point Objective (RPO)** | **< 1 hour** | Max 1 hour of transaction drift | MongoDB Atlas Automated Continuous Backups |
| **Recovery Time Objective (RTO)** | **< 2 hours** | Full catalog and balance restoration | Verified via [`scripts/restore.js`](../scripts/restore.js) |
| **Zero-Drift Data Integrity** | **100.0%** (0 Discrepancy) | 0 uncompensated stock drift | [`GET /api/admin/reconcile`](../app/api/admin/reconcile/route.ts) |

---

## 2. Latency & Throughput Performance Budgets

Measured end-to-end under representative rural Philippine 3G/4G cellular latency (~80ms RTT) and Vercel serverless execution (`sin1` Singapore):

| User Journey / Operation | p50 (Median) | p95 Budget | p99 Budget | Peak Throughput Target | Capacity Model & Measurement |
|---|---|---|---|---|---|
| **POS Product Search / Scan** | < 45 ms | < 120 ms | < 250 ms | 60 requests / sec | In-memory client cache (`products`) + compound text index |
| **Atomic POS Checkout** | < 180 ms | < 450 ms | < 850 ms | 25 transactions / sec | MongoDB multi-document ACID transaction (`w: majority`) |
| **FEFO Expiry Alert Query** | < 65 ms | < 180 ms | < 350 ms | 15 requests / sec | Compound index `(businessName, expirationDate)` |
| **Offline Sync Batch Upload (25 items)** | < 350 ms | < 900 ms | < 1,500 ms | 10 batches / sec | Idempotent bulk insertion with localId deduplication |
| **Daily Report PDF Streaming** | < 450 ms | < 1,200 ms | < 2,000 ms | 5 exports / sec | Serverless PDFKit streaming response (`/api/reports`) |

---

## 3. Capacity & Scaling Model

- **Store Capacity Baseline:** Designed for 50 concurrent independent store tenants, 1,000 transactions/day per store, and ~5 items per checkout basket.
- **Connection Pool Sizing:** MongoDB connection pool capped at `maxPoolSize: 10` per serverless function instance ([`lib/mongodb.js`](../lib/mongodb.js)) to prevent Atlas M0/M10 connection exhaustion.
- **Storage Projections:** 
  - Each `Sale` document averages ~1.2 KB.
  - 1,000 sales/day = ~1.2 MB/day = ~438 MB/year per store, easily fitting within standard Atlas tiers without sharding.

