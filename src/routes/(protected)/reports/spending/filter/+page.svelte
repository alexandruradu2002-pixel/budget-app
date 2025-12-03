<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';

	// State
	let loading = $state(true);
	let categoryGroups: Array<{
		name: string;
		categories: Array<{
			id: number;
			name: string;
			color: string;
		}>;
	}> = $state([]);
	
	// Selected category IDs (stored in localStorage)
	let selectedCategories: Set<number> = $state(new Set());

	// Load categories grouped by group_name
	async function loadCategories() {
		loading = true;
		try {
			const response = await fetch('/api/categories?type=expense');
			if (!response.ok) throw new Error('Failed to load categories');
			
			const data = await response.json();
			const categories = data.categories || [];
			
			// Group by group_name
			const groupMap = new Map<string, Array<{ id: number; name: string; color: string }>>();
			
			for (const cat of categories) {
				const groupName = cat.group_name || 'Ungrouped';
				if (!groupMap.has(groupName)) {
					groupMap.set(groupName, []);
				}
				groupMap.get(groupName)!.push({
					id: cat.id,
					name: cat.name,
					color: cat.color || '#6B7280'
				});
			}
			
			// Convert to array
			categoryGroups = Array.from(groupMap.entries()).map(([name, cats]) => ({
				name,
				categories: cats
			}));
			
			// Load saved filter from localStorage or select all by default
			if (browser) {
				const saved = localStorage.getItem('spendingCategoryFilter');
				if (saved) {
					const savedIds = JSON.parse(saved) as number[];
					selectedCategories = new Set(savedIds);
				} else {
					// Select all by default
					const allIds = categories.map((c: { id: number }) => c.id);
					selectedCategories = new Set(allIds);
				}
			}
		} catch (err) {
			console.error('Error loading categories:', err);
		} finally {
			loading = false;
		}
	}

	// Toggle category selection
	function toggleCategory(categoryId: number) {
		const newSet = new Set(selectedCategories);
		if (newSet.has(categoryId)) {
			newSet.delete(categoryId);
		} else {
			newSet.add(categoryId);
		}
		selectedCategories = newSet;
	}

	// Toggle all categories in a group
	function toggleGroup(groupName: string) {
		const group = categoryGroups.find(g => g.name === groupName);
		if (!group) return;
		
		const groupIds = group.categories.map(c => c.id);
		const allSelected = groupIds.every(id => selectedCategories.has(id));
		
		const newSet = new Set(selectedCategories);
		if (allSelected) {
			// Deselect all in group
			groupIds.forEach(id => newSet.delete(id));
		} else {
			// Select all in group
			groupIds.forEach(id => newSet.add(id));
		}
		selectedCategories = newSet;
	}

	// Check if all categories in a group are selected
	function isGroupSelected(groupName: string): boolean {
		const group = categoryGroups.find(g => g.name === groupName);
		if (!group) return false;
		return group.categories.every(c => selectedCategories.has(c.id));
	}

	// Check if some (but not all) categories in a group are selected
	function isGroupPartiallySelected(groupName: string): boolean {
		const group = categoryGroups.find(g => g.name === groupName);
		if (!group) return false;
		const selectedCount = group.categories.filter(c => selectedCategories.has(c.id)).length;
		return selectedCount > 0 && selectedCount < group.categories.length;
	}

	// Select all categories
	function selectAll() {
		const allIds = categoryGroups.flatMap(g => g.categories.map(c => c.id));
		selectedCategories = new Set(allIds);
	}

	// Deselect all categories
	function deselectAll() {
		selectedCategories = new Set();
	}

	// Save and go back
	function saveAndGoBack() {
		if (browser) {
			localStorage.setItem('spendingCategoryFilter', JSON.stringify([...selectedCategories]));
		}
		goto('/reports/spending');
	}

	// Cancel and go back
	function cancel() {
		goto('/reports/spending');
	}

	// Load on mount
	$effect(() => {
		loadCategories();
	});

	// Count selected
	let selectedCount = $derived(selectedCategories.size);
	let totalCount = $derived(categoryGroups.reduce((sum, g) => sum + g.categories.length, 0));
</script>

<div class="filter-page">
	<!-- Header -->
	<header class="page-header">
		<button class="back-btn" onclick={cancel} aria-label="Cancel">
			<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
		<h1 class="page-title">Filter Categories</h1>
		<button class="save-btn" onclick={saveAndGoBack}>
			Done
		</button>
	</header>

	<!-- Quick Actions -->
	<div class="quick-actions">
		<button class="action-btn" onclick={selectAll}>Select All</button>
		<button class="action-btn" onclick={deselectAll}>Deselect All</button>
		<span class="selection-count">{selectedCount}/{totalCount} selected</span>
	</div>

	<!-- Categories List -->
	{#if loading}
		<div class="loading-state">Loading categories...</div>
	{:else}
		<div class="groups-list">
			{#each categoryGroups as group}
				<div class="group-section">
					<!-- Group Header -->
					<button class="group-header" onclick={() => toggleGroup(group.name)}>
						<div class="checkbox-container">
							<div 
								class="checkbox"
								class:checked={isGroupSelected(group.name)}
								class:partial={isGroupPartiallySelected(group.name)}
							>
								{#if isGroupSelected(group.name)}
									<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3">
										<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
									</svg>
								{:else if isGroupPartiallySelected(group.name)}
									<svg fill="currentColor" viewBox="0 0 24 24">
										<rect x="6" y="11" width="12" height="2" rx="1" />
									</svg>
								{/if}
							</div>
						</div>
						<span class="group-name">{group.name}</span>
						<span class="group-count">
							{group.categories.filter(c => selectedCategories.has(c.id)).length}/{group.categories.length}
						</span>
					</button>

					<!-- Categories in Group -->
					<div class="categories-in-group">
						{#each group.categories as category}
							<button class="category-item" onclick={() => toggleCategory(category.id)}>
								<div class="checkbox-container">
									<div 
										class="checkbox"
										class:checked={selectedCategories.has(category.id)}
									>
										{#if selectedCategories.has(category.id)}
											<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3">
												<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
											</svg>
										{/if}
									</div>
								</div>
								<span class="category-name">{category.name}</span>
							</button>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.filter-page {
		min-height: 100vh;
		background-color: var(--color-bg-primary);
		padding-bottom: 70px;
	}

	/* Header */
	.page-header {
		display: flex;
		align-items: center;
		padding: 16px;
		background-color: var(--color-bg-primary);
		position: sticky;
		top: 0;
		z-index: 10;
		gap: 12px;
	}

	.back-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border: none;
		background: transparent;
		color: var(--color-text-primary);
		cursor: pointer;
		border-radius: 8px;
		transition: background-color 0.2s;
	}

	.back-btn:hover {
		background-color: var(--color-bg-secondary);
	}

	.back-btn svg {
		width: 24px;
		height: 24px;
	}

	.page-title {
		flex: 1;
		font-size: 20px;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
	}

	.save-btn {
		padding: 8px 16px;
		border: none;
		background-color: var(--color-primary);
		color: white;
		font-size: 14px;
		font-weight: 600;
		border-radius: 8px;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.save-btn:hover {
		background-color: var(--color-primary-hover);
	}

	/* Quick Actions */
	.quick-actions {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		background-color: var(--color-bg-secondary);
		margin: 0 16px 16px;
		border-radius: 12px;
	}

	.action-btn {
		padding: 8px 12px;
		border: 1px solid var(--color-border);
		background: transparent;
		color: var(--color-text-secondary);
		font-size: 13px;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.action-btn:hover {
		background-color: var(--color-bg-tertiary);
		color: var(--color-text-primary);
	}

	.selection-count {
		margin-left: auto;
		font-size: 13px;
		color: var(--color-text-muted);
	}

	/* Groups List */
	.groups-list {
		padding: 0 16px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.group-section {
		background-color: var(--color-bg-secondary);
		border-radius: 12px;
		overflow: hidden;
	}

	/* Group Header */
	.group-header {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 16px;
		border: none;
		background-color: var(--color-bg-tertiary);
		color: var(--color-text-primary);
		font-size: 15px;
		font-weight: 600;
		text-align: left;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.group-header:hover {
		background-color: var(--color-bg-primary);
	}

	.group-name {
		flex: 1;
	}

	.group-count {
		font-size: 13px;
		font-weight: 400;
		color: var(--color-text-muted);
	}

	/* Categories in Group */
	.categories-in-group {
		display: flex;
		flex-direction: column;
	}

	.category-item {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 14px 16px;
		border: none;
		border-bottom: 1px solid var(--color-border);
		background: transparent;
		color: var(--color-text-primary);
		font-size: 15px;
		text-align: left;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.category-item:last-child {
		border-bottom: none;
	}

	.category-item:hover {
		background-color: var(--color-bg-tertiary);
	}

	.category-name {
		flex: 1;
	}

	/* Checkbox */
	.checkbox-container {
		flex-shrink: 0;
	}

	.checkbox {
		width: 22px;
		height: 22px;
		border: 2px solid var(--color-border);
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.checkbox.checked {
		background-color: var(--color-primary);
		border-color: var(--color-primary);
	}

	.checkbox.partial {
		background-color: var(--color-primary);
		border-color: var(--color-primary);
		opacity: 0.7;
	}

	.checkbox svg {
		width: 14px;
		height: 14px;
		color: white;
	}

	/* States */
	.loading-state {
		padding: 32px 16px;
		text-align: center;
		color: var(--color-text-secondary);
	}
</style>
