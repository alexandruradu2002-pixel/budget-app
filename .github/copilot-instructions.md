# Budget App - Copilot Instructions

## Architecture

SvelteKit 5 + Turso (cloud SQLite) + Tailwind 4, deployed on Vercel.

```
src/lib/server/     → Server-only (db.ts, auth.ts, middleware.ts, validation.ts)
src/routes/api/     → REST endpoints (+server.ts)
src/routes/(protected)/ → Auth-required pages (dashboard, accounts, spending, plan, reports)
```

**Data flow**: Svelte components → `fetch('/api/...')` → API routes → `db.execute()` → Turso

## Svelte 5 Runes (REQUIRED)

Use runes - **NOT** legacy `$:` or `export let`:

```svelte
<script lang="ts">
  let { children } = $props();           // Props (replaces export let)
  let count = $state(0);                  // Reactive state
  let doubled = $derived(count * 2);      // Derived values
  $effect(() => { loadData(); });         // Side effects (replaces $:)
</script>
```

See `src/routes/(protected)/dashboard/+page.svelte` for a complete example.

## API Routes Pattern

All API routes use this pattern (see `src/routes/api/transactions/+server.ts`):

```typescript
import { json, error } from '@sveltejs/kit';
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
  const body = await event.request.json();
  const parsed = transactionSchema.safeParse(body);
  if (!parsed.success) return json({ error: parsed.error }, { status: 400 });
  // ... insert into db
};
```

## Database

Direct SQL via `@libsql/client` - **no ORM**. Always use parameterized queries:

```typescript
await db.execute({ sql: 'SELECT * FROM accounts WHERE user_id = ?', args: [userId] });
```

**Tables**: `users`, `sessions`, `accounts`, `categories`, `transactions`, `budgets`  
**Schema**: See `src/lib/server/db.ts` `initializeDatabase()`  
**Types**: See `src/lib/types.ts` for TypeScript interfaces

## Theming - CSS Variables Only

**⚠️ NEVER hardcode colors** - use CSS variables from `src/routes/layout.css`:

```svelte
<!-- ✅ Correct -->
<div class="bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]">
<button class="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]">

<!-- ❌ Wrong - breaks theming -->
<div class="bg-slate-800 text-white">
```

**Variables**: `--color-primary`, `--color-bg-{primary,secondary,tertiary}`, `--color-text-{primary,secondary,muted}`, `--color-{success,danger,warning}`, `--color-border`

## Mobile-First UI

**⚠️ Design mobile-first** - app uses fixed bottom navigation on mobile.

```svelte
<!-- ✅ Mobile-first (scales up) -->
<div class="flex flex-col gap-2 p-4 md:flex-row md:gap-4 lg:p-6">
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

<!-- Touch targets: min 44px -->
<button class="min-h-[44px] px-4 py-3">
```

**Layout**: See `src/routes/(protected)/+layout.svelte` for bottom nav implementation.

## Current Auth Mode

**Login disabled** - single-user mode. `hooks.server.ts` auto-authenticates as admin user (id: 1). To re-enable login, uncomment the session logic in `hooks.server.ts`.

## Commands

```bash
npm run dev    # Dev server (auto-seeds with sample data)
npm run check  # TypeScript + svelte-check
npm run build  # Production build
```

## Key Files

| File | Purpose |
|------|---------|
| `src/hooks.server.ts` | Auth middleware, auto-seeding |
| `src/lib/server/db.ts` | Turso client, schema initialization |
| `src/lib/server/validation.ts` | Zod schemas for all entities |
| `src/lib/server/middleware.ts` | `requireAuth()`, `requireRole()` |
| `src/lib/types.ts` | TypeScript interfaces |
| `src/routes/layout.css` | Theme CSS variables |
