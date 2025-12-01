<script lang="ts">
	import type { Account } from '$lib/types';
	import { LoadingState, PageHeader, HeaderButton } from '$lib/components';
	import { formatCurrency } from '$lib/utils/format';

	interface AccountGroup {
		name: string;
		accounts: Account[];
		total: number;
	}

	let loading = $state(true);
	let accounts = $state<Account[]>([]);
	let closedAccounts = $state<Account[]>([]);
	let showClosedAccounts = $state(false);

	// Group accounts by type/category
	let accountGroups = $derived.by<AccountGroup[]>(() => {
		const activeAccounts = accounts.filter(a => a.is_active);
		
		// Group by type
		const cashAccounts = activeAccounts.filter(a => a.type === 'cash' || a.type === 'checking');
		const trackingAccounts = activeAccounts.filter(a => a.type === 'savings' || a.type === 'investment' || a.type === 'credit_card');
		
		const groups: AccountGroup[] = [];
		
		if (cashAccounts.length > 0) {
			groups.push({
				name: 'Cash',
				accounts: cashAccounts,
				total: cashAccounts.reduce((sum, a) => sum + a.balance, 0)
			});
		}
		
		if (trackingAccounts.length > 0) {
			groups.push({
				name: 'Tracking',
				accounts: trackingAccounts,
				total: trackingAccounts.reduce((sum, a) => sum + a.balance, 0)
			});
		}
		
		return groups;
	});

	async function loadAccounts() {
		try {
			// TODO: Load accounts from API
			// Mock data to match the design
			accounts = [
				{
					id: 1,
					user_id: 1,
					name: 'SALARIU',
					type: 'cash',
					balance: 1343.96,
					currency: 'RON',
					color: '#10B981',
					is_active: true,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				},
				{
					id: 2,
					user_id: 1,
					name: 'BANI',
					type: 'cash',
					balance: 2614.98,
					currency: 'RON',
					color: '#10B981',
					is_active: true,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				},
				{
					id: 3,
					user_id: 1,
					name: 'Depozit - Cash - Brd',
					type: 'savings',
					balance: 4381.00,
					currency: 'RON',
					color: '#10B981',
					is_active: true,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				},
				{
					id: 4,
					user_id: 1,
					name: 'Fond de Urgențe',
					type: 'savings',
					balance: 4500.00,
					currency: 'RON',
					color: '#10B981',
					is_active: true,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				},
				{
					id: 5,
					user_id: 1,
					name: 'Portofoliu - TRADING 212',
					type: 'investment',
					balance: 1920.00,
					currency: 'RON',
					color: '#10B981',
					is_active: true,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				},
				{
					id: 6,
					user_id: 1,
					name: 'Portofoliu - Tradeville',
					type: 'investment',
					balance: 581.50,
					currency: 'RON',
					color: '#10B981',
					is_active: true,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				}
			];
			
			// Mock closed accounts
			closedAccounts = [
				{ id: 100, user_id: 1, name: 'Old Account 1', type: 'cash', balance: 0, currency: 'RON', color: '#666', is_active: false, created_at: '', updated_at: '' },
				{ id: 101, user_id: 1, name: 'Old Account 2', type: 'cash', balance: 0, currency: 'RON', color: '#666', is_active: false, created_at: '', updated_at: '' },
				{ id: 102, user_id: 1, name: 'Old Account 3', type: 'cash', balance: 0, currency: 'RON', color: '#666', is_active: false, created_at: '', updated_at: '' },
				{ id: 103, user_id: 1, name: 'Old Account 4', type: 'cash', balance: 0, currency: 'RON', color: '#666', is_active: false, created_at: '', updated_at: '' },
				{ id: 104, user_id: 1, name: 'Old Account 5', type: 'cash', balance: 0, currency: 'RON', color: '#666', is_active: false, created_at: '', updated_at: '' },
				{ id: 105, user_id: 1, name: 'Old Account 6', type: 'cash', balance: 0, currency: 'RON', color: '#666', is_active: false, created_at: '', updated_at: '' },
				{ id: 106, user_id: 1, name: 'Old Account 7', type: 'cash', balance: 0, currency: 'RON', color: '#666', is_active: false, created_at: '', updated_at: '' },
			];
			
			loading = false;
		} catch (error) {
			console.error('Failed to load accounts:', error);
			loading = false;
		}
	}

	$effect(() => {
		loadAccounts();
	});
</script>

<div class="accounts-page">
	<PageHeader title="Accounts">
		<HeaderButton label="Add account">
			<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
				<circle cx="12" cy="12" r="9"/>
				<line x1="12" y1="8" x2="12" y2="16"/>
				<line x1="8" y1="12" x2="16" y2="12"/>
			</svg>
		</HeaderButton>
		<HeaderButton label="More options">
			<svg fill="currentColor" viewBox="0 0 24 24">
				<circle cx="12" cy="5" r="1.5"/>
				<circle cx="12" cy="12" r="1.5"/>
				<circle cx="12" cy="19" r="1.5"/>
			</svg>
		</HeaderButton>
	</PageHeader>

	{#if loading}
		<LoadingState message="Loading accounts..." />
	{:else}
		<!-- Account Groups -->
		<div class="accounts-content">
			{#each accountGroups as group}
				<!-- Group Header -->
				<div class="group-header">
					<span class="group-name">{group.name}</span>
					<span class="group-total">{formatCurrency(group.total)}</span>
				</div>
				
				<!-- Accounts in Group -->
				<div class="accounts-group">
					{#each group.accounts as account, index (account.id)}
						<a href="/accounts/{account.id}" class="account-row" class:has-border={index > 0}>
							<div class="account-info">
								<div class="account-indicator"></div>
								<span class="account-name">{account.name}</span>
							</div>
							<span class="account-balance">{formatCurrency(account.balance)}</span>
						</a>
					{/each}
				</div>
			{/each}

			<!-- Closed Accounts Section -->
			{#if closedAccounts.length > 0}
				<!-- Closed Header -->
				<div class="group-header">
					<span class="group-name">Closed</span>
				</div>
				
				<div class="accounts-group">
					<button onclick={() => showClosedAccounts = !showClosedAccounts} class="closed-toggle">
						<span>{closedAccounts.length} closed accounts</span>
						<svg class="chevron-icon" class:rotated={showClosedAccounts} fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
						</svg>
					</button>
					
					{#if showClosedAccounts}
						{#each closedAccounts as account (account.id)}
							<div class="account-row closed has-border">
								<div class="account-info">
									<div class="account-indicator muted"></div>
									<span class="account-name muted">{account.name}</span>
								</div>
								<span class="account-balance muted">{formatCurrency(account.balance)}</span>
							</div>
						{/each}
					{/if}
				</div>
			{/if}
		</div>

		<!-- Bottom Actions -->
		<div class="bottom-actions">
			<button class="action-button primary">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
					<circle cx="12" cy="12" r="9"/>
					<line x1="12" y1="8" x2="12" y2="16"/>
					<line x1="8" y1="12" x2="16" y2="12"/>
				</svg>
				Add Account
			</button>
			
			<button class="action-button">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
					<path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>
				</svg>
				Manage Bank Connections
			</button>
		</div>
	{/if}
</div>

<style>
	.accounts-page {
		display: flex;
		flex-direction: column;
		min-height: calc(100vh - 70px);
		min-height: calc(100dvh - 70px);
	}

	/* Content */
	.accounts-content {
		flex: 1;
		padding: 0 16px;
	}

	/* Group Header */
	.group-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 4px;
		margin-top: 8px;
	}

	.group-name {
		font-size: 13px;
		color: var(--color-text-muted);
	}

	.group-total {
		font-size: 13px;
		color: var(--color-text-secondary);
	}

	/* Accounts Group */
	.accounts-group {
		background-color: var(--color-bg-secondary);
		border-radius: 12px;
		overflow: hidden;
	}

	/* Account Row */
	.account-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px 14px 0;
		text-decoration: none;
		min-height: 52px;
	}

	.account-row:active {
		background-color: var(--color-bg-tertiary);
	}

	.account-row.has-border {
		border-top: 1px solid var(--color-border);
	}

	.account-row.closed {
		cursor: default;
	}

	.account-info {
		display: flex;
		align-items: center;
	}

	.account-indicator {
		width: 4px;
		height: 32px;
		background-color: var(--color-success);
		border-radius: 0 4px 4px 0;
		margin-right: 12px;
	}

	.account-indicator.muted {
		background-color: var(--color-text-muted);
	}

	.account-name {
		font-size: 15px;
		color: var(--color-text-primary);
	}

	.account-name.muted {
		color: var(--color-text-muted);
	}

	.account-balance {
		font-size: 15px;
		color: var(--color-success);
	}

	.account-balance.muted {
		color: var(--color-text-muted);
	}

	/* Closed Toggle */
	.closed-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 14px 16px;
		background: none;
		border: none;
		text-align: left;
		color: var(--color-text-primary);
		font-size: 15px;
	}

	.closed-toggle:active {
		background-color: var(--color-bg-tertiary);
	}

	.chevron-icon {
		width: 20px;
		height: 20px;
		color: var(--color-text-muted);
		transition: transform 0.2s;
	}

	.chevron-icon.rotated {
		transform: rotate(90deg);
	}

	/* Bottom Actions */
	.bottom-actions {
		padding: 24px 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.action-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		padding: 14px;
		background-color: var(--color-bg-secondary);
		border: none;
		border-radius: 12px;
		color: var(--color-primary);
		font-size: 15px;
		font-weight: 500;
		min-height: 52px;
	}

	.action-button:active {
		background-color: var(--color-bg-tertiary);
	}

	.action-button svg {
		width: 20px;
		height: 20px;
	}
</style>
