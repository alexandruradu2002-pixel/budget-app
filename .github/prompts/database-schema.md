# Database Schema - All Columns

Reference document for all database tables and columns. Use this to identify unused columns.

---

## Table: `users`

| Column | Type | Default | Usage Status |
|--------|------|---------|--------------|
| `id` | INTEGER | AUTO | ✅ Used |
| `email` | TEXT | - | ✅ Used |
| `name` | TEXT | - | ✅ Used |
| `password_hash` | TEXT | - | ✅ Used (auth.ts) |
| `roles` | TEXT | `'["user"]'` | ✅ Used (hooks.server.ts, app.d.ts) |
| `created_at` | DATETIME | CURRENT_TIMESTAMP | ✅ Used |

---

## Table: `sessions`

| Column | Type | Default | Usage Status |
|--------|------|---------|--------------|
| `id` | TEXT | - | ✅ Used |
| `user_id` | INTEGER | - | ✅ Used |
| `expires_at` | DATETIME | - | ✅ Used |
| `created_at` | DATETIME | CURRENT_TIMESTAMP | ✅ Used |
| `user_agent` | TEXT | - | ⚠️ Written only (auth.ts), never read |
| `ip_address` | TEXT | - | ⚠️ Written only (auth.ts), never read |

---

## Table: `accounts`

| Column | Type | Default | Usage Status |
|--------|------|---------|--------------|
| `id` | INTEGER | AUTO | ✅ Used |
| `user_id` | INTEGER | - | ✅ Used |
| `name` | TEXT | - | ✅ Used |
| `type` | TEXT | - | ✅ Used |
| `balance` | REAL | 0 | ✅ Used |
| `currency` | TEXT | 'RON' | ✅ Used |
| `color` | TEXT | '#3B82F6' | ✅ Used |
| `icon` | TEXT | - | ⚠️ Stored but never displayed in UI |
| `notes` | TEXT | - | ✅ Used (accounts API) |
| `is_active` | BOOLEAN | 1 | ✅ Used |
| `ynab_account_name` | TEXT | - | ✅ Used (YNAB import) |
| `sort_order` | INTEGER | 0 | ✅ Used |
| `created_at` | DATETIME | CURRENT_TIMESTAMP | ✅ Used |
| `updated_at` | DATETIME | CURRENT_TIMESTAMP | ✅ Used |

---

## Table: `categories`

| Column | Type | Default | Usage Status |
|--------|------|---------|--------------|
| `id` | INTEGER | AUTO | ✅ Used |
| `user_id` | INTEGER | - | ✅ Used |
| `name` | TEXT | - | ✅ Used |
| `type` | TEXT | - | ✅ Used |
| `color` | TEXT | '#6B7280' | ✅ Used |
| `icon` | TEXT | - | ⚠️ Stored but never displayed in UI |
| `parent_id` | INTEGER | - | ✅ Used (hierarchy) |
| `group_name` | TEXT | - | ✅ Used |
| `is_active` | BOOLEAN | 1 | ✅ Used |
| `is_hidden` | BOOLEAN | 0 | ✅ Used |
| `sort_order` | INTEGER | 0 | ✅ Used |
| `group_sort_order` | INTEGER | 0 | ✅ Used |
| `created_at` | DATETIME | CURRENT_TIMESTAMP | ✅ Used |

---

## Table: `transactions`

| Column | Type | Default | Usage Status |
|--------|------|---------|--------------|
| `id` | INTEGER | AUTO | ✅ Used |
| `user_id` | INTEGER | - | ✅ Used |
| `account_id` | INTEGER | - | ✅ Used |
| `category_id` | INTEGER | - | ✅ Used |
| `amount` | REAL | - | ✅ Used |
| `description` | TEXT | - | ✅ Used |
| `date` | TEXT | - | ✅ Used |
| `payee` | TEXT | - | ✅ Used |
| `memo` | TEXT | - | ✅ Used |
| `cleared` | TEXT | - | ✅ Used |
| `transfer_account_id` | INTEGER | - | ✅ Used (transfers) |
| `notes` | TEXT | - | ✅ Used |
| `tags` | TEXT | - | ✅ Used (stored as JSON) |
| `ynab_import_id` | TEXT | - | ✅ Used (YNAB import) |
| `created_at` | DATETIME | CURRENT_TIMESTAMP | ✅ Used |
| `updated_at` | DATETIME | CURRENT_TIMESTAMP | ✅ Used |

---

## Table: `budgets`

| Column | Type | Default | Usage Status |
|--------|------|---------|--------------|
| `id` | INTEGER | AUTO | ✅ Used |
| `user_id` | INTEGER | - | ✅ Used |
| `category_id` | INTEGER | - | ✅ Used |
| `amount` | REAL | - | ✅ Used |
| `period` | TEXT | 'monthly' | ✅ Used |
| `currency` | TEXT | 'RON' | ✅ Used |
| `start_date` | TEXT | - | ✅ Used |
| `end_date` | TEXT | - | ✅ Used |
| `is_active` | BOOLEAN | 1 | ✅ Used |
| `created_at` | DATETIME | CURRENT_TIMESTAMP | ✅ Used |

---

## Table: `budget_allocations`

| Column | Type | Default | Usage Status |
|--------|------|---------|--------------|
| `id` | INTEGER | AUTO | ✅ Used |
| `user_id` | INTEGER | - | ✅ Used |
| `category_id` | INTEGER | - | ✅ Used |
| `month` | TEXT | - | ✅ Used |
| `assigned` | REAL | 0 | ✅ Used |
| `activity` | REAL | 0 | ✅ Used |
| `available` | REAL | 0 | ✅ Used |
| `created_at` | DATETIME | CURRENT_TIMESTAMP | ✅ Used |
| `updated_at` | DATETIME | CURRENT_TIMESTAMP | ✅ Used |

---

## Table: `payees`

| Column | Type | Default | Usage Status |
|--------|------|---------|--------------|
| `id` | INTEGER | AUTO | ✅ Used |
| `user_id` | INTEGER | - | ✅ Used |
| `name` | TEXT | - | ✅ Used |
| `created_at` | DATETIME | CURRENT_TIMESTAMP | ✅ Used |

---

## Table: `category_groups`

| Column | Type | Default | Usage Status |
|--------|------|---------|--------------|
| `id` | INTEGER | AUTO | ✅ Used |
| `user_id` | INTEGER | - | ✅ Used |
| `name` | TEXT | - | ✅ Used |
| `sort_order` | INTEGER | 0 | ✅ Used |
| `created_at` | DATETIME | CURRENT_TIMESTAMP | ✅ Used |

---

## Table: `learned_locations`

| Column | Type | Default | Usage Status |
|--------|------|---------|--------------|
| `id` | INTEGER | AUTO | ✅ Used |
| `user_id` | INTEGER | - | ✅ Used |
| `latitude` | REAL | - | ✅ Used |
| `longitude` | REAL | - | ✅ Used |
| `radius` | INTEGER | 50 | ✅ Used (locations API) |
| `payee` | TEXT | - | ✅ Used |
| `category_id` | INTEGER | - | ✅ Used |
| `account_id` | INTEGER | - | ✅ Used |
| `times_used` | INTEGER | 1 | ✅ Used |
| `last_used` | DATETIME | CURRENT_TIMESTAMP | ✅ Used |
| `created_at` | DATETIME | CURRENT_TIMESTAMP | ✅ Used |

---

## Potentially Unused Columns (Candidates for Removal)

| Table | Column | Notes |
|-------|--------|-------|
| `sessions` | `user_agent` | Written during session creation but never queried/displayed |
| `sessions` | `ip_address` | Written during session creation but never queried/displayed |
| `accounts` | `icon` | Stored in DB and API but no UI displays it |
| `categories` | `icon` | Stored in DB and API but no UI displays it |

### Notes:
- **`user_agent` / `ip_address`**: Could be useful for security audit logs, but currently not used
- **`icon` fields**: The schema supports custom icons but the UI doesn't implement icon selection or display

---

## Database Indexes

```sql
idx_sessions_user_id ON sessions(user_id)
idx_accounts_user_id ON accounts(user_id)
idx_categories_user_id ON categories(user_id)
idx_categories_group ON categories(group_name)
idx_transactions_user_id ON transactions(user_id)
idx_transactions_date ON transactions(date)
idx_transactions_payee ON transactions(payee)
idx_transactions_ynab_import ON transactions(ynab_import_id)
idx_budgets_user_id ON budgets(user_id)
idx_budget_allocations_user_id ON budget_allocations(user_id)
idx_budget_allocations_month ON budget_allocations(month)
idx_category_groups_user_id ON category_groups(user_id)
idx_payees_user_id ON payees(user_id)
idx_learned_locations_user_id ON learned_locations(user_id)
idx_learned_locations_coords ON learned_locations(latitude, longitude)
```
