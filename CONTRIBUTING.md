# Contributing to Budget App

First off, thank you for considering contributing to Budget App! 🎉

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

When creating a bug report, please include:
- **Clear title** describing the issue
- **Steps to reproduce** the behavior
- **Expected behavior** vs what actually happened
- **Screenshots** if applicable
- **Environment** (browser, OS, deployment method)

### Suggesting Features

Feature suggestions are welcome! Please:
- Check if the feature has already been requested
- Describe the feature clearly
- Explain why it would be useful
- Provide examples if possible

### Pull Requests

> **Note**: Direct commits to `main` are disabled. All changes must go through Pull Requests.

#### Branch Naming Convention
- `feature/` - New features (e.g., `feature/add-dark-mode`)
- `fix/` - Bug fixes (e.g., `fix/transaction-validation`)
- `docs/` - Documentation changes (e.g., `docs/update-readme`)
- `refactor/` - Code refactoring (e.g., `refactor/api-helpers`)

#### Workflow

1. **Fork** the repository (external contributors) or **create a branch** (maintainers)
2. **Clone** (if forked): `git clone https://github.com/YOUR_USERNAME/budget_app.git`
3. **Create a branch**: `git checkout -b feature/amazing-feature`
4. **Make changes** following our code style
5. **Test** your changes:
   ```bash
   npm run check    # Type checking
   npm run build    # Build test
   ```
6. **Commit** with clear messages:
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```
   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` - New features
   - `fix:` - Bug fixes
   - `docs:` - Documentation
   - `refactor:` - Code refactoring
   - `style:` - Formatting changes
   - `test:` - Adding tests
7. **Push**: `git push origin feature/amazing-feature`
8. **Open a Pull Request** on GitHub with:
   - Clear title describing the change
   - Description of what changed and why
   - Reference any related issues (e.g., "Fixes #123")
   - Screenshots if UI changes
9. **Address review feedback** if requested
10. **Squash and merge** once approved

## Development Setup

```bash
# Clone the repository
git clone https://github.com/alexandruradu2002-pixel/budget_app.git
cd budget_app

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server (uses in-memory SQLite)
npm run dev
```

## Code Style Guidelines

### Svelte 5 Runes (Required)
We use Svelte 5 runes exclusively. No legacy syntax.

```svelte
<script lang="ts">
  // ✅ Correct
  let { data } = $props();
  let count = $state(0);
  let doubled = $derived(count * 2);
  
  // ❌ Wrong - no legacy syntax
  export let data;
  let count = 0;
  $: doubled = count * 2;
</script>
```

### TypeScript
- Always use TypeScript
- Define types in `src/lib/types.ts`
- Use constants from `src/lib/constants.ts`

### API Routes
Use helpers from `$lib/server/api-helpers`:

```typescript
import { requireAuth } from '$lib/server/middleware';
import { successResponse, createdResponse } from '$lib/server/api-helpers';
```

### Database
Direct SQL with `@libsql/client` - no ORM:

```typescript
import db from '$lib/server/db';
import type { InValue } from '@libsql/client';

const args: InValue[] = [userId, name];
await db.execute({ sql: 'SELECT * FROM accounts WHERE user_id = ?', args });
```

## Project Structure

```
src/lib/
├── server/           # Server-only code (db, auth, validation)
├── components/       # UI components (barrel exported via index.ts)
├── stores/           # Svelte 5 runes stores (*.svelte.ts)
├── utils/            # Client utilities (format.ts, etc.)
├── constants.ts      # Enums, labels, currencies
├── types.ts          # TypeScript interfaces
└── index.ts          # Main barrel export

src/routes/
├── api/              # REST endpoints (+server.ts)
├── demo/             # Demo page (public)
├── (protected)/      # Auth-required pages
└── login/            # Public auth pages
```

## Testing

```bash
npm run check    # TypeScript + svelte-check
npm run build    # Production build test
```

## Questions?

Feel free to open an issue for any questions about contributing!

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
