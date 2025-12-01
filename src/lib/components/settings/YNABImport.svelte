<script lang="ts">
	import { FileUpload, StatCard, Button, Alert, SettingsSection } from '$lib/components';
	import { formatCurrency } from '$lib/utils/format';

	// Types
	interface AnalysisResult {
		totalTransactions: number;
		accounts: string[];
		categoryGroups: string[];
		categories: string[];
		uniquePayees: number;
		dateRange: { start: string; end: string };
		totals: { inflow: number; outflow: number; net: number };
	}

	interface ImportResult {
		accounts: { created: number; existing: number };
		categories: { created: number; existing: number };
		transactions: { imported: number; skipped: number };
		budgets: { imported: number; skipped: number };
		errors: string[];
	}

	// State
	let registerFile = $state<File | null>(null);
	let planFile = $state<File | null>(null);
	let loading = $state(false);
	let analyzing = $state(false);
	let analysis = $state<AnalysisResult | null>(null);
	let importResult = $state<ImportResult | null>(null);
	let error = $state<string | null>(null);

	// Computed
	let importComplete = $derived(importResult !== null && importResult.errors.length === 0);
	let canAnalyze = $derived(registerFile !== null && !analyzing);
	let canImport = $derived(analysis !== null && !loading);

	// Actions
	async function analyzeCSV() {
		if (!registerFile) return;

		analyzing = true;
		error = null;

		try {
			const formData = new FormData();
			formData.append('register', registerFile);
			formData.append('analyzeOnly', 'true');

			const response = await fetch('/api/import', {
				method: 'POST',
				body: formData
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to analyze file');
			}

			analysis = data.analysis;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to analyze file';
		} finally {
			analyzing = false;
		}
	}

	async function importData() {
		if (!registerFile) return;

		loading = true;
		error = null;

		try {
			const formData = new FormData();
			formData.append('register', registerFile);
			if (planFile) {
				formData.append('plan', planFile);
			}

			const response = await fetch('/api/import', {
				method: 'POST',
				body: formData
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Import failed');
			}

			importResult = data.result;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Import failed';
		} finally {
			loading = false;
		}
	}

	function reset() {
		registerFile = null;
		planFile = null;
		analysis = null;
		importResult = null;
		error = null;
	}

	function handleRegisterFile(file: File | null) {
		registerFile = file;
		// Reset analysis when file changes
		analysis = null;
		importResult = null;
		error = null;
	}

	function handlePlanFile(file: File | null) {
		planFile = file;
	}
</script>

<SettingsSection title="Import from YNAB" description="Import your budget data from You Need A Budget">
	{#snippet icon()}
		<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
			/>
		</svg>
	{/snippet}

	{#if importComplete && importResult}
		<!-- Success State -->
		<div class="import-success">
			<div class="success-icon">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
			</div>
			<h3>Import Complete!</h3>

			<div class="stats-grid">
				<StatCard value={importResult.transactions.imported} label="Transactions" variant="success" />
				<StatCard value={importResult.accounts.created} label="Accounts" variant="success" />
				<StatCard value={importResult.categories.created} label="Categories" variant="success" />
				{#if importResult.budgets.imported > 0}
					<StatCard value={importResult.budgets.imported} label="Budgets" variant="success" />
				{/if}
			</div>

			{#if importResult.transactions.skipped > 0}
				<p class="skipped-note">
					{importResult.transactions.skipped} duplicate transactions were skipped
				</p>
			{/if}

			<div class="actions">
				<Button href="/dashboard">Go to Dashboard</Button>
				<Button variant="secondary" onclick={reset}>Import More</Button>
			</div>
		</div>
	{:else}
		<!-- Upload Form -->
		<div class="import-form">
			<FileUpload
				id="register-input"
				label="Register.csv"
				description="Contains all your transactions"
				required
				file={registerFile}
				onchange={handleRegisterFile}
			/>

			<FileUpload
				id="plan-input"
				label="Plan.csv"
				description="Contains your budget allocations"
				file={planFile}
				onchange={handlePlanFile}
			/>

			{#if error}
				<Alert type="error" message={error} />
			{/if}

			{#if analysis}
				<div class="analysis-results">
					<h3>Preview</h3>

					<div class="stats-grid">
						<StatCard value={analysis.totalTransactions} label="Transactions" variant="primary" />
						<StatCard value={analysis.accounts.length} label="Accounts" variant="primary" />
						<StatCard value={analysis.categoryGroups.length} label="Category Groups" variant="primary" />
						<StatCard value={analysis.uniquePayees} label="Unique Payees" variant="primary" />
					</div>

					<div class="analysis-details">
						<p>
							<strong>Date Range:</strong>
							{analysis.dateRange.start} to {analysis.dateRange.end}
						</p>
						<p><strong>Total Inflow:</strong> {formatCurrency(analysis.totals.inflow)}</p>
						<p><strong>Total Outflow:</strong> {formatCurrency(analysis.totals.outflow)}</p>
					</div>

					<div class="analysis-lists">
						<div class="list-section">
							<h4>Accounts</h4>
							<ul>
								{#each analysis.accounts as account}
									<li>{account}</li>
								{/each}
							</ul>
						</div>
						<div class="list-section">
							<h4>Category Groups</h4>
							<ul>
								{#each analysis.categoryGroups as group}
									<li>{group}</li>
								{/each}
							</ul>
						</div>
					</div>
				</div>
			{/if}

			<div class="actions">
				{#if !analysis}
					<Button variant="secondary" onclick={analyzeCSV} disabled={!canAnalyze} loading={analyzing}>
						{analyzing ? 'Analyzing...' : 'Preview Import'}
					</Button>
				{:else}
					<Button onclick={importData} disabled={!canImport} loading={loading}>
						{loading ? 'Importing...' : 'Import Data'}
					</Button>
					<Button variant="secondary" onclick={reset} disabled={loading}>
						Cancel
					</Button>
				{/if}
			</div>
		</div>
	{/if}
</SettingsSection>

<style>
	.import-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* Success State */
	.import-success {
		text-align: center;
		padding: 1rem 0;
	}

	.success-icon {
		width: 64px;
		height: 64px;
		margin: 0 auto 1rem;
		color: var(--color-success);
	}

	.success-icon svg {
		width: 100%;
		height: 100%;
	}

	.import-success h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 1rem;
	}

	.skipped-note {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		margin: 1rem 0;
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	/* Analysis Results */
	.analysis-results {
		background: var(--color-bg-tertiary);
		border-radius: 8px;
		padding: 1rem;
	}

	.analysis-results h3 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 1rem;
	}

	.analysis-details {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		margin-bottom: 1rem;
	}

	.analysis-details p {
		margin: 0.25rem 0;
	}

	.analysis-lists {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.list-section h4 {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 0.5rem;
	}

	.list-section ul {
		margin: 0;
		padding: 0 0 0 1rem;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}

	.list-section li {
		margin: 0.25rem 0;
	}

	/* Actions */
	.actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 0.5rem;
		justify-content: center;
	}

	.import-form .actions {
		justify-content: flex-start;
	}

	/* Responsive */
	@media (min-width: 640px) {
		.stats-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}
</style>
