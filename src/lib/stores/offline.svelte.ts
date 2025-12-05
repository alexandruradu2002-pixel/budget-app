// ============================================
// Offline Store - Budget App
// IndexedDB-based offline storage with sync queue
// ============================================

import type { Account, Category, Transaction } from '$lib/types';
import type { Payee, CategoryGroup } from './cache.svelte';

// ============================================
// Types
// ============================================

interface SyncQueueItem {
	id: string;
	timestamp: number;
	method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
	url: string;
	body?: unknown;
	retries: number;
}

interface OfflineData {
	accounts: Account[];
	categories: Category[];
	transactions: Transaction[];
	payees: Payee[];
	categoryGroups: CategoryGroup[];
	dashboardStats: DashboardStats | null;
}

interface DashboardStats {
	totalBalance: number;
	monthlyIncome: number;
	monthlyExpenses: number;
	accountsCount: number;
}

interface CacheMetadata {
	key: string;
	timestamp: number;
	expiresAt: number;
}

// ============================================
// IndexedDB Setup
// ============================================

const DB_NAME = 'budget_app_offline';
const DB_VERSION = 1;

const STORES = {
	accounts: 'accounts',
	categories: 'categories',
	transactions: 'transactions',
	payees: 'payees',
	categoryGroups: 'categoryGroups',
	syncQueue: 'syncQueue',
	metadata: 'metadata',
	apiCache: 'apiCache'
} as const;

// Cache durations (in milliseconds)
const CACHE_DURATION = {
	accounts: 30 * 60 * 1000,      // 30 minutes
	categories: 30 * 60 * 1000,    // 30 minutes
	transactions: 5 * 60 * 1000,   // 5 minutes
	payees: 60 * 60 * 1000,        // 1 hour
	categoryGroups: 30 * 60 * 1000, // 30 minutes
	dashboard: 2 * 60 * 1000,      // 2 minutes
	apiCache: 5 * 60 * 1000        // 5 minutes for generic API responses
};

let db: IDBDatabase | null = null;

// ============================================
// Database Initialization
// ============================================

async function openDatabase(): Promise<IDBDatabase> {
	if (db) return db;
	
	return new Promise((resolve, reject) => {
		if (typeof window === 'undefined') {
			reject(new Error('IndexedDB not available on server'));
			return;
		}

		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => {
			console.error('Failed to open IndexedDB:', request.error);
			reject(request.error);
		};

		request.onsuccess = () => {
			db = request.result;
			resolve(db);
		};

		request.onupgradeneeded = (event) => {
			const database = (event.target as IDBOpenDBRequest).result;

			// Accounts store
			if (!database.objectStoreNames.contains(STORES.accounts)) {
				const store = database.createObjectStore(STORES.accounts, { keyPath: 'id' });
				store.createIndex('user_id', 'user_id', { unique: false });
				store.createIndex('is_active', 'is_active', { unique: false });
			}

			// Categories store
			if (!database.objectStoreNames.contains(STORES.categories)) {
				const store = database.createObjectStore(STORES.categories, { keyPath: 'id' });
				store.createIndex('type', 'type', { unique: false });
				store.createIndex('group_id', 'group_id', { unique: false });
			}

			// Transactions store
			if (!database.objectStoreNames.contains(STORES.transactions)) {
				const store = database.createObjectStore(STORES.transactions, { keyPath: 'id' });
				store.createIndex('account_id', 'account_id', { unique: false });
				store.createIndex('category_id', 'category_id', { unique: false });
				store.createIndex('date', 'date', { unique: false });
				store.createIndex('description', 'description', { unique: false });
			}

			// Payees store
			if (!database.objectStoreNames.contains(STORES.payees)) {
				const store = database.createObjectStore(STORES.payees, { keyPath: 'id' });
				store.createIndex('name', 'name', { unique: false });
			}

			// Category Groups store
			if (!database.objectStoreNames.contains(STORES.categoryGroups)) {
				const store = database.createObjectStore(STORES.categoryGroups, { keyPath: 'id' });
				store.createIndex('sort_order', 'sort_order', { unique: false });
			}

			// Sync Queue store
			if (!database.objectStoreNames.contains(STORES.syncQueue)) {
				const store = database.createObjectStore(STORES.syncQueue, { keyPath: 'id' });
				store.createIndex('timestamp', 'timestamp', { unique: false });
			}

			// Metadata store (for cache timestamps)
			if (!database.objectStoreNames.contains(STORES.metadata)) {
				database.createObjectStore(STORES.metadata, { keyPath: 'key' });
			}

			// API Cache store (for generic API responses)
			if (!database.objectStoreNames.contains(STORES.apiCache)) {
				const store = database.createObjectStore(STORES.apiCache, { keyPath: 'url' });
				store.createIndex('timestamp', 'timestamp', { unique: false });
			}
		};
	});
}

// ============================================
// Generic IndexedDB Operations
// ============================================

async function getAll<T>(storeName: string): Promise<T[]> {
	const database = await openDatabase();
	return new Promise((resolve, reject) => {
		const transaction = database.transaction(storeName, 'readonly');
		const store = transaction.objectStore(storeName);
		const request = store.getAll();

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function getById<T>(storeName: string, id: number | string): Promise<T | null> {
	const database = await openDatabase();
	return new Promise((resolve, reject) => {
		const transaction = database.transaction(storeName, 'readonly');
		const store = transaction.objectStore(storeName);
		const request = store.get(id);

		request.onsuccess = () => resolve(request.result || null);
		request.onerror = () => reject(request.error);
	});
}

async function getByIndex<T>(storeName: string, indexName: string, value: IDBValidKey): Promise<T[]> {
	const database = await openDatabase();
	return new Promise((resolve, reject) => {
		const transaction = database.transaction(storeName, 'readonly');
		const store = transaction.objectStore(storeName);
		const index = store.index(indexName);
		const request = index.getAll(value);

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function putOne<T>(storeName: string, item: T): Promise<void> {
	const database = await openDatabase();
	return new Promise((resolve, reject) => {
		const transaction = database.transaction(storeName, 'readwrite');
		const store = transaction.objectStore(storeName);
		const request = store.put(item);

		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

async function putMany<T>(storeName: string, items: T[]): Promise<void> {
	if (items.length === 0) return;
	
	const database = await openDatabase();
	return new Promise((resolve, reject) => {
		const transaction = database.transaction(storeName, 'readwrite');
		const store = transaction.objectStore(storeName);

		transaction.oncomplete = () => resolve();
		transaction.onerror = () => reject(transaction.error);

		for (const item of items) {
			store.put(item);
		}
	});
}

async function deleteOne(storeName: string, id: number | string): Promise<void> {
	const database = await openDatabase();
	return new Promise((resolve, reject) => {
		const transaction = database.transaction(storeName, 'readwrite');
		const store = transaction.objectStore(storeName);
		const request = store.delete(id);

		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

async function clearStore(storeName: string): Promise<void> {
	const database = await openDatabase();
	return new Promise((resolve, reject) => {
		const transaction = database.transaction(storeName, 'readwrite');
		const store = transaction.objectStore(storeName);
		const request = store.clear();

		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

// ============================================
// Cache Metadata Management
// ============================================

async function setMetadata(key: string, expiresIn: number): Promise<void> {
	const metadata: CacheMetadata = {
		key,
		timestamp: Date.now(),
		expiresAt: Date.now() + expiresIn
	};
	await putOne(STORES.metadata, metadata);
}

async function getMetadata(key: string): Promise<CacheMetadata | null> {
	return await getById<CacheMetadata>(STORES.metadata, key);
}

async function isCacheValid(key: string): Promise<boolean> {
	const metadata = await getMetadata(key);
	if (!metadata) return false;
	return Date.now() < metadata.expiresAt;
}

// ============================================
// Offline Store Implementation
// ============================================

function createOfflineStore() {
	// Reactive state
	let isOnline = $state(typeof navigator !== 'undefined' ? navigator.onLine : true);
	let isSyncing = $state(false);
	let pendingChanges = $state(0);
	let lastSyncTime = $state<number | null>(null);
	let syncError = $state<string | null>(null);

	// Initialize online/offline listeners
	function initNetworkListeners() {
		if (typeof window === 'undefined') return;

		window.addEventListener('online', () => {
			isOnline = true;
			// Auto-sync when coming back online
			syncPendingChanges();
		});

		window.addEventListener('offline', () => {
			isOnline = false;
		});

		// Also check periodically (some browsers don't fire events reliably)
		setInterval(() => {
			const wasOnline = isOnline;
			isOnline = navigator.onLine;
			if (!wasOnline && isOnline) {
				syncPendingChanges();
			}
		}, 5000);
	}

	// ============================================
	// Sync Queue Management
	// ============================================

	async function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>): Promise<void> {
		const queueItem: SyncQueueItem = {
			...item,
			id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			timestamp: Date.now(),
			retries: 0
		};
		await putOne(STORES.syncQueue, queueItem);
		pendingChanges = await getSyncQueueCount();
	}

	async function getSyncQueue(): Promise<SyncQueueItem[]> {
		return await getAll<SyncQueueItem>(STORES.syncQueue);
	}

	async function getSyncQueueCount(): Promise<number> {
		const queue = await getSyncQueue();
		return queue.length;
	}

	async function removeSyncQueueItem(id: string): Promise<void> {
		await deleteOne(STORES.syncQueue, id);
		pendingChanges = await getSyncQueueCount();
	}

	async function syncPendingChanges(): Promise<void> {
		if (!isOnline || isSyncing) return;

		const queue = await getSyncQueue();
		if (queue.length === 0) return;

		isSyncing = true;
		syncError = null;

		// Sort by timestamp to maintain order
		const sortedQueue = queue.sort((a, b) => a.timestamp - b.timestamp);

		for (const item of sortedQueue) {
			try {
				const response = await fetch(item.url, {
					method: item.method,
					headers: {
						'Content-Type': 'application/json'
					},
					body: item.body ? JSON.stringify(item.body) : undefined,
					credentials: 'include'
				});

				if (response.ok) {
					await removeSyncQueueItem(item.id);
				} else if (response.status >= 400 && response.status < 500) {
					// Client error - don't retry, just remove
					console.warn(`Sync item ${item.id} failed with ${response.status}, removing`);
					await removeSyncQueueItem(item.id);
				} else {
					// Server error - increment retries
					item.retries++;
					if (item.retries >= 3) {
						console.error(`Sync item ${item.id} failed after 3 retries, removing`);
						await removeSyncQueueItem(item.id);
					} else {
						await putOne(STORES.syncQueue, item);
					}
				}
			} catch (err) {
				console.error(`Failed to sync item ${item.id}:`, err);
				// Network error - will retry next time
			}
		}

		isSyncing = false;
		lastSyncTime = Date.now();
		pendingChanges = await getSyncQueueCount();
	}

	// ============================================
	// Data Operations with Offline Support
	// ============================================

	// Accounts
	async function getAccounts(forceRefresh = false): Promise<Account[]> {
		if (!forceRefresh) {
			const isValid = await isCacheValid('accounts');
			if (isValid) {
				return await getAll<Account>(STORES.accounts);
			}
		}

		if (!isOnline) {
			return await getAll<Account>(STORES.accounts);
		}

		try {
			const response = await fetch('/api/accounts?includeInactive=true', { credentials: 'include' });
			if (response.ok) {
				const data = await response.json();
				const accounts = data.accounts || [];
				await clearStore(STORES.accounts);
				await putMany(STORES.accounts, accounts);
				await setMetadata('accounts', CACHE_DURATION.accounts);
				return accounts;
			}
		} catch (err) {
			console.error('Failed to fetch accounts:', err);
		}

		return await getAll<Account>(STORES.accounts);
	}

	// Categories
	async function getCategories(forceRefresh = false): Promise<Category[]> {
		if (!forceRefresh) {
			const isValid = await isCacheValid('categories');
			if (isValid) {
				return await getAll<Category>(STORES.categories);
			}
		}

		if (!isOnline) {
			return await getAll<Category>(STORES.categories);
		}

		try {
			const response = await fetch('/api/categories', { credentials: 'include' });
			if (response.ok) {
				const data = await response.json();
				const categories = data.categories || [];
				await clearStore(STORES.categories);
				await putMany(STORES.categories, categories);
				await setMetadata('categories', CACHE_DURATION.categories);
				return categories;
			}
		} catch (err) {
			console.error('Failed to fetch categories:', err);
		}

		return await getAll<Category>(STORES.categories);
	}

	// Transactions
	async function getTransactions(accountId?: number, forceRefresh = false): Promise<Transaction[]> {
		const cacheKey = accountId ? `transactions_${accountId}` : 'transactions_all';
		
		if (!forceRefresh) {
			const isValid = await isCacheValid(cacheKey);
			if (isValid) {
				if (accountId) {
					return await getByIndex<Transaction>(STORES.transactions, 'account_id', accountId);
				}
				return await getAll<Transaction>(STORES.transactions);
			}
		}

		if (!isOnline) {
			if (accountId) {
				return await getByIndex<Transaction>(STORES.transactions, 'account_id', accountId);
			}
			return await getAll<Transaction>(STORES.transactions);
		}

		try {
			const url = accountId 
				? `/api/transactions?accountId=${accountId}` 
				: '/api/transactions';
			const response = await fetch(url, { credentials: 'include' });
			if (response.ok) {
				const data = await response.json();
				const transactions = data.transactions || [];
				
				if (!accountId) {
					await clearStore(STORES.transactions);
				}
				await putMany(STORES.transactions, transactions);
				await setMetadata(cacheKey, CACHE_DURATION.transactions);
				return transactions;
			}
		} catch (err) {
			console.error('Failed to fetch transactions:', err);
		}

		if (accountId) {
			return await getByIndex<Transaction>(STORES.transactions, 'account_id', accountId);
		}
		return await getAll<Transaction>(STORES.transactions);
	}

	// Payees
	async function getPayees(forceRefresh = false): Promise<Payee[]> {
		if (!forceRefresh) {
			const isValid = await isCacheValid('payees');
			if (isValid) {
				return await getAll<Payee>(STORES.payees);
			}
		}

		if (!isOnline) {
			return await getAll<Payee>(STORES.payees);
		}

		try {
			const response = await fetch('/api/payees', { credentials: 'include' });
			if (response.ok) {
				const data = await response.json();
				const payees = data.payees || [];
				await clearStore(STORES.payees);
				await putMany(STORES.payees, payees);
				await setMetadata('payees', CACHE_DURATION.payees);
				return payees;
			}
		} catch (err) {
			console.error('Failed to fetch payees:', err);
		}

		return await getAll<Payee>(STORES.payees);
	}

	// Category Groups
	async function getCategoryGroups(forceRefresh = false): Promise<CategoryGroup[]> {
		if (!forceRefresh) {
			const isValid = await isCacheValid('categoryGroups');
			if (isValid) {
				return await getAll<CategoryGroup>(STORES.categoryGroups);
			}
		}

		if (!isOnline) {
			return await getAll<CategoryGroup>(STORES.categoryGroups);
		}

		try {
			const response = await fetch('/api/category-groups', { credentials: 'include' });
			if (response.ok) {
				const data = await response.json();
				const groups = data.groups || [];
				await clearStore(STORES.categoryGroups);
				await putMany(STORES.categoryGroups, groups);
				await setMetadata('categoryGroups', CACHE_DURATION.categoryGroups);
				return groups;
			}
		} catch (err) {
			console.error('Failed to fetch category groups:', err);
		}

		return await getAll<CategoryGroup>(STORES.categoryGroups);
	}

	// ============================================
	// Mutation Operations (with offline queue)
	// ============================================

	async function createTransaction(data: Partial<Transaction>): Promise<{ success: boolean; id?: number; offline?: boolean }> {
		if (isOnline) {
			try {
				const response = await fetch('/api/transactions', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(data),
					credentials: 'include'
				});

				if (response.ok) {
					const result = await response.json();
					// Add to local cache
					const newTransaction = { ...data, id: result.id } as Transaction;
					await putOne(STORES.transactions, newTransaction);
					return { success: true, id: result.id };
				}
				return { success: false };
			} catch (err) {
				console.error('Failed to create transaction:', err);
			}
		}

		// Offline: create with temporary ID and queue for sync
		const tempId = -Date.now(); // Negative to distinguish from server IDs
		const newTransaction = { ...data, id: tempId } as Transaction;
		await putOne(STORES.transactions, newTransaction);
		await addToSyncQueue({
			method: 'POST',
			url: '/api/transactions',
			body: data
		});
		return { success: true, id: tempId, offline: true };
	}

	async function updateTransaction(id: number, data: Partial<Transaction>): Promise<{ success: boolean; offline?: boolean }> {
		if (isOnline) {
			try {
				const response = await fetch(`/api/transactions/${id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(data),
					credentials: 'include'
				});

				if (response.ok) {
					// Update local cache
					const existing = await getById<Transaction>(STORES.transactions, id);
					if (existing) {
						await putOne(STORES.transactions, { ...existing, ...data });
					}
					return { success: true };
				}
				return { success: false };
			} catch (err) {
				console.error('Failed to update transaction:', err);
			}
		}

		// Offline: update local and queue for sync
		const existing = await getById<Transaction>(STORES.transactions, id);
		if (existing) {
			await putOne(STORES.transactions, { ...existing, ...data });
		}
		await addToSyncQueue({
			method: 'PUT',
			url: `/api/transactions/${id}`,
			body: data
		});
		return { success: true, offline: true };
	}

	async function deleteTransaction(id: number): Promise<{ success: boolean; offline?: boolean }> {
		if (isOnline) {
			try {
				const response = await fetch(`/api/transactions/${id}`, {
					method: 'DELETE',
					credentials: 'include'
				});

				if (response.ok) {
					await deleteOne(STORES.transactions, id);
					return { success: true };
				}
				return { success: false };
			} catch (err) {
				console.error('Failed to delete transaction:', err);
			}
		}

		// Offline: remove local and queue for sync
		await deleteOne(STORES.transactions, id);
		await addToSyncQueue({
			method: 'DELETE',
			url: `/api/transactions/${id}`
		});
		return { success: true, offline: true };
	}

	// ============================================
	// Generic API Cache
	// ============================================

	interface ApiCacheEntry {
		url: string;
		data: unknown;
		timestamp: number;
		expiresAt: number;
	}

	async function getCachedApiResponse<T>(url: string): Promise<T | null> {
		try {
			const entry = await getById<ApiCacheEntry>(STORES.apiCache, url);
			if (entry && Date.now() < entry.expiresAt) {
				return entry.data as T;
			}
		} catch {
			// Ignore cache errors
		}
		return null;
	}

	async function setCachedApiResponse(url: string, data: unknown, ttl = CACHE_DURATION.apiCache): Promise<void> {
		const entry: ApiCacheEntry = {
			url,
			data,
			timestamp: Date.now(),
			expiresAt: Date.now() + ttl
		};
		await putOne(STORES.apiCache, entry);
	}

	// Fetch with offline support and caching
	async function fetchWithOffline<T>(url: string, options?: RequestInit & { ttl?: number }): Promise<T | null> {
		const ttl = options?.ttl ?? CACHE_DURATION.apiCache;

		// Try cache first if offline
		if (!isOnline) {
			return await getCachedApiResponse<T>(url);
		}

		try {
			const response = await fetch(url, {
				...options,
				credentials: options?.credentials ?? 'include'
			});

			if (response.ok) {
				const data = await response.json();
				await setCachedApiResponse(url, data, ttl);
				return data;
			}
		} catch (err) {
			console.error(`Failed to fetch ${url}:`, err);
		}

		// Fallback to cache on error
		return await getCachedApiResponse<T>(url);
	}

	// ============================================
	// Initialization
	// ============================================

	async function init(): Promise<void> {
		if (typeof window === 'undefined') return;

		initNetworkListeners();
		await openDatabase();
		pendingChanges = await getSyncQueueCount();

		// Try to sync on init if online
		if (isOnline) {
			syncPendingChanges();
		}
	}

	// ============================================
	// Cache Invalidation
	// ============================================

	async function invalidateCache(key?: string): Promise<void> {
		if (key) {
			await deleteOne(STORES.metadata, key);
		} else {
			await clearStore(STORES.metadata);
		}
	}

	async function clearAllData(): Promise<void> {
		await clearStore(STORES.accounts);
		await clearStore(STORES.categories);
		await clearStore(STORES.transactions);
		await clearStore(STORES.payees);
		await clearStore(STORES.categoryGroups);
		await clearStore(STORES.metadata);
		await clearStore(STORES.apiCache);
	}

	return {
		// State
		get isOnline() { return isOnline; },
		get isSyncing() { return isSyncing; },
		get pendingChanges() { return pendingChanges; },
		get lastSyncTime() { return lastSyncTime; },
		get syncError() { return syncError; },

		// Initialization
		init,

		// Data operations (read)
		getAccounts,
		getCategories,
		getTransactions,
		getPayees,
		getCategoryGroups,

		// Data operations (write)
		createTransaction,
		updateTransaction,
		deleteTransaction,

		// Generic fetch with offline support
		fetchWithOffline,

		// Sync
		syncPendingChanges,
		getSyncQueueCount,

		// Cache management
		invalidateCache,
		clearAllData
	};
}

export const offlineStore = createOfflineStore();
