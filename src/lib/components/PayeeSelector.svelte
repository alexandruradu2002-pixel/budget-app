<script lang="ts">
	// Props
	let {
		show = $bindable(false),
		selectedPayee = $bindable(''),
		onSelect = (payee: string) => {},
		onClose = () => {}
	} = $props();

	// State
	let searchQuery = $state('');
	let payees = $state<{ name: string; usage_count: number }[]>([]);
	let loading = $state(false);
	let error = $state('');

	// Load payees when modal opens
	$effect(() => {
		if (show) {
			loadPayees();
		}
	});

	// Search with debounce
	let searchTimeout: ReturnType<typeof setTimeout>;
	$effect(() => {
		if (show) {
			clearTimeout(searchTimeout);
			searchTimeout = setTimeout(() => {
				loadPayees(searchQuery);
			}, 300);
		}
	});

	async function loadPayees(search = '') {
		loading = true;
		error = '';
		try {
			const url = search 
				? `/api/payees?search=${encodeURIComponent(search)}`
				: '/api/payees';
			const res = await fetch(url);
			if (!res.ok) throw new Error('Failed to load payees');
			const data = await res.json();
			payees = data.payees || [];
		} catch (e) {
			error = 'Could not load payees';
			console.error(e);
		} finally {
			loading = false;
		}
	}

	function selectPayee(name: string) {
		selectedPayee = name;
		onSelect(name);
		closeModal();
	}

	function useCustomPayee() {
		if (searchQuery.trim()) {
			selectPayee(searchQuery.trim());
		}
	}

	function closeModal() {
		show = false;
		searchQuery = '';
		onClose();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeModal();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if show}
	<div class="modal-overlay">
		<!-- Header -->
		<header class="modal-header">
			<button aria-label="Înapoi" onclick={closeModal} class="back-btn">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
				</svg>
			</button>
			<h2 class="modal-title">Select Payee</h2>
			<div class="header-spacer"></div>
		</header>

		<!-- Search Input -->
		<div class="search-container">
			<div class="search-input-wrapper">
				<svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search or enter new payee..."
					class="search-input"
				/>
				{#if searchQuery}
					<button aria-label="Clear search" onclick={() => searchQuery = ''} class="clear-btn">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				{/if}
			</div>
		</div>

		<!-- Content -->
		<div class="modal-content">
			{#if loading}
				<div class="loading-state">
					<div class="spinner"></div>
					<span>Loading payees...</span>
				</div>
			{:else if error}
				<div class="error-state">
					<p>{error}</p>
					<button onclick={() => loadPayees(searchQuery)} class="retry-btn">Try Again</button>
				</div>
			{:else}
				<!-- Add New Payee option if searching -->
				{#if searchQuery.trim() && !payees.some(p => p.name.toLowerCase() === searchQuery.trim().toLowerCase())}
					<button class="payee-item new-payee" onclick={useCustomPayee}>
						<div class="payee-icon add">
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
							</svg>
						</div>
						<div class="payee-info">
							<span class="payee-name">Add "{searchQuery.trim()}"</span>
							<span class="payee-hint">Create new payee</span>
						</div>
					</button>
				{/if}

				<!-- Payees List -->
				{#if payees.length > 0}
					<div class="payees-list">
						{#each payees as payee (payee.name)}
							<button 
								class="payee-item"
								class:selected={selectedPayee === payee.name}
								onclick={() => selectPayee(payee.name)}
							>
								<div class="payee-icon">
									<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
									</svg>
								</div>
								<div class="payee-info">
									<span class="payee-name">{payee.name}</span>
									<span class="payee-count">{payee.usage_count} transaction{payee.usage_count !== 1 ? 's' : ''}</span>
								</div>
								{#if selectedPayee === payee.name}
									<svg class="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
										<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
									</svg>
								{/if}
							</button>
						{/each}
					</div>
				{:else if !searchQuery}
					<div class="empty-state">
						<svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
						</svg>
						<p class="empty-title">No payees yet</p>
						<p class="empty-text">Start typing to add your first payee</p>
					</div>
				{:else}
					<div class="empty-state">
						<p class="empty-text">No matching payees found</p>
					</div>
				{/if}
			{/if}
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		z-index: 60;
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

	.back-btn {
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

	.back-btn:active {
		background-color: var(--color-bg-tertiary);
	}

	.back-btn svg {
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

	/* Search */
	.search-container {
		padding: 16px;
		border-bottom: 1px solid var(--color-border);
	}

	.search-input-wrapper {
		display: flex;
		align-items: center;
		gap: 12px;
		background-color: var(--color-bg-secondary);
		border-radius: 12px;
		padding: 0 16px;
	}

	.search-icon {
		width: 20px;
		height: 20px;
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	.search-input {
		flex: 1;
		background: transparent;
		border: none;
		padding: 14px 0;
		font-size: 16px;
		color: var(--color-text-primary);
		outline: none;
	}

	.search-input::placeholder {
		color: var(--color-text-muted);
	}

	.clear-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		background-color: var(--color-bg-tertiary);
		border: none;
		border-radius: 50%;
		color: var(--color-text-muted);
	}

	.clear-btn svg {
		width: 16px;
		height: 16px;
	}

	/* Content */
	.modal-content {
		flex: 1;
		overflow-y: auto;
	}

	/* Payees List */
	.payees-list {
		display: flex;
		flex-direction: column;
	}

	.payee-item {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 16px;
		background: none;
		border: none;
		border-bottom: 1px solid var(--color-border);
		text-align: left;
		width: 100%;
		cursor: pointer;
	}

	.payee-item:active {
		background-color: var(--color-bg-secondary);
	}

	.payee-item.selected {
		background-color: var(--color-bg-secondary);
	}

	.payee-item.new-payee {
		background-color: var(--color-bg-secondary);
	}

	.payee-icon {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: var(--color-bg-tertiary);
		border-radius: 50%;
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	.payee-icon.add {
		background-color: var(--color-primary);
		color: white;
	}

	.payee-icon svg {
		width: 20px;
		height: 20px;
	}

	.payee-info {
		flex: 1;
		min-width: 0;
	}

	.payee-name {
		display: block;
		font-size: 16px;
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.payee-count,
	.payee-hint {
		display: block;
		font-size: 13px;
		color: var(--color-text-muted);
		margin-top: 2px;
	}

	.check-icon {
		width: 24px;
		height: 24px;
		color: var(--color-primary);
		flex-shrink: 0;
	}

	/* States */
	.loading-state,
	.empty-state,
	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 48px 24px;
		gap: 16px;
		color: var(--color-text-muted);
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--color-border);
		border-top-color: var(--color-primary);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.empty-icon {
		width: 48px;
		height: 48px;
		color: var(--color-text-muted);
	}

	.empty-title {
		font-size: 18px;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
	}

	.empty-text {
		font-size: 14px;
		margin: 0;
		text-align: center;
	}

	.retry-btn {
		padding: 10px 20px;
		background-color: var(--color-primary);
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
	}

	.retry-btn:active {
		opacity: 0.9;
	}
</style>
