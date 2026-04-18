# Backend Audit Report

## Scope

- Backend only: `Prisma`, server actions, auth/permissions, treasury, invoice/return flows, reset/seed/wipe scripts.
- No UI/UX review.
- This is a static code audit; no runtime tests or database execution were performed.

## Executive Summary

- The system is functionally rich, but the highest-risk problems are structural rather than cosmetic.
- The main risk is **data drift** between `Product.currentStock`, `TreasurySafe/TreasuryBank.balance`, and the accounting ledger in `JournalEntry`/`JournalItem`.
- A second major risk is **manual sequential numbering** for invoices, returns, and journal entries, which is vulnerable to concurrency collisions.
- A third major risk is **destructive reset/wipe scripts** that can remove core accounting structure, not just transactional history.
- A fourth major risk is **inconsistent authorization coverage**: some highly sensitive actions check permissions correctly, but others do not.

## Severity Summary

- High: 8 findings
- Medium: 6 findings
- Low: 4 findings

## High-Risk Findings

### 1. Treasury balances have two sources of truth

- Files:
  - `src/app/(dashboard)/treasury/actions.tsx`
  - `src/app/(dashboard)/sales-invoices/actions.tsx`
  - `src/app/(dashboard)/purchase-invoices/actions.ts`
  - `src/app/(dashboard)/sales-returns/actions.tsx`
  - `src/app/(dashboard)/purchase-returns/actions.tsx`
- Problem:
  - The code updates `TreasurySafe.balance` and `TreasuryBank.balance` directly inside business actions.
  - Treasury screens also recompute balances from `account.journalItems` and override displayed balance with `debit - credit`.
- Impact:
  - If any action updates only one side, the UI and ledger will disagree.
  - Historical data corrections become difficult because persisted balance and computed balance can diverge silently.
- Recommendation:
  - Choose one source of truth.
  - Preferred: ledger-derived balance for correctness, with optional cached/materialized balance for performance.
  - If keeping `balance`, add reconciliation jobs and enforce that every treasury-affecting action creates journal entries and balance mutations together through one shared service.

### 2. Journal entry numbers are generated with `max + 1`

- Files:
  - `src/app/(dashboard)/sales-invoices/actions.tsx`
  - `src/app/(dashboard)/purchase-invoices/actions.ts`
  - `src/app/(dashboard)/sales-returns/actions.tsx`
  - `src/app/(dashboard)/purchase-returns/actions.tsx`
  - `src/app/(dashboard)/treasury/actions.tsx`
  - `src/app/actions/journal.ts`
  - `src/app/(dashboard)/treasury/payment-voucher/actions.tsx`
- Problem:
  - `findFirst({ orderBy: { entryNumber: "desc" } })` then `+1` is used repeatedly.
- Impact:
  - Two concurrent requests can generate the same `entryNumber`, causing unique constraint failures or inconsistent user behavior.
- Recommendation:
  - Move numbering to a DB-backed sequence or dedicated counter table with transactional locking.
  - Apply the same fix to `invoiceNumber` and `returnNumber` generation where auto-numbering is used.

### 3. Sales invoice update sends duplicate alerts

- File:
  - `src/app/(dashboard)/sales-invoices/actions.tsx`
- Problem:
  - `pendingAlerts` are fired twice in `updateSalesInvoice()`.
- Impact:
  - Duplicate notifications for stock/treasury events.
  - No accounting corruption, but noisy operational behavior and misleading alert history.
- Recommendation:
  - Remove the duplicated post-transaction alert loop and centralize alert dispatch once per action.

### 4. Sensitive return actions lack auth/permission checks

- Files:
  - `src/app/(dashboard)/sales-returns/actions.tsx`
  - `src/app/(dashboard)/purchase-returns/actions.tsx`
- Problem:
  - Return creation, deletion, and status update do not enforce `getSession()` and `hasPermission(...)` the way invoice and treasury actions do.
- Impact:
  - Any server-side invocation path reaching these actions may process financial and stock changes without explicit authorization enforcement.
- Recommendation:
  - Add mandatory session and permission checks for:
    - sales returns: `returns_sales`
    - purchase returns: `returns_purchase`
  - Apply checks consistently to create, delete, update-status, and read endpoints where needed.

### 5. Reset/wipe scripts can break the system if run without reseeding

- Files:
  - `prisma/wipe_history.ts`
  - `scripts/db-reset-clean.ts`
  - `prisma/seed.ts`
  - `prisma/seed_coa.ts`
- Problem:
  - `wipe_history.ts` deletes the full `Account` tree and most master data, not just transactions.
- Impact:
  - After running it, invoice, treasury, and return logic will fail because core account codes like `120101`, `120301`, `4101`, `6101` are assumed by the app.
- Recommendation:
  - Treat `wipe_history.ts` as a factory reset, not a year-end reset.
  - Never run it on live data without backup and immediate reseed.
  - Add explicit environment guardrails and interactive confirmation.

### 6. Dual COA seed paths can create mismatched assumptions

- Files:
  - `prisma/seed.ts`
  - `prisma/seed_coa.ts`
  - `prisma/default_coa.json`
- Problem:
  - There are two account-tree seed strategies.
  - Business logic depends on hard-coded account codes existing with expected hierarchy and selectability.
- Impact:
  - If `default_coa.json` diverges from app assumptions, runtime posting errors or wrong account usage can happen.
- Recommendation:
  - Standardize on one seed path.
  - Add startup validation for required account codes.
  - Move hard-coded COA dependencies into a validated configuration layer.

### 7. Purchase invoice delete contains irrelevant transaction checks

- File:
  - `src/app/(dashboard)/purchase-invoices/actions.ts`
- Problem:
  - `deletePurchaseInvoice()` checks related vouchers/receipts/sales/purchase invoices by `bankId` using fresh `getTenantPrisma()` calls inside a transaction, but the result `hasTransactions` is not used.
- Impact:
  - Confusing code path, increased maintenance risk, and transaction-boundary inconsistency.
- Recommendation:
  - Remove dead logic or enforce a real business rule.
  - Avoid calling `getTenantPrisma()` from inside an active transaction callback; use `tx` only.

### 8. Tenant Prisma usage relies on `any` in critical flows

- Files:
  - `src/app/(dashboard)/purchase-invoices/actions.ts`
  - `src/app/(dashboard)/treasury/actions.tsx`
  - `src/app/(dashboard)/treasury/payment-voucher/actions.tsx`
- Problem:
  - Several actions use `(await getTenantPrisma() as any).$transaction(async (tx: any) => ...)`.
- Impact:
  - Type safety is disabled in the most sensitive accounting flows.
  - Runtime-only failures become easier to introduce.
- Recommendation:
  - Replace `any` with `Prisma.TransactionClient` and typed Prisma client usage throughout.

## Medium-Risk Findings

### 9. Stock logic uses both movement history and denormalized `currentStock`

- Files:
  - `src/app/(dashboard)/sales-invoices/actions.tsx`
  - `src/app/(dashboard)/purchase-invoices/actions.ts`
  - `src/app/(dashboard)/sales-returns/actions.tsx`
  - `src/app/(dashboard)/purchase-returns/actions.tsx`
- Problem:
  - Some checks compute stock from `StockMovement`, while final writes mutate `Product.currentStock`.
- Impact:
  - If any correction or partial rollback misses one side, product stock becomes inaccurate.
- Recommendation:
  - Standardize stock ownership.
  - Either derive stock from movements only, or keep `currentStock` as a controlled projection with periodic reconciliation.

### 10. Purchase invoice update changes costing strategy

- File:
  - `src/app/(dashboard)/purchase-invoices/actions.ts`
- Problem:
  - Create path recalculates weighted average cost.
  - Update path writes `buyPrice: item.unitPrice` directly for each item.
- Impact:
  - Edited purchase invoices may distort product cost basis compared to creation logic.
- Recommendation:
  - Reuse the same costing service in create/update/delete reversal flows.

### 11. Login fallback still accepts plaintext-stored passwords

- File:
  - `src/app/login/actions.ts`
- Problem:
  - If `user.password === password`, the system allows login and rehashes it.
- Impact:
  - Helpful for bootstrap, but unsafe as a permanent fallback.
- Recommendation:
  - Restrict to explicit bootstrap mode or remove after migration.
  - Add a one-time migration script for legacy passwords instead of runtime fallback.

### 12. Permissions model collapses all non-admin users into one role

- File:
  - `src/lib/permissions.ts`
- Problem:
  - Every worker resolves to `rbac.roles["worker"]`, regardless of finer user distinctions.
- Impact:
  - Limited granularity and potential future authorization mistakes.
- Recommendation:
  - Bind permissions to actual user role keys instead of a single hard-coded worker role.

### 13. Some destructive actions miss explicit permission checks

- Files:
  - `src/app/(dashboard)/treasury/actions.tsx`
- Problem:
  - `restoreAccount()` and `archiveSafe()` do not clearly enforce `treasury_manage` like other treasury operations.
- Impact:
  - Treasury administration may be partially exposed through uneven server-side checks.
- Recommendation:
  - Add uniform session and `treasury_manage` checks to every mutating treasury action.

### 14. Error handling often swallows root cause

- Files:
  - `src/lib/auth.ts`
  - `src/app/(dashboard)/sales-returns/actions.tsx`
  - `src/app/(dashboard)/purchase-returns/actions.tsx`
  - several action files
- Problem:
  - Many catches return generic failure objects or `null` without structured logging.
- Impact:
  - Harder incident diagnosis, especially for partial accounting failures.
- Recommendation:
  - Add structured logs with operation name, entity ids, source type, and user id.

## Low-Risk Findings

### 15. `publicPrisma` imports are present but often unused

- Files:
  - Several action files
- Impact:
  - Minor maintainability noise.

### 16. `revalidatePath()` is called inside some transactions

- Files:
  - invoice and treasury actions
- Impact:
  - Better moved after commit for cleaner side-effect boundaries.

### 17. Some comments indicate prior accounting fixes remain embedded in action code

- Files:
  - `src/app/(dashboard)/purchase-invoices/actions.ts`
  - `src/app/(dashboard)/purchase-returns/actions.tsx`
  - `src/app/(dashboard)/treasury/actions.tsx`
- Impact:
  - Signals the domain logic needs extraction into tested services.

### 18. Return status can be updated independently of posting state

- Files:
  - `src/app/(dashboard)/sales-returns/actions.tsx`
  - `src/app/(dashboard)/purchase-returns/actions.tsx`
- Impact:
  - Operational status may drift from financial effect if status is treated as business-state later.

## Reset / Wipe Impact Analysis

### `prisma/wipe_history.ts`

- What it does:
  - Deletes notifications, sessions, treasury requests, stock movements, transfers, quotations, journals, vouchers, returns, invoices, safes, banks, customers, suppliers, products, categories, warehouses.
  - Deletes the full chart of accounts after nulling parent references.
  - Resets company, system, and general settings.
  - Resets many sequences with `$executeRawUnsafe`.
- If you run it:
  - Yes, things will break until you reseed.
  - The accounting structure is gone.
  - Treasury accounts and main safe linkage are gone.
  - Any custom accounts and custom mappings are lost.
- Safe use case:
  - Fresh-development reset only.
- Required next step:
  - Immediately run a seed flow, preferably one standardized seed path.

### `scripts/db-reset-clean.ts`

- What it does:
  - Truncates many operational tables with `RESTART IDENTITY CASCADE`.
  - Deletes non-primary safes.
  - Deletes many terminal user-created accounts while preserving a small allowlist.
  - Resets safe balances to zero.
- If you run it:
  - The system may still start, but business history is gone.
  - Some structural accounts remain, but settings are also truncated.
  - Any new tables not listed here may survive and cause partial-reset inconsistencies.
- Safe use case:
  - Controlled cleanup for non-production or carefully managed year-reset scenarios after backup.

### `prisma/seed.ts`

- What it does:
  - Seeds a hard-coded COA and links the main safe to `120101`.
  - Seeds system/company/general settings.
- Risk:
  - Strongly coupled to hard-coded app assumptions.
- Safe use case:
  - If this is the official COA contract and remains the single source of truth.

### `prisma/seed_coa.ts`

- What it does:
  - Builds the COA from `default_coa.json`, creates/links the main safe, sets company/general settings, creates default warehouse, syncs some sequences.
- Risk:
  - More flexible, but only safe if `default_coa.json` is kept fully aligned with business logic.

## Answer: If We Do a Reset, Will Anything Break?

### Short answer

- Yes, **depending on which reset script you run**.

### If you run `prisma/wipe_history.ts`

- Yes, the system will not remain operational by itself.
- What breaks:
  - Chart of accounts removed
  - Treasury account mappings removed
  - Master data removed
  - Historical accounting and inventory removed
- What you must do after:
  - Run seed again
  - Recheck safe/bank-account links
  - Recreate any custom COA branches or custom operational settings

### If you run `scripts/db-reset-clean.ts`

- The app is less likely to hard-fail immediately, but business data and some config will be gone.
- What may still break:
  - Missing settings defaults
  - Missing newer tables not included in the reset list
  - Custom terminal accounts removed unexpectedly

## Recommended Change List

### Priority 1

- Centralize posting logic into domain services:
  - `InventoryService`
  - `TreasuryService`
  - `JournalPostingService`
- Replace manual `max + 1` numbering with DB-backed sequences/counters.
- Enforce auth/permission checks on all return and treasury mutating actions.

### Priority 2

- Choose one source of truth for:
  - stock
  - treasury balances
- Add reconciliation commands:
  - recompute stock from movements
  - recompute treasury balances from journal
  - detect orphan vouchers/journal entries

### Priority 3

- Standardize on one COA seed strategy.
- Add startup/self-check validation for required account codes:
  - `120101`
  - `120301`
  - `4101`
  - `6101`
  - any other codes required by posting logic

### Priority 4

- Add environment guards for destructive scripts:
  - explicit confirmation
  - production refusal unless forced flag is present
  - backup reminder

## Suggested Test Coverage

- Concurrent creation test for journal entry numbering.
- Sales invoice create/update/delete accounting integrity tests.
- Purchase invoice create/update/delete cost and treasury integrity tests.
- Sales return and purchase return authorization tests.
- Reconciliation tests:
  - `currentStock` vs movement sum
  - `balance` field vs journal-derived balance

## Final Verdict

- The system is usable, but it is not yet robust enough for high-confidence financial continuity without tightening accounting invariants.
- The most important issue is not a single crashing bug; it is the possibility of **silent divergence** between stock, treasury, and ledger over time.
- Reset is safe only when you clearly distinguish:
  - **factory reset**: `prisma/wipe_history.ts`
  - **operational cleanup/reset**: `scripts/db-reset-clean.ts`
- Running the wrong script in the wrong environment can absolutely break accounting continuity and remove essential structure.