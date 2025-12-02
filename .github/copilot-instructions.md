# Budget App - Copilot Instructions

Personal budgeting app: **SvelteKit 5 + Turso (cloud SQLite) + Tailwind 4**, deployed on Vercel.

## Architecture & Data Flow

```
src/lib/
├── server/           → Server-only: db.ts, api-helpers.ts, validation.ts, middleware.ts
├── components/       → UI components (barrel exported via index.ts)
├── stores/           → Svelte 5 runes stores (toast.svelte.ts, user.svelte.ts, currency.svelte.ts)
├── utils/            → Client utilities (format.ts, geolocation.ts)
├── constants.ts      → ACCOUNT_TYPES, CATEGORY_TYPES, CLEARED_STATUSES, currencies
├── types.ts          → TypeScript interfaces
└── index.ts          → Main barrel: exports all above

src/routes/
├── api/              → REST endpoints (+server.ts files)
└── (protected)/      → Auth-required pages (dashboard, accounts, spending, plan, reports)
```

**Data flow**: `Page ($effect) → fetch('/api/...') → API route → db.execute() → Turso`

## Svelte 5 Runes (REQUIRED - No Legacy Syntax)

```svelte
<script lang="ts">
  // Props - use $bindable() for two-way binding
  let { show = $bindable(false), items = [] } = $props();
  
  // Reactive state
  let count = $state(0);
  let doubled = $derived(count * 2);
  
  // Side effects (runs on mount + when deps change)
  $effect(() => { loadData(); });
</script>
```

**Reference files**: `src/routes/(protected)/dashboard/+page.svelte`, `src/lib/components/TransactionModal.svelte`

## API Route Pattern

All endpoints follow this structure using helpers from `$lib/server/api-helpers`:

```typescript
import { requireAuth } from '$lib/server/middleware';
import { transactionSchema } from '$lib/server/validation';
import { parseBody, parseSearchParams, verifyOwnership, successResponse, createdResponse } from '$lib/server/api-helpers';
import db from '$lib/server/db';
import type { InValue } from '@libsql/client';

export const GET: RequestHandler = async (event) => {
  const user = requireAuth(event);
  const params = parseSearchParams(event.url);
  const limit = params.getInt('limit', 50);
  const startDate = params.getDate('startDate');
  // Query with parameterized SQL
  const args: InValue[] = [user.userId];
  const result = await db.execute({ sql: 'SELECT * FROM accounts WHERE user_id = ?', args });
  return successResponse({ data: result.rows });
};

export const POST: RequestHandler = async (event) => {
  const user = requireAuth(event);
  const data = await parseBody(event, transactionSchema);  // Zod validation
  await verifyOwnership(db, 'accounts', data.account_id, user.userId, 'Account');
  // Insert...
  return createdResponse({ id, message: 'Created' });
};
```

**Helpers**: `parseBody()`, `tryParseBody()`, `parseSearchParams()`, `verifyOwnership()`, `successResponse()`, `createdResponse()`, `handleDbError()`, `buildWhereClause()`, `buildPagination()`

## Database (Direct SQL - No ORM)

```typescript
import db from '$lib/server/db';
import type { InValue } from '@libsql/client';

// Always use parameterized queries
const args: InValue[] = [userId, name];
await db.execute({ sql: 'SELECT * FROM accounts WHERE user_id = ? AND name = ?', args });
```

**Tables**: `users`, `sessions`, `accounts`, `categories`, `transactions`, `budgets`, `budget_allocations`  
**Schema**: `src/lib/server/db.ts` → `initializeDatabase()`  
**Validation**: `src/lib/server/validation.ts` (Zod schemas for each entity)

## Theming - CSS Variables ONLY

**⚠️ NEVER hardcode colors** - always use CSS variables from `src/routes/layout.css`:

```svelte
<!-- ✅ Correct -->
<div class="bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]">

<!-- ❌ Wrong - breaks theming -->
<div class="bg-slate-800 text-white">
```

**Variables**: `--color-primary`, `--color-primary-hover`, `--color-bg-{primary,secondary,tertiary}`, `--color-text-{primary,secondary,muted}`, `--color-{success,danger,warning}`, `--color-border`

## Constants & Types

Always import from `$lib/constants` - never hardcode enum values:

```typescript
import { ACCOUNT_TYPES, CATEGORY_TYPES, CLEARED_STATUSES, DEFAULT_CURRENCY } from '$lib/constants';
import type { AccountTypeValue, CategoryTypeValue, ClearedStatusValue } from '$lib/constants';
```

## Global Stores

Svelte 5 runes-based stores in `$lib/stores`:

```typescript
import { toast, userStore, currencyStore } from '$lib/stores';

toast.success('Saved!');
toast.error('Operation failed');
if (userStore.isAuthenticated) { /* ... */ }
```

## Component Imports

Always use barrel export from `$lib/components`:

```svelte
<script lang="ts">
  import { LoadingState, EmptyState, PageHeader, Button, TransactionModal } from '$lib/components';
</script>
```

## Mobile-First UI

- Fixed bottom nav: 64px → content needs `pb-[70px]` or `padding-bottom: 70px`
- Touch targets: minimum 44px height (`min-h-[44px]`)

## Geolocation Auto-Complete

Location-based transaction auto-fill is a core feature. When adding transactions, the app detects user location and suggests payee/category/account based on learned locations.

```typescript
import { getCurrentPosition, getLocationSuggestions, saveLearnedLocation } from '$lib/utils/geolocation';

// Get position (promise-based, handles errors)
const result = await getCurrentPosition();
if (result.success) {
  const suggestions = await getLocationSuggestions(result.position.latitude, result.position.longitude);
}

// Save learned location for future suggestions
await saveLearnedLocation({ latitude, longitude, payee: 'Starbucks', category_id: 5 });
```

**API endpoints**: `GET /api/locations?lat=...&lng=...` (suggestions), `POST /api/locations` (save learned)  
**Reference**: `src/lib/utils/geolocation.ts`, `src/lib/components/TransactionModal.svelte` (usage)

## Auth Mode

**Currently single-user**: `hooks.server.ts` auto-authenticates as user ID 1 and seeds sample data on first request. For multi-user, uncomment session logic in that file.

## Commands

```bash
npm run dev    # Dev server (auto-seeds sample data in memory)
npm run check  # TypeScript + svelte-check
npm run build  # Production build
```

## Key Reference Files

| Pattern | File |
|---------|------|
| API route example | `src/routes/api/transactions/+server.ts` |
| Page with data loading | `src/routes/(protected)/dashboard/+page.svelte` |
| Complex component | `src/lib/components/TransactionModal.svelte` |
| Runes-based store | `src/lib/stores/toast.svelte.ts` |
| Zod validation schemas | `src/lib/server/validation.ts` |
| All constants/types | `src/lib/constants.ts` |
