# ADR 001: CAP / PACELC Architectural Split — AP Offline Outbox vs. CP Inventory Ledger
**Document ID:** `ADR-001`  
**Status:** `Approved`  
**Date:** 2026-10-24  
**Author:** Systems Design Agent (`SD`), DBA Agent (`DB`), Integration Agent (`IR`)  
**Related Rules:** `SD-01`, `SD-02`, `DB-02`, `DB-09`, `IR-03`, `BR01`, `BR08`

---

## 1. Context & Problem Statement

Agrivet serves agricultural and veterinary supply retailers operating in rural municipalities across the Philippines. Counter connectivity is intermittent and subject to frequent local ISP dropouts and power disruptions. 

At the same time, inventory count drift and negative stock balances are critical business hazards: allowing two disconnected terminals to decrement stock into negative numbers or blindly overwriting stock balances compromises physical auditability and violates BIR/regulatory inventory record standards.

A single naive consistency model cannot solve both requirements:
- If the system is strictly CP everywhere, cashier checkout freezes whenever internet connectivity drops.
- If the system is strictly AP with naive Last-Write-Wins (LWW) everywhere, stock counts experience drift, overselling occurs, and negative balances accumulate.

---

## 2. Decision & Architecture Split

We explicitly split the application workflows along PACELC / CAP boundaries:

```
                                  AGRIVET ARCHITECTURE
                                           │
         ┌─────────────────────────────────┴─────────────────────────────────┐
         ▼                                                                   ▼
   OFFLINE CHECKOUT                                                  INVENTORY MUTATIONS
    (Counter POS)                                                      (Server Primary)
         │                                                                   │
    CAP Model: AP                                                       CAP Model: CP
   PACELC: PA / EL                                                     PACELC: PC / EC
         │                                                                   │
• Browser IndexedDB outbox                                          • MongoDB Primary Authoritative
• Local ID (LOCAL-<ts>-<rand>)                                      • Write Concern: w: majority
• Non-blocking cashier checkout                                     • Multi-document ACID Transaction
• Invariant: Queued locally                                         • Conditional guard: $gte: quantity
```

### 2.1 POS Counter Checkout: AP (Availability + Partition Tolerance)
- Counter checkout is **AP by invariant**. When the store is disconnected, cashiers can continue to ring up customer sales without interruption.
- The browser persists the sale to client-side IndexedDB (`lib/offlineQueue.js`) with an immutable client ID (`localId`).
- The user interface renders an `offline` badge, reassuring the cashier that the sale is saved safely and will sync upon reconnection.

### 2.2 Server Inventory Ledger: CP (Consistency + Partition Tolerance)
- All stock increments, decrements, adjustments, and receiving confirmations are strictly **CP**.
- When online transactions or offline sync batches are submitted to the server, they execute inside MongoDB multi-document ACID transactions with snapshot isolation and `w: majority` write concern.
- Decrements use an atomic condition: `quantityOnHand: { $gte: -quantityChange }`.

### 2.3 Reconciliation of Disconnected Sales
- If an offline sale arrives at `/api/sync` and sufficient stock exists, the sale commits atomically.
- If insufficient stock exists (e.g., an item was sold concurrently on another terminal before connection was restored), the transaction is **flagged for owner review** or **rejected** (`IR-04`). Stock is **never silently decremented below zero**.

---

## 3. Alternatives Considered

1. **Strict CP Everywhere (Two-Phase Commit / Central Lock):**
   - *Rejected:* Freezes the checkout counter whenever rural 3G/4G connectivity drops. In a retail store, customers in physical queues will walk away if the register cannot generate an invoice.
2. **Strict AP Everywhere with Last-Write-Wins (LWW):**
   - *Rejected:* Caused inventory count discrepancies in legacy spreadsheet and standalone POS systems. Overwriting stock leads to unrecorded shrinkage and false financial reporting.
3. **CRDT (Conflict-Free Replicated Data Types) for Stock:**
   - *Rejected:* Positive-only PN-Counters cannot enforce non-negative stock invariants without coordinate reservation, which adds prohibitive complexity for a retail store setup.

---

## 4. Consequences & Verification

- **Positive:**
  - Cashier checkout continues uninterrupted regardless of internet status.
  - On-hand stock balances never drop below zero on the authoritative primary server.
  - Zero inventory drift is mathematically verified via `npm run reconcile` (`DB-02`).
- **Review Trigger:**
  - If multi-store inventory transfers across different physical branches are introduced in Phase 3 enterprise expansion.

