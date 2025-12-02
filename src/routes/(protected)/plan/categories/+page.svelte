<script lang="ts">
	import type { Category } from '$lib/types';
	import { LoadingState, PageHeader, HeaderButton, Alert } from '$lib/components';
	import { toast } from '$lib/stores';

	// Constants
	const UNCATEGORIZED = 'Uncategorized';

	interface CategoryGroup {
		name: string;
		categories: Category[];
		isExpanded: boolean;
	}

	interface DbGroup {
		id: number;
		name: string;
		sort_order: number;
	}

	// State
	let loading = $state(true);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let categories = $state<Category[]>([]);
	let categoryGroups = $state<CategoryGroup[]>([]);
	let dbGroups = $state<DbGroup[]>([]); // Groups from DB (for dropdown)

	// Modal state
	let showModal = $state(false);
	let editingCategory = $state<Category | null>(null);
	let editingGroupName = $state<string | null>(null);
	let modalMode = $state<'category' | 'group'>('category');
	let isAddingToGroup = $state(false);

	// Delete confirmation modal state
	let showDeleteConfirm = $state(false);
	let categoryToDelete = $state<Category | null>(null);

	// Form state
	let formName = $state('');
	let formGroupName = $state('');

	// Derived: all available groups for dropdown (from DB + any group_names from categories)
	let availableGroups = $derived.by(() => {
		const groupNames = new Set<string>();
		// Add groups from DB
		dbGroups.forEach(g => groupNames.add(g.name));
		// Add groups from categories that might not be in DB yet
		categoryGroups.forEach(g => {
			if (g.name !== UNCATEGORIZED) {
				groupNames.add(g.name);
			}
		});
		return Array.from(groupNames).sort();
	});

	// Derived
	let modalTitle = $derived(
		modalMode === 'group'
			? editingGroupName ? 'Edit Group' : 'New Group'
			: editingCategory ? 'Edit Category' : 'New Category'
	);

	// Helper: Reset modal form
	function resetModalForm(mode: 'category' | 'group', options?: {
		category?: Category;
		groupName?: string;
		preselectedGroup?: string;
	}) {
		modalMode = mode;
		editingCategory = options?.category ?? null;
		editingGroupName = options?.groupName ?? null;
		formName = options?.category?.name ?? options?.groupName ?? '';
		formGroupName = options?.category?.group_name ?? options?.preselectedGroup ?? '';
		isAddingToGroup = !!options?.preselectedGroup && !options?.category;
		showModal = true;
	}

	// Helper: Get group for a category
	function getGroupForCategory(category: Category): CategoryGroup | undefined {
		return categoryGroups.find(g => g.name === (category.group_name || UNCATEGORIZED));
	}

	// Load category groups from DB
	async function loadGroups() {
		try {
			const res = await fetch('/api/category-groups');
			if (!res.ok) throw new Error('Failed to load groups');
			const data = await res.json();
			dbGroups = data.groups || [];
		} catch (e) {
			console.error('Failed to load groups:', e);
		}
	}

	// Load categories
	async function loadCategories() {
		loading = true;
		error = null;
		try {
			// Load groups first
			await loadGroups();
			
			const res = await fetch('/api/categories');
			if (!res.ok) throw new Error('Failed to load categories');
			
			const data = await res.json();
			categories = data.categories || [];
			
			// Create a map of group sort orders from DB
			const groupSortOrders = new Map<string, number>();
			dbGroups.forEach((g, idx) => groupSortOrders.set(g.name, g.sort_order || idx));
			
			// Group categories by group_name
			const groupMap = new Map<string, Category[]>();
			
			// First, add all groups from DB (even empty ones)
			for (const dbGroup of dbGroups) {
				groupMap.set(dbGroup.name, []);
			}
			
			// Then add categories to their groups
			for (const cat of categories) {
				const groupName = cat.group_name || UNCATEGORIZED;
				if (!groupMap.has(groupName)) {
					groupMap.set(groupName, []);
				}
				groupMap.get(groupName)!.push(cat);
			}
			
			// Ensure Uncategorized exists if there are categories without a group
			const uncategorizedCats = categories.filter(c => !c.group_name);
			if (uncategorizedCats.length > 0 && !groupMap.has(UNCATEGORIZED)) {
				groupMap.set(UNCATEGORIZED, uncategorizedCats);
			}
			
			// Convert to array and sort
			categoryGroups = Array.from(groupMap.entries())
				.map(([name, cats]) => ({
					name,
					categories: cats,
					isExpanded: true
				}))
				.sort((a, b) => {
					// Uncategorized always at the end
					if (a.name === UNCATEGORIZED) return 1;
					if (b.name === UNCATEGORIZED) return -1;
					// Sort alphabetically
					return a.name.localeCompare(b.name);
				});
		} catch (e) {
			console.error('Failed to load categories:', e);
			error = e instanceof Error ? e.message : 'Failed to load categories';
		} finally {
			loading = false;
		}
	}

	// Toggle group expansion
	function toggleGroup(groupName: string) {
		categoryGroups = categoryGroups.map(g =>
			g.name === groupName ? { ...g, isExpanded: !g.isExpanded } : g
		);
	}

	// Modal openers
	function openAddCategory(groupName?: string) {
		resetModalForm('category', { preselectedGroup: groupName });
	}

	function openEditCategory(category: Category) {
		resetModalForm('category', { category });
	}

	function openAddGroup() {
		resetModalForm('group');
	}

	function openEditGroup(groupName: string) {
		resetModalForm('group', { groupName });
	}

	// Save category or group
	async function handleSave() {
		const name = formName.trim();
		if (!name) {
			toast.error('Name is required');
			return;
		}

		saving = true;
		try {
			if (modalMode === 'group') {
				const shouldReload = await saveGroup(name);
				showModal = false;
				if (shouldReload) {
					await loadCategories();
				}
			} else {
				await saveCategory(name);
				showModal = false;
				await loadCategories();
			}
		} catch (e) {
			console.error('Failed to save:', e);
			toast.error(e instanceof Error ? e.message : 'Failed to save');
		} finally {
			saving = false;
		}
	}

	async function saveGroup(name: string): Promise<boolean> {
		if (editingGroupName) {
			// Rename group via API
			const res = await fetch('/api/category-groups', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ old_name: editingGroupName, name })
			});
			
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.message || 'Failed to rename group');
			}
			
			toast.success('Group renamed');
			return true; // Reload to get updated categories
		} else {
			// Create new group via API
			const res = await fetch('/api/category-groups', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name })
			});
			
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.message || 'Failed to create group');
			}
			
			toast.success('Group created');
			return true; // Reload to get the new group from DB
		}
	}

	async function saveCategory(name: string) {
		const payload = {
			name,
			type: editingCategory?.type ?? 'expense',
			group_name: formGroupName.trim() || null
		};

		const res = await fetch('/api/categories', {
			method: editingCategory ? 'PUT' : 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(editingCategory ? { id: editingCategory.id, ...payload } : payload)
		});

		if (!res.ok) throw new Error(`Failed to ${editingCategory ? 'update' : 'create'} category`);
		toast.success(`Category ${editingCategory ? 'updated' : 'created'}`);
	}

	// Delete category
	function openDeleteConfirm(category: Category) {
		categoryToDelete = category;
		showDeleteConfirm = true;
	}

	async function confirmDeleteCategory() {
		if (!categoryToDelete) return;
		
		try {
			const res = await fetch(`/api/categories?id=${categoryToDelete.id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error('Failed to delete category');
			toast.success('Category deleted');
			showDeleteConfirm = false;
			categoryToDelete = null;
			await loadCategories();
		} catch (e) {
			console.error('Failed to delete:', e);
			toast.error('Failed to delete category');
		}
	}

	function cancelDelete() {
		showDeleteConfirm = false;
		categoryToDelete = null;
	}

	// Reorder API calls
	async function saveCategoryOrder(groupName: string, categoryIds: number[]) {
		try {
			await fetch('/api/categories/reorder', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ group_name: groupName, category_ids: categoryIds })
			});
		} catch (e) {
			console.error('Failed to save category order:', e);
		}
	}

	async function saveGroupOrder(groupNames: string[]) {
		try {
			await fetch('/api/categories/reorder-groups', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ group_order: groupNames })
			});
		} catch (e) {
			console.error('Failed to save group order:', e);
		}
	}

	// Move category up/down within its group
	function moveCategory(category: Category, direction: 'up' | 'down') {
		const group = getGroupForCategory(category);
		if (!group) return;

		const index = group.categories.findIndex(c => c.id === category.id);
		const targetIndex = direction === 'up' ? index - 1 : index + 1;
		
		if (targetIndex < 0 || targetIndex >= group.categories.length) return;

		const newCategories = [...group.categories];
		[newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]];
		
		categoryGroups = categoryGroups.map(g =>
			g.name === group.name ? { ...g, categories: newCategories } : g
		);
		
		saveCategoryOrder(group.name, newCategories.map(c => c.id));
	}

	// Move group up/down
	function moveGroup(groupName: string, direction: 'up' | 'down') {
		const index = categoryGroups.findIndex(g => g.name === groupName);
		const targetIndex = direction === 'up' ? index - 1 : index + 1;
		
		if (targetIndex < 0 || targetIndex >= categoryGroups.length) return;

		const newGroups = [...categoryGroups];
		[newGroups[index], newGroups[targetIndex]] = [newGroups[targetIndex], newGroups[index]];
		categoryGroups = newGroups;
		
		saveGroupOrder(newGroups.map(g => g.name));
	}

	// Initialize
	$effect(() => {
		loadCategories();
	});
</script>

<div class="categories-page">
	<PageHeader title="Edit Categories">
		<HeaderButton label="Close" href="/plan">
			<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</HeaderButton>
	</PageHeader>

	<div class="content">
		{#if loading}
			<LoadingState message="Loading categories..." />
		{:else if error}
			<Alert type="error" message={error} />
			<button class="retry-btn" onclick={loadCategories}>Retry</button>
		{:else}
			<!-- Add buttons -->
			<div class="add-buttons">
				<button class="add-btn" onclick={openAddGroup}>
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					Add Group
				</button>
			</div>

			<!-- Category Groups -->
			<div class="groups-list">
				{#each categoryGroups as group, groupIndex (group.name)}
					<div 
						class="group-container"
						role="listitem"
					>
						<!-- Group Header -->
						<div class="group-header">
							<button class="group-expand" onclick={(e) => { e.stopPropagation(); toggleGroup(group.name); }} aria-label={group.isExpanded ? `Collapse ${group.name}` : `Expand ${group.name}`}>
								<svg 
									class="chevron" 
									class:collapsed={!group.isExpanded}
									fill="none" 
									stroke="currentColor" 
									viewBox="0 0 24 24"
								>
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
								</svg>
							</button>
							
							<span class="group-name">{group.name}</span>
							<span class="group-count">({group.categories.length})</span>
							
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div class="group-actions" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
								<button 
									class="icon-btn"
									onclick={(e) => { e.stopPropagation(); moveGroup(group.name, 'up'); }}
									disabled={groupIndex === 0}
									aria-label="Move group up"
								>
									<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
									</svg>
								</button>
								<button 
									class="icon-btn"
									onclick={(e) => { e.stopPropagation(); moveGroup(group.name, 'down'); }}
									disabled={groupIndex === categoryGroups.length - 1}
									aria-label="Move group down"
								>
									<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
									</svg>
								</button>
								<button class="icon-btn" onclick={(e) => { e.stopPropagation(); openAddCategory(group.name); }} aria-label="Add category to group">
									<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
									</svg>
								</button>
								<button class="icon-btn" onclick={(e) => { e.stopPropagation(); openEditGroup(group.name); }} aria-label="Edit group">
									<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
									</svg>
								</button>
							</div>
						</div>

						<!-- Category List -->
						{#if group.isExpanded}
							<div class="category-list" role="list">
								{#each group.categories as category, catIndex (category.id)}
									<div 
										class="category-item"
										role="listitem"
									>
										<span class="category-name">{category.name}</span>
										
										<!-- svelte-ignore a11y_no_static_element_interactions -->
										<div class="category-actions" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
											<button 
												class="icon-btn small"
												onclick={(e) => { e.stopPropagation(); moveCategory(category, 'up'); }}
												disabled={catIndex === 0}
												aria-label="Move up"
											>
												<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
												</svg>
											</button>
											<button 
												class="icon-btn small"
												onclick={(e) => { e.stopPropagation(); moveCategory(category, 'down'); }}
												disabled={catIndex === group.categories.length - 1}
												aria-label="Move down"
											>
												<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
												</svg>
											</button>
											<button class="icon-btn small" onclick={(e) => { e.stopPropagation(); openEditCategory(category); }} aria-label="Edit">
												<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
												</svg>
											</button>
											<button class="icon-btn small danger" onclick={(e) => { e.stopPropagation(); openDeleteConfirm(category); }} aria-label="Delete">
												<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
												</svg>
											</button>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Modal -->
{#if showModal}
	<div class="modal-overlay" onclick={() => showModal = false} onkeydown={(e) => e.key === 'Escape' && (showModal = false)} role="presentation">
		<div class="modal" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
			<div class="modal-header">
				<h2>{modalTitle}</h2>
				<button class="close-btn" onclick={() => showModal = false} aria-label="Close">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			
			<div class="modal-body">
				<div class="form-group">
					<label for="name">{modalMode === 'group' ? 'Group Name' : 'Category Name'}</label>
					<input 
						type="text" 
						id="name" 
						bind:value={formName}
						placeholder={modalMode === 'group' ? 'e.g., Bills' : 'e.g., Groceries'}
					/>
				</div>

				{#if modalMode === 'category'}
					<!-- Group dropdown - show always for categories (both edit and add) -->
					{#if !isAddingToGroup}
						<div class="form-group">
							<label for="group">Group</label>
							<select id="group" bind:value={formGroupName}>
								<option value="">{UNCATEGORIZED}</option>
								{#each availableGroups as groupName (groupName)}
									{#if groupName !== UNCATEGORIZED}
										<option value={groupName}>{groupName}</option>
									{/if}
								{/each}
							</select>
						</div>
					{/if}
				{/if}
			</div>

			<div class="modal-footer">
				<button class="btn-secondary" onclick={() => showModal = false}>Cancel</button>
				<button class="btn-primary" onclick={handleSave} disabled={saving}>
					{saving ? 'Saving...' : 'Save'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm && categoryToDelete}
	<div class="modal-overlay" onclick={cancelDelete} onkeydown={(e) => e.key === 'Escape' && cancelDelete()} role="presentation">
		<div class="modal confirm-modal" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" tabindex="-1">
			<div class="confirm-content">
				<div class="confirm-icon">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="32" height="32">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
				</div>
				<h3 id="confirm-title">Delete Category</h3>
				<p>Are you sure you want to delete <strong>"{categoryToDelete.name}"</strong>?</p>
			</div>
			<div class="confirm-actions">
				<button class="btn-secondary" onclick={cancelDelete}>Cancel</button>
				<button class="btn-danger" onclick={confirmDeleteCategory}>Delete</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.categories-page {
		display: flex;
		flex-direction: column;
		height: calc(100vh - 70px);
		height: calc(100dvh - 70px);
	}

	.content {
		flex: 1;
		overflow-y: auto;
		padding: 16px;
		padding-bottom: 100px;
	}

	/* Add buttons */
	.add-buttons {
		display: flex;
		gap: 12px;
		margin-bottom: 16px;
	}

	.add-btn {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 16px;
		background-color: var(--color-bg-secondary);
		color: var(--color-text-primary);
		border: 1px dashed var(--color-border);
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		min-height: 44px;
	}

	.add-btn:hover {
		background-color: var(--color-bg-tertiary);
	}

	/* Groups */
	.groups-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.group-container {
		background-color: var(--color-bg-secondary);
		border-radius: 12px;
		overflow: hidden;
	}

	.group-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 16px;
		background-color: var(--color-bg-secondary);
	}

	.group-expand {
		background: none;
		border: none;
		padding: 4px;
		cursor: pointer;
		color: var(--color-text-muted);
	}

	.chevron {
		width: 20px;
		height: 20px;
		transition: transform 0.2s;
	}

	.chevron.collapsed {
		transform: rotate(-90deg);
	}

	.group-name {
		font-weight: 600;
		color: var(--color-text-primary);
		flex: 1;
	}

	.group-count {
		font-size: 13px;
		color: var(--color-text-muted);
		margin-right: 8px;
	}

	.group-actions {
		display: flex;
		gap: 4px;
	}

	/* Category list */
	.category-list {
		border-top: 1px solid var(--color-border);
	}

	.category-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		padding-left: 48px;
		background-color: var(--color-bg-primary);
		transition: background-color 0.15s;
	}

	.category-item:hover {
		background-color: var(--color-bg-secondary);
	}

	.category-name {
		flex: 1;
		color: var(--color-text-primary);
		font-size: 15px;
	}

	.category-actions {
		display: flex;
		gap: 4px;
		opacity: 0;
		transition: opacity 0.15s;
	}

	.category-item:hover .category-actions {
		opacity: 1;
	}

	/* Icon buttons */
	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: none;
		border: none;
		border-radius: 6px;
		color: var(--color-text-muted);
		cursor: pointer;
	}

	.icon-btn:hover:not(:disabled) {
		background-color: var(--color-bg-tertiary);
		color: var(--color-text-primary);
	}

	.icon-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.icon-btn.small {
		width: 28px;
		height: 28px;
	}

	.icon-btn.danger:hover:not(:disabled) {
		background-color: var(--color-danger);
		color: white;
	}

	/* Modal */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: 16px;
	}

	.modal {
		background-color: var(--color-bg-secondary);
		border-radius: 12px;
		width: 100%;
		max-width: 400px;
		max-height: 90vh;
		overflow-y: auto;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px;
		border-bottom: 1px solid var(--color-border);
	}

	.modal-header h2 {
		margin: 0;
		font-size: 18px;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.close-btn {
		background: none;
		border: none;
		padding: 4px;
		cursor: pointer;
		color: var(--color-text-muted);
	}

	.close-btn:hover {
		color: var(--color-text-primary);
	}

	.modal-body {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.form-group label {
		font-size: 14px;
		font-weight: 500;
		color: var(--color-text-secondary);
	}

	.form-group input[type="text"],
	.form-group select {
		padding: 12px;
		background-color: var(--color-bg-primary);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		color: var(--color-text-primary);
		font-size: 15px;
		min-height: 44px;
	}

	.form-group input:focus,
	.form-group select:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.modal-footer {
		display: flex;
		gap: 12px;
		padding: 16px;
		border-top: 1px solid var(--color-border);
	}

	.btn-secondary,
	.btn-primary {
		flex: 1;
		padding: 12px;
		border-radius: 8px;
		font-size: 15px;
		font-weight: 500;
		cursor: pointer;
		min-height: 44px;
	}

	.btn-secondary {
		background-color: var(--color-bg-tertiary);
		border: none;
		color: var(--color-text-primary);
	}

	.btn-secondary:hover {
		background-color: var(--color-bg-primary);
	}

	.btn-primary {
		background-color: var(--color-primary);
		border: none;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background-color: var(--color-primary-hover);
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.retry-btn {
		margin-top: 16px;
		padding: 12px 24px;
		background-color: var(--color-primary);
		color: white;
		border: none;
		border-radius: 8px;
		font-weight: 500;
		cursor: pointer;
		min-height: 44px;
	}

	/* Delete Confirmation Modal */
	.confirm-modal {
		max-width: 320px;
		text-align: center;
	}

	.confirm-content {
		padding: 24px 20px 16px;
	}

	.confirm-icon {
		display: flex;
		justify-content: center;
		margin-bottom: 16px;
		color: var(--color-danger);
	}

	.confirm-content h3 {
		margin: 0 0 8px;
		font-size: 18px;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.confirm-content p {
		margin: 0;
		font-size: 14px;
		color: var(--color-text-secondary);
		line-height: 1.5;
	}

	.confirm-content strong {
		color: var(--color-text-primary);
	}

	.confirm-actions {
		display: flex;
		gap: 12px;
		padding: 16px 20px 20px;
	}

	.btn-danger {
		flex: 1;
		padding: 12px;
		border-radius: 8px;
		font-size: 15px;
		font-weight: 500;
		cursor: pointer;
		min-height: 44px;
		background-color: var(--color-danger);
		border: none;
		color: white;
	}

	.btn-danger:hover {
		background-color: #dc2626;
	}
</style>
