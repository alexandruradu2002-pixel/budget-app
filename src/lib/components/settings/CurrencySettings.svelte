<script lang="ts">
	import { SettingsSection } from '$lib/components';
	import { CURRENCY_SYMBOLS, SUPPORTED_CURRENCIES, ALL_CURRENCY_SYMBOLS, type CurrencyValue } from '$lib/constants';
	import { currencyStore } from '$lib/stores';

	let { disabled = false }: { disabled?: boolean } = $props();

	// Converter state
	let fromCurrency = $state<CurrencyValue>('EUR');
	let toCurrency = $state<CurrencyValue>('RON');
	let amount = $state<string>('100');
	let convertedAmount = $derived(calculateConversion());

	// Custom dropdown state
	let fromDropdownOpen = $state(false);
	let toDropdownOpen = $state(false);

	// Add currency dropdown state
	let showAddCurrencyDropdown = $state(false);
	let showMainCurrencyDropdown = $state(false);

	// Get all available currencies that are not yet added
	let availableCurrencies = $derived(() => {
		const allCurrencies = Object.keys(ALL_CURRENCY_SYMBOLS);
		return allCurrencies.filter(c => !currencyStore.transactionCurrencies.includes(c));
	});

	// Get all currencies for main currency dropdown
	let allCurrenciesList = $derived(() => {
		return Object.keys(ALL_CURRENCY_SYMBOLS);
	});

	// Get symbol for any currency
	function getCurrencySymbol(currency: string): string {
		return ALL_CURRENCY_SYMBOLS[currency] || currency;
	}

	// Initialize from localStorage on mount
	$effect(() => {
		currencyStore.init();
		loadConverterPreferences();
	});

	// Close dropdowns when clicking outside
	$effect(() => {
		if (typeof window !== 'undefined') {
			const handleClickOutside = (e: MouseEvent) => {
				const target = e.target as HTMLElement;
				if (!target.closest('.custom-select') && !target.closest('.add-currency-container') && !target.closest('.main-currency-selector')) {
					fromDropdownOpen = false;
					toDropdownOpen = false;
					showAddCurrencyDropdown = false;
					showMainCurrencyDropdown = false;
				}
			};
			window.addEventListener('click', handleClickOutside);
			return () => window.removeEventListener('click', handleClickOutside);
		}
	});

	function loadConverterPreferences() {
		if (typeof window !== 'undefined') {
			const savedFrom = localStorage.getItem('converterFromCurrency') as CurrencyValue | null;
			const savedTo = localStorage.getItem('converterToCurrency') as CurrencyValue | null;
			
			if (savedFrom && SUPPORTED_CURRENCIES.includes(savedFrom)) {
				fromCurrency = savedFrom;
			}
			if (savedTo && SUPPORTED_CURRENCIES.includes(savedTo)) {
				toCurrency = savedTo;
			}
		}
	}

	function saveConverterPreferences() {
		if (typeof window !== 'undefined') {
			localStorage.setItem('converterFromCurrency', fromCurrency);
			localStorage.setItem('converterToCurrency', toCurrency);
		}
	}

	function calculateConversion(): string {
		const numAmount = parseFloat(amount) || 0;
		if (numAmount === 0) return '0.00';
		
		const rate = currencyStore.getRate(fromCurrency, toCurrency);
		const result = numAmount * rate;
		return result.toFixed(2);
	}

	function swapCurrencies() {
		if (disabled) return;
		const temp = fromCurrency;
		fromCurrency = toCurrency;
		toCurrency = temp;
		saveConverterPreferences();
	}

	function selectFromCurrency(currency: CurrencyValue) {
		fromCurrency = currency;
		fromDropdownOpen = false;
		saveConverterPreferences();
	}

	function selectToCurrency(currency: CurrencyValue) {
		toCurrency = currency;
		toDropdownOpen = false;
		saveConverterPreferences();
	}

	function toggleFromDropdown(e: MouseEvent) {
		e.stopPropagation();
		fromDropdownOpen = !fromDropdownOpen;
		toDropdownOpen = false;
	}

	function toggleToDropdown(e: MouseEvent) {
		e.stopPropagation();
		toDropdownOpen = !toDropdownOpen;
		fromDropdownOpen = false;
	}
</script>

<SettingsSection title="Currency" description="Set your main currency for the app">
	{#snippet icon()}
		<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
			/>
		</svg>
	{/snippet}

	<div class="currency-setting">
		<div class="currency-info">
			<span class="currency-label">Main Currency</span>
			<span class="currency-hint">Used for displaying amounts across the app</span>
		</div>
		<div class="main-currency-selector">
			<button 
				type="button"
				class="currency-toggle" 
				onclick={(e) => { e.stopPropagation(); showMainCurrencyDropdown = !showMainCurrencyDropdown; }}
			>
				<span class="currency-code">{currencyStore.value}</span>
				<span class="currency-symbol">{getCurrencySymbol(currencyStore.value)}</span>
				<svg class="dropdown-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>
			
			{#if showMainCurrencyDropdown}
				<div class="main-currency-dropdown">
					{#each allCurrenciesList() as currency}
						<button
							type="button"
							class="currency-dropdown-option"
							class:active={currencyStore.value === currency}
							onclick={() => {
								currencyStore.set(currency);
								showMainCurrencyDropdown = false;
							}}
						>
							<span class="option-code">{currency}</span>
							<span class="option-symbol">{getCurrencySymbol(currency)}</span>
							{#if currencyStore.value === currency}
								<svg class="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
							{/if}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- Transaction Modal Currencies -->
	<div class="transaction-currencies-section">
		<div class="section-header">
			<span class="section-title">Transaction Currencies</span>
			<span class="section-hint">Manage which currencies appear in the transaction modal dropdown</span>
		</div>
		<div class="currency-chips">
			{#each currencyStore.transactionCurrencies as currency}
				<div class="currency-chip selected">
					<span class="chip-code">{currency}</span>
					<span class="chip-symbol">{getCurrencySymbol(currency)}</span>
					{#if currencyStore.transactionCurrencies.length > 1}
						<button
							type="button"
							class="chip-remove"
							onclick={() => currencyStore.removeTransactionCurrency(currency)}
							title={`Remove ${currency}`}
						>
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					{/if}
				</div>
			{/each}
			
			<!-- Add currency button -->
			<div class="add-currency-container">
				<button
					type="button"
					class="add-currency-btn"
					onclick={(e) => { e.stopPropagation(); showAddCurrencyDropdown = !showAddCurrencyDropdown; }}
					title="Add currency"
				>
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					<span>Add</span>
				</button>
				
				{#if showAddCurrencyDropdown}
					<div class="add-currency-dropdown">
						{#each availableCurrencies() as currency}
							<button
								type="button"
								class="add-currency-option"
								onclick={() => {
									currencyStore.addTransactionCurrency(currency);
									showAddCurrencyDropdown = false;
								}}
							>
								<span class="option-code">{currency}</span>
								<span class="option-symbol">{getCurrencySymbol(currency)}</span>
							</button>
						{/each}
						{#if availableCurrencies().length === 0}
							<div class="no-currencies">All currencies added</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Currency Converter -->
	<div class="converter-section">
		<div class="converter-header">
			<span class="converter-title">Currency Converter</span>
			<span class="converter-hint">Convert between currencies</span>
		</div>
		
		<div class="converter-body">
			<!-- From Currency -->
			<div class="converter-input-group">
				<span class="converter-label">From</span>
				<div class="converter-row">
					<input
						type="number"
						class="amount-input"
						bind:value={amount}
						placeholder="0.00"
						min="0"
						step="0.01"
						aria-label="Amount to convert"
					/>
					<!-- Custom Select for From Currency -->
					<div class="custom-select" class:open={fromDropdownOpen}>
						<button 
							type="button"
							class="select-trigger" 
							onclick={toggleFromDropdown}
							aria-expanded={fromDropdownOpen}
							aria-haspopup="listbox"
						>
							<span class="select-value">
								<span class="select-code">{fromCurrency}</span>
								<span class="select-symbol">({CURRENCY_SYMBOLS[fromCurrency]})</span>
							</span>
							<svg class="select-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
							</svg>
						</button>
						{#if fromDropdownOpen}
							<div class="select-dropdown" role="listbox">
								{#each SUPPORTED_CURRENCIES as currency}
									<button
										type="button"
										class="select-option"
										class:selected={fromCurrency === currency}
										onclick={() => selectFromCurrency(currency)}
										role="option"
										aria-selected={fromCurrency === currency}
									>
										<span class="option-code">{currency}</span>
										<span class="option-symbol">({CURRENCY_SYMBOLS[currency]})</span>
										{#if fromCurrency === currency}
											<svg class="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
											</svg>
										{/if}
									</button>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Swap Button -->
			<button class="swap-button" onclick={swapCurrencies} title="Swap currencies">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
				</svg>
			</button>

			<!-- To Currency -->
			<div class="converter-input-group">
				<span class="converter-label">To</span>
				<div class="converter-row">
					<input
						type="text"
						class="amount-input result"
						value={convertedAmount}
						readonly
						aria-label="Converted amount"
					/>
					<!-- Custom Select for To Currency -->
					<div class="custom-select" class:open={toDropdownOpen}>
						<button 
							type="button"
							class="select-trigger" 
							onclick={toggleToDropdown}
							aria-expanded={toDropdownOpen}
							aria-haspopup="listbox"
						>
							<span class="select-value">
								<span class="select-code">{toCurrency}</span>
								<span class="select-symbol">({CURRENCY_SYMBOLS[toCurrency]})</span>
							</span>
							<svg class="select-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
							</svg>
						</button>
						{#if toDropdownOpen}
							<div class="select-dropdown" role="listbox">
								{#each SUPPORTED_CURRENCIES as currency}
									<button
										type="button"
										class="select-option"
										class:selected={toCurrency === currency}
										onclick={() => selectToCurrency(currency)}
										role="option"
										aria-selected={toCurrency === currency}
									>
										<span class="option-code">{currency}</span>
										<span class="option-symbol">({CURRENCY_SYMBOLS[currency]})</span>
										{#if toCurrency === currency}
											<svg class="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
											</svg>
										{/if}
									</button>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Exchange Rate Info -->
			<div class="rate-info">
				<span class="rate-text">
					1 {fromCurrency} = {currencyStore.getRate(fromCurrency, toCurrency).toFixed(4)} {toCurrency}
				</span>
				{#if currencyStore.lastUpdated}
					<span class="rate-updated">
						Updated: {new Date(currencyStore.lastUpdated).toLocaleDateString('ro-RO')}
					</span>
				{/if}
			</div>
		</div>
	</div>
</SettingsSection>

<style>
	.currency-setting {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.currency-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.currency-label {
		font-size: 0.95rem;
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.currency-hint {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	/* Main Currency Selector */
	.main-currency-selector {
		position: relative;
	}

	.currency-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s ease;
		min-width: 140px;
		justify-content: space-between;
	}

	.currency-toggle:hover {
		border-color: var(--color-primary);
	}

	.currency-toggle:hover .dropdown-arrow {
		color: var(--color-primary);
	}

	.currency-code {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-text-primary);
		transition: color 0.2s ease;
	}

	.currency-symbol {
		font-size: 0.85rem;
		color: var(--color-text-muted);
		transition: color 0.2s ease;
	}

	.dropdown-arrow {
		color: var(--color-text-muted);
		transition: color 0.2s ease;
		flex-shrink: 0;
	}

	.main-currency-dropdown {
		position: absolute;
		top: calc(100% + 4px);
		right: 0;
		min-width: 160px;
		max-height: 250px;
		overflow-y: auto;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		z-index: 100;
		animation: dropdownFadeIn 0.15s ease-out;
	}

	.currency-dropdown-option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.75rem 0.875rem;
		background: transparent;
		border: none;
		color: var(--color-text-primary);
		font-size: 0.875rem;
		cursor: pointer;
		transition: background-color 0.15s ease;
		text-align: left;
	}

	.currency-dropdown-option:hover {
		background: var(--color-bg-tertiary);
	}

	.currency-dropdown-option.active {
		background: var(--color-primary);
		color: white;
	}

	.currency-dropdown-option.active:hover {
		background: var(--color-primary-hover);
	}

	.currency-dropdown-option.active .option-symbol {
		color: rgba(255, 255, 255, 0.8);
	}

	.currency-dropdown-option .option-code {
		font-weight: 600;
	}

	.currency-dropdown-option .option-symbol {
		color: var(--color-text-muted);
		font-size: 0.8rem;
		transition: color 0.15s ease;
	}

	.currency-dropdown-option .check-icon {
		margin-left: auto;
		flex-shrink: 0;
	}

	/* Transaction Currencies Section */
	.transaction-currencies-section {
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--color-border);
	}

	.section-header {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		margin-bottom: 1rem;
	}

	.section-title {
		font-size: 0.95rem;
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.section-hint {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	.currency-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.currency-chip {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.875rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: 9999px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.currency-chip:hover {
		border-color: var(--color-primary);
		background: var(--color-bg-secondary);
	}

	.currency-chip.selected {
		background: var(--color-primary);
		border-color: var(--color-primary);
	}

	.currency-chip.selected .chip-code,
	.currency-chip.selected .chip-symbol {
		color: white;
	}

	.chip-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		margin-left: 0.25rem;
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		transition: color 0.2s ease;
		flex-shrink: 0;
	}

	.chip-remove:hover {
		color: white;
	}

	.chip-code {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-primary);
		transition: color 0.2s ease;
	}

	.chip-symbol {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		transition: color 0.2s ease;
	}

	/* Add Currency Button & Dropdown */
	.add-currency-container {
		position: relative;
	}

	.add-currency-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.875rem;
		background: var(--color-bg-tertiary);
		border: 1px dashed var(--color-border);
		border-radius: 9999px;
		cursor: pointer;
		transition: all 0.2s ease;
		color: var(--color-text-secondary);
		font-size: 0.85rem;
		font-weight: 500;
	}

	.add-currency-btn:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
		background: var(--color-bg-secondary);
	}

	.add-currency-dropdown {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		min-width: 140px;
		max-height: 200px;
		overflow-y: auto;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		z-index: 100;
		animation: dropdownFadeIn 0.15s ease-out;
	}

	.add-currency-option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.625rem 0.875rem;
		background: transparent;
		border: none;
		color: var(--color-text-primary);
		font-size: 0.85rem;
		cursor: pointer;
		transition: background-color 0.15s ease;
		text-align: left;
	}

	.add-currency-option:hover {
		background: var(--color-bg-tertiary);
	}

	.add-currency-option .option-code {
		font-weight: 600;
	}

	.add-currency-option .option-symbol {
		color: var(--color-text-muted);
		font-size: 0.8rem;
	}

	.no-currencies {
		padding: 0.75rem;
		text-align: center;
		color: var(--color-text-muted);
		font-size: 0.85rem;
	}

	/* Converter Section */
	.converter-section {
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--color-border);
	}

	.converter-header {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		margin-bottom: 1rem;
	}

	.converter-title {
		font-size: 0.95rem;
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.converter-hint {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	.converter-body {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.converter-input-group {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.converter-label {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.converter-row {
		display: flex;
		gap: 0.5rem;
	}

	.amount-input {
		flex: 1;
		padding: 0.75rem 1rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		color: var(--color-text-primary);
		font-size: 1rem;
		font-weight: 500;
		min-width: 0;
	}

	.amount-input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
	}

	.amount-input.result {
		background: var(--color-bg-secondary);
		color: var(--color-primary);
		font-weight: 600;
	}

	.amount-input::placeholder {
		color: var(--color-text-muted);
	}

	/* Remove spinner from number input */
	.amount-input[type='number']::-webkit-outer-spin-button,
	.amount-input[type='number']::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	.amount-input[type='number'] {
		-moz-appearance: textfield;
		appearance: textfield;
	}

	/* Custom Select Styles */
	.custom-select {
		position: relative;
		min-width: 120px;
	}

	.select-trigger {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		width: 100%;
		padding: 0.75rem 0.875rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		color: var(--color-text-primary);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.select-trigger:hover {
		border-color: var(--color-primary);
	}

	.custom-select.open .select-trigger {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
	}

	.select-value {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.select-code {
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.select-symbol {
		color: var(--color-text-muted);
		font-size: 0.8rem;
	}

	.select-arrow {
		color: var(--color-text-muted);
		transition: transform 0.2s ease;
		flex-shrink: 0;
	}

	.custom-select.open .select-arrow {
		transform: rotate(180deg);
	}

	.select-dropdown {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		z-index: 100;
		overflow: hidden;
		animation: dropdownFadeIn 0.15s ease-out;
	}

	@keyframes dropdownFadeIn {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.select-option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.75rem 0.875rem;
		background: transparent;
		border: none;
		color: var(--color-text-primary);
		font-size: 0.875rem;
		cursor: pointer;
		transition: background-color 0.15s ease;
		text-align: left;
	}

	.select-option:hover {
		background: var(--color-bg-tertiary);
	}

	.select-option.selected {
		background: var(--color-primary);
		color: white;
	}

	.select-option.selected:hover {
		background: var(--color-primary-hover);
	}

	.select-option.selected .option-symbol {
		color: rgba(255, 255, 255, 0.8);
	}

	.option-code {
		font-weight: 600;
	}

	.option-symbol {
		color: var(--color-text-muted);
		font-size: 0.8rem;
		transition: color 0.15s ease;
	}

	.check-icon {
		margin-left: auto;
		flex-shrink: 0;
	}

	.swap-button {
		align-self: center;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: 50%;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.swap-button:hover {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: white;
	}

	.swap-button:active {
		transform: scale(0.95);
	}

	.rate-info {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.75rem;
		background: var(--color-bg-tertiary);
		border-radius: 8px;
		margin-top: 0.5rem;
	}

	.rate-text {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.rate-updated {
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}
</style>
