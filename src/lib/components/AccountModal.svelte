<script lang="ts">
	import { toast } from '$lib/stores';
	import type { Account } from '$lib/types';

	// Props
	let {
		show = $bindable(false),
		account = null as Account | null,
		onSave = async () => {},
		onClose = () => {}
	} = $props();

	// Determine if we're editing
	let isEditing = $derived(account !== null);

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
	let showTypeSelector = $state(false);
	let showCurrencySelector = $state(false);

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
						notes: formData.notes.trim() || null
					})
				});

				if (!response.ok) {
					const data = await response.json();
					throw new Error(data.message || 'Nu s-a putut actualiza contul');
				}

				toast.success('Contul a fost actualizat');
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
		onClose();
	}

	// Handle type selection
	function selectType(type: 'cash' | 'investment' | 'savings') {
		formData.type = type;
		showTypeSelector = false;
	}

	// Handle currency selection
	function selectCurrency(code: string) {
		formData.currency = code;
		showCurrencySelector = false;
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

	/* Spin animation */
	.spin {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>
