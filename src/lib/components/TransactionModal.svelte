<script lang="ts">
	import type { Transaction, Account, Category } from '$lib/types';
	import PayeeSelector from './PayeeSelector.svelte';

	// Props
	let {
		show = $bindable(false),
		editingTransaction = null as Transaction | null,
		accounts = [] as Account[],
		categories = [] as Category[],
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
		isCleared: false,
		flag: 'none' as 'none' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple'
	});

	// Calculator state
	let calcDisplay = $state('0');
	let calcHasDecimal = $state(false);
	let isNewInput = $state(true);

	// Payee selector state
	let showPayeeSelector = $state(false);

	// Initialize form when modal opens or editingTransaction changes
	$effect(() => {
		if (show) {
			if (editingTransaction) {
				const amount = Math.abs(editingTransaction.amount);
				formData = {
					description: editingTransaction.description,
					amount: amount.toFixed(2),
					date: editingTransaction.date,
					account_id: editingTransaction.account_id,
					category_id: editingTransaction.category_id,
					notes: editingTransaction.notes || '',
					isInflow: editingTransaction.amount >= 0,
					isCleared: false,
					flag: 'none'
				};
				calcDisplay = amount.toFixed(2);
				calcHasDecimal = calcDisplay.includes('.');
				isNewInput = false;
			} else {
				formData = {
					description: '',
					amount: '0.00',
					date: new Date().toISOString().split('T')[0],
					account_id: accounts[0]?.id || 0,
					category_id: categories[0]?.id || 0,
					notes: '',
					isInflow: false,
					isCleared: false,
					flag: 'none'
				};
				calcDisplay = '0';
				calcHasDecimal = false;
				isNewInput = true;
			}
		}
	});

	// Calculator functions
	function calcInput(digit: string) {
		if (isNewInput || calcDisplay === '0') {
			calcDisplay = digit;
			isNewInput = false;
		} else {
			// Limit decimal places to 2
			if (calcHasDecimal) {
				const parts = calcDisplay.split('.');
				if (parts[1] && parts[1].length >= 2) return;
			}
			calcDisplay += digit;
		}
		updateAmountFromCalc();
	}

	function calcDecimal() {
		if (!calcHasDecimal) {
			if (isNewInput) {
				calcDisplay = '0.';
				isNewInput = false;
			} else {
				calcDisplay += '.';
			}
			calcHasDecimal = true;
		}
		updateAmountFromCalc();
	}

	function calcBackspace() {
		if (calcDisplay.length > 1) {
			const removed = calcDisplay[calcDisplay.length - 1];
			if (removed === '.') calcHasDecimal = false;
			calcDisplay = calcDisplay.slice(0, -1);
		} else {
			calcDisplay = '0';
			calcHasDecimal = false;
			isNewInput = true;
		}
		updateAmountFromCalc();
	}

	function calcClear() {
		calcDisplay = '0';
		calcHasDecimal = false;
		isNewInput = true;
		updateAmountFromCalc();
	}

	function updateAmountFromCalc() {
		const num = parseFloat(calcDisplay) || 0;
		formData.amount = num.toFixed(2);
	}

	function calcDone() {
		const num = parseFloat(calcDisplay) || 0;
		formData.amount = num.toFixed(2);
	}

	// Formatted display amount with sign
	let displayAmount = $derived(() => {
		const num = parseFloat(formData.amount) || 0;
		const sign = formData.isInflow ? '+' : '−';
		return `${sign}${num.toFixed(2)}lei`;
	});

	// Handle payee selection
	function handlePayeeSelect(payee: string) {
		formData.description = payee;
	}

	// Save transaction
	async function handleSave() {
		const amount = parseFloat(formData.amount);
		if (isNaN(amount) || amount === 0) return;

		const payload = {
			id: editingTransaction?.id,
			description: formData.description || 'Transaction',
			amount: formData.isInflow ? Math.abs(amount) : -Math.abs(amount),
			date: formData.date,
			account_id: formData.account_id,
			category_id: formData.category_id,
			notes: formData.notes
		};

		await onSave(payload);
		closeModal();
	}

	// Delete transaction
	async function handleDelete() {
		if (!editingTransaction) return;
		if (!confirm('Sigur vrei să ștergi această tranzacție?')) return;
		
		await onDelete(editingTransaction.id);
		closeModal();
	}

	// Close modal
	function closeModal() {
		show = false;
		onClose();
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
			<h2 class="modal-title">
				{editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
			</h2>
			<div class="header-spacer"></div>
		</header>

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
					{formData.isInflow ? '+' : '−'}{formData.amount}lei
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
				<div class="form-row">
					<div class="form-icon primary square">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
						</svg>
					</div>
					<div class="form-field">
						<label for="category-select" class="field-label">Category</label>
						<select id="category-select" bind:value={formData.category_id} class="field-select">
							{#each categories as category}
								<option value={category.id}>{category.name}</option>
							{/each}
						</select>
					</div>
					<svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</div>

				<!-- Account -->
				<div class="form-row">
					<div class="form-icon primary square">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
						</svg>
					</div>
					<div class="form-field">
						<label for="account-select" class="field-label">Account</label>
						<select id="account-select" bind:value={formData.account_id} class="field-select">
							{#each accounts as account}
								<option value={account.id}>{account.name}</option>
							{/each}
						</select>
					</div>
					<svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</div>

				<!-- Date -->
				<div class="form-row no-border">
					<div class="form-icon primary square">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
						</svg>
					</div>
					<div class="form-field">
						<label for="date-input" class="field-label">Date</label>
						<input id="date-input" type="date" bind:value={formData.date} class="field-input" />
					</div>
				</div>
			</div>

			<!-- Additional Options -->
			<div class="form-card">
				<!-- Cleared -->
				<div class="form-row">
					<div class="form-icon cleared">
						<span>C</span>
					</div>
					<div class="form-field">
						<span class="field-value">Cleared</span>
					</div>
					<button
						type="button"
						aria-label="Toggle cleared status"
						class="toggle-switch"
						class:active={formData.isCleared}
						onclick={() => formData.isCleared = !formData.isCleared}
					>
						<div class="toggle-thumb" class:active={formData.isCleared}></div>
					</button>
				</div>

				<!-- Flag -->
				<div class="form-row">
					<div class="form-icon-plain">
						<svg fill="currentColor" viewBox="0 0 24 24">
							<path d="M4 24h-2v-24h2v24zm18-21.387s-1.621 1.43-3.754 1.43c-3.36 0-3.436-2.895-7.337-2.895-2.108 0-4.075.98-4.909 1.694v12.085c1.184-.819 2.979-1.681 4.923-1.681 3.684 0 4.201 2.754 7.484 2.754 2.122 0 3.593-1.359 3.593-1.359v-12.028z"/>
						</svg>
					</div>
					<div class="form-field">
						<span class="field-label">Flag</span>
						<span class="field-value">None</span>
					</div>
					<svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</div>

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

			<!-- Action Buttons -->
			<div class="action-buttons">
				{#if editingTransaction}
					<button type="button" onclick={handleDelete} class="btn-delete">
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
		</div>

		<!-- Calculator Keyboard -->
		<div class="calculator">
			<div class="calc-grid">
				<!-- Row 1 -->
				<button type="button" onclick={() => calcInput('7')} class="calc-btn number">7</button>
				<button type="button" onclick={() => calcInput('8')} class="calc-btn number">8</button>
				<button type="button" onclick={() => calcInput('9')} class="calc-btn number">9</button>
				<button type="button" class="calc-btn operator">×</button>
				<button type="button" class="calc-btn operator">÷</button>
				
				<!-- Row 2 -->
				<button type="button" onclick={() => calcInput('4')} class="calc-btn number">4</button>
				<button type="button" onclick={() => calcInput('5')} class="calc-btn number">5</button>
				<button type="button" onclick={() => calcInput('6')} class="calc-btn number">6</button>
				<button type="button" class="calc-btn operator">+</button>
				<button type="button" class="calc-btn operator">−</button>
				
				<!-- Row 3 -->
				<button type="button" onclick={() => calcInput('1')} class="calc-btn number">1</button>
				<button type="button" onclick={() => calcInput('2')} class="calc-btn number">2</button>
				<button type="button" onclick={() => calcInput('3')} class="calc-btn number">3</button>
				<button type="button" onclick={calcDone} class="calc-btn equals">=</button>
				
				<!-- Row 4 -->
				<button type="button" onclick={calcDecimal} class="calc-btn number">.</button>
				<button type="button" onclick={() => calcInput('0')} class="calc-btn number">0</button>
				<button type="button" aria-label="Backspace" onclick={calcBackspace} class="calc-btn backspace">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414a2 2 0 011.414-.586H19a2 2 0 012 2v10a2 2 0 01-2 2h-8.172a2 2 0 01-1.414-.586L3 12z" />
					</svg>
				</button>
				<button type="button" onclick={() => { calcDone(); handleSave(); }} class="calc-btn done">Done</button>
			</div>
		</div>
	</div>
{/if}

<!-- Payee Selector Modal -->
<PayeeSelector 
	bind:show={showPayeeSelector}
	selectedPayee={formData.description}
	onSelect={handlePayeeSelect}
/>

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		z-index: 50;
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
		font-size: 18px;
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
		padding-bottom: 16px;
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
		padding: 24px 16px;
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

	.form-icon.square {
		border-radius: 8px;
	}

	.form-icon svg {
		width: 16px;
		height: 16px;
	}

	.form-icon.cleared {
		width: 32px;
		height: 32px;
		border: 2px solid var(--color-text-muted);
		border-radius: 50%;
		color: var(--color-text-muted);
		font-size: 14px;
		font-weight: 700;
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

	.field-select {
		width: 100%;
		background: transparent;
		border: none;
		color: var(--color-text-primary);
		font-size: 15px;
		font-weight: 500;
		appearance: none;
		cursor: pointer;
	}

	.field-select:focus {
		outline: none;
	}

	.field-select option {
		background-color: var(--color-bg-secondary);
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

	/* Toggle Switch */
	.toggle-switch {
		width: 48px;
		height: 28px;
		border-radius: 14px;
		background-color: var(--color-bg-tertiary);
		border: none;
		padding: 2px;
		transition: background-color 0.2s;
	}

	.toggle-switch.active {
		background-color: var(--color-primary);
	}

	.toggle-thumb {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background-color: white;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
		transition: transform 0.2s;
		margin-top: 2px;
		margin-left: 2px;
	}

	.toggle-thumb.active {
		transform: translateX(20px);
	}

	/* Action Buttons */
	.action-buttons {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		padding: 16px;
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
		background-color: var(--color-bg-secondary);
		border-top: 1px solid var(--color-border);
		padding: 12px 12px 24px;
	}

	.calc-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 8px;
	}

	.calc-btn {
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		border-radius: 12px;
		font-size: 20px;
		font-weight: 500;
	}

	.calc-btn.number {
		background-color: var(--color-bg-tertiary);
		color: var(--color-text-primary);
	}

	.calc-btn.number:active {
		background-color: var(--color-border);
	}

	.calc-btn.operator {
		background-color: var(--color-bg-primary);
		color: var(--color-text-muted);
	}

	.calc-btn.equals {
		grid-column: span 2;
		grid-row: span 2;
		background-color: var(--color-bg-primary);
		border: 1px solid var(--color-border);
		color: var(--color-text-muted);
		font-size: 18px;
	}

	.calc-btn.backspace {
		background-color: var(--color-bg-tertiary);
		color: var(--color-text-muted);
	}

	.calc-btn.backspace:active {
		background-color: var(--color-border);
	}

	.calc-btn.backspace svg {
		width: 20px;
		height: 20px;
	}

	.calc-btn.done {
		grid-column: span 2;
		background-color: var(--color-primary);
		color: white;
		font-size: 14px;
		font-weight: 600;
	}

	.calc-btn.done:active {
		background-color: var(--color-primary-hover);
	}
</style>
