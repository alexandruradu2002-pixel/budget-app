<script lang="ts">
	import type { Category } from '$lib/types';

	// Props
	let {
		show = $bindable(false),
		selectedCategoryId = $bindable(0),
		onSelect = (category: Category) => {},
		onClose = () => {}
	} = $props();

	// State
	let searchQuery = $state('');
	let categories = $state<Category[]>([]);
	let loading = $state(false);
	let error = $state('');

	// Group categories by group_name
	let groupedCategories = $derived(() => {
		const filtered = searchQuery
			? categories.filter(c => 
				c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(c.group_name?.toLowerCase().includes(searchQuery.toLowerCase()))
			)
			: categories;

		const groups: Record<string, Category[]> = {};
		
		for (const cat of filtered) {
			const groupName = cat.group_name || 'Other';
			if (!groups[groupName]) {
				groups[groupName] = [];
			}
			groups[groupName].push(cat);
		}

		return groups;
	});

	// Load categories when modal opens
	$effect(() => {
		if (show) {
			loadCategories();
		}
	});

	async function loadCategories() {
		loading = true;
		error = '';
		try {
			const res = await fetch('/api/categories');
			if (!res.ok) throw new Error('Failed to load categories');
			const data = await res.json();
			categories = data.categories || [];
		} catch (e) {
			error = 'Could not load categories';
			console.error(e);
		} finally {
			loading = false;
		}
	}

	function selectCategory(category: Category) {
		selectedCategoryId = category.id;
		onSelect(category);
		closeModal();
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
			<h2 class="modal-title">Select Category</h2>
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
					placeholder="Search categories..."
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
					<span>Loading categories...</span>
				</div>
			{:else if error}
				<div class="error-state">
					<p>{error}</p>
					<button onclick={() => loadCategories()} class="retry-btn">Try Again</button>
				</div>
			{:else if Object.keys(groupedCategories()).length === 0}
				<div class="empty-state">
					<svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
					</svg>
					<p class="empty-title">No categories found</p>
					<p class="empty-text">
						{searchQuery ? 'Try a different search term' : 'Add some categories to get started'}
					</p>
				</div>
			{:else}
				<!-- Categories List grouped by group_name -->
				<div class="categories-list">
					{#each Object.entries(groupedCategories()) as [groupName, groupCategories] (groupName)}
						<div class="category-group">
							<div class="group-header">
								<span class="group-name">{groupName}</span>
							</div>
							{#each groupCategories as category (category.id)}
								<button 
									class="category-item"
									class:selected={selectedCategoryId === category.id}
									onclick={() => selectCategory(category)}
								>
									<div class="category-icon" style="background-color: {category.color || 'var(--color-bg-tertiary)'}">
										<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
										</svg>
									</div>
									<div class="category-info">
										<span class="category-name">{category.name}</span>
									</div>
									{#if selectedCategoryId === category.id}
										<svg class="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
											<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
										</svg>
									{/if}
								</button>
							{/each}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		z-index: 210;
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

	/* Categories List */
	.categories-list {
		display: flex;
		flex-direction: column;
	}

	.category-group {
		display: flex;
		flex-direction: column;
	}

	.group-header {
		padding: 12px 16px 8px;
		background-color: var(--color-bg-secondary);
		border-bottom: 1px solid var(--color-border);
		position: sticky;
		top: 0;
	}

	.group-name {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.category-item {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 14px 16px;
		background: none;
		border: none;
		border-bottom: 1px solid var(--color-border);
		text-align: left;
		width: 100%;
		cursor: pointer;
	}

	.category-item:active {
		background-color: var(--color-bg-secondary);
	}

	.category-item.selected {
		background-color: var(--color-bg-secondary);
	}

	.category-icon {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		color: white;
		flex-shrink: 0;
	}

	.category-icon svg {
		width: 18px;
		height: 18px;
	}

	.category-info {
		flex: 1;
		min-width: 0;
	}

	.category-name {
		display: block;
		font-size: 16px;
		font-weight: 500;
		color: var(--color-text-primary);
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
