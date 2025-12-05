// ============================================
// Local Cache Store - Budget App
// Provides instant loading from localStorage while fetching fresh data
// ============================================

import type { Account, Category, CategoryGroup } from '$lib/types';

// Cache configuration
const CACHE_PREFIX = 'budget_cache_';
const CACHE_DURATION_MS = {
	accounts: 30 * 60 * 1000,     // 30 minutes - accounts rarely change
	categories: 30 * 60 * 1000,   // 30 minutes - categories rarely change
	payees: 60 * 60 * 1000,       // 1 hour - payees change even less
	categoryGroups: 30 * 60 * 1000 // 30 minutes
};

// Payee type for the cache
export interface Payee {
	id: number;
	name: string;
	use_count?: number;
}

// Re-export CategoryGroup from types for convenience
export type { CategoryGroup };

// Cache entry structure
interface CacheEntry<T> {
	data: T;
	timestamp: number;
	version: number;
}

// Current cache version - increment to invalidate all caches
const CACHE_VERSION = 1;

// ============================================
// Generic Cache Functions
// ============================================

function getCacheKey(key: string): string {
	return `${CACHE_PREFIX}${key}`;
}

function getFromCache<T>(key: string): T | null {
	if (typeof window === 'undefined') return null;
	
	try {
		const stored = localStorage.getItem(getCacheKey(key));
		if (!stored) return null;
		
		const entry: CacheEntry<T> = JSON.parse(stored);
		
		// Check version
		if (entry.version !== CACHE_VERSION) {
			localStorage.removeItem(getCacheKey(key));
			return null;
		}
		
		return entry.data;
	} catch {
		return null;
	}
}

function getTimestamp(key: string): number | null {
	if (typeof window === 'undefined') return null;
	
	try {
		const stored = localStorage.getItem(getCacheKey(key));
		if (!stored) return null;
		
		const entry: CacheEntry<unknown> = JSON.parse(stored);
		return entry.timestamp;
	} catch {
		return null;
	}
}

function setCache<T>(key: string, data: T): void {
	if (typeof window === 'undefined') return;
	
	try {
		const entry: CacheEntry<T> = {
			data,
			timestamp: Date.now(),
			version: CACHE_VERSION
		};
		localStorage.setItem(getCacheKey(key), JSON.stringify(entry));
	} catch {
		// localStorage might be full or disabled
		console.warn('Failed to cache data:', key);
	}
}

function isCacheValid(key: string, maxAge: number): boolean {
	const timestamp = getTimestamp(key);
	if (!timestamp) return false;
	return Date.now() - timestamp < maxAge;
}

function invalidateCache(key: string): void {
	if (typeof window === 'undefined') return;
	localStorage.removeItem(getCacheKey(key));
}

function invalidateAllCaches(): void {
	if (typeof window === 'undefined') return;
	
	const keysToRemove: string[] = [];
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (key?.startsWith(CACHE_PREFIX)) {
			keysToRemove.push(key);
		}
	}
	keysToRemove.forEach(key => localStorage.removeItem(key));
}

// ============================================
// Cache Store Implementation
// ============================================

function createCacheStore() {
	// Reactive state for each cached entity
	let accounts = $state<Account[]>([]);
	let categories = $state<Category[]>([]);
	let payees = $state<Payee[]>([]);
	let categoryGroups = $state<CategoryGroup[]>([]);
	
	// Loading states
	let accountsLoading = $state(false);
	let categoriesLoading = $state(false);
	let payeesLoading = $state(false);
	let categoryGroupsLoading = $state(false);

	// ---- Accounts ----
	async function loadAccounts(forceRefresh = false): Promise<Account[]> {
		// Try cache first
		if (!forceRefresh) {
			const cached = getFromCache<Account[]>('accounts');
			if (cached && isCacheValid('accounts', CACHE_DURATION_MS.accounts)) {
				accounts = cached;
				// Still fetch in background to ensure fresh data
				fetchAccountsInBackground();
				return cached;
			}
			// If cache exists but expired, use it while fetching
			if (cached) {
				accounts = cached;
			}
		}
		
		return await fetchAccounts();
	}

	async function fetchAccounts(): Promise<Account[]> {
		accountsLoading = true;
		try {
			const response = await fetch('/api/accounts?includeInactive=true');
			if (!response.ok) throw new Error('Failed to fetch accounts');
			
			const data = await response.json();
			const fetchedAccounts = data.accounts || [];
			
			accounts = fetchedAccounts;
			setCache('accounts', fetchedAccounts);
			
			return fetchedAccounts;
		} catch (err) {
			console.error('Failed to fetch accounts:', err);
			return accounts; // Return cached/current data on error
		} finally {
			accountsLoading = false;
		}
	}

	function fetchAccountsInBackground(): void {
		// Non-blocking background refresh
		fetchAccounts().catch(() => {});
	}

	// ---- Categories ----
	async function loadCategories(forceRefresh = false): Promise<Category[]> {
		if (!forceRefresh) {
			const cached = getFromCache<Category[]>('categories');
			if (cached && isCacheValid('categories', CACHE_DURATION_MS.categories)) {
				categories = cached;
				fetchCategoriesInBackground();
				return cached;
			}
			if (cached) {
				categories = cached;
			}
		}
		
		return await fetchCategories();
	}

	async function fetchCategories(): Promise<Category[]> {
		categoriesLoading = true;
		try {
			const response = await fetch('/api/categories');
			if (!response.ok) throw new Error('Failed to fetch categories');
			
			const data = await response.json();
			const fetchedCategories = data.categories || [];
			
			categories = fetchedCategories;
			setCache('categories', fetchedCategories);
			
			return fetchedCategories;
		} catch (err) {
			console.error('Failed to fetch categories:', err);
			return categories;
		} finally {
			categoriesLoading = false;
		}
	}

	function fetchCategoriesInBackground(): void {
		fetchCategories().catch(() => {});
	}

	// ---- Payees ----
	async function loadPayees(forceRefresh = false): Promise<Payee[]> {
		if (!forceRefresh) {
			const cached = getFromCache<Payee[]>('payees');
			if (cached && isCacheValid('payees', CACHE_DURATION_MS.payees)) {
				payees = cached;
				fetchPayeesInBackground();
				return cached;
			}
			if (cached) {
				payees = cached;
			}
		}
		
		return await fetchPayees();
	}

	async function fetchPayees(): Promise<Payee[]> {
		payeesLoading = true;
		try {
			const response = await fetch('/api/payees');
			if (!response.ok) throw new Error('Failed to fetch payees');
			
			const data = await response.json();
			const fetchedPayees = data.payees || [];
			
			payees = fetchedPayees;
			setCache('payees', fetchedPayees);
			
			return fetchedPayees;
		} catch (err) {
			console.error('Failed to fetch payees:', err);
			return payees;
		} finally {
			payeesLoading = false;
		}
	}

	function fetchPayeesInBackground(): void {
		fetchPayees().catch(() => {});
	}

	// ---- Category Groups ----
	async function loadCategoryGroups(forceRefresh = false): Promise<CategoryGroup[]> {
		if (!forceRefresh) {
			const cached = getFromCache<CategoryGroup[]>('categoryGroups');
			if (cached && isCacheValid('categoryGroups', CACHE_DURATION_MS.categoryGroups)) {
				categoryGroups = cached;
				fetchCategoryGroupsInBackground();
				return cached;
			}
			if (cached) {
				categoryGroups = cached;
			}
		}
		
		return await fetchCategoryGroups();
	}

	async function fetchCategoryGroups(): Promise<CategoryGroup[]> {
		categoryGroupsLoading = true;
		try {
			const response = await fetch('/api/category-groups');
			if (!response.ok) throw new Error('Failed to fetch category groups');
			
			const data = await response.json();
			const fetchedGroups = data.groups || [];
			
			categoryGroups = fetchedGroups;
			setCache('categoryGroups', fetchedGroups);
			
			return fetchedGroups;
		} catch (err) {
			console.error('Failed to fetch category groups:', err);
			return categoryGroups;
		} finally {
			categoryGroupsLoading = false;
		}
	}

	function fetchCategoryGroupsInBackground(): void {
		fetchCategoryGroups().catch(() => {});
	}

	// ---- Cache Invalidation ----
	function invalidateAccounts(): void {
		invalidateCache('accounts');
		accounts = [];
	}

	function invalidateCategories(): void {
		invalidateCache('categories');
		invalidateCache('categoryGroups');
		categories = [];
		categoryGroups = [];
	}

	function invalidatePayees(): void {
		invalidateCache('payees');
		payees = [];
	}

	function invalidateAll(): void {
		invalidateAllCaches();
		accounts = [];
		categories = [];
		payees = [];
		categoryGroups = [];
	}

	// ---- Preload commonly used data ----
	async function preloadEssentials(): Promise<void> {
		// Load accounts and categories in parallel - these are used everywhere
		await Promise.all([
			loadAccounts(),
			loadCategories()
		]);
	}

	return {
		// Accounts
		get accounts() { return accounts; },
		get accountsLoading() { return accountsLoading; },
		loadAccounts,
		invalidateAccounts,

		// Categories
		get categories() { return categories; },
		get categoriesLoading() { return categoriesLoading; },
		loadCategories,
		invalidateCategories,

		// Payees
		get payees() { return payees; },
		get payeesLoading() { return payeesLoading; },
		loadPayees,
		invalidatePayees,

		// Category Groups
		get categoryGroups() { return categoryGroups; },
		get categoryGroupsLoading() { return categoryGroupsLoading; },
		loadCategoryGroups,

		// Utility
		invalidateAll,
		preloadEssentials,

		// Get active accounts only
		get activeAccounts() {
			return accounts.filter(a => a.is_active);
		},

		// Get expense categories only
		get expenseCategories() {
			return categories.filter(c => c.type === 'expense');
		},

		// Get income categories only
		get incomeCategories() {
			return categories.filter(c => c.type === 'income');
		}
	};
}

export const cacheStore = createCacheStore();
