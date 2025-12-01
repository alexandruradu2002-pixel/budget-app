# Budget App - Copilot Instructions

## Architecture Overview

SvelteKit 5 app with Turso (cloud SQLite) backend, deployed on Vercel.

```
Client (Svelte 5 runes) → API Routes → Turso DB
└── /routes/(protected)/* requires auth
```

**Key directories:**
- `src/lib/server/` - Server-only: `db.ts` (Turso client), `auth.ts` (sessions), `middleware.ts`, `validation.ts` (Zod)
- `src/routes/api/` - REST endpoints (JSON responses)
- `src/routes/(protected)/` - Auth-required pages (client checks `/api/auth/me`)

## Svelte 5 Runes Pattern

Use runes, NOT legacy `$:` reactivity or `export let`:

```svelte
<script lang="ts">
  let { children } = $props();           // Props
  let count = $state(0);                  // Reactive state
  $effect(() => { loadData(); });         // Side effects
</script>
```

## Authentication Flow

- **Session cookie**: `session` (httpOnly, 30-day sliding expiration)
- **Server access**: `event.locals.user` populated by `hooks.server.ts`
- **API protection**: Use `requireAuth(event)` from `$lib/server/middleware`
- **Dev mode**: Auto-authenticated as admin when no Turso credentials (see `hooks.server.ts`)

```typescript
// In API routes:
import { requireAuth } from '$lib/server/middleware';
export const GET: RequestHandler = async (event) => {
  const user = requireAuth(event);  // Throws 401 if not authenticated
  // user.userId, user.email, user.roles
};
```

## Database Patterns

Direct SQL via `@libsql/client`. No ORM. Use parameterized queries:

```typescript
import db from '$lib/server/db';
const result = await db.execute({
  sql: 'SELECT * FROM accounts WHERE user_id = ?',
  args: [user.userId]
});
```

**Tables**: `users`, `sessions`, `accounts`, `categories`, `transactions`, `budgets`  
**Schema**: See `db.ts` `initializeDatabase()` for column definitions

## Validation

Use Zod schemas from `$lib/server/validation.ts`:

```typescript
import { transactionSchema } from '$lib/server/validation';
const parsed = transactionSchema.safeParse(body);
if (!parsed.success) return json({ error: parsed.error }, { status: 400 });
```

## Theming (CSS Variables)

**⚠️ NEVER hardcode colors** - always use CSS variables for theme support.

Colors defined in `layout.css` via CSS variables. Use `var(--color-*)` in Tailwind:

```svelte
<!-- ✅ Correct - uses theme variables -->
<div class="bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]">
<button class="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]">

<!-- ❌ Wrong - hardcoded colors break theming -->
<div class="bg-slate-800 text-white">
<button class="bg-blue-500">
```

**Available variables:**
- **Primary**: `--color-primary`, `--color-primary-hover`
- **Backgrounds**: `--color-bg-primary`, `--color-bg-secondary`, `--color-bg-tertiary`
- **Text**: `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`
- **Semantic**: `--color-success`, `--color-danger`, `--color-warning`
- **Border**: `--color-border`

**Theme switching**: Add `data-theme` attribute to `<html>` and define theme variants in `layout.css`:

```
[data-theme="ocean"] {
  --color-primary: oklch(0.7 0.15 200);
  --color-bg-primary: oklch(0.15 0.02 230);
  /* ... override all variables */
}
```

## Mobile-First UI Design

**⚠️ ALWAYS design mobile-first** - UI must be fully responsive and touch-friendly.

### Responsive Breakpoints (Tailwind)

Use mobile-first approach - start with mobile styles, then add larger breakpoints:

```svelte
<!-- ✅ Correct - mobile-first, scales up -->
<div class="flex flex-col gap-2 p-4 md:flex-row md:gap-4 lg:p-6">
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
<button class="w-full md:w-auto px-4 py-3 md:py-2">

<!-- ❌ Wrong - desktop-first breaks mobile -->
<div class="flex-row p-6 gap-4 sm:flex-col sm:p-4">
```

**Breakpoints:**
- `sm:` → 640px+ (large phones, small tablets)
- `md:` → 768px+ (tablets)
- `lg:` → 1024px+ (laptops)
- `xl:` → 1280px+ (desktops)

### Touch-Friendly Elements

Ensure interactive elements are easily tappable:

```svelte
<!-- ✅ Good touch targets (min 44x44px) -->
<button class="min-h-[44px] min-w-[44px] px-4 py-3">
<a class="block py-3 px-4">
<input class="h-12 px-4 text-base">

<!-- ❌ Too small for touch -->
<button class="px-2 py-1 text-xs">
```

### Mobile Layout Patterns

```svelte
<!-- Responsive navigation -->
<nav class="fixed bottom-0 left-0 right-0 md:relative md:top-0 bg-[var(--color-bg-secondary)]">

<!-- Stack on mobile, side-by-side on desktop -->
<div class="flex flex-col gap-4 md:flex-row">

<!-- Full-width cards on mobile -->
<div class="w-full md:max-w-md lg:max-w-lg mx-auto">

<!-- Hide/show based on screen size -->
<div class="hidden md:block">Desktop only</div>
<div class="block md:hidden">Mobile only</div>
```

### Mobile-Specific Considerations

- **Font sizes**: Use `text-sm` or `text-base` on mobile, scale up with `md:text-lg`
- **Spacing**: Use smaller padding/margins on mobile (`p-4` → `md:p-6` → `lg:p-8`)
- **Forms**: Full-width inputs on mobile, use `type="tel"`, `type="email"` for better keyboards
- **Modals/Drawers**: Use bottom sheets on mobile (`fixed bottom-0 inset-x-0`)
- **Tables**: Scroll horizontally or convert to card layout on mobile
- **Images**: Use `object-cover` and responsive sizing

### Testing

Always test on multiple screen sizes:
- Mobile: 375px (iPhone SE), 390px (iPhone 14)
- Tablet: 768px (iPad Mini), 1024px (iPad Pro)
- Desktop: 1280px+

Use browser DevTools responsive mode or real devices for testing.

## API Response Pattern

```typescript
import { json, error } from '@sveltejs/kit';

// Success
return json({ data });

// Error
throw error(400, 'Validation failed');
// OR
return json({ error: 'message' }, { status: 400 });
```

## Commands

```bash
npm run dev        # Dev server (auto-auth enabled)
npm run check      # TypeScript + svelte-check
npm run build      # Production build
```

## File Naming

- API routes: `+server.ts` (GET, POST, PUT, DELETE exports)
- Pages: `+page.svelte`
- Layouts: `+layout.svelte`
- Protected routes: Place under `(protected)/` group

## Deployment (Vercel)

**Environment variables** (set in Vercel dashboard):
- `TURSO_DATABASE_URL` - Turso connection URL (`libsql://...`)
- `TURSO_AUTH_TOKEN` - Turso auth token
- `NODE_ENV` - Set to `production`

**Config**: `vercel.json` handles SvelteKit adapter settings.

**Local dev without Turso**: If credentials are missing, app uses in-memory SQLite (data doesn't persist). Auto-auth as admin is enabled.
