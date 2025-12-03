<script lang="ts">
	import type { Transaction, Account, Category } from '$lib/types';
	import { 
		isGeolocationSupported, 
		getCurrentPosition, 
		getLocationSuggestions, 
		saveLearnedLocation,
		type GeolocationPosition 
	} from '$lib/utils/geolocation';
	import { getCurrencySymbol } from '$lib/utils/format';
	import PayeeSelector, { isTransferPayee, getTransferTargetAccountName, TRANSFER_PAYEE_PREFIX } from './PayeeSelector.svelte';
	import CategorySelector from './CategorySelector.svelte';
	import AccountSelector from './AccountSelector.svelte';

	// Props
	let {
		show = $bindable(false),
		editingTransaction = null as Transaction | null,
		accounts = [] as Account[],
		categories = [] as Category[],
		defaultAccountId = undefined as number | undefined,
		defaultCategoryId = undefined as number | undefined,
		onSave = async () => {},
		onDelete = async (id: number) => {},
		onClose = () => {}
	} = $props();

	// Form state
	let formData = $state({
		description: '',
		amount: '0.00',
		date: new Date().toISOString().split('T')[0],
		account_id: 0,
		category_id: 0 as number | undefined,
		notes: '',
		isInflow: false,
		isCleared: false
	});

	// Transfer state
	let isTransfer = $state(false);
	let transferTargetAccountId = $state<number | null>(null);

	// Calculator state
	let calcDisplay = $state('0');
	let isNewInput = $state(true);

	// Payee selector state
	let showPayeeSelector = $state(false);

	// Category selector state
	let showCategorySelector = $state(false);

	// Account selector state
	let showAccountSelector = $state(false);

	// Date picker state
	let showDatePicker = $state(false);
	let calendarMonth = $state(new Date().getMonth());
	let calendarYear = $state(new Date().getFullYear());

	// Selected names for display
	let selectedCategoryName = $state('');
	let selectedAccountName = $state('');

	// Location-based auto-complete state
	let currentPosition = $state<GeolocationPosition | null>(null);
	let locationStatus = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let appliedLocationSuggestion = $state(false);

	// Delete confirmation dialog state
	let showDeleteConfirm = $state(false);

	// Fetch location and auto-complete when modal opens for new transaction
	async function fetchLocationAndAutoComplete() {
		if (!isGeolocationSupported()) {
			locationStatus = 'error';
			return;
		}

		locationStatus = 'loading';
		
		const posResult = await getCurrentPosition();
		if (!posResult.success) {
			locationStatus = 'error';
			return;
		}

		currentPosition = posResult.position;
		
		const suggestions = await getLocationSuggestions(
			posResult.position.latitude,
			posResult.position.longitude
		);

		locationStatus = 'success';

		// Auto-apply best suggestion immediately if there's any match
		if (suggestions.length > 0 && !appliedLocationSuggestion) {
			const best = suggestions[0];
			
			// Apply payee
			if (best.payee) {
				formData.description = best.payee;
			}
			
			// Apply category
			if (best.category_id) {
				formData.category_id = best.category_id;
				selectedCategoryName = best.category_name || '';
			}
			
			// Apply account
			if (best.account_id) {
				formData.account_id = best.account_id;
				selectedAccountName = best.account_name || '';
			}
			
			appliedLocationSuggestion = true;
		}
	}

	// Check URL hash on mount to restore state after reload
	$effect(() => {
		if (typeof window !== 'undefined' && window.location.hash === '#transaction-modal') {
			show = true;
		}
	});

	// Update URL hash when modal opens
	$effect(() => {
		if (show && typeof window !== 'undefined' && window.location.hash !== '#transaction-modal') {
			// Only push state if not already a sub-selector hash
			if (!window.location.hash.includes('-selector')) {
				history.pushState({ transactionModal: true }, '', '#transaction-modal');
			}
		}
	});

	// Handle browser back button
	function handlePopState(event: PopStateEvent) {
		if (show && typeof window !== 'undefined') {
			// If we're back to no hash or different hash, close modal
			if (window.location.hash !== '#transaction-modal' && !window.location.hash.includes('-selector')) {
				show = false;
				onClose();
			}
		}
	}

	// Initialize form when modal opens or editingTransaction changes
	$effect(() => {
		if (show) {
			// Reset location state
			locationStatus = 'idle';
			appliedLocationSuggestion = false;
			currentPosition = null;

			// Reset transfer state
			isTransfer = false;
			transferTargetAccountId = null;

			if (editingTransaction) {
				const amount = Math.abs(Math.round(editingTransaction.amount));
				formData = {
					description: editingTransaction.description,
					amount: amount.toString(),
					date: editingTransaction.date,
					account_id: editingTransaction.account_id,
					category_id: editingTransaction.category_id,
					notes: editingTransaction.notes || '',
					isInflow: editingTransaction.amount >= 0,
					isCleared: false
				};
				calcDisplay = amount.toString();
				isNewInput = false;
				// Set display names for editing
				const cat = categories.find(c => c.id === editingTransaction.category_id);
				selectedCategoryName = cat?.name || '';
				const acc = accounts.find(a => a.id === editingTransaction.account_id);
				selectedAccountName = acc?.name || '';

				// Check if this is a transfer transaction
				if (editingTransaction.transfer_account_id) {
					isTransfer = true;
					transferTargetAccountId = editingTransaction.transfer_account_id;
				}
			} else {
				// Determine the initial account: use defaultAccountId if provided, otherwise first account
				const initialAccountId = defaultAccountId ?? accounts[0]?.id ?? 0;
				const initialAccount = accounts.find(a => a.id === initialAccountId);
				
				// Determine the initial category: use defaultCategoryId if provided, otherwise first category
				const initialCategoryId = defaultCategoryId ?? categories[0]?.id ?? 0;
				const initialCategory = categories.find(c => c.id === initialCategoryId);
				
				formData = {
					description: '',
					amount: '0',
					date: new Date().toISOString().split('T')[0],
					account_id: initialAccountId,
					category_id: initialCategoryId,
					notes: '',
					isInflow: false,
					isCleared: false
				};
				calcDisplay = '0';
				isNewInput = true;
				// Set default display names
				selectedCategoryName = initialCategory?.name || categories[0]?.name || '';
				selectedAccountName = initialAccount?.name || accounts[0]?.name || '';

				// Fetch location and auto-complete for new transactions
				fetchLocationAndAutoComplete();
			}
		}
	});

	// Calculator functions
	function calcInput(digit: string) {
		if (isNewInput || calcDisplay === '0') {
			calcDisplay = digit;
			isNewInput = false;
		} else {
			// Limit to reasonable amount (max 999,999,999)
			if (calcDisplay.length >= 9) return;
			calcDisplay += digit;
		}
		updateAmountFromCalc();
	}

	function calcBackspace() {
		if (calcDisplay.length > 1) {
			calcDisplay = calcDisplay.slice(0, -1);
		} else {
			calcDisplay = '0';
			isNewInput = true;
		}
		updateAmountFromCalc();
	}

	function calcClear() {
		calcDisplay = '0';
		isNewInput = true;
		updateAmountFromCalc();
	}

	function updateAmountFromCalc() {
		const num = parseInt(calcDisplay) || 0;
		formData.amount = num.toString();
	}

	// Get current account's currency symbol
	let selectedAccountCurrency = $derived(() => {
		const account = accounts.find(a => a.id === formData.account_id);
		const currency = account?.currency || 'RON';
		return getCurrencySymbol(currency);
	});

	// Formatted display amount with sign and account currency (with thousand separators)
	let displayAmount = $derived(() => {
		const num = parseInt(formData.amount) || 0;
		const sign = formData.isInflow ? '+' : '−';
		const symbol = selectedAccountCurrency();
		// Format with thousand separators (using dot as separator)
		const formatted = num.toLocaleString('ro-RO');
		
		// Position symbol based on currency type
		if (['€', '$', '£', '¥'].includes(symbol)) {
			return `${sign}${symbol}${formatted}`;
		}
		return `${sign}${formatted}${symbol}`;
	});

	// Handle payee selection (regular payee)
	async function handlePayeeSelect(payee: string) {
		formData.description = payee;
		// If a regular payee is selected, clear transfer state
		isTransfer = false;
		transferTargetAccountId = null;

		// Check if auto-categorize is enabled
		const autoCategorize = localStorage.getItem('payee_auto_categorize') === 'true';
		if (autoCategorize && payee) {
			try {
				const res = await fetch(`/api/payees?action=most-frequent-category&payee=${encodeURIComponent(payee)}`);
				if (res.ok) {
					const data = await res.json();
					if (data.category_id) {
						formData.category_id = data.category_id;
						selectedCategoryName = data.category_name || '';
					}
				}
			} catch (e) {
				console.error('Error fetching category for payee:', e);
			}
		}
	}

	// Handle transfer payee selection
	function handleTransferSelect(payee: string, targetAccountId: number) {
		formData.description = payee;
		// Mark as transfer and clear category
		isTransfer = true;
		transferTargetAccountId = targetAccountId;
		formData.category_id = undefined;
		selectedCategoryName = '';
	}

	// Handle category selection
	function handleCategorySelect(category: Category) {
		// Don't allow category selection for transfers
		if (isTransfer) return;
		formData.category_id = category.id;
		selectedCategoryName = category.name;
	}

	// Handle account selection
	function handleAccountSelect(account: Account) {
		formData.account_id = account.id;
		selectedAccountName = account.name;
		// If this is a transfer and we're changing the source account,
		// we need to ensure the target isn't the same as the source
		if (isTransfer && transferTargetAccountId === account.id) {
			// Reset transfer if source and target are the same
			isTransfer = false;
			transferTargetAccountId = null;
			formData.description = '';
		}
	}

	// Formatted date display (DD.MM.YYYY)
	let formattedDate = $derived(() => {
		const [year, month, day] = formData.date.split('-');
		return `${day}.${month}.${year}`;
	});

	// Calendar helpers
	function getDaysInMonth(year: number, month: number): number {
		return new Date(year, month + 1, 0).getDate();
	}

	function getFirstDayOfMonth(year: number, month: number): number {
		// Return 0 for Monday, 6 for Sunday (European week starts Monday)
		const day = new Date(year, month, 1).getDay();
		return day === 0 ? 6 : day - 1;
	}

	let calendarDays = $derived(() => {
		const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
		const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
		const days: (number | null)[] = [];
		
		// Add empty slots for days before the first day of the month
		for (let i = 0; i < firstDay; i++) {
			days.push(null);
		}
		
		// Add the days of the month
		for (let i = 1; i <= daysInMonth; i++) {
			days.push(i);
		}
		
		return days;
	});

	let monthNames = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 
		'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];

	function prevMonth() {
		if (calendarMonth === 0) {
			calendarMonth = 11;
			calendarYear--;
		} else {
			calendarMonth--;
		}
	}

	function nextMonth() {
		if (calendarMonth === 11) {
			calendarMonth = 0;
			calendarYear++;
		} else {
			calendarMonth++;
		}
	}

	function selectDate(day: number) {
		const month = String(calendarMonth + 1).padStart(2, '0');
		const dayStr = String(day).padStart(2, '0');
		formData.date = `${calendarYear}-${month}-${dayStr}`;
		showDatePicker = false;
	}

	function isSelectedDate(day: number): boolean {
		const [year, month, dayOfMonth] = formData.date.split('-').map(Number);
		return day === dayOfMonth && calendarMonth === month - 1 && calendarYear === year;
	}

	function isToday(day: number): boolean {
		const today = new Date();
		return day === today.getDate() && 
			calendarMonth === today.getMonth() && 
			calendarYear === today.getFullYear();
	}

	function openDatePicker() {
		// Initialize calendar to show the currently selected date's month
		const [year, month] = formData.date.split('-').map(Number);
		calendarYear = year;
		calendarMonth = month - 1;
		showDatePicker = true;
	}

	// Save transaction
	async function handleSave() {
		const amount = parseFloat(formData.amount);
		if (isNaN(amount) || amount === 0) return;

		// Validate required fields
		if (!formData.account_id || formData.account_id <= 0) {
			alert('Please select an account');
			return;
		}

		// Validate transfer
		if (isTransfer && (!transferTargetAccountId || transferTargetAccountId === formData.account_id)) {
			alert('Please select a valid transfer destination');
			return;
		}

		const payload: Record<string, any> = {
			description: formData.description || (isTransfer ? 'Transfer' : 'Transaction'),
			amount: formData.isInflow ? Math.abs(amount) : -Math.abs(amount),
			date: formData.date,
			account_id: formData.account_id,
			cleared: formData.isCleared ? 'cleared' : 'uncleared'
		};

		// Handle transfer
		if (isTransfer && transferTargetAccountId) {
			payload.is_transfer = true;
			payload.transfer_account_id = transferTargetAccountId;
			// For transfers, always use outflow from source (the amount will be inverted for target)
			payload.amount = -Math.abs(amount);
		}

		// Only include optional fields if they have values
		if (formData.description) {
			payload.payee = formData.description;
		}
		if (formData.notes) {
			payload.memo = formData.notes;
			payload.notes = formData.notes;
		}

		// Only include category_id if it's a valid positive number and NOT a transfer
		if (!isTransfer && formData.category_id && formData.category_id > 0) {
			payload.category_id = formData.category_id;
		}

		// Include id only when editing
		if (editingTransaction?.id) {
			payload.id = editingTransaction.id;
		}

		console.log('Saving transaction with payload:', payload);
		await onSave(payload);

		// Save learned location if we have position data (for new transactions only, not for transfers)
		if (!editingTransaction && !isTransfer && currentPosition && (formData.description || formData.category_id || formData.account_id)) {
			saveLearnedLocation({
				latitude: currentPosition.latitude,
				longitude: currentPosition.longitude,
				payee: formData.description || undefined,
				category_id: formData.category_id && formData.category_id > 0 ? formData.category_id : undefined,
				account_id: formData.account_id && formData.account_id > 0 ? formData.account_id : undefined
			}).catch(err => {
				// Silent fail - location learning is not critical
				console.warn('Failed to save learned location:', err);
			});
		}

		closeModal();
	}

	// Delete transaction
	function openDeleteConfirm() {
		if (!editingTransaction) return;
		showDeleteConfirm = true;
	}

	function closeDeleteConfirm() {
		showDeleteConfirm = false;
	}

	async function confirmDelete() {
		if (!editingTransaction) return;
		showDeleteConfirm = false;
		await onDelete(editingTransaction.id);
		closeModal();
	}

	// Close modal
	function closeModal() {
		// Remove hash and go back in history
		if (typeof window !== 'undefined' && window.location.hash === '#transaction-modal') {
			history.back();
		}
		show = false;
		onClose();
	}
</script>

<svelte:window onpopstate={handlePopState} />

{#if show}
	<div class="modal-overlay">
		<!-- Header -->
		<header class="modal-header">
			<button aria-label="Închide" onclick={closeModal} class="close-btn">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
			<h2 class="modal-title">
				{editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
			</h2>
			<div class="header-spacer"></div>
		</header>

		<!-- Location-based auto-complete banner -->
		{#if !editingTransaction && locationStatus === 'loading'}
			<div class="location-banner loading">
				<svg class="location-icon spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
				</svg>
				<span>Detectare locație...</span>
			</div>
		{:else if !editingTransaction && appliedLocationSuggestion}
			<div class="location-banner applied">
				<svg class="location-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
				</svg>
				<span>Completat automat din locație</span>
			</div>
		{/if}

		<!-- Scrollable Content -->
		<div class="modal-content">
			<!-- Outflow/Inflow Toggle -->
			<div class="toggle-container">
				<div class="toggle-group">
					<button
						type="button"
						class="toggle-btn"
						class:active={!formData.isInflow}
						onclick={() => formData.isInflow = false}
					>
						<span class="toggle-icon">−</span>
						<span>Outflow</span>
					</button>
					<button
						type="button"
						class="toggle-btn"
						class:active={formData.isInflow}
						onclick={() => formData.isInflow = true}
					>
						<span class="toggle-icon">+</span>
						<span>Inflow</span>
					</button>
				</div>
			</div>

			<!-- Amount Display -->
			<div class="amount-display">
				<span class="amount-value" class:inflow={formData.isInflow} class:outflow={!formData.isInflow}>
					{displayAmount()}
				</span>
			</div>

			<!-- Form Fields -->
			<div class="form-card">
				<!-- Payee -->
				<button type="button" class="form-row" onclick={() => showPayeeSelector = true}>
					<div class="form-icon primary">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
						</svg>
					</div>
					<div class="form-field">
						<span class="field-label">Payee</span>
						<span class="field-value" class:placeholder={!formData.description}>
							{formData.description || 'Enter payee name'}
						</span>
					</div>
					<svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</button>

				<!-- Category -->
				<button 
					type="button" 
					class="form-row" 
					class:disabled={isTransfer}
					onclick={() => !isTransfer && (showCategorySelector = true)}
				>
					<div class="form-icon primary square" class:transfer-icon={isTransfer}>
						{#if isTransfer}
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
							</svg>
						{:else}
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
							</svg>
						{/if}
					</div>
					<div class="form-field">
						<span class="field-label">Category</span>
						<span class="field-value" class:placeholder={!selectedCategoryName && !isTransfer} class:transfer-text={isTransfer}>
							{#if isTransfer}
								Transfer — No Category
							{:else}
								{selectedCategoryName || 'Select category'}
							{/if}
						</span>
					</div>
					{#if !isTransfer}
						<svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
					{/if}
				</button>

				<!-- Account -->
				<button type="button" class="form-row" onclick={() => showAccountSelector = true}>
					<div class="form-icon primary square">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
						</svg>
					</div>
					<div class="form-field">
						<span class="field-label">Account</span>
						<span class="field-value" class:placeholder={!selectedAccountName}>
							{selectedAccountName || 'Select account'}
						</span>
					</div>
					<svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</button>

				<!-- Date -->
				<button type="button" class="form-row no-border" onclick={openDatePicker}>
					<div class="form-icon primary square">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
						</svg>
					</div>
					<div class="form-field">
						<span class="field-label">Date</span>
						<span class="field-value">{formattedDate()}</span>
					</div>
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" class="calendar-icon">
						<path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
					</svg>
				</button>
			</div>

			<!-- Additional Options -->
			<div class="form-card">
				<!-- Memo -->
				<div class="form-row no-border">
					<div class="form-icon-plain">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
						</svg>
					</div>
					<div class="form-field">
						<label for="memo-input" class="field-label">Memo</label>
						<input
							id="memo-input"
							type="text"
							bind:value={formData.notes}
							placeholder="Add a memo"
							class="field-input"
						/>
					</div>
				</div>
			</div>

			<!-- Repeat -->
			<div class="form-card">
				<div class="form-row no-border">
					<div class="form-icon-plain">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
					</div>
					<span class="field-muted">Never Repeat</span>
					<svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</div>
			</div>
		</div>

		<!-- Bottom fixed section: Action Buttons + Calculator -->
		<div class="bottom-section">
			<!-- Action Buttons -->
			<div class="action-buttons">
				{#if editingTransaction}
					<button type="button" onclick={openDeleteConfirm} class="btn-delete">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
						</svg>
						Delete
					</button>
				{/if}
				<button type="button" onclick={handleSave} class="btn-save">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
					</svg>
					Save
				</button>
			</div>

			<!-- Calculator Keyboard (always visible) -->
			<div class="calculator">
				<div class="calc-grid">
					<!-- Row 1 -->
					<button type="button" onclick={() => calcInput('7')} class="calc-btn number">7</button>
					<button type="button" onclick={() => calcInput('8')} class="calc-btn number">8</button>
					<button type="button" onclick={() => calcInput('9')} class="calc-btn number">9</button>
					
					<!-- Row 2 -->
					<button type="button" onclick={() => calcInput('4')} class="calc-btn number">4</button>
					<button type="button" onclick={() => calcInput('5')} class="calc-btn number">5</button>
					<button type="button" onclick={() => calcInput('6')} class="calc-btn number">6</button>
					
					<!-- Row 3 -->
					<button type="button" onclick={() => calcInput('1')} class="calc-btn number">1</button>
					<button type="button" onclick={() => calcInput('2')} class="calc-btn number">2</button>
					<button type="button" onclick={() => calcInput('3')} class="calc-btn number">3</button>
					
					<!-- Row 4 -->
					<button type="button" onclick={() => calcInput('0')} class="calc-btn number span-2">0</button>
					<button type="button" aria-label="Backspace" onclick={calcBackspace} class="calc-btn backspace">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414a2 2 0 011.414-.586H19a2 2 0 012 2v10a2 2 0 01-2 2h-8.172a2 2 0 01-1.414-.586L3 12z" />
						</svg>
					</button>
				</div>
			</div>
		</div>

		<!-- Date Picker -->
		{#if showDatePicker}
			<div class="datepicker-overlay" onclick={() => showDatePicker = false} role="presentation"></div>
			<div class="datepicker">
				<div class="datepicker-header">
					<button type="button" class="datepicker-nav" aria-label="Luna precedentă" onclick={prevMonth}>
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
						</svg>
					</button>
					<span class="datepicker-title">{monthNames[calendarMonth]} {calendarYear}</span>
					<button type="button" class="datepicker-nav" aria-label="Luna următoare" onclick={nextMonth}>
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
						</svg>
					</button>
				</div>
				<div class="datepicker-weekdays">
					<span>Lu</span>
					<span>Ma</span>
					<span>Mi</span>
					<span>Jo</span>
					<span>Vi</span>
					<span>Sâ</span>
					<span>Du</span>
				</div>
				<div class="datepicker-days">
					{#each calendarDays() as day}
						{#if day === null}
							<span class="day-empty"></span>
						{:else}
							<button 
								type="button" 
								class="day-btn"
								class:selected={isSelectedDate(day)}
								class:today={isToday(day)}
								onclick={() => selectDate(day)}
							>
								{day}
							</button>
						{/if}
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/if}

<!-- Payee Selector Modal -->
<PayeeSelector 
	bind:show={showPayeeSelector}
	selectedPayee={formData.description}
	{accounts}
	currentAccountId={formData.account_id}
	onSelect={handlePayeeSelect}
	onTransferSelect={handleTransferSelect}
/>

<!-- Category Selector Modal -->
<CategorySelector 
	bind:show={showCategorySelector}
	selectedCategoryId={formData.category_id}
	onSelect={handleCategorySelect}
/>

<!-- Account Selector Modal -->
<AccountSelector 
	bind:show={showAccountSelector}
	selectedAccountId={formData.account_id}
	onSelect={handleAccountSelect}
/>

<!-- Delete Confirmation Dialog -->
{#if showDeleteConfirm}
	<div class="delete-confirm-overlay" onclick={closeDeleteConfirm} role="presentation">
		<div class="delete-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-confirm-title">
			<div class="delete-confirm-icon">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
				</svg>
			</div>
			<h3 id="delete-confirm-title" class="delete-confirm-title">Șterge tranzacția?</h3>
			<p class="delete-confirm-message">Această acțiune nu poate fi anulată. Tranzacția va fi ștearsă definitiv.</p>
			<div class="delete-confirm-actions">
				<button type="button" onclick={closeDeleteConfirm} class="delete-confirm-cancel">
					Anulează
				</button>
				<button type="button" onclick={confirmDelete} class="delete-confirm-delete">
					Șterge
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		z-index: 200;
		background-color: var(--color-bg-primary);
		display: flex;
		flex-direction: column;
	}

	/* Header */
	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 12px;
		border-bottom: 1px solid var(--color-border);
	}

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		margin-left: -4px;
		background: none;
		border: none;
		color: var(--color-text-primary);
		border-radius: 10px;
	}

	.close-btn:active {
		background-color: var(--color-bg-tertiary);
	}

	.close-btn svg {
		width: 20px;
		height: 20px;
	}

	.modal-title {
		font-size: 16px;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.header-spacer {
		width: 36px;
	}

	/* Content */
	.modal-content {
		flex: 1;
		overflow-y: hidden;
	}

	/* Toggle */
	.toggle-container {
		padding: 16px 16px 0;
	}

	.toggle-group {
		display: flex;
		background-color: var(--color-bg-tertiary);
		border-radius: 24px;
		padding: 4px;
	}

	.toggle-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 10px;
		border: none;
		border-radius: 20px;
		font-size: 14px;
		font-weight: 500;
		background: none;
		color: var(--color-text-muted);
		transition: all 0.2s;
	}

	.toggle-btn.active {
		background-color: var(--color-bg-secondary);
		color: var(--color-text-primary);
	}

	.toggle-icon {
		font-size: 18px;
	}

	/* Amount Display */
	.amount-display {
		display: block;
		width: 100%;
		padding: 20px 16px;
		text-align: center;
	}

	.amount-value {
		font-size: 36px;
		font-weight: 600;
	}

	.amount-value.inflow {
		color: var(--color-success);
	}

	.amount-value.outflow {
		color: var(--color-danger);
	}

	/* Form Card */
	.form-card {
		background-color: var(--color-bg-secondary);
		border-radius: 16px;
		margin: 0 16px 16px;
		overflow: hidden;
	}

	.form-row {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 14px 16px;
		border-bottom: 1px solid var(--color-border);
		background: none;
		border-left: none;
		border-right: none;
		border-top: none;
		width: 100%;
		text-align: left;
		cursor: pointer;
	}

	.form-row:active {
		background-color: var(--color-bg-tertiary);
	}

	.form-row.no-border {
		border-bottom: none;
	}

	.form-row.disabled {
		cursor: default;
		opacity: 0.8;
	}

	.form-row.disabled:active {
		background: none;
	}

	.form-icon {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.form-icon.primary {
		background-color: var(--color-primary);
		color: white;
	}

	.form-icon.transfer-icon {
		background-color: var(--color-bg-tertiary);
		color: var(--color-text-muted);
	}

	.form-icon.square {
		border-radius: 8px;
	}

	.form-icon svg {
		width: 16px;
		height: 16px;
	}

	.form-icon-plain {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		color: var(--color-text-muted);
	}

	.form-icon-plain svg {
		width: 20px;
		height: 20px;
	}

	.form-field {
		flex: 1;
		min-width: 0;
	}

	.field-label {
		display: block;
		font-size: 12px;
		color: var(--color-text-muted);
		margin-bottom: 2px;
	}

	.field-input {
		width: 100%;
		background: transparent;
		border: none;
		color: var(--color-text-primary);
		font-size: 15px;
		font-weight: 500;
	}

	.field-input::placeholder {
		color: var(--color-text-muted);
	}

	.field-input:focus {
		outline: none;
	}

	.field-value {
		font-size: 15px;
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.field-value.placeholder {
		color: var(--color-text-muted);
		font-weight: 400;
	}

	.field-value.transfer-text {
		color: var(--color-text-muted);
		font-style: italic;
	}

	.field-muted {
		flex: 1;
		font-size: 15px;
		color: var(--color-text-muted);
	}

	.chevron {
		width: 20px;
		height: 20px;
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	/* Bottom Section (sticky) */
	.bottom-section {
		flex-shrink: 0;
		background-color: var(--color-bg-primary);
	}

	/* Action Buttons */
	.action-buttons {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		padding: 12px 16px;
	}

	.btn-delete {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 20px;
		background-color: rgba(239, 68, 68, 0.1);
		color: var(--color-danger);
		border: none;
		border-radius: 24px;
		font-size: 15px;
		font-weight: 500;
		min-height: 48px;
	}

	.btn-delete:active {
		background-color: rgba(239, 68, 68, 0.2);
	}

	.btn-delete svg {
		width: 20px;
		height: 20px;
	}

	.btn-save {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 24px;
		background-color: var(--color-primary);
		color: white;
		border: none;
		border-radius: 24px;
		font-size: 15px;
		font-weight: 500;
		min-height: 48px;
	}

	.btn-save:active {
		background-color: var(--color-primary-hover);
	}

	.btn-save svg {
		width: 20px;
		height: 20px;
	}

	/* Calculator */
	.calculator {
		background: transparent;
		padding: 4px 12px;
		padding-bottom: calc(12px + env(safe-area-inset-bottom, 0));
	}

	.calc-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6px;
	}

	.calc-btn {
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		border-radius: 10px;
		font-size: 18px;
		font-weight: 500;
	}

	.calc-btn.span-2 {
		grid-column: span 2;
	}

	.calc-btn.number {
		background-color: var(--color-bg-tertiary);
		color: var(--color-text-primary);
	}

	.calc-btn.number:active {
		background-color: var(--color-border);
	}

	.calc-btn.backspace {
		background-color: var(--color-bg-tertiary);
		color: var(--color-text-muted);
	}

	.calc-btn.backspace:active {
		background-color: var(--color-border);
	}

	.calc-btn.backspace svg {
		width: 18px;
		height: 18px;
	}

	/* Calendar Icon */
	.calendar-icon {
		width: 20px;
		height: 20px;
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	/* Date Picker */
	.datepicker-overlay {
		position: fixed;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.5);
		z-index: 210;
	}

	.datepicker {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background-color: var(--color-bg-secondary);
		border-top: 1px solid var(--color-border);
		border-top-left-radius: 20px;
		border-top-right-radius: 20px;
		padding: 16px;
		padding-bottom: calc(24px + env(safe-area-inset-bottom, 0));
		z-index: 211;
		animation: slideUp 0.2s ease-out;
	}

	.datepicker-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16px;
	}

	.datepicker-nav {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		color: var(--color-text-primary);
		border-radius: 12px;
	}

	.datepicker-nav:active {
		background-color: var(--color-bg-tertiary);
	}

	.datepicker-nav svg {
		width: 20px;
		height: 20px;
	}

	.datepicker-title {
		font-size: 16px;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.datepicker-weekdays {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 4px;
		margin-bottom: 8px;
	}

	.datepicker-weekdays span {
		text-align: center;
		font-size: 12px;
		font-weight: 500;
		color: var(--color-text-muted);
		padding: 8px 0;
	}

	.datepicker-days {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 4px;
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
		font-size: 14px;
		font-weight: 500;
		color: var(--color-text-primary);
		cursor: pointer;
	}

	.day-btn:active {
		background-color: var(--color-bg-tertiary);
	}

	.day-btn.today {
		border: 1px solid var(--color-primary);
	}

	.day-btn.selected {
		background-color: var(--color-primary);
		color: white;
	}

	.day-btn.selected.today {
		border-color: var(--color-primary);
	}

	/* Location-based auto-complete */
	.location-banner {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 16px;
		font-size: 13px;
		border-bottom: 1px solid var(--color-border);
	}

	.location-banner.loading {
		background-color: var(--color-bg-secondary);
		color: var(--color-text-muted);
	}

	.location-banner.applied {
		background-color: color-mix(in srgb, var(--color-success) 15%, transparent);
		color: var(--color-success);
	}

	.location-icon {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
	}

	.location-icon.spin {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	/* Delete Confirmation Dialog */
	.delete-confirm-overlay {
		position: fixed;
		inset: 0;
		z-index: 300;
		background-color: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
		backdrop-filter: blur(4px);
		animation: fadeIn 0.15s ease-out;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.delete-confirm-dialog {
		background-color: var(--color-bg-secondary);
		border-radius: 20px;
		padding: 24px;
		max-width: 320px;
		width: 100%;
		text-align: center;
		animation: slideUp 0.2s ease-out;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(20px) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.delete-confirm-icon {
		width: 56px;
		height: 56px;
		margin: 0 auto 16px;
		background-color: rgba(239, 68, 68, 0.15);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.delete-confirm-icon svg {
		width: 28px;
		height: 28px;
		color: var(--color-danger);
	}

	.delete-confirm-title {
		font-size: 18px;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 8px;
	}

	.delete-confirm-message {
		font-size: 14px;
		color: var(--color-text-muted);
		margin: 0 0 24px;
		line-height: 1.5;
	}

	.delete-confirm-actions {
		display: flex;
		gap: 12px;
	}

	.delete-confirm-cancel,
	.delete-confirm-delete {
		flex: 1;
		padding: 14px 20px;
		border: none;
		border-radius: 14px;
		font-size: 15px;
		font-weight: 600;
		min-height: 48px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.delete-confirm-cancel {
		background-color: var(--color-bg-tertiary);
		color: var(--color-text-primary);
	}

	.delete-confirm-cancel:active {
		background-color: var(--color-border);
		transform: scale(0.98);
	}

	.delete-confirm-delete {
		background-color: var(--color-danger);
		color: var(--color-text-primary);
	}

	.delete-confirm-delete:active {
		background-color: var(--color-danger);
		opacity: 0.9;
		transform: scale(0.98);
	}
</style>
