# Budget App - Copilot Instructions

## Architecture

SvelteKit 5 + Turso (cloud SQLite) + Tailwind 4, deployed on Vercel.

```
src/lib/server/         → Server-only (db.ts, auth.ts, middleware.ts, validation.ts)
src/lib/components/     → Reusable UI components (exported via index.ts)
src/lib/utils/          → Client utilities (format.ts for currency/dates)
src/routes/api/         → REST endpoints (+server.ts)
src/routes/(protected)/ → Auth-required pages (dashboard, accounts, spending, plan, reports)
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

All endpoints in `src/routes/api/` follow this structure:

```typescript
import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/middleware';
import { transactionSchema } from '$lib/server/validation';
import db from '$lib/server/db';

export const GET: RequestHandler = async (event) => {
  const user = requireAuth(event);  // Throws 401 if unauthenticated
  const result = await db.execute({
    sql: 'SELECT * FROM transactions WHERE user_id = ?',
    args: [user.userId]
  });
  return json({ transactions: result.rows });
};

export const POST: RequestHandler = async (event) => {
  const user = requireAuth(event);
  const parsed = transactionSchema.safeParse(await event.request.json());
  if (!parsed.success) return json({ error: parsed.error }, { status: 400 });
  // Insert with parameterized query...
};
```

## Database

Direct SQL via `@libsql/client` - **no ORM**. Always parameterized:

```typescript
await db.execute({ sql: 'SELECT * FROM accounts WHERE user_id = ?', args: [userId] });
```

**Tables**: `users`, `sessions`, `accounts`, `categories`, `transactions`, `budgets`, `budget_allocations`  
**Schema**: `src/lib/server/db.ts` → `initializeDatabase()`  
**Types**: `src/lib/types.ts`  
**Validation**: `src/lib/server/validation.ts` (Zod schemas)

**Dev mode**: Falls back to in-memory SQLite if no Turso credentials (data won't persist).

## Theming - CSS Variables Only

**⚠️ NEVER hardcode colors** - use variables from `src/routes/layout.css`:

```svelte
<!-- ✅ Correct -->
<div class="bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]">

<!-- ❌ Wrong - breaks theming -->
<div class="bg-slate-800 text-white">
```

**Available**: `--color-primary`, `--color-primary-hover`, `--color-bg-{primary,secondary,tertiary}`, `--color-text-{primary,secondary,muted}`, `--color-{success,danger,warning}`, `--color-border`

## Mobile-First UI

App uses fixed bottom nav (64px) - content needs `padding-bottom: 70px`.

```svelte
<!-- ✅ Mobile-first responsive -->
<div class="flex flex-col gap-2 p-4 md:flex-row md:gap-4">
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

<!-- Touch targets: min 44px height -->
<button class="min-h-[44px] px-4 py-3">
```

**Layout**: `src/routes/(protected)/+layout.svelte`

## Components

Import from `$lib/components` (barrel export):

```svelte
import { LoadingState, PageHeader, HeaderButton, Button, Alert } from '$lib/components';
```

## Formatting Utilities

Use `$lib/utils/format` for consistent display:

```typescript
import { formatCurrency, formatDate, formatMonthYear } from '$lib/utils/format';
formatCurrency(1234.56);  // "1.234,56 lei" (Romanian locale)
formatDate('2025-12-01'); // "1 December 2025"
```

## Auth Mode

**Currently single-user** - `hooks.server.ts` auto-authenticates as user ID 1. To enable multi-user login, uncomment session logic in that file.

## Commands

```bash
npm run dev    # Dev server (auto-seeds sample data on first request)
npm run check  # TypeScript + svelte-check
npm run build  # Production build
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/hooks.server.ts` | Auth middleware, database seeding |
| `src/lib/server/db.ts` | Turso client, schema init |
| `src/lib/server/validation.ts` | Zod schemas for all entities |
| `src/lib/server/middleware.ts` | `requireAuth()`, `requireRole()` |
| `src/lib/types.ts` | TypeScript interfaces |
| `src/lib/components/index.ts` | Component exports |
| `src/routes/layout.css` | Theme CSS variables |
