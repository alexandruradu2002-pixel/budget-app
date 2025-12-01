# Budget App - Copilot Instructions

## Architecture

SvelteKit 5 + Turso (cloud SQLite) + Tailwind 4, deployed on Vercel.

```
src/lib/
├── server/           → Server-only (db.ts, auth.ts, middleware.ts, validation.ts, api-helpers.ts)
├── components/       → Reusable UI (exported via index.ts)
│   ├── ui/           → Generic primitives (Button, Alert, PageHeader, FAB)
│   └── settings/     → Feature-specific (YNABImport)
├── stores/           → Global state (toast.svelte.ts, user.svelte.ts)
├── utils/            → Client utilities (format.ts)
├── constants.ts      → App-wide constants (ACCOUNT_TYPES, PRESET_COLORS, etc.)
├── types.ts          → TypeScript interfaces
└── index.ts          → Barrel export for all above

src/routes/
├── api/              → REST endpoints (+server.ts)
└── (protected)/      → Auth-required pages (dashboard, accounts, spending, plan, reports)
```

**Data flow**: Svelte page → `fetch('/api/...')` → API route → `db.execute()` → Turso

## Svelte 5 Runes (REQUIRED)

Use runes - **NOT** legacy `$:` or `export let`:

```svelte
<script lang="ts">
  let { show = $bindable(false), data = [] } = $props();  // Props (use $bindable for two-way)
  let count = $state(0);                                   // Reactive state
  let doubled = $derived(count * 2);                       // Computed values
  $effect(() => { loadData(); });                          // Side effects on mount/deps change
</script>
```

**Reference**: `src/routes/(protected)/dashboard/+page.svelte`, `src/lib/components/TransactionModal.svelte`

## API Routes Pattern

All endpoints use helpers from `$lib/server/api-helpers`:

```typescript
import { error } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/middleware';
import { transactionSchema } from '$lib/server/validation';
import { parseBody, parseSearchParams, verifyOwnership, successResponse, createdResponse } from '$lib/server/api-helpers';
import db from '$lib/server/db';

export const GET: RequestHandler = async (event) => {
  const user = requireAuth(event);
  const params = parseSearchParams(event.url);
  const limit = params.getInt('limit', 50);
  // ... query with db.execute()
  return successResponse({ data });
};

export const POST: RequestHandler = async (event) => {
  const user = requireAuth(event);
  const data = await parseBody(event, transactionSchema);  // Validates with Zod
  await verifyOwnership(db, 'accounts', data.account_id, user.userId, 'Account');
  // ... insert
  return createdResponse({ id, message: 'Created' });
};
```

**Available helpers**: `parseBody()`, `parseSearchParams()`, `verifyOwnership()`, `successResponse()`, `createdResponse()`, `handleDbError()`

## Database

Direct SQL via `@libsql/client` - **no ORM**. Always parameterized:

```typescript
import type { InValue } from '@libsql/client';
const args: InValue[] = [userId, name];  // Use InValue type for args
await db.execute({ sql: 'SELECT * FROM accounts WHERE user_id = ? AND name = ?', args });
```

**Tables**: `users`, `sessions`, `accounts`, `categories`, `transactions`, `budgets`, `budget_allocations`  
**Schema**: `src/lib/server/db.ts` → `initializeDatabase()`  
**Validation**: `src/lib/server/validation.ts` (Zod schemas)

## Constants & Types

Use constants from `$lib/constants` instead of hardcoding:

```typescript
import { ACCOUNT_TYPES, DEFAULT_CURRENCY, PRESET_COLORS, CATEGORY_TYPES } from '$lib/constants';
// Types available: AccountTypeValue, CategoryTypeValue, ClearedStatusValue
```

## Global State (Stores)

Svelte 5 runes-based stores in `$lib/stores`:

```typescript
import { toast, userStore } from '$lib/stores';

// Toast notifications
toast.success('Saved!');
toast.error('Failed to save');

// User session
if (userStore.isAuthenticated) { /* ... */ }
```

## Theming - CSS Variables Only

**⚠️ NEVER hardcode colors** - use variables from `src/routes/layout.css`:

```svelte
<!-- ✅ Correct -->
<div class="bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]">

<!-- ❌ Wrong - breaks theming -->
<div class="bg-slate-800 text-white">
```

**Available**: `--color-primary`, `--color-primary-hover`, `--color-bg-{primary,secondary,tertiary}`, `--color-text-{primary,secondary,muted}`, `--color-{success,danger,warning}`, `--color-border`

## Components

Import from `$lib/components` (barrel export):

```svelte
<script lang="ts">
  import { 
    LoadingState, EmptyState, PageHeader, HeaderButton, 
    FloatingActionButton, Button, Alert, StatCard,
    TransactionModal, CategorySelector, AccountSelector, PayeeSelector,
    YNABImport  // Settings components also exported
  } from '$lib/components';
</script>
```

## Mobile-First UI

App uses fixed bottom nav (64px) - content needs `padding-bottom: 70px`. Touch targets min 44px.

```svelte
<div class="flex flex-col gap-2 p-4 md:flex-row md:gap-4">
<button class="min-h-[44px] px-4 py-3">
```

## Formatting

```typescript
import { formatCurrency, formatDate, formatAmount } from '$lib/utils/format';
formatCurrency(1234.56);  // "1.234,56 lei" (Romanian locale)
```

## Auth Mode

**Currently single-user** - `hooks.server.ts` auto-authenticates as user ID 1. For multi-user, uncomment session logic there.

## Commands

```bash
npm run dev    # Dev server (auto-seeds sample data)
npm run check  # TypeScript + svelte-check
npm run build  # Production build
```

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/index.ts` | Main barrel export (types, constants, stores, components, utils) |
| `src/lib/server/api-helpers.ts` | API route helpers (parseBody, verifyOwnership, etc.) |
| `src/lib/constants.ts` | App-wide constants and type definitions |
| `src/lib/stores/` | Global state (toast, user) |
| `src/lib/server/validation.ts` | Zod schemas for all entities |
| `src/routes/layout.css` | Theme CSS variables |
