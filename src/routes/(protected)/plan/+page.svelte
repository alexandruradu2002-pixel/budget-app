<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import type { CategoryGroup, Account, Category, CategoryBudget, Transaction } from '$lib/types';
	import type { CurrencyValue } from '$lib/constants';
	import { TransactionModal, LoadingState, PageHeader, HeaderButton, FloatingActionButton } from '$lib/components';
	import { formatCurrency, formatMonthYearShort } from '$lib/utils/format';
	import { currencyStore, offlineStore, toast, transactionStore } from '$lib/stores';

	// Constants
	const UNCATEGORIZED = 'Uncategorized';
	const HIDDEN_GROUP = 'Hidden';
	const PLAN_RANGE_STORAGE_KEY = 'plan-custom-range';

	// Initialize currency store from localStorage - only on client
	$effect(() => {
		if (browser) currencyStore.init();
	});

	// Custom range type
	type PlanRangeMode = 'single' | 'custom';
	interface PlanRange {
		mode: PlanRangeMode;
		startDate: string; // YYYY-MM-DD format
		endDate: string; // YYYY-MM-DD format
		// Keep month/year for single mode
		startMonth?: number;
		startYear?: number;
	}

	// Load saved range from localStorage
	function loadSavedRange(): PlanRange | null {
		try {
			const saved = localStorage.getItem(PLAN_RANGE_STORAGE_KEY);
			if (saved) {
				return JSON.parse(saved);
			}
		} catch (e) {
			console.error('Failed to load saved plan range:', e);
		}
		return null;
	}

	// Save range to localStorage
	function saveRange(range: PlanRange) {
		try {
			localStorage.setItem(PLAN_RANGE_STORAGE_KEY, JSON.stringify(range));
		} catch (e) {
			console.error('Failed to save plan range:', e);
		}
	}

	// Current month state (for single month mode or default)
	let currentDate = $state(new Date());
	let showMonthPicker = $state(false);
	let pickerYear = $state(new Date().getFullYear());

	// Custom range state - using full dates
	let rangeMode = $state<PlanRangeMode>('single');
	let customStartDate = $state(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
	let customEndDate = $state(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
	let rangePickerTab = $state<'start' | 'end'>('start');
	
	// Calendar state for range pickers
	let rangeStartCalendarMonth = $state(new Date().getMonth());
	let rangeStartCalendarYear = $state(new Date().getFullYear());
	let rangeEndCalendarMonth = $state(new Date().getMonth());
	let rangeEndCalendarYear = $state(new Date().getFullYear());
	let rangeInitialized = $state(false);

	// Initialize from localStorage on mount - only on client
	$effect(() => {
		if (!browser) return;
		
		const saved = loadSavedRange();
		if (saved) {
			rangeMode = saved.mode;
			if (saved.mode === 'custom' && saved.startDate && saved.endDate) {
				customStartDate = saved.startDate;
				customEndDate = saved.endDate;
				// Set calendar months to match saved dates
				const startParts = saved.startDate.split('-').map(Number);
				const endParts = saved.endDate.split('-').map(Number);
				rangeStartCalendarYear = startParts[0];
				rangeStartCalendarMonth = startParts[1] - 1;
				rangeEndCalendarYear = endParts[0];
				rangeEndCalendarMonth = endParts[1] - 1;
			} else if (saved.mode === 'single' && saved.startMonth !== undefined && saved.startYear !== undefined) {
				// Restore single month mode - set currentDate to the saved month/year
				currentDate = new Date(saved.startYear, saved.startMonth, 1);
				pickerYear = saved.startYear;
			}
		}
		rangeInitialized = true;
	});

	// Months with transactions (year-month format: "2025-01")
	let monthsWithTransactions = $state<Set<string>>(new Set());

	// Month names for the calendar grid
	const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const monthNamesFull = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 
		'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
	const dayNames = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

	// Calendar helper functions
	function getDaysInMonth(year: number, month: number): number {
		return new Date(year, month + 1, 0).getDate();
	}

	function getFirstDayOfMonth(year: number, month: number): number {
		// Return 0 for Monday, 6 for Sunday (European week starts Monday)
		const day = new Date(year, month, 1).getDay();
		return day === 0 ? 6 : day - 1;
	}

	// Generate calendar days for start date picker
	let startCalendarDays = $derived.by(() => {
		const daysInMonth = getDaysInMonth(rangeStartCalendarYear, rangeStartCalendarMonth);
		const firstDay = getFirstDayOfMonth(rangeStartCalendarYear, rangeStartCalendarMonth);
		const days: (number | null)[] = [];
		
		for (let i = 0; i < firstDay; i++) {
			days.push(null);
		}
		for (let i = 1; i <= daysInMonth; i++) {
			days.push(i);
		}
		return days;
	});

	// Generate calendar days for end date picker
	let endCalendarDays = $derived.by(() => {
		const daysInMonth = getDaysInMonth(rangeEndCalendarYear, rangeEndCalendarMonth);
		const firstDay = getFirstDayOfMonth(rangeEndCalendarYear, rangeEndCalendarMonth);
		const days: (number | null)[] = [];
		
		for (let i = 0; i < firstDay; i++) {
			days.push(null);
		}
		for (let i = 1; i <= daysInMonth; i++) {
			days.push(i);
		}
		return days;
	});

	// Format date for display
	function formatDateShort(dateStr: string): string {
		const [year, month, day] = dateStr.split('-').map(Number);
		return `${day} ${monthNames[month - 1]} ${year}`;
	}

	// Load months that have transactions
	async function loadMonthsWithTransactions() {
		try {
			// Fetch all transactions to determine which months have data
			const res = await fetch('/api/transactions?limit=10000');
			if (res.ok) {
				const data = await res.json();
				const months = new Set<string>();
				for (const t of data.transactions || []) {
					const date = new Date(t.date);
					const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
					months.add(key);
				}
				monthsWithTransactions = months;
			}
		} catch (e) {
			console.error('Failed to load months with transactions:', e);
		}
	}

	// Check if a month has transactions
	function hasTransactions(year: number, month: number): boolean {
		const key = `${year}-${String(month + 1).padStart(2, '0')}`;
		return monthsWithTransactions.has(key);
	}

	// Transaction modal state
	let showTransactionModal = $state(false);
	let accounts = $state<Account[]>([]);
	let categories = $state<Category[]>([]);

	// Loading state
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Category groups from API
	let categoryGroups = $state<CategoryGroup[]>([]);

	// Transactions for the current month
	let transactions = $state<Transaction[]>([]);

	// Map of account_id to currency for conversion
	let accountCurrencies = $state<Map<number, CurrencyValue>>(new Map());

	// Calculate cashflow: sum of all transactions in the month
	// Excludes: account transfers and balance adjustment transactions
	// Positive = income, negative = expenses. Net result shows overall cashflow.
	let cashflow = $derived.by(() => {
		// Access currencyStore.value to create reactivity dependency
		const _ = currencyStore.value;
		
		// Patterns for adjustment transactions to exclude
		const adjustmentPatterns = [
			'Closing Balance',
			'Reconciliation Adjustment',
			'Balance Adjustment',
			'Starting Balance'
		];
		
		let total = 0;
		for (const t of transactions) {
			// Skip account transfers (transfer_account_id is set)
			if (t.transfer_account_id) continue;
			
			// Skip adjustment transactions based on description/payee
			const desc = (t.description || '').toLowerCase();
			const payee = (t.payee || '').toLowerCase();
			const isAdjustment = adjustmentPatterns.some(pattern => 
				desc.includes(pattern.toLowerCase()) || payee.includes(pattern.toLowerCase())
			);
			if (isAdjustment) continue;
			
			// Get the currency of the transaction's account
			const accountCurrency = accountCurrencies.get(t.account_id) || 'RON';
			// Convert to main currency, keep original sign
			const convertedAmount = currencyStore.convert(t.amount, accountCurrency);
			total += convertedAmount;
		}
		return total;
	});

	// Calculate total spent per category (converting to main currency)
	// For spending: negative amounts become positive (expenses shown as positive spent)
	// Track currencyStore.value to re-compute when main currency changes
	let spentByCategory = $derived.by(() => {
		// Access currencyStore.value to create reactivity dependency
		const _ = currencyStore.value;
		
		const spent = new Map<number, number>();
		for (const t of transactions) {
			if (t.category_id) {
				// Get the currency of the transaction's account
				const accountCurrency = accountCurrencies.get(t.account_id) || 'RON';
				// Convert to main currency - invert sign so expenses show as positive
				const convertedAmount = currencyStore.convert(-t.amount, accountCurrency);
				
				const current = spent.get(t.category_id) || 0;
				spent.set(t.category_id, current + convertedAmount);
			}
		}
		return spent;
	});

	// Map of category_id to target { amount, currency }
	let targetByCategory = $state<Map<number, { amount: number; currency: string }>>(new Map());
	
	// Converted targets in main currency (reactive to currency changes)
	let convertedTargets = $derived.by(() => {
		// Access currencyStore.value to create reactivity dependency
		const _ = currencyStore.value;
		
		const converted = new Map<number, number>();
		for (const [catId, target] of targetByCategory) {
			const convertedAmount = currencyStore.convert(target.amount, target.currency as CurrencyValue);
			converted.set(catId, convertedAmount);
		}
		return converted;
	});

	// Total target remaining: sum of (target - spent) for each category, only positive values
	// When spent reaches or exceeds target, that category contributes 0 to total
	let totalTargetRemaining = $derived.by(() => {
		// Dependencies for reactivity
		const _ = currencyStore.value;
		
		let total = 0;
		for (const [catId, target] of convertedTargets) {
			const spent = spentByCategory.get(catId) || 0;
			const remaining = Math.max(0, target - spent);
			total += remaining;
		}
		return total;
	});

	// Calculate min and max spent values for gradient coloring
	// Positive spent = expenses (yellow/gold), Negative spent = income (green), Zero = neutral (white)
	let spentRange = $derived.by(() => {
		const values = Array.from(spentByCategory.values());
		if (values.length === 0) return { min: 0, max: 0 };
		
		const positives = values.filter(v => v > 0);
		const negatives = values.filter(v => v < 0);
		
		return {
			min: negatives.length > 0 ? Math.min(...negatives) : 0,
			max: positives.length > 0 ? Math.max(...positives) : 0
		};
	});

	// Get color for spent value based on gradient
	// Positive values: white to red (more positive = more red = more expenses)
	// Negative values: white to bright green (more negative = more green = more income)
	// Zero: white
	function getSpentColor(spent: number): string {
		if (spent === 0) return 'var(--color-text-primary)';
		
		const { min, max } = spentRange;
		
		if (spent > 0 && max > 0) {
			// Positive: interpolate from white to red (expenses)
			const intensity = spent / max;
			// Red color: rgb(239, 68, 68) - danger red
			const r = Math.round(255);
			const g = Math.round(255 - (255 - 68) * intensity);
			const b = Math.round(255 - (255 - 68) * intensity);
			return `rgb(${r}, ${g}, ${b})`;
		} else if (spent < 0 && min < 0) {
			// Negative: interpolate from white to bright neon green (income)
			const intensity = spent / min; // Both negative, so this gives positive ratio
			// Bright neon green: rgb(0, 255, 100) - very bright green
			const r = Math.round(255 - 255 * intensity);
			const g = Math.round(255);
			const b = Math.round(255 - (255 - 100) * intensity);
			return `rgb(${r}, ${g}, ${b})`;
		}
		
		return 'var(--color-text-primary)';
	}

	// Load categories and build groups
	async function loadCategories() {
		loading = true;
		error = null;
		try {
			// Get date range based on mode
			let startDate: string;
			let endDate: string;
			
			if (rangeMode === 'custom') {
				// Custom range mode - use exact dates
				startDate = customStartDate;
				endDate = customEndDate;
			} else {
				// Single month mode
				const year = currentDate.getFullYear();
				const month = currentDate.getMonth();
				startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
				const lastDay = new Date(year, month + 1, 0).getDate();
				endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
			}

			// Fetch categories, transactions, accounts, and groups in parallel
			// Add cache-busting timestamp to ensure fresh data
			const cacheBust = `_t=${Date.now()}`;
			const [catRes, transRes, accountsRes, groupsRes] = await Promise.all([
				fetch(`/api/categories?includeTargets=true&${cacheBust}`),
				fetch(`/api/transactions?startDate=${startDate}&endDate=${endDate}&limit=1000&${cacheBust}`),
				fetch(`/api/accounts?${cacheBust}`),
				fetch(`/api/category-groups?${cacheBust}`)
			]);

			if (!catRes.ok) throw new Error('Failed to load categories');
			
			const catData = await catRes.json();
			categories = catData.categories || [];
			
			// Build target map from categories (with currency)
			const newTargetMap = new Map<number, { amount: number; currency: string }>();
			for (const cat of categories) {
				if (cat.target) {
					newTargetMap.set(cat.id, {
						amount: cat.target,
						currency: cat.target_currency || 'RON'
					});
				}
			}
			targetByCategory = newTargetMap;
			
			if (transRes.ok) {
				const transData = await transRes.json();
				transactions = transData.transactions || [];
				console.log('[Plan] Loaded transactions:', transactions.length, 'items');
			}
			
			// Build account currency map
			if (accountsRes.ok) {
				const accountsData = await accountsRes.json();
				accounts = accountsData.accounts || [];
				const currencyMap = new Map<number, CurrencyValue>();
				for (const acc of accounts) {
					currencyMap.set(acc.id, (acc.currency as CurrencyValue) || 'RON');
				}
				accountCurrencies = currencyMap;
			}

			// Get groups from DB with their sort orders
			let groupSortOrders = new Map<string, number>();
			if (groupsRes.ok) {
				const groupsData = await groupsRes.json();
				const groups = groupsData.groups || [];
				groups.forEach((g: { name: string; sort_order: number }, idx: number) => {
					groupSortOrders.set(g.name, g.sort_order ?? idx);
				});
			}
			
			// Group categories by group_name
			const groupMap = new Map<string, Category[]>();

			// First, add all groups from DB (even empty ones, except Hidden/Uncategorized which are special)
			for (const [groupName] of groupSortOrders) {
				if (groupName !== HIDDEN_GROUP && groupName !== UNCATEGORIZED) {
					groupMap.set(groupName, []);
				}
			}
			
			for (const cat of categories) {
				const groupName = cat.group_name || UNCATEGORIZED;
				
				if (!groupMap.has(groupName)) {
					groupMap.set(groupName, []);
				}
				groupMap.get(groupName)!.push(cat);
			}
			
			// Convert to CategoryGroup array
			let groupId = 1;
			categoryGroups = Array.from(groupMap.entries())
				// Filter out Uncategorized and Hidden if empty
				.filter(([name, cats]) => (name !== UNCATEGORIZED && name !== HIDDEN_GROUP) || cats.length > 0)
				.map(([name, cats]) => {
					const categoryBudgets: CategoryBudget[] = cats.map(cat => ({
						id: cat.id,
						category_id: cat.id,
						name: cat.name,
						assigned: 0,
						activity: 0,
						available: 0,
						color: cat.color,
						icon: cat.icon
					}));
					
					// Calculate total spent for this group
					const groupSpent = cats.reduce((total, cat) => {
						return total + (spentByCategory.get(cat.id) || 0);
					}, 0);
					
					return {
						id: groupId++,
						name,
						assigned: groupSpent,  // Using assigned to store spent for the group
						available: 0,
						categories: categoryBudgets,
						// Uncategorized and Hidden collapsed by default
						isExpanded: name !== UNCATEGORIZED && name !== HIDDEN_GROUP
					};
				})
				// Sort: Hidden at the very end, Uncategorized before Hidden, then by sort_order
				.sort((a, b) => {
					if (a.name === HIDDEN_GROUP) return 1;
					if (b.name === HIDDEN_GROUP) return -1;
					if (a.name === UNCATEGORIZED) return 1;
					if (b.name === UNCATEGORIZED) return -1;
					// Sort by saved sort order from DB, fallback to alphabetical
					const orderA = groupSortOrders.get(a.name) ?? 999;
					const orderB = groupSortOrders.get(b.name) ?? 999;
					if (orderA !== orderB) return orderA - orderB;
					return a.name.localeCompare(b.name);
				});
		} catch (e) {
			console.error('Failed to load categories:', e);
			error = e instanceof Error ? e.message : 'Failed to load categories';
			
			// Try offline fallback
			if (!offlineStore.isOnline) {
				try {
					const [offlineCategories, offlineTransactions, offlineAccounts, offlineGroups] = await Promise.all([
						offlineStore.getCategories(),
						offlineStore.getTransactions(),
						offlineStore.getAccounts(),
						offlineStore.getCategoryGroups()
					]);

					if (offlineCategories.length > 0) {
						categories = offlineCategories;
						transactions = offlineTransactions;
						accounts = offlineAccounts;
						
						// Build account currency map
						const currencyMap = new Map<number, CurrencyValue>();
						for (const acc of accounts) {
							currencyMap.set(acc.id, (acc.currency as CurrencyValue) || 'RON');
						}
						accountCurrencies = currencyMap;
						
						toast.info('Showing cached plan data.');
						error = null;
					}
				} catch {
					// Ignore offline fallback errors
				}
			}
		} finally {
			loading = false;
		}
	}

	// Load accounts and categories for the modal
	async function loadModalData() {
		try {
			const accountsRes = await fetch('/api/accounts');
			if (accountsRes.ok) {
				const data = await accountsRes.json();
				accounts = data.accounts || [];
			}
		} catch (e) {
			console.error('Failed to load modal data:', e);
		}
	}

	async function openTransactionModal() {
		await loadModalData();
		showTransactionModal = true;
	}

	async function handleSaveTransaction(payload: any) {
		try {
			console.log('[Plan] Sending payload to API:', payload);
			const res = await fetch('/api/transactions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}));
				console.error('[Plan] API Error:', res.status, errorData);
				throw new Error(errorData.message || 'Failed to save');
			}
			const result = await res.json();
			console.log('[Plan] Transaction saved successfully:', result);
			// Reload categories to update spent amounts
			console.log('[Plan] Reloading categories after save...');
			await loadCategories();
			console.log('[Plan] Categories reloaded');
		} catch (e) {
			console.error('[Plan] Failed to save transaction:', e);
		}
	}

	// Display title - shows range or single month
	let displayMonth = $derived.by(() => {
		if (rangeMode === 'custom') {
			const startStr = formatDateShort(customStartDate);
			const endStr = formatDateShort(customEndDate);
			if (customStartDate === customEndDate) {
				return startStr;
			}
			return `${startStr} - ${endStr}`;
		}
		return formatMonthYearShort(currentDate);
	});

	function toggleGroup(groupId: number) {
		categoryGroups = categoryGroups.map(group => 
			group.id === groupId 
				? { ...group, isExpanded: !group.isExpanded }
				: group
		);
	}

	// Month navigation functions
	function toggleMonthPicker() {
		if (!showMonthPicker) {
			// Reset picker year to current selected year when opening
			if (rangeMode === 'single') {
				pickerYear = currentDate.getFullYear();
			}
			loadMonthsWithTransactions();
		}
		showMonthPicker = !showMonthPicker;
	}

	function selectMonth(month: number) {
		rangeMode = 'single';
		currentDate = new Date(pickerYear, month, 1);
		// Save single month mode
		saveRange({
			mode: 'single',
			startDate: `${pickerYear}-${String(month + 1).padStart(2, '0')}-01`,
			endDate: `${pickerYear}-${String(month + 1).padStart(2, '0')}-${String(getDaysInMonth(pickerYear, month)).padStart(2, '0')}`,
			startMonth: month,
			startYear: pickerYear
		});
		showMonthPicker = false;
	}

	function isSelectedMonth(month: number): boolean {
		if (rangeMode === 'custom') {
			return false; // Don't highlight in single-month mode when in custom range
		}
		return currentDate.getFullYear() === pickerYear && 
			   currentDate.getMonth() === month;
	}

	// Custom range day selection
	function selectRangeStartDay(day: number) {
		const month = String(rangeStartCalendarMonth + 1).padStart(2, '0');
		const dayStr = String(day).padStart(2, '0');
		customStartDate = `${rangeStartCalendarYear}-${month}-${dayStr}`;
		// Auto-switch to end tab after selecting start
		rangePickerTab = 'end';
	}

	function selectRangeEndDay(day: number) {
		const month = String(rangeEndCalendarMonth + 1).padStart(2, '0');
		const dayStr = String(day).padStart(2, '0');
		customEndDate = `${rangeEndCalendarYear}-${month}-${dayStr}`;
	}

	function isStartDaySelected(day: number): boolean {
		const [year, month, d] = customStartDate.split('-').map(Number);
		return day === d && rangeStartCalendarMonth === month - 1 && rangeStartCalendarYear === year;
	}

	function isEndDaySelected(day: number): boolean {
		const [year, month, d] = customEndDate.split('-').map(Number);
		return day === d && rangeEndCalendarMonth === month - 1 && rangeEndCalendarYear === year;
	}

	function applyCustomRange() {
		// Validate that end is >= start
		const startDateObj = new Date(customStartDate);
		const endDateObj = new Date(customEndDate);
		
		if (endDateObj < startDateObj) {
			// Swap if end is before start
			const temp = customStartDate;
			customStartDate = customEndDate;
			customEndDate = temp;
		}
		
		rangeMode = 'custom';
		
		// Save to localStorage
		saveRange({
			mode: 'custom',
			startDate: customStartDate,
			endDate: customEndDate
		});
		
		showMonthPicker = false;
		// Trigger reload
		loadCategories();
	}

	function clearCustomRange() {
		rangeMode = 'single';
		currentDate = new Date();
		const today = new Date().toISOString().split('T')[0];
		customStartDate = today;
		customEndDate = today;
		
		// Save single month mode
		const month = currentDate.getMonth();
		const year = currentDate.getFullYear();
		saveRange({
			mode: 'single',
			startDate: `${year}-${String(month + 1).padStart(2, '0')}-01`,
			endDate: `${year}-${String(month + 1).padStart(2, '0')}-${String(getDaysInMonth(year, month)).padStart(2, '0')}`,
			startMonth: month,
			startYear: year
		});
	}

	// Calendar navigation for range pickers
	function prevStartMonth() {
		if (rangeStartCalendarMonth === 0) {
			rangeStartCalendarMonth = 11;
			rangeStartCalendarYear--;
		} else {
			rangeStartCalendarMonth--;
		}
	}

	function nextStartMonth() {
		if (rangeStartCalendarMonth === 11) {
			rangeStartCalendarMonth = 0;
			rangeStartCalendarYear++;
		} else {
			rangeStartCalendarMonth++;
		}
	}

	function prevEndMonth() {
		if (rangeEndCalendarMonth === 0) {
			rangeEndCalendarMonth = 11;
			rangeEndCalendarYear--;
		} else {
			rangeEndCalendarMonth--;
		}
	}

	function nextEndMonth() {
		if (rangeEndCalendarMonth === 11) {
			rangeEndCalendarMonth = 0;
			rangeEndCalendarYear++;
		} else {
			rangeEndCalendarMonth++;
		}
	}

	function prevYear() {
		pickerYear = pickerYear - 1;
	}

	function nextYear() {
		pickerYear = pickerYear + 1;
	}

	// Track last known update counter and date/mode to detect changes
	let lastUpdateCounter = $state(-1);
	let lastDateKey = $state('');
	let lastRangeMode = $state('');

	// Single unified effect for loading data - reacts to date changes AND transaction changes
	// Only runs on client to avoid SSR issues
	$effect(() => {
		// Skip during SSR to prevent hydration mismatches
		if (!browser) return;
		
		// Wait for initialization to complete
		if (!rangeInitialized) return;
		
		// Read all reactive dependencies
		const currentCounter = transactionStore.updateCounter;
		const dateKey = rangeMode === 'custom' 
			? `${customStartDate}-${customEndDate}` 
			: `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
		const currentRangeMode = rangeMode;
		
		// Check what changed
		const counterChanged = currentCounter !== lastUpdateCounter;
		const dateChanged = dateKey !== lastDateKey;
		const modeChanged = currentRangeMode !== lastRangeMode;
		
		if (counterChanged || dateChanged || modeChanged) {
			console.log('[Plan] Loading data - counter:', currentCounter, 'dateKey:', dateKey, 'mode:', currentRangeMode);
			
			// Update tracked values AFTER checking but BEFORE loading
			lastUpdateCounter = currentCounter;
			lastDateKey = dateKey;
			lastRangeMode = currentRangeMode;
			
			loadCategories();
		}
	});
</script>

<div class="plan-page">
	<!-- Header with month and actions -->
	<PageHeader title={displayMonth} onTitleClick={toggleMonthPicker}>
		<HeaderButton label="Edit categories" href="/plan/categories">
			<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
			</svg>
		</HeaderButton>
	</PageHeader>

	<!-- Cashflow and Target Summary -->
	<div class="summary-row">
		<div class="summary-item">
			<span class="summary-label">Cashflow</span>
			<span class="summary-value" class:positive={cashflow >= 0} class:negative={cashflow < 0}>
				{formatCurrency(cashflow)}
			</span>
		</div>
		<div class="summary-item">
			<span class="summary-label">Target</span>
			<span class="summary-value target">
				{formatCurrency(totalTargetRemaining)}
			</span>
		</div>
	</div>

	<!-- Month Picker Dropdown -->
	{#if showMonthPicker}
		<button class="month-picker-overlay" onclick={toggleMonthPicker} aria-label="Close month picker"></button>
		<div class="month-picker">
			<!-- Single Month Selection -->
			<div class="month-picker-header">
				<button class="year-nav" onclick={prevYear} aria-label="Previous year">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
				</button>
				<span class="picker-year">{pickerYear}</span>
				<button class="year-nav" onclick={nextYear} aria-label="Next year">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</button>
			</div>
			<div class="month-grid">
				{#each monthNames as name, index}
					<button 
						class="month-cell" 
						class:selected={isSelectedMonth(index)}
						class:has-data={hasTransactions(pickerYear, index)}
						onclick={() => selectMonth(index)}
					>
						{name}
					</button>
				{/each}
			</div>

			<!-- Custom Range Section -->
			<div class="custom-range-section">
				<div class="range-divider">
					<span>Custom Range</span>
				</div>

				<!-- Range Tabs -->
				<div class="range-tabs">
					<button 
						class="range-tab" 
						class:active={rangePickerTab === 'start'}
						onclick={() => rangePickerTab = 'start'}
					>
						<span class="range-tab-label">From</span>
						<span class="range-tab-value">{formatDateShort(customStartDate)}</span>
					</button>
					<button 
						class="range-tab" 
						class:active={rangePickerTab === 'end'}
						onclick={() => rangePickerTab = 'end'}
					>
						<span class="range-tab-label">To</span>
						<span class="range-tab-value">{formatDateShort(customEndDate)}</span>
					</button>
				</div>

				<!-- Range Day Calendar (Start) -->
				{#if rangePickerTab === 'start'}
					<div class="range-picker-header">
						<button class="year-nav" onclick={prevStartMonth} aria-label="Previous month">
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
							</svg>
						</button>
						<span class="picker-year-small">{monthNamesFull[rangeStartCalendarMonth]} {rangeStartCalendarYear}</span>
						<button class="year-nav" onclick={nextStartMonth} aria-label="Next month">
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
							</svg>
						</button>
					</div>
					<div class="day-names-header">
						{#each dayNames as dayName}
							<span class="day-name">{dayName}</span>
						{/each}
					</div>
					<div class="days-grid">
						{#each startCalendarDays as day}
							{#if day === null}
								<span class="day-empty"></span>
							{:else}
								<button
									class="day-btn"
									class:selected={isStartDaySelected(day)}
									onclick={() => selectRangeStartDay(day)}
								>
									{day}
								</button>
							{/if}
						{/each}
					</div>
				{/if}

				<!-- Range Day Calendar (End) -->
				{#if rangePickerTab === 'end'}
					<div class="range-picker-header">
						<button class="year-nav" onclick={prevEndMonth} aria-label="Previous month">
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
							</svg>
						</button>
						<span class="picker-year-small">{monthNamesFull[rangeEndCalendarMonth]} {rangeEndCalendarYear}</span>
						<button class="year-nav" onclick={nextEndMonth} aria-label="Next month">
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
							</svg>
						</button>
					</div>
					<div class="day-names-header">
						{#each dayNames as dayName}
							<span class="day-name">{dayName}</span>
						{/each}
					</div>
					<div class="days-grid">
						{#each endCalendarDays as day}
							{#if day === null}
								<span class="day-empty"></span>
							{:else}
								<button
									class="day-btn"
									class:selected={isEndDaySelected(day)}
									onclick={() => selectRangeEndDay(day)}
								>
									{day}
								</button>
							{/if}
						{/each}
					</div>
				{/if}

				<!-- Apply / Clear Buttons -->
				<div class="range-actions">
					{#if rangeMode === 'custom'}
						<button class="range-clear-btn" onclick={clearCustomRange}>
							Clear Range
						</button>
					{/if}
					<button class="range-apply-btn" onclick={applyCustomRange}>
						Apply Range
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Category Groups List -->
	<div class="categories-list">
		{#if loading}
			<LoadingState message="Loading categories..." />
		{:else if error}
			<div class="error-state">
				<p>{error}</p>
				<button onclick={loadCategories} class="retry-btn">Retry</button>
			</div>
		{:else if categoryGroups.length === 0}
			<div class="empty-state">
				<p>No categories yet</p>
				<p class="empty-hint">Import from YNAB or create categories in Settings</p>
			</div>
		{:else}
			<!-- Sticky Column Header -->
			<div class="column-header-sticky">
				<span class="column-header-label">Target</span>
				<span class="column-header-label">Spent</span>
			</div>

			{#each categoryGroups as group (group.id)}
				<!-- Group Header -->
				<button onclick={() => toggleGroup(group.id)} class="group-header">
					<div class="group-left">
						<svg class="group-chevron" class:collapsed={!group.isExpanded} fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
						<span class="group-name">{group.name}</span>
					</div>
				</button>

				<!-- Category Items -->
				{#if group.isExpanded}
					{#each group.categories as category (category.id)}
						{@const spent = spentByCategory.get(category.category_id) || 0}
						{@const target = convertedTargets.get(category.category_id)}
						{@const isOverBudget = target && spent > target}
						{@const remaining = target ? Math.max(0, target - spent) : null}
						{@const spentColor = getSpentColor(spent)}
						{@const spentDisplay = spent < 0 ? '+' + formatCurrency(Math.abs(spent)) : formatCurrency(spent)}
						<button 
							class="category-row"
							onclick={() => goto(`/plan/categories/${category.category_id}`)}
						>
							<span class="category-name">{category.name}</span>
							<div class="category-values">
								{#if target}
									<span class="category-target" class:over-budget={isOverBudget}>
										{formatCurrency(remaining ?? 0)}
									</span>
								{/if}
								<span 
									class="category-spent" 
									class:over-budget={isOverBudget}
									style="color: {spentColor}"
								>
									{spentDisplay}
								</span>
							</div>
						</button>
					{/each}
				{/if}
			{/each}
		{/if}
	</div>
</div>

<!-- Floating Action Button -->
<FloatingActionButton onclick={openTransactionModal} label="Transaction" />

<!-- Transaction Modal -->
<TransactionModal
	bind:show={showTransactionModal}
	{accounts}
	{categories}
	onSave={handleSaveTransaction}
/>

<style>
	.plan-page {
		display: flex;
		flex-direction: column;
		height: calc(100vh - 70px);
		height: calc(100dvh - 70px);
	}

	/* Summary Row (Cashflow + Target) */
	.summary-row {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 24px;
		padding: 12px 16px;
		background-color: var(--color-bg-secondary);
		border-bottom: 1px solid var(--color-border);
	}

	.summary-item {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.summary-label {
		font-size: 14px;
		color: var(--color-text-muted);
	}

	.summary-value {
		font-size: 18px;
		font-weight: 600;
	}

	.summary-value.positive {
		color: var(--color-success);
	}

	.summary-value.negative {
		color: var(--color-danger);
	}

	.summary-value.target {
		color: var(--color-warning);
	}

	/* Sticky Column Header */
	.column-header-sticky {
		position: sticky;
		top: 0;
		z-index: 60;
		display: flex;
		justify-content: flex-end;
		padding: 10px 16px;
		background-color: var(--color-bg-primary);
		border-bottom: 1px solid var(--color-border);
	}

	/* Column Header Label */
	.column-header-label {
		font-size: 11px;
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		min-width: 65px;
		text-align: center;
	}

	/* Categories List */
	.categories-list {
		flex: 1;
		overflow-y: auto;
		padding-bottom: 80px;
	}

	/* Group Header */
	.group-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 8px 12px;
		background-color: var(--color-bg-secondary);
		border: none;
		min-height: 40px;
	}

	.group-left {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.group-chevron {
		width: 16px;
		height: 16px;
		color: var(--color-text-muted);
		transition: transform 0.2s;
	}

	.group-chevron.collapsed {
		transform: rotate(-90deg);
	}

	.group-name {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	/* Category Row */
	.category-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 14px 16px;
		background: none;
		border: none;
		min-height: 52px;
	}

	.category-row:active {
		background-color: var(--color-bg-secondary);
	}

	.category-name {
		font-size: 15px;
		color: var(--color-text-primary);
		text-align: left;
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		padding-right: 16px;
	}

	.category-values {
		display: flex;
		align-items: center;
		flex-shrink: 0;
		gap: 8px;
	}

	.category-target {
		padding: 4px 10px;
		border-radius: 8px;
		font-size: 12px;
		font-weight: 600;
		min-width: 65px;
		text-align: center;
		background-color: var(--color-bg-tertiary);
		color: var(--color-warning);
	}

	.category-target.over-budget {
		background-color: rgba(239, 68, 68, 0.15);
		color: var(--color-danger);
	}

	.category-spent {
		padding: 4px 10px;
		border-radius: 8px;
		font-size: 12px;
		font-weight: 600;
		min-width: 65px;
		text-align: center;
		background-color: var(--color-bg-tertiary);
		/* Color is set inline via style attribute for gradient effect */
	}

	.category-spent.over-budget {
		background-color: rgba(239, 68, 68, 0.15);
		color: var(--color-danger) !important;
	}

	/* Error and Empty States */
	.error-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 48px 24px;
		text-align: center;
		color: var(--color-text-secondary);
	}

	.error-state p,
	.empty-state p {
		margin: 0;
		font-size: 16px;
	}

	.empty-hint {
		margin-top: 8px !important;
		font-size: 14px !important;
		color: var(--color-text-muted);
	}

	.retry-btn {
		margin-top: 16px;
		padding: 10px 20px;
		background-color: var(--color-primary);
		color: white;
		border: none;
		border-radius: 8px;
		font-weight: 500;
		cursor: pointer;
		min-height: 44px;
	}

	.retry-btn:hover {
		background-color: var(--color-primary-hover);
	}

	/* Month Picker */
	.month-picker-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		z-index: 100;
		border: none;
		cursor: default;
	}

	.month-picker {
		position: fixed;
		top: 60px;
		left: 16px;
		right: 16px;
		max-width: 320px;
		max-height: calc(100vh - 80px);
		max-height: calc(100dvh - 80px);
		overflow-y: auto;
		background-color: var(--color-bg-secondary);
		border-radius: 12px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
		z-index: 101;
	}

	.month-picker-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px;
		border-bottom: 1px solid var(--color-border);
	}

	.picker-year {
		font-size: 18px;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.year-nav {
		background: none;
		border: none;
		padding: 8px;
		cursor: pointer;
		color: var(--color-text-muted);
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		min-width: 44px;
		min-height: 44px;
	}

	.year-nav:hover {
		background-color: var(--color-bg-tertiary);
		color: var(--color-text-primary);
	}

	.month-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 8px;
		padding: 16px;
	}

	.month-cell {
		padding: 12px 8px;
		background: none;
		border: none;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text-muted);
		cursor: pointer;
		min-height: 44px;
		transition: all 0.15s ease;
	}

	.month-cell.has-data {
		color: var(--color-text-primary);
	}

	.month-cell:hover {
		background-color: var(--color-bg-tertiary);
	}

	.month-cell.selected {
		background-color: var(--color-primary);
		color: white;
		font-weight: 600;
	}

	/* Custom Range Section */
	.custom-range-section {
		border-top: 1px solid var(--color-border);
	}

	.range-divider {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 12px 16px 8px;
	}

	.range-divider span {
		font-size: 12px;
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.range-tabs {
		display: flex;
		gap: 8px;
		padding: 0 16px 12px;
	}

	.range-tab {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 10px 12px;
		background-color: var(--color-bg-tertiary);
		border: 2px solid transparent;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.15s ease;
		min-height: 44px;
	}

	.range-tab.active {
		border-color: var(--color-primary);
		background-color: var(--color-bg-primary);
	}

	.range-tab-label {
		font-size: 11px;
		font-weight: 500;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.3px;
	}

	.range-tab-value {
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text-primary);
		margin-top: 2px;
	}

	.range-picker-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 16px;
	}

	.picker-year-small {
		font-size: 15px;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.range-actions {
		display: flex;
		gap: 8px;
		padding: 12px 16px 16px;
	}

	.range-apply-btn {
		flex: 1;
		padding: 12px 16px;
		background-color: var(--color-primary);
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		min-height: 44px;
		transition: background-color 0.15s ease;
	}

	.range-apply-btn:hover {
		background-color: var(--color-primary-hover);
	}

	.range-clear-btn {
		padding: 12px 16px;
		background: none;
		color: var(--color-text-muted);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		min-height: 44px;
		transition: all 0.15s ease;
	}

	.range-clear-btn:hover {
		background-color: var(--color-bg-tertiary);
		color: var(--color-text-primary);
	}

	/* Day Calendar Styles */
	.day-names-header {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		padding: 4px 16px;
		gap: 2px;
	}

	.day-name {
		text-align: center;
		font-size: 11px;
		font-weight: 600;
		color: var(--color-text-muted);
		padding: 4px 0;
	}

	.days-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 2px;
		padding: 4px 16px 12px;
	}

	.day-empty {
		aspect-ratio: 1;
	}

	.day-btn {
		aspect-ratio: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		border-radius: 50%;
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text-primary);
		cursor: pointer;
		transition: all 0.15s ease;
		min-width: 32px;
		min-height: 32px;
	}

	.day-btn:hover {
		background-color: var(--color-bg-tertiary);
	}

	.day-btn.selected {
		background-color: var(--color-primary);
		color: white;
		font-weight: 600;
	}
</style>
