<script lang="ts">
	import { toast } from '$lib/stores';
	import type { Account } from '$lib/types';

	// Props
	let {
		show = $bindable(false),
		account = null as Account | null,
		allAccounts = [] as Account[],
		onSave = async () => {},
		onClose = () => {},
		onCloseAccount = async (_id: number) => {},
		onDeleteAccount = async (_id: number) => {}
	} = $props();

	// Determine if we're editing
	let isEditing = $derived(account !== null);

	// Exchange rates to RON (for display conversion)
	const exchangeRates: Record<string, number> = {
		RON: 1,
		EUR: 4.97,
		USD: 4.58,
		GBP: 5.82,
		CHF: 5.18,
		PLN: 1.15,
		HUF: 0.0125,
		CZK: 0.20,
		BGN: 2.54,
		SEK: 0.43,
		NOK: 0.42,
		DKK: 0.67,
		JPY: 0.030,
		CNY: 0.63,
		AUD: 2.98,
		CAD: 3.28
	};

	// Currency symbols
	const currencySymbols: Record<string, string> = {
		RON: 'lei',
		EUR: '€',
		USD: '$',
		GBP: '£',
		CHF: 'Fr',
		PLN: 'zł',
		HUF: 'Ft',
		CZK: 'Kč',
		BGN: 'лв',
		SEK: 'kr',
		NOK: 'kr',
		DKK: 'kr',
		JPY: '¥',
		CNY: '¥',
		AUD: 'A$',
		CAD: 'C$'
	};

	// Account types for selection (only 3 as requested)
	const accountTypes = [
		{ value: 'cash', label: 'Cash', icon: '💵' },
		{ value: 'investment', label: 'Investing', icon: '📈' },
		{ value: 'savings', label: 'Savings', icon: '💰' }
	] as const;

	// Popular currencies
	const currencies = [
		{ code: 'RON', symbol: 'lei', name: 'Romanian Leu' },
		{ code: 'EUR', symbol: '€', name: 'Euro' },
		{ code: 'USD', symbol: '$', name: 'US Dollar' },
		{ code: 'GBP', symbol: '£', name: 'British Pound' },
		{ code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
		{ code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
		{ code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint' },
		{ code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' },
		{ code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev' },
		{ code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
		{ code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
		{ code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
		{ code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
		{ code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
		{ code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
		{ code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' }
	];

	// Form state
	let formData = $state({
		name: '',
		type: 'cash' as 'cash' | 'investment' | 'savings',
		balance: '',
		currency: 'RON',
		notes: ''
	});

	let saving = $state(false);
	let closing = $state(false);
	let deleting = $state(false);
	let showTypeSelector = $state(false);
	let showCurrencySelector = $state(false);
	let showCloseConfirm = $state(false);
	let showDeleteConfirm = $state(false);
	let showCurrencyChangeConfirm = $state(false);
	let pendingCurrencyChange = $state<string | null>(null);
	let selectedTransferAccountId = $state<number | null>(null);
	let transactionCount = $state(0);

	// Get other active accounts for transfer (excluding current account)
	let otherAccounts = $derived.by(() => {
		if (!account) return [];
		return allAccounts.filter(a => a.is_active && a.id !== account.id);
	});

	// Get selected transfer account
	let selectedTransferAccount = $derived(
		otherAccounts.find(a => a.id === selectedTransferAccountId) || null
	);

	// Calculate converted amount for display
	let convertedAmount = $derived.by(() => {
		if (!account || !selectedTransferAccount) return 0;
		const sourceCurrency = account.currency || 'RON';
		const targetCurrency = selectedTransferAccount.currency || 'RON';
		const sourceToRON = exchangeRates[sourceCurrency] || 1;
		const targetToRON = exchangeRates[targetCurrency] || 1;
		return (account.balance * sourceToRON) / targetToRON;
	});

	// Format amount with currency symbol
	function formatWithCurrency(amount: number, currency: string): string {
		const symbol = currencySymbols[currency] || currency;
		const formatted = amount.toLocaleString('ro-RO', { 
			minimumFractionDigits: 2, 
			maximumFractionDigits: 2 
		});
		
		if (['€', '$', '£', '¥'].includes(symbol)) {
			return `${symbol}${formatted}`;
		}
		return `${formatted} ${symbol}`;
	}

	// Get display values
	let selectedTypeLabel = $derived(
		accountTypes.find(t => t.value === formData.type)?.label || 'Cash'
	);
	let selectedTypeIcon = $derived(
		accountTypes.find(t => t.value === formData.type)?.icon || '💵'
	);
	let selectedCurrencyName = $derived(
		currencies.find(c => c.code === formData.currency)?.name || 'Romanian Leu'
	);
	let selectedCurrencySymbol = $derived(
		currencies.find(c => c.code === formData.currency)?.symbol || 'lei'
	);

	// Reset form when modal opens
	$effect(() => {
		if (show) {
			if (account) {
				// Editing existing account
				formData = {
					name: account.name,
					type: (account.type === 'checking' ? 'cash' : account.type) as 'cash' | 'investment' | 'savings',
					balance: account.balance.toString(),
					currency: account.currency || 'RON',
					notes: ''
				};
			} else {
				// Creating new account
				formData = {
					name: '',
					type: 'cash',
					balance: '',
					currency: 'RON',
					notes: ''
				};
			}
			saving = false;
			showTypeSelector = false;
			showCurrencySelector = false;
		}
	});

	// Save account
	async function handleSave() {
		// Validate name
		if (!formData.name.trim()) {
			toast.error('Introdu un nume pentru cont');
			return;
		}

		saving = true;
		try {
			const balanceNum = parseFloat(formData.balance) || 0;
			
			if (isEditing && account) {
				// Check if currency changed to send convertTransactions flag
				const currencyChanged = account.currency !== formData.currency;
				
				// Update existing account
				const response = await fetch('/api/accounts', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						id: account.id,
						name: formData.name.trim(),
						type: formData.type,
						balance: balanceNum,
						currency: formData.currency,
						notes: formData.notes.trim() || null,
						convertTransactions: currencyChanged // Convert transactions if currency changed
					})
				});

				if (!response.ok) {
					const data = await response.json();
					throw new Error(data.message || 'Nu s-a putut actualiza contul');
				}

				const result = await response.json();
				
				if (result.currencyConverted && result.transactionsConverted > 0) {
					toast.success(`Contul actualizat. ${result.transactionsConverted} tranzacții convertite în ${formData.currency}.`);
				} else {
					toast.success('Contul a fost actualizat');
				}
			} else {
				// Create new account
				const response = await fetch('/api/accounts', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: formData.name.trim(),
						type: formData.type,
						balance: balanceNum,
						currency: formData.currency,
						notes: formData.notes.trim() || null
					})
				});

				if (!response.ok) {
					const data = await response.json();
					throw new Error(data.message || 'Nu s-a putut crea contul');
				}

				toast.success('Contul a fost creat');
			}
			
			await onSave();
			closeModal();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Eroare la salvarea contului');
		} finally {
			saving = false;
		}
	}

	// Close modal
	function closeModal() {
		show = false;
		showCloseConfirm = false;
		selectedTransferAccountId = null;
		onClose();
	}

	// Open close account confirmation
	function openCloseConfirm() {
		if (!account) return;
		showCloseConfirm = true;
		// Pre-select first available account if balance > 0
		if (account.balance !== 0 && otherAccounts.length > 0) {
			selectedTransferAccountId = otherAccounts[0].id;
		}
	}

	// Close account (soft delete) with optional transfer
	async function handleCloseAccount() {
		if (!account) return;
		
		// If there's a balance, require transfer target
		if (account.balance !== 0 && !selectedTransferAccountId) {
			toast.error('Selectează un cont pentru transfer');
			return;
		}
		
		closing = true;
		try {
			let url = `/api/accounts?id=${account.id}`;
			if (selectedTransferAccountId) {
				url += `&transferTo=${selectedTransferAccountId}`;
			}
			
			const response = await fetch(url, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.message || 'Nu s-a putut închide contul');
			}

			toast.success('Contul a fost închis');
			await onCloseAccount(account.id);
			closeModal();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Eroare la închiderea contului');
		} finally {
			closing = false;
		}
	}

	// Close account with zero balance (creates adjustment transaction)
	async function handleCloseAccountWithZeroBalance() {
		if (!account) return;
		
		closing = true;
		try {
			const url = `/api/accounts?id=${account.id}&zeroBalance=true`;
			
			const response = await fetch(url, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.message || 'Nu s-a putut închide contul');
			}

			toast.success('Contul a fost închis și balanța a fost resetată la 0');
			await onCloseAccount(account.id);
			closeModal();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Eroare la închiderea contului');
		} finally {
			closing = false;
		}
	}

	// Permanently delete account from database
	async function handleDeleteAccount() {
		if (!account) return;
		
		deleting = true;
		try {
			const response = await fetch(`/api/accounts?id=${account.id}&permanent=true`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.message || 'Nu s-a putut șterge contul');
			}

			toast.success('Contul a fost șters permanent');
			await onDeleteAccount(account.id);
			closeModal();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Eroare la ștergerea contului');
		} finally {
			deleting = false;
		}
	}

	// Handle type selection
	function selectType(type: 'cash' | 'investment' | 'savings') {
		formData.type = type;
		showTypeSelector = false;
	}

	// Handle currency selection - check if we need confirmation
	async function selectCurrency(code: string) {
		showCurrencySelector = false;
		
		// If editing and currency is actually changing, check for transactions
		if (isEditing && account && account.currency !== code) {
			try {
				// Fetch transaction count for this account
				const response = await fetch(`/api/transactions?accountId=${account.id}&limit=1`);
				if (response.ok) {
					const data = await response.json();
					transactionCount = data.total || 0;
					
					if (transactionCount > 0) {
						// Show confirmation dialog
						pendingCurrencyChange = code;
						showCurrencyChangeConfirm = true;
						return;
					}
				}
			} catch {
				// If we can't check, just proceed with the change
			}
		}
		
		formData.currency = code;
	}

	// Confirm currency change with conversion
	function confirmCurrencyChange() {
		if (pendingCurrencyChange) {
			formData.currency = pendingCurrencyChange;
		}
		showCurrencyChangeConfirm = false;
		pendingCurrencyChange = null;
	}

	// Cancel currency change
	function cancelCurrencyChange() {
		showCurrencyChangeConfirm = false;
		pendingCurrencyChange = null;
	}
</script>

{#if show}
	<div class="modal-overlay">
		<!-- Header -->
		<header class="modal-header">
			<button aria-label="Închide" onclick={closeModal} class="close-btn">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
			<h2 class="modal-title">{isEditing ? 'Edit Account' : 'Add Account'}</h2>
			<div class="header-spacer"></div>
		</header>

		<!-- Scrollable Content -->
		<div class="modal-content">
			<!-- Form Fields -->
			<div class="form-card">
				<!-- Account Name -->
				<div class="form-row">
					<div class="form-icon primary">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
						</svg>
					</div>
					<div class="form-field">
						<label for="account-name" class="field-label">Account Name</label>
						<input
							id="account-name"
							type="text"
							bind:value={formData.name}
							placeholder="Enter account name"
							class="field-input"
						/>
					</div>
				</div>

				<!-- Account Type -->
				<button type="button" class="form-row" onclick={() => showTypeSelector = true}>
					<div class="form-icon primary">
						<span class="icon-emoji">{selectedTypeIcon}</span>
					</div>
					<div class="form-field">
						<span class="field-label">Account Type</span>
						<span class="field-value">{selectedTypeLabel}</span>
					</div>
					<svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</button>

				<!-- Account Balance -->
				<div class="form-row">
					<div class="form-icon primary">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<div class="form-field">
						<label for="account-balance" class="field-label">Account Balance</label>
						<input
							id="account-balance"
							type="number"
							step="0.01"
							bind:value={formData.balance}
							placeholder="0.00"
							class="field-input"
						/>
					</div>
					<span class="currency-suffix">{selectedCurrencySymbol}</span>
				</div>

				<!-- Currency -->
				<button type="button" class="form-row" onclick={() => showCurrencySelector = true}>
					<div class="form-icon primary">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<div class="form-field">
						<span class="field-label">Currency</span>
						<span class="field-value">{formData.currency} - {selectedCurrencyName}</span>
					</div>
					<svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</button>

				<!-- Account Notes -->
				<div class="form-row no-border">
					<div class="form-icon primary">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
						</svg>
					</div>
					<div class="form-field">
						<label for="account-notes" class="field-label">Account Notes</label>
						<input
							id="account-notes"
							type="text"
							bind:value={formData.notes}
							placeholder="Optional notes..."
							class="field-input"
						/>
					</div>
				</div>
			</div>

			<!-- Save Button -->
			<div class="action-buttons">
				<button type="button" onclick={handleSave} class="btn-save" disabled={saving}>
					{#if saving}
						<svg class="spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						Saving...
					{:else}
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
						</svg>
						Save Account
					{/if}
				</button>

				{#if isEditing}
					<button type="button" onclick={openCloseConfirm} class="btn-close-account">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
						</svg>
						Close Account
					</button>

					<button type="button" onclick={() => showDeleteConfirm = true} class="btn-delete-account">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
						</svg>
						Delete Account
					</button>
				{/if}
			</div>
		</div>

		<!-- Type Selector -->
		{#if showTypeSelector}
			<div class="selector-overlay" onclick={() => showTypeSelector = false} role="presentation"></div>
			<div class="selector-sheet">
				<div class="selector-header">
					<h3 class="selector-title">Select Account Type</h3>
					<button class="selector-close" aria-label="Close" onclick={() => showTypeSelector = false}>
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
				<div class="selector-list">
					{#each accountTypes as type}
						<button 
							class="selector-item" 
							class:selected={formData.type === type.value}
							onclick={() => selectType(type.value)}
						>
							<span class="selector-icon">{type.icon}</span>
							<span class="selector-label">{type.label}</span>
							{#if formData.type === type.value}
								<svg class="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
								</svg>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Currency Selector -->
		{#if showCurrencySelector}
			<div class="selector-overlay" onclick={() => showCurrencySelector = false} role="presentation"></div>
			<div class="selector-sheet currency-sheet">
				<div class="selector-header">
					<h3 class="selector-title">Select Currency</h3>
					<button class="selector-close" aria-label="Close" onclick={() => showCurrencySelector = false}>
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
				<div class="selector-list scrollable">
					{#each currencies as currency}
						<button 
							class="selector-item" 
							class:selected={formData.currency === currency.code}
							onclick={() => selectCurrency(currency.code)}
						>
							<span class="currency-code">{currency.code}</span>
							<span class="currency-name">{currency.name}</span>
							<span class="currency-symbol">{currency.symbol}</span>
							{#if formData.currency === currency.code}
								<svg class="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
								</svg>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Currency Change Confirmation Sheet -->
		{#if showCurrencyChangeConfirm}
			<div class="selector-overlay" onclick={cancelCurrencyChange} role="presentation"></div>
			<div class="selector-sheet currency-change-sheet">
				<div class="selector-header">
					<h3 class="selector-title">Schimbare Valută</h3>
					<button class="selector-close" aria-label="Close" onclick={cancelCurrencyChange}>
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
				
				<div class="currency-change-content">
					<div class="currency-change-warning">
						<svg class="warning-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
						</svg>
						<div class="warning-text">
							<p class="warning-title">Atenție!</p>
							<p class="warning-description">
								Acest cont are <strong>{transactionCount}</strong> tranzacți{transactionCount === 1 ? 'e' : 'i'}.
							</p>
						</div>
					</div>

					<div class="currency-change-info">
						<div class="conversion-preview">
							<div class="conversion-from">
								<span class="conversion-label">Din</span>
								<span class="conversion-currency">{account?.currency || 'RON'}</span>
							</div>
							<svg class="conversion-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
							</svg>
							<div class="conversion-to">
								<span class="conversion-label">În</span>
								<span class="conversion-currency">{pendingCurrencyChange}</span>
							</div>
						</div>
						<p class="conversion-note">
							Toate tranzacțiile și soldul vor fi convertite automat folosind cursul valutar actual.
						</p>
					</div>

					<div class="currency-change-actions">
						<button class="btn-cancel" onclick={cancelCurrencyChange}>
							Anulează
						</button>
						<button class="btn-confirm" onclick={confirmCurrencyChange}>
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
							</svg>
							Confirmă Conversia
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Close Account Confirmation Sheet -->
		{#if showCloseConfirm}
			<div class="selector-overlay" onclick={() => showCloseConfirm = false} role="presentation"></div>
			<div class="selector-sheet close-confirm-sheet">
				<div class="selector-header">
					<h3 class="selector-title">Close Account</h3>
					<button class="selector-close" aria-label="Close" onclick={() => showCloseConfirm = false}>
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
				
				<div class="close-confirm-content">
					{#if account && account.balance !== 0}
						<div class="transfer-info">
							{#if account.balance > 0}
								<p class="transfer-label">Transfer balance of <strong>{formatWithCurrency(account.balance, account.currency || 'RON')}</strong> to:</p>
							{:else}
								<p class="transfer-label">Deduct debt of <strong class="negative">{formatWithCurrency(Math.abs(account.balance), account.currency || 'RON')}</strong> from:</p>
							{/if}
							
							{#if otherAccounts.length > 0}
								<div class="account-select-list">
									{#each otherAccounts as targetAccount}
										<button 
											class="account-select-item" 
											class:selected={selectedTransferAccountId === targetAccount.id}
											onclick={() => selectedTransferAccountId = targetAccount.id}
										>
											<div class="account-select-info">
												<span class="account-select-name">{targetAccount.name}</span>
												{#if targetAccount.currency && targetAccount.currency !== 'RON'}
													<span class="account-select-currency">{targetAccount.currency}</span>
												{/if}
											</div>
											{#if selectedTransferAccountId === targetAccount.id}
												<svg class="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
													<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
												</svg>
											{/if}
										</button>
									{/each}
								</div>
								
								{#if selectedTransferAccount && account.currency !== selectedTransferAccount.currency}
									<div class="conversion-info" class:negative={account.balance < 0}>
										<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
										</svg>
										{#if account.balance > 0}
											<span>Will be converted to <strong>{formatWithCurrency(convertedAmount, selectedTransferAccount.currency || 'RON')}</strong></span>
										{:else}
											<span>Will deduct <strong>{formatWithCurrency(Math.abs(convertedAmount), selectedTransferAccount.currency || 'RON')}</strong></span>
										{/if}
									</div>
								{/if}
							{:else}
								<p class="no-accounts-warning">No other accounts available. Use "Zero Balance" to create an adjustment transaction.</p>
							{/if}

							<!-- Zero Balance Option -->
							<div class="zero-balance-option">
								<div class="divider-with-text">
									<span>or</span>
								</div>
								<button class="btn-zero-balance" onclick={handleCloseAccountWithZeroBalance} disabled={closing}>
									{#if closing}
										<svg class="spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
										</svg>
										Processing...
									{:else}
										<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										Zero Balance & Close
									{/if}
								</button>
								<p class="zero-balance-hint">Creates an adjustment transaction to bring balance to 0</p>
							</div>
						</div>
					{:else}
						<p class="close-confirm-text">Are you sure you want to close this account? You can reopen it later from the Closed section.</p>
					{/if}
					
					<div class="close-confirm-actions">
						<button class="btn-cancel" onclick={() => showCloseConfirm = false}>
							Cancel
						</button>
						{#if account && account.balance !== 0}
							<button class="btn-confirm-close" onclick={handleCloseAccount} disabled={closing || !selectedTransferAccountId}>
								{#if closing}
									<svg class="spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
									</svg>
									Closing...
								{:else}
									Transfer & Close
								{/if}
							</button>
						{:else}
							<button class="btn-confirm-close" onclick={handleCloseAccount} disabled={closing}>
								{#if closing}
									<svg class="spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
									</svg>
									Closing...
								{:else}
									Close Account
								{/if}
							</button>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<!-- Delete Account Confirmation Sheet -->
		{#if showDeleteConfirm}
			<div class="selector-overlay" onclick={() => showDeleteConfirm = false} role="presentation"></div>
			<div class="selector-sheet delete-confirm-sheet">
				<div class="selector-header">
					<h3 class="selector-title delete-title">⚠️ Delete Account</h3>
					<button class="selector-close" aria-label="Close" onclick={() => showDeleteConfirm = false}>
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
				
				<div class="delete-confirm-content">
					<div class="delete-warning">
						<svg class="warning-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
						</svg>
						<div class="warning-text">
							<p class="warning-title">Această acțiune este permanentă!</p>
							<p class="warning-description">
								Contul <strong>"{account?.name}"</strong> și toate tranzacțiile asociate vor fi șterse definitiv din baza de date. Această acțiune nu poate fi anulată.
							</p>
						</div>
					</div>
					
					<div class="delete-confirm-actions">
						<button class="btn-cancel" onclick={() => showDeleteConfirm = false}>
							Cancel
						</button>
						<button class="btn-confirm-delete" onclick={handleDeleteAccount} disabled={deleting}>
							{#if deleting}
								<svg class="spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
								</svg>
								Deleting...
							{:else}
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
								</svg>
								Delete Permanently
							{/if}
						</button>
					</div>
				</div>
			</div>
		{/if}
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
		padding: 12px 16px;
		border-bottom: 1px solid var(--color-border);
	}

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		margin-left: -8px;
		background: none;
		border: none;
		color: var(--color-text-primary);
		border-radius: 12px;
	}

	.close-btn:active {
		background-color: var(--color-bg-tertiary);
	}

	.close-btn svg {
		width: 24px;
		height: 24px;
	}

	.modal-title {
		font-size: 17px;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.header-spacer {
		width: 44px;
	}

	/* Content */
	.modal-content {
		flex: 1;
		overflow-y: auto;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	/* Form Card */
	.form-card {
		background-color: var(--color-bg-secondary);
		border-radius: 12px;
		overflow: hidden;
	}

	.form-row {
		display: flex;
		align-items: center;
		padding: 14px 16px;
		gap: 12px;
		border-bottom: 1px solid var(--color-border);
		background: none;
		border-left: none;
		border-right: none;
		border-top: none;
		width: 100%;
		text-align: left;
		color: var(--color-text-primary);
	}

	.form-row:active {
		background-color: var(--color-bg-tertiary);
	}

	.form-row.no-border {
		border-bottom: none;
	}

	.form-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 10px;
		flex-shrink: 0;
	}

	.form-icon.primary {
		background-color: var(--color-primary);
		color: white;
	}

	.form-icon svg {
		width: 20px;
		height: 20px;
	}

	.icon-emoji {
		font-size: 18px;
	}

	.form-field {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.field-label {
		font-size: 12px;
		color: var(--color-text-muted);
	}

	.field-value {
		font-size: 16px;
		color: var(--color-text-primary);
	}

	.field-input {
		font-size: 16px;
		color: var(--color-text-primary);
		background: none;
		border: none;
		outline: none;
		padding: 0;
		width: 100%;
	}

	.field-input::placeholder {
		color: var(--color-text-muted);
	}

	.currency-suffix {
		font-size: 14px;
		color: var(--color-text-muted);
		padding-right: 4px;
	}

	.chevron {
		width: 20px;
		height: 20px;
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	/* Action Buttons */
	.action-buttons {
		padding: 8px 0 24px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.btn-save {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		padding: 16px;
		background-color: var(--color-primary);
		border: none;
		border-radius: 12px;
		color: white;
		font-size: 16px;
		font-weight: 600;
		min-height: 52px;
	}

	.btn-save:active:not(:disabled) {
		background-color: var(--color-primary-hover);
	}

	.btn-save:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.btn-save svg {
		width: 20px;
		height: 20px;
	}

	.btn-close-account {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		padding: 16px;
		background-color: var(--color-bg-secondary);
		border: 1px solid var(--color-danger);
		border-radius: 12px;
		color: var(--color-danger);
		font-size: 16px;
		font-weight: 600;
		min-height: 52px;
	}

	.btn-close-account:active:not(:disabled) {
		background-color: var(--color-bg-tertiary);
	}

	.btn-close-account:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.btn-close-account svg {
		width: 20px;
		height: 20px;
	}

	.btn-delete-account {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		padding: 16px;
		background-color: var(--color-danger);
		border: none;
		border-radius: 12px;
		color: white;
		font-size: 16px;
		font-weight: 600;
		min-height: 52px;
		opacity: 0.8;
	}

	.btn-delete-account:hover {
		opacity: 1;
	}

	.btn-delete-account:active:not(:disabled) {
		opacity: 0.9;
	}

	.btn-delete-account:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-delete-account svg {
		width: 20px;
		height: 20px;
	}

	/* Selector Sheet */
	.selector-overlay {
		position: fixed;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.5);
		z-index: 210;
	}

	.selector-sheet {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background-color: var(--color-bg-secondary);
		border-radius: 16px 16px 0 0;
		z-index: 220;
		max-height: 50vh;
		display: flex;
		flex-direction: column;
	}

	.selector-sheet.currency-sheet {
		max-height: 70vh;
	}

	.selector-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px;
		border-bottom: 1px solid var(--color-border);
	}

	.selector-title {
		font-size: 17px;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.selector-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: none;
		border: none;
		color: var(--color-text-muted);
		border-radius: 8px;
	}

	.selector-close:active {
		background-color: var(--color-bg-tertiary);
	}

	.selector-close svg {
		width: 20px;
		height: 20px;
	}

	.selector-list {
		padding: 8px 0;
	}

	.selector-list.scrollable {
		overflow-y: auto;
		flex: 1;
	}

	.selector-item {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 14px 16px;
		background: none;
		border: none;
		text-align: left;
		color: var(--color-text-primary);
	}

	.selector-item:active {
		background-color: var(--color-bg-tertiary);
	}

	.selector-item.selected {
		background-color: var(--color-bg-tertiary);
	}

	.selector-icon {
		font-size: 24px;
		width: 32px;
		text-align: center;
	}

	.selector-label {
		flex: 1;
		font-size: 16px;
	}

	.currency-code {
		font-size: 14px;
		font-weight: 600;
		width: 40px;
		color: var(--color-primary);
	}

	.currency-name {
		flex: 1;
		font-size: 15px;
	}

	.currency-symbol {
		font-size: 14px;
		color: var(--color-text-muted);
		width: 30px;
		text-align: right;
	}

	.check-icon {
		width: 20px;
		height: 20px;
		color: var(--color-primary);
		flex-shrink: 0;
	}

	/* Close Confirm Sheet */
	.close-confirm-sheet {
		max-height: 80vh;
	}

	.close-confirm-content {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.close-confirm-text {
		font-size: 15px;
		color: var(--color-text-secondary);
		margin: 0;
		line-height: 1.5;
	}

	.transfer-info {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.transfer-label {
		font-size: 15px;
		color: var(--color-text-primary);
		margin: 0;
	}

	.transfer-label strong {
		color: var(--color-primary);
	}

	.transfer-label strong.negative {
		color: var(--color-danger);
	}

	.account-select-list {
		display: flex;
		flex-direction: column;
		background-color: var(--color-bg-tertiary);
		border-radius: 12px;
		overflow: hidden;
		max-height: 200px;
		overflow-y: auto;
	}

	.account-select-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px;
		background: none;
		border: none;
		border-bottom: 1px solid var(--color-border);
		text-align: left;
		color: var(--color-text-primary);
	}

	.account-select-item:last-child {
		border-bottom: none;
	}

	.account-select-item:active {
		background-color: var(--color-bg-secondary);
	}

	.account-select-item.selected {
		background-color: var(--color-bg-secondary);
	}

	.account-select-info {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.account-select-name {
		font-size: 16px;
	}

	.account-select-currency {
		font-size: 12px;
		color: var(--color-text-muted);
		background-color: var(--color-bg-primary);
		padding: 2px 6px;
		border-radius: 4px;
	}

	.conversion-info {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px;
		background-color: var(--color-bg-tertiary);
		border-radius: 8px;
		font-size: 14px;
		color: var(--color-text-secondary);
	}

	.conversion-info svg {
		width: 18px;
		height: 18px;
		color: var(--color-primary);
		flex-shrink: 0;
	}

	.conversion-info.negative svg {
		color: var(--color-danger);
	}

	.conversion-info strong {
		color: var(--color-success);
	}

	.conversion-info.negative strong {
		color: var(--color-danger);
	}

	.no-accounts-warning {
		font-size: 14px;
		color: var(--color-warning);
		margin: 0;
		padding: 12px;
		background-color: var(--color-bg-tertiary);
		border-radius: 8px;
	}

	/* Zero Balance Option */
	.zero-balance-option {
		margin-top: 16px;
	}

	.divider-with-text {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 16px;
	}

	.divider-with-text::before,
	.divider-with-text::after {
		content: '';
		flex: 1;
		height: 1px;
		background-color: var(--color-border);
	}

	.divider-with-text span {
		font-size: 13px;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.btn-zero-balance {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 14px;
		background-color: var(--color-bg-tertiary);
		border: 2px solid var(--color-primary);
		border-radius: 12px;
		color: var(--color-primary);
		font-size: 16px;
		font-weight: 600;
		min-height: 48px;
		transition: all 0.2s ease;
	}

	.btn-zero-balance:hover:not(:disabled) {
		background-color: var(--color-primary);
		color: white;
	}

	.btn-zero-balance:active:not(:disabled) {
		opacity: 0.9;
	}

	.btn-zero-balance:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.btn-zero-balance svg {
		width: 20px;
		height: 20px;
	}

	.zero-balance-hint {
		font-size: 12px;
		color: var(--color-text-muted);
		text-align: center;
		margin: 8px 0 0 0;
	}

	.close-confirm-actions {
		display: flex;
		gap: 12px;
		margin-top: 8px;
	}

	.btn-cancel {
		flex: 1;
		padding: 14px;
		background-color: var(--color-bg-tertiary);
		border: none;
		border-radius: 12px;
		color: var(--color-text-primary);
		font-size: 16px;
		font-weight: 500;
		min-height: 48px;
	}

	.btn-cancel:active {
		background-color: var(--color-border);
	}

	.btn-confirm-close {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 14px;
		background-color: var(--color-danger);
		border: none;
		border-radius: 12px;
		color: white;
		font-size: 16px;
		font-weight: 600;
		min-height: 48px;
	}

	.btn-confirm-close:active:not(:disabled) {
		opacity: 0.9;
	}

	.btn-confirm-close:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.btn-confirm-close svg {
		width: 18px;
		height: 18px;
	}

	/* Delete Confirm Sheet */
	.delete-confirm-sheet {
		max-height: 60vh;
	}

	.delete-title {
		color: var(--color-danger);
	}

	.delete-confirm-content {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.delete-warning {
		display: flex;
		gap: 14px;
		padding: 16px;
		background-color: rgba(239, 68, 68, 0.1);
		border: 1px solid var(--color-danger);
		border-radius: 12px;
	}

	.warning-icon {
		width: 28px;
		height: 28px;
		color: var(--color-danger);
		flex-shrink: 0;
	}

	.warning-text {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.warning-title {
		font-size: 16px;
		font-weight: 600;
		color: var(--color-danger);
		margin: 0;
	}

	.warning-description {
		font-size: 14px;
		color: var(--color-text-secondary);
		margin: 0;
		line-height: 1.5;
	}

	.warning-description strong {
		color: var(--color-text-primary);
	}

	.delete-confirm-actions {
		display: flex;
		gap: 12px;
	}

	.btn-confirm-delete {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 14px;
		background-color: var(--color-danger);
		border: none;
		border-radius: 12px;
		color: white;
		font-size: 16px;
		font-weight: 600;
		min-height: 48px;
	}

	.btn-confirm-delete:active:not(:disabled) {
		opacity: 0.9;
	}

	.btn-confirm-delete:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.btn-confirm-delete svg {
		width: 18px;
		height: 18px;
	}

	/* Spin animation */
	.spin {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	/* Currency Change Confirmation Sheet */
	.currency-change-sheet {
		max-height: 80vh;
	}

	.currency-change-content {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.currency-change-warning {
		display: flex;
		gap: 12px;
		padding: 16px;
		background-color: rgba(245, 158, 11, 0.1);
		border-radius: 12px;
		border: 1px solid rgba(245, 158, 11, 0.3);
	}

	.warning-icon {
		width: 24px;
		height: 24px;
		color: #F59E0B;
		flex-shrink: 0;
	}

	.warning-text {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.warning-title {
		font-size: 15px;
		font-weight: 600;
		color: #F59E0B;
		margin: 0;
	}

	.warning-description {
		font-size: 14px;
		color: var(--color-text-secondary);
		margin: 0;
		line-height: 1.4;
	}

	.warning-description strong {
		color: var(--color-text-primary);
	}

	.currency-change-info {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.conversion-preview {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16px;
		padding: 16px;
		background-color: var(--color-bg-tertiary);
		border-radius: 12px;
	}

	.conversion-from,
	.conversion-to {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}

	.conversion-label {
		font-size: 12px;
		color: var(--color-text-muted);
		text-transform: uppercase;
	}

	.conversion-currency {
		font-size: 20px;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.conversion-arrow {
		width: 24px;
		height: 24px;
		color: var(--color-primary);
	}

	.conversion-note {
		font-size: 13px;
		color: var(--color-text-muted);
		text-align: center;
		margin: 0;
		line-height: 1.4;
	}

	.currency-change-actions {
		display: flex;
		gap: 12px;
		padding-top: 8px;
	}

	.currency-change-actions .btn-cancel {
		flex: 1;
		padding: 14px 16px;
		border: none;
		border-radius: 12px;
		font-size: 15px;
		font-weight: 500;
		cursor: pointer;
		background-color: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		transition: background-color 0.2s;
	}

	.currency-change-actions .btn-cancel:hover {
		background-color: var(--color-bg-secondary);
	}

	.currency-change-actions .btn-confirm {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 14px 16px;
		border: none;
		border-radius: 12px;
		font-size: 15px;
		font-weight: 600;
		cursor: pointer;
		background-color: var(--color-primary);
		color: white;
		transition: background-color 0.2s;
	}

	.currency-change-actions .btn-confirm:hover {
		background-color: var(--color-primary-hover);
	}

	.currency-change-actions .btn-confirm svg {
		width: 18px;
		height: 18px;
	}
</style>
