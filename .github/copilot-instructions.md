# Budget App - Copilot Instructions

Personal budgeting app: **SvelteKit 5 + Turso (cloud SQLite) + Tailwind 4**, deployed on Vercel.

## Architecture Overview

```
src/lib/
├── server/           → Server-only: db.ts, api-helpers.ts, validation.ts, middleware.ts
├── components/       → UI components (barrel exported via index.ts)
├── stores/           → Svelte 5 runes stores (*.svelte.ts files)
├── utils/            → Client utilities (format.ts, geolocation.ts)
├── constants.ts      → Enums, labels, currencies (ACCOUNT_TYPES, CATEGORY_TYPES, etc.)
├── types.ts          → TypeScript interfaces
└── index.ts          → Main barrel: re-exports all above

src/routes/
├── api/              → REST endpoints (+server.ts files)
└── (protected)/      → Auth-required pages (dashboard, accounts, spending, plan, reports)
```

**Data flow**: `Page ($effect) → fetch('/api/...') → API route → db.execute() → Turso`

## Svelte 5 Runes (REQUIRED)

**No legacy syntax** - use runes exclusively:

```svelte
<script lang="ts">
  let { show = $bindable(false), items = [] } = $props();  // $bindable for two-way
  let count = $state(0);
  let doubled = $derived(count * 2);
  $effect(() => { loadData(); });  // Runs on mount + deps change
</script>
```

## API Routes

Use helpers from `$lib/server/api-helpers`:

```typescript
import { requireAuth } from '$lib/server/middleware';
import { transactionSchema } from '$lib/server/validation';
import { parseBody, parseSearchParams, verifyOwnership, successResponse, createdResponse } from '$lib/server/api-helpers';
import db from '$lib/server/db';
import type { InValue } from '@libsql/client';

export const GET: RequestHandler = async (event) => {
  const user = requireAuth(event);
  const params = parseSearchParams(event.url);
  const args: InValue[] = [user.userId];
  const result = await db.execute({ sql: 'SELECT * FROM accounts WHERE user_id = ?', args });
  return successResponse({ data: result.rows });
};

export const POST: RequestHandler = async (event) => {
  const user = requireAuth(event);
  const data = await parseBody(event, transactionSchema);  // Zod validation
  await verifyOwnership(db, 'accounts', data.account_id, user.userId, 'Account');
  return createdResponse({ id, message: 'Created' });
};
```

**Helpers**: `parseBody()`, `parseSearchParams()` (`.getInt()`, `.getString()`, `.getDate()`, `.getBoolean()`), `verifyOwnership()`, `successResponse()`, `createdResponse()`, `handleDbError()`, `buildWhereClause()`

## Database (Direct SQL - No ORM)

```typescript
import db from '$lib/server/db';
import type { InValue } from '@libsql/client';

const args: InValue[] = [userId, name];
await db.execute({ sql: 'SELECT * FROM accounts WHERE user_id = ? AND name = ?', args });
```

**Tables**: `users`, `sessions`, `accounts`, `categories`, `transactions`, `budgets`, `budget_allocations`, `learned_locations`, `payees`  
**Schema**: `src/lib/server/db.ts` → `initializeDatabase()`  
**Validation**: `src/lib/server/validation.ts` (Zod schemas)

## Theming - CSS Variables ONLY

**⚠️ NEVER hardcode colors** - use variables from `src/routes/layout.css`:

```svelte
<!-- ✅ Correct -->
<div class="bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]">

<!-- ❌ Wrong - breaks multi-theme support -->
<div class="bg-slate-800 text-white">
```

**Variables**: `--color-primary`, `--color-primary-hover`, `--color-bg-{primary,secondary,tertiary}`, `--color-text-{primary,secondary,muted}`, `--color-{success,danger,warning}`, `--color-border`, `--color-chart-{1-5}`

## Imports

```typescript
// Constants - never hardcode values
import { ACCOUNT_TYPES, CATEGORY_TYPES, DEFAULT_CURRENCY } from '$lib/constants';
import type { AccountTypeValue, CategoryTypeValue } from '$lib/constants';
// Types
import type { Account, Transaction, Category } from '$lib/types';
// Stores - all reactive with runes
import { toast, userStore, currencyStore, transactionStore, offlineStore } from '$lib/stores';
// Components - always use barrel export
import { LoadingState, EmptyState, PageHeader, Button, TransactionModal } from '$lib/components';
// Formatting
import { formatCurrency, formatWithCurrency, formatMonthYear } from '$lib/utils/format';
```

## Mobile-First UI

- Fixed bottom nav: 64px → content needs `pb-[70px]`
- Touch targets: minimum 44px height (`min-h-[44px]`)
- Currency format: RON uses suffix (`100 lei`), EUR/USD/GBP use prefix (`€100`)

## Cross-Component Communication

Use `transactionStore.notifyUpdate()` after CRUD operations to trigger dashboard/list refreshes:

```typescript
// In TransactionModal after save:
await fetch('/api/transactions', { method: 'POST', body: JSON.stringify(data) });
transactionStore.notifyUpdate();  // Dashboard will auto-refresh

// In Dashboard:
$effect(() => {
  if (transactionStore.updateCounter > lastCounter) {
    loadDashboard();  // React to changes from other components
  }
});
```

## Dev Mode

- `hooks.server.ts` auto-seeds sample data on first request
- In-memory SQLite if no Turso credentials (data doesn't persist)

## Commands

```bash
npm run dev    # Dev server
npm run check  # TypeScript + svelte-check
npm run build  # Production build
```

## Reference Files

| Pattern | File |
|---------|------|
| API route | `src/routes/api/transactions/+server.ts` |
| Page with data loading | `src/routes/(protected)/dashboard/+page.svelte` |
| Complex component | `src/lib/components/TransactionModal.svelte` |
| Runes store | `src/lib/stores/toast.svelte.ts` |
| Zod schemas | `src/lib/server/validation.ts` |
| Constants/enums | `src/lib/constants.ts` |
| CSS theme variables | `src/routes/layout.css` |
