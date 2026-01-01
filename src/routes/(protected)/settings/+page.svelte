<script lang="ts">
	import { PageHeader, SettingsSection, CurrencySettings, YNABImport, PayeeSettings, Button, ThemeSettings, KeyboardSettings } from '$lib/components';
	import { toast, userStore } from '$lib/stores';
	import { goto } from '$app/navigation';
	
	// Check if in demo mode - block destructive actions
	let isDemo = $derived(userStore.isDemo);
	
	let recalculating = $state(false);
	let exportingJSON = $state(false);
	let exportingCSV = $state(false);
	let loggingOut = $state(false);
	
	// Check last backup date from localStorage
	let lastBackupDate = $state<string | null>(null);
	let showBackupReminder = $state(false);
	
	$effect(() => {
		const stored = localStorage.getItem('lastBackupDate');
		lastBackupDate = stored;
		
		// Show reminder if no backup in last 7 days
		if (stored) {
			const daysSinceBackup = Math.floor((Date.now() - new Date(stored).getTime()) / (1000 * 60 * 60 * 24));
			showBackupReminder = daysSinceBackup >= 7;
		} else {
			showBackupReminder = true;
		}
	});
	
	async function recalculateBalances() {
		if (isDemo) {
			toast.info('🎭 Acțiune blocată în modul demo');
			return;
		}
		recalculating = true;
		try {
			const response = await fetch('/api/accounts?action=recalculate-balances', {
				method: 'PATCH'
			});
			const data = await response.json();
			
			if (!response.ok) {
				throw new Error(data.error || 'Failed to recalculate');
			}
			
			toast.success(`✅ Balanțe recalculate pentru ${data.balances.length} conturi`);
		} catch (err) {
			toast.error('Eroare la recalcularea balanțelor');
		} finally {
			recalculating = false;
		}
	}
	
	async function exportData(format: 'json' | 'csv') {
		if (isDemo) {
			toast.info('🎭 Export dezactivat în modul demo');
			return;
		}
		const loading = format === 'json' ? () => exportingJSON = true : () => exportingCSV = true;
		const done = format === 'json' ? () => exportingJSON = false : () => exportingCSV = false;
		
		loading();
		try {
			const response = await fetch(`/api/export?format=${format}`);
			
			if (!response.ok) {
				throw new Error('Export failed');
			}
			
			// Get filename from Content-Disposition header or generate one
			const contentDisposition = response.headers.get('Content-Disposition');
			let filename = `budget_backup_${new Date().toISOString().split('T')[0]}.${format}`;
			if (contentDisposition) {
				const match = contentDisposition.match(/filename="?([^"]+)"?/);
				if (match) filename = match[1];
			}
			
			// Download file
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);
			
			// Save backup date
			const now = new Date().toISOString();
			localStorage.setItem('lastBackupDate', now);
			lastBackupDate = now;
			showBackupReminder = false;
			
			toast.success(`✅ Backup ${format.toUpperCase()} descărcat cu succes!`);
		} catch (err) {
			toast.error(`Eroare la export: ${err instanceof Error ? err.message : 'Unknown error'}`);
		} finally {
			done();
		}
	}

	async function handleLogout() {
		if (isDemo) {
			goto('/demo');
			return;
		}
		loggingOut = true;
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
			goto('/login');
		} catch (err) {
			toast.error('Failed to logout');
			loggingOut = false;
		}
	}
</script>

<div class="settings-page">
	<PageHeader title="Settings" />

	<div class="settings-content">
		<!-- Theme Settings Section -->
		<ThemeSettings />

		<!-- Keyboard Size Settings -->
		<KeyboardSettings disabled={isDemo} />

		<!-- Currency Settings Section -->
		<CurrencySettings disabled={isDemo} />

		<!-- Payee Settings Section -->
		<PayeeSettings disabled={isDemo} />

		<!-- YNAB Import Section -->
		<YNABImport disabled={isDemo} />

		<!-- Backup & Export Section -->
		<SettingsSection title="Backup & Export" description="Exportă datele pentru siguranță">
			{#snippet icon()}
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
					/>
				</svg>
			{/snippet}

			{#if showBackupReminder}
				<div class="backup-reminder">
					<svg class="reminder-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
					<span>
						{#if lastBackupDate}
							Ultimul backup: {new Date(lastBackupDate).toLocaleDateString('ro-RO')} - E timpul pentru unul nou!
						{:else}
							Nu ai făcut niciun backup încă. Recomandăm backup săptămânal!
						{/if}
					</span>
				</div>
			{/if}

			<div class="export-options">
				<div class="export-item">
					<div class="export-info">
						<h4>Export JSON (Complet)</h4>
						<p>Include toate datele într-un fișier JSON - ideal pentru restaurare completă</p>
					</div>
					<Button 
						variant="primary" 
						onclick={() => exportData('json')} 
						loading={exportingJSON}
						disabled={isDemo || exportingJSON || exportingCSV}
					>
						{exportingJSON ? 'Se exportă...' : '📥 JSON'}
					</Button>
				</div>
				
				<div class="export-item">
					<div class="export-info">
						<h4>Export CSV (Citibil)</h4>
						<p>Format ușor de citit în Excel/Google Sheets</p>
					</div>
					<Button 
						variant="secondary" 
						onclick={() => exportData('csv')} 
						loading={exportingCSV}
						disabled={isDemo || exportingJSON || exportingCSV}
					>
						{exportingCSV ? 'Se exportă...' : '📊 CSV'}
					</Button>
				</div>
			</div>

			{#if lastBackupDate && !showBackupReminder}
				<p class="last-backup-info">
					✅ Ultimul backup: {new Date(lastBackupDate).toLocaleDateString('ro-RO', { 
						year: 'numeric', 
						month: 'long', 
						day: 'numeric',
						hour: '2-digit',
						minute: '2-digit'
					})}
				</p>
			{/if}
		</SettingsSection>

		<!-- Instructions Section -->
		<SettingsSection title="How to Export from YNAB">
			{#snippet icon()}
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
			{/snippet}

			<div class="instructions">
				<ol>
					<li>Open YNAB and go to your budget</li>
					<li>Click on <strong>File</strong> → <strong>Export Budget</strong></li>
					<li>
						Download both CSV files:
						<ul>
							<li><strong>Register.csv</strong> - Contains all transactions</li>
							<li><strong>Plan.csv</strong> - Contains budget allocations (optional)</li>
						</ul>
					</li>
					<li>Upload the files above and click Import</li>
				</ol>
			</div>
		</SettingsSection>

		<!-- Data Management Section -->
		<SettingsSection title="Data Management" description="Manage your budget data">
			{#snippet icon()}
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
					/>
				</svg>
			{/snippet}

			<div class="data-actions">
				<div class="action-item">
					<div class="action-info">
						<h4>Recalculează balanțele</h4>
						<p>Recalculează balanțele tuturor conturilor pe baza tranzacțiilor existente</p>
					</div>
					<Button 
						variant="secondary" 
						onclick={recalculateBalances} 
						loading={recalculating}
						disabled={isDemo || recalculating}
					>
						{recalculating ? 'Se recalculează...' : 'Recalculează'}
					</Button>
				</div>
			</div>
		</SettingsSection>

		<!-- Logout Section -->
		<SettingsSection title="Account" description="Manage your session">
			{#snippet icon()}
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
					/>
				</svg>
			{/snippet}

			<div class="logout-section">
				<p class="logout-info">
					{#if isDemo}
						Ești în modul demo. Apasă pentru a ieși.
					{:else}
						Session is active. You can logout to require password again.
					{/if}
				</p>
				<Button 
					variant={isDemo ? 'primary' : 'danger'}
					onclick={handleLogout} 
					loading={loggingOut}
					disabled={loggingOut}
				>
					{#if isDemo}
						🎭 Ieși din Demo
					{:else}
						{loggingOut ? 'Logging out...' : '🚪 Logout'}
					{/if}
				</Button>
			</div>
		</SettingsSection>

		<!-- Future sections can be added here -->
		<!-- <ThemeSettings /> -->
		<!-- <AccountSettings /> -->
		<!-- <DataManagement /> -->
	</div>
</div>

<style>
	.settings-page {
		min-height: 100%;
		padding-bottom: calc(80px + env(safe-area-inset-bottom));
	}

	.settings-content {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* Instructions */
	.instructions ol {
		margin: 0;
		padding: 0 0 0 1.25rem;
		font-size: 0.9rem;
		color: var(--color-text-secondary);
	}

	.instructions li {
		margin: 0.5rem 0;
	}

	.instructions ul {
		margin: 0.5rem 0;
		padding: 0 0 0 1rem;
	}

	/* Data Management */
	.data-actions {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.action-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		background: var(--color-bg-tertiary);
		border-radius: 0.5rem;
	}

	.action-info {
		flex: 1;
	}

	.action-info h4 {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.action-info p {
		margin: 0.25rem 0 0;
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	/* Export/Backup Section */
	.backup-reminder {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: var(--color-warning);
		color: var(--color-bg-primary);
		border-radius: 0.5rem;
		margin-bottom: 1rem;
		font-size: 0.85rem;
	}

	.reminder-icon {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
	}

	.export-options {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.export-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		background: var(--color-bg-tertiary);
		border-radius: 0.5rem;
	}

	.export-info {
		flex: 1;
	}

	.export-info h4 {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.export-info p {
		margin: 0.25rem 0 0;
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.last-backup-info {
		margin: 1rem 0 0;
		font-size: 0.8rem;
		color: var(--color-success);
		text-align: center;
	}

	.logout-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		text-align: center;
	}

	.logout-info {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-text-muted);
	}

	/* Responsive */
	@media (min-width: 640px) {
		.settings-content {
			padding: 1.5rem;
			max-width: 600px;
			margin: 0 auto;
		}
	}
</style>
