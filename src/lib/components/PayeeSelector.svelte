<script lang="ts" module>
	// Transfer payee prefix constant
	export const TRANSFER_PAYEE_PREFIX = 'Transfer to: ';

	// Helper to check if a payee is a transfer
	export function isTransferPayee(payee: string): boolean {
		return payee.startsWith(TRANSFER_PAYEE_PREFIX);
	}

	// Helper to get target account name from transfer payee
	export function getTransferTargetAccountName(payee: string): string | null {
		if (!isTransferPayee(payee)) return null;
		return payee.slice(TRANSFER_PAYEE_PREFIX.length);
	}
</script>

<script lang="ts">
	import type { Account } from '$lib/types';
	import { cacheStore, type Payee } from '$lib/stores';

	// Props
	let {
		show = $bindable(false),
		selectedPayee = $bindable(''),
		accounts = [] as Account[],
		currentAccountId = undefined as number | undefined,
		onSelect = (payee: string) => {},
		onTransferSelect = (payee: string, targetAccountId: number) => {},
		onClose = () => {}
	} = $props();

	// State
	let searchQuery = $state('');
	let allPayees = $derived(cacheStore.payees);
	let loading = $derived(cacheStore.payeesLoading);
	let error = $state('');
	let searchInputRef = $state<HTMLInputElement | null>(null);

	// Filter payees client-side based on search query
	let payees = $derived.by(() => {
		if (!searchQuery.trim()) return allPayees;
		const query = searchQuery.toLowerCase();
		return allPayees.filter(p => p.name.toLowerCase().includes(query));
	});

	// Collapsible sections state
	let transfersExpanded = $state(false);
	let payeesExpanded = $state(true);

	// Menu state
	let openMenuPayee = $state<string | null>(null);

	// Delete confirmation state
	let showDeleteConfirm = $state(false);
	let payeeToDelete = $state<string | null>(null);

	// Edit state
	let showEditModal = $state(false);
	let payeeToEdit = $state<string | null>(null);
	let editNewName = $state('');
	let editLoading = $state(false);

	// Filter accounts for transfer (exclude current account)
	let transferAccounts = $derived(
		accounts.filter(a => a.is_active && a.id !== currentAccountId)
	);

	// Check URL hash on mount to restore state after reload
	$effect(() => {
		if (typeof window !== 'undefined' && window.location.hash === '#payee-selector') {
			show = true;
		}
	});

	// Track if we need to focus the input (set by parent on user interaction)
	let shouldFocusOnOpen = $state(false);
	
	// Export a function to open with focus (call this from user interaction)
	export function openWithFocus() {
		shouldFocusOnOpen = true;
		show = true;
	}

	// Load payees when modal opens
	$effect(() => {
		if (show) {
			// Reset search and load all payees when modal opens
			searchQuery = '';
			loadPayees();
			// Update URL hash so reload keeps the modal open
			if (typeof window !== 'undefined' && window.location.hash !== '#payee-selector') {
				history.pushState({ payeeSelector: true }, '', '#payee-selector');
			}
			// Focus search input - this works when triggered by user interaction
			if (shouldFocusOnOpen) {
				// Use requestAnimationFrame for better timing on mobile
				requestAnimationFrame(() => {
					searchInputRef?.focus();
					// On iOS, we may need a slight delay
					setTimeout(() => {
						searchInputRef?.focus();
					}, 50);
				});
				shouldFocusOnOpen = false;
			}
		}
	});

	// Handle browser back button
	function handlePopState(event: PopStateEvent) {
		if (show && window.location.hash !== '#payee-selector') {
			show = false;
			searchQuery = '';
			onClose();
		}
	}

	async function loadPayees() {
		error = '';
		try {
			// Uses cache - instant load from localStorage, then background refresh
			await cacheStore.loadPayees();
		} catch (e) {
			error = 'Could not load payees';
			console.error(e);
		}
	}

	// Force refresh after edits/deletes
	async function refreshPayees() {
		await cacheStore.loadPayees(true);
	}

	function selectPayee(name: string) {
		selectedPayee = name;
		onSelect(name);
		closeModal();
	}

	function selectTransfer(account: Account) {
		const payeeName = `${TRANSFER_PAYEE_PREFIX}${account.name}`;
		selectedPayee = payeeName;
		onTransferSelect(payeeName, account.id);
		closeModal();
	}

	async function useCustomPayee() {
		if (searchQuery.trim()) {
			const name = searchQuery.trim();
			// Save the new payee to the database
			try {
				const res = await fetch('/api/payees', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name })
				});
				if (!res.ok) {
					console.error('Failed to save new payee');
				} else {
					// Invalidate cache so new payee appears next time
					cacheStore.invalidatePayees();
				}
			} catch (e) {
				console.error('Error saving payee:', e);
			}
			selectPayee(name);
		}
	}

	function openDeleteConfirm(name: string, event: Event) {
		event.stopPropagation();
		openMenuPayee = null;
		payeeToDelete = name;
		showDeleteConfirm = true;
	}

	function cancelDelete() {
		showDeleteConfirm = false;
		payeeToDelete = null;
	}

	async function confirmDelete() {
		if (!payeeToDelete) return;
		
		try {
			const res = await fetch(`/api/payees?name=${encodeURIComponent(payeeToDelete)}`, {
				method: 'DELETE'
			});
			if (res.ok) {
				// Refresh payees list from server
				await refreshPayees();
			} else {
				console.error('Failed to delete payee');
			}
		} catch (e) {
			console.error('Error deleting payee:', e);
		} finally {
			showDeleteConfirm = false;
			payeeToDelete = null;
		}
	}

	function toggleMenu(name: string, event: Event) {
		event.stopPropagation();
		if (openMenuPayee === name) {
			openMenuPayee = null;
			menuPosition = 'below';
		} else {
			// Calculate if menu should appear above or below
			const button = event.currentTarget as HTMLElement;
			const rect = button.getBoundingClientRect();
			const viewportHeight = window.innerHeight;
			const spaceBelow = viewportHeight - rect.bottom;
			const menuHeight = 100; // Approximate menu height
			
			menuPosition = spaceBelow < menuHeight ? 'above' : 'below';
			openMenuPayee = name;
		}
	}

	// Menu position state
	let menuPosition = $state<'above' | 'below'>('below');

	function closeMenu() {
		openMenuPayee = null;
		menuPosition = 'below';
	}

	function openEditModal(name: string, event: Event) {
		event.stopPropagation();
		openMenuPayee = null;
		payeeToEdit = name;
		editNewName = name;
		showEditModal = true;
	}

	function cancelEdit() {
		showEditModal = false;
		payeeToEdit = null;
		editNewName = '';
	}

	async function confirmEdit() {
		if (!payeeToEdit || !editNewName.trim()) return;
		
		editLoading = true;
		try {
			const res = await fetch('/api/payees', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					oldName: payeeToEdit,
					newName: editNewName.trim()
				})
			});
			if (res.ok) {
				// Update selected payee if it was the edited one
				if (selectedPayee === payeeToEdit) {
					selectedPayee = editNewName.trim();
				}
				// Refresh payees list from server
				await refreshPayees();
			} else {
				console.error('Failed to rename payee');
			}
		} catch (e) {
			console.error('Error renaming payee:', e);
		} finally {
			editLoading = false;
			showEditModal = false;
			payeeToEdit = null;
			editNewName = '';
		}
	}

	function closeModal() {
		// Remove hash and go back in history
		if (typeof window !== 'undefined' && window.location.hash === '#payee-selector') {
			history.back();
		}
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

<svelte:window onkeydown={handleKeydown} onpopstate={handlePopState} />

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
					bind:this={searchInputRef}
					bind:value={searchQuery}
					placeholder="Search or enter new payee..."
					class="search-input"
					enterkeyhint="done"
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
					<button onclick={() => loadPayees()} class="retry-btn">Try Again</button>
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

				<!-- Transfer Between Accounts Section -->
				{#if transferAccounts.length > 0 && (!searchQuery || 'transfer'.includes(searchQuery.toLowerCase()))}
					<button class="section-header" onclick={() => transfersExpanded = !transfersExpanded}>
						<svg class="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
						</svg>
						<span class="section-title">Transfer Between Accounts</span>
						<span class="section-count">{transferAccounts.length}</span>
						<svg class="chevron-icon" class:expanded={transfersExpanded} fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					{#if transfersExpanded}
						<div class="payees-list">
							{#each transferAccounts as account (account.id)}
								{@const transferPayeeName = `${TRANSFER_PAYEE_PREFIX}${account.name}`}
								<button 
									class="payee-item transfer-item"
									class:selected={selectedPayee === transferPayeeName}
									onclick={() => selectTransfer(account)}
								>
									<div class="payee-icon transfer" style="background-color: {account.color}20; color: {account.color};">
										<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
										</svg>
									</div>
									<div class="payee-info">
										<span class="payee-name">Transfer to: {account.name}</span>
										<span class="payee-hint">{account.type} • No category</span>
									</div>
									{#if selectedPayee === transferPayeeName}
										<svg class="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
											<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
										</svg>
									{/if}
								</button>
							{/each}
						</div>
					{/if}
				{/if}

				<!-- Regular Payees Section -->
				{#if payees.length > 0}
					{#if transferAccounts.length > 0}
						<button class="section-header" onclick={() => payeesExpanded = !payeesExpanded}>
							<svg class="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
							</svg>
							<span class="section-title">Payees</span>
							<span class="section-count">{payees.length}</span>
							<svg class="chevron-icon" class:expanded={payeesExpanded} fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
							</svg>
						</button>
					{/if}
					{#if payeesExpanded || transferAccounts.length === 0}
						<div class="payees-list">
							{#each payees as payee (payee.name)}
								<div class="payee-item-wrapper">
									<button 
										class="payee-item"
										class:selected={selectedPayee === payee.name}
										onclick={() => selectPayee(payee.name)}
									>
										<span class="payee-name">{payee.name}</span>
										{#if selectedPayee === payee.name}
											<svg class="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
												<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
											</svg>
										{/if}
									</button>
									<div class="menu-container">
										<button 
											class="menu-btn"
											aria-label="Payee options"
											onclick={(e) => toggleMenu(payee.name, e)}
										>
											<svg fill="currentColor" viewBox="0 0 24 24">
												<path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
											</svg>
										</button>
										{#if openMenuPayee === payee.name}
											<div class="dropdown-menu" class:above={menuPosition === 'above'}>
												<button class="dropdown-item" onclick={(e) => openEditModal(payee.name, e)}>
													<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
														<path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
													</svg>
													<span>Edit</span>
												</button>
												<button class="dropdown-item danger" onclick={(e) => openDeleteConfirm(payee.name, e)}>
													<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
														<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
													</svg>
													<span>Delete</span>
												</button>
											</div>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}
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

		<!-- Delete Confirmation Dialog -->
		{#if showDeleteConfirm}
			<div class="confirm-overlay" onclick={cancelDelete} role="presentation"></div>
			<div class="confirm-dialog">
				<div class="confirm-icon">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
				</div>
				<h3 class="confirm-title">Delete Payee?</h3>
				<p class="confirm-text">Are you sure you want to delete "<strong>{payeeToDelete}</strong>"? This action cannot be undone.</p>
				<div class="confirm-actions">
					<button class="confirm-btn cancel" onclick={cancelDelete}>Cancel</button>
					<button class="confirm-btn delete" onclick={confirmDelete}>Delete</button>
				</div>
			</div>
		{/if}

		<!-- Edit Payee Modal -->
		{#if showEditModal}
			<div class="confirm-overlay" onclick={cancelEdit} role="presentation"></div>
			<div class="confirm-dialog edit-dialog">
				<div class="edit-icon">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
					</svg>
				</div>
				<h3 class="confirm-title">Edit Payee</h3>
				<p class="edit-subtitle">Rename "<strong>{payeeToEdit}</strong>"</p>
				<input
					type="text"
					bind:value={editNewName}
					placeholder="Enter new name"
					class="edit-input"
					onkeydown={(e) => e.key === 'Enter' && confirmEdit()}
				/>
				<div class="confirm-actions">
					<button class="confirm-btn cancel" onclick={cancelEdit} disabled={editLoading}>Cancel</button>
					<button class="confirm-btn save" onclick={confirmEdit} disabled={editLoading || !editNewName.trim()}>
						{editLoading ? 'Saving...' : 'Save'}
					</button>
				</div>
			</div>
		{/if}

		<!-- Click outside to close menu -->
		{#if openMenuPayee}
			<div class="menu-backdrop" onclick={closeMenu} role="presentation"></div>
		{/if}
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		z-index: 300;
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

	.payee-icon.transfer {
		border-radius: 50%;
	}

	.payee-icon svg {
		width: 20px;
		height: 20px;
	}

	/* Section Headers */
	.section-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 16px;
		background-color: var(--color-bg-secondary);
		border: none;
		border-bottom: 1px solid var(--color-border);
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		width: 100%;
		cursor: pointer;
		text-align: left;
	}

	.section-header:active {
		background-color: var(--color-bg-tertiary);
	}

	.section-title {
		flex: 1;
	}

	.section-count {
		font-size: 12px;
		background-color: var(--color-bg-tertiary);
		padding: 2px 8px;
		border-radius: 10px;
	}

	.chevron-icon {
		width: 16px;
		height: 16px;
		transition: transform 0.2s ease;
	}

	.chevron-icon.expanded {
		transform: rotate(180deg);
	}

	.section-icon {
		width: 16px;
		height: 16px;
	}

	.transfer-item {
		background-color: transparent;
	}

	/* Payee item wrapper for delete button */
	.payee-item-wrapper {
		display: flex;
		align-items: center;
		border-bottom: 1px solid var(--color-border);
	}

	.payee-item-wrapper .payee-item {
		border-bottom: none;
	}

	/* Menu Container */
	.menu-container {
		position: relative;
		flex-shrink: 0;
	}

	.menu-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		background: none;
		border: none;
		color: var(--color-text-muted);
		cursor: pointer;
		margin-right: 4px;
	}

	.menu-btn:hover {
		color: var(--color-text-primary);
	}

	.menu-btn:active {
		opacity: 0.8;
	}

	.menu-btn svg {
		width: 20px;
		height: 20px;
	}

	/* Dropdown Menu */
	.dropdown-menu {
		position: absolute;
		top: 100%;
		right: 8px;
		background-color: var(--color-bg-primary);
		border: 1px solid var(--color-border);
		border-radius: 12px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		z-index: 350;
		min-width: 140px;
		overflow: hidden;
	}

	.dropdown-menu.above {
		top: auto;
		bottom: 100%;
		margin-bottom: 4px;
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 12px 16px;
		background: none;
		border: none;
		font-size: 15px;
		color: var(--color-text-primary);
		cursor: pointer;
		text-align: left;
	}

	.dropdown-item:hover {
		background-color: var(--color-bg-secondary);
	}

	.dropdown-item:active {
		background-color: var(--color-bg-tertiary);
	}

	.dropdown-item svg {
		width: 18px;
		height: 18px;
		color: var(--color-text-muted);
	}

	.dropdown-item.danger {
		color: var(--color-danger);
	}

	.dropdown-item.danger svg {
		color: var(--color-danger);
	}

	.menu-backdrop {
		position: fixed;
		inset: 0;
		z-index: 340;
	}

	/* Delete Button - removed, using menu now */

	/* Confirm Dialog */
	.confirm-overlay {
		position: fixed;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.5);
		z-index: 400;
	}

	.confirm-dialog {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background-color: var(--color-bg-primary);
		border-radius: 16px;
		padding: 24px;
		width: calc(100% - 48px);
		max-width: 320px;
		z-index: 401;
		text-align: center;
	}

	.confirm-icon {
		width: 48px;
		height: 48px;
		margin: 0 auto 16px;
		background-color: var(--color-danger);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
	}

	.confirm-icon svg {
		width: 24px;
		height: 24px;
	}

	.confirm-title {
		font-size: 18px;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 8px;
	}

	.confirm-text {
		font-size: 14px;
		color: var(--color-text-muted);
		margin: 0 0 24px;
		line-height: 1.5;
	}

	.confirm-actions {
		display: flex;
		gap: 12px;
	}

	.confirm-btn {
		flex: 1;
		padding: 12px 16px;
		border-radius: 10px;
		font-size: 15px;
		font-weight: 600;
		border: none;
		cursor: pointer;
	}

	.confirm-btn.cancel {
		background-color: var(--color-bg-secondary);
		color: var(--color-text-primary);
	}

	.confirm-btn.delete {
		background-color: var(--color-danger);
		color: white;
	}

	.confirm-btn.save {
		background-color: var(--color-primary);
		color: white;
	}

	.confirm-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.confirm-btn:active {
		opacity: 0.9;
	}

	/* Edit Modal */
	.edit-dialog {
		text-align: left;
	}

	.edit-icon {
		width: 48px;
		height: 48px;
		margin: 0 auto 16px;
		background-color: var(--color-primary);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
	}

	.edit-icon svg {
		width: 24px;
		height: 24px;
	}

	.edit-dialog .confirm-title {
		text-align: center;
	}

	.edit-subtitle {
		font-size: 14px;
		color: var(--color-text-muted);
		margin: 0 0 16px;
		text-align: center;
	}

	.edit-input {
		width: 100%;
		padding: 14px 16px;
		font-size: 16px;
		border: 1px solid var(--color-border);
		border-radius: 10px;
		background-color: var(--color-bg-secondary);
		color: var(--color-text-primary);
		margin-bottom: 20px;
		outline: none;
	}

	.edit-input:focus {
		border-color: var(--color-primary);
	}

	.edit-input::placeholder {
		color: var(--color-text-muted);
	}

	.payee-info {
		flex: 1;
		min-width: 0;
	}

	.payee-name {
		display: block;
		flex: 1;
		font-size: 16px;
		font-weight: 500;
		color: var(--color-text-primary);
	}

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
