<script lang="ts">
	import { FileUpload, StatCard, Button, Alert, SettingsSection } from '$lib/components';
	import { formatCurrency } from '$lib/utils/format';
	import { toast } from '$lib/stores';

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
	let clearExisting = $state(false);

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
		
		// Confirm if clearing existing data
		if (clearExisting) {
			const confirmed = confirm(
				'⚠️ ATENȚIE!\n\n' +
				'Această acțiune va ȘTERGE PERMANENT toate datele existente:\n' +
				'• Toate tranzacțiile\n' +
				'• Toate conturile\n' +
				'• Toate categoriile\n' +
				'• Toate bugetele\n' +
				'• Toate payee-urile salvate\n' +
				'• Toate locațiile învățate\n\n' +
				'Datele nu pot fi recuperate!\n\n' +
				'Ești sigur că vrei să continui?'
			);
			if (!confirmed) return;
		}

		loading = true;
		error = null;

		try {
			const formData = new FormData();
			formData.append('register', registerFile);
			if (planFile) {
				formData.append('plan', planFile);
			}
			if (clearExisting) {
				formData.append('clearExisting', 'true');
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
			
			// Show success toast
			toast.success(
				`✅ Import finalizat! ${data.result.transactions.imported.toLocaleString()} tranzacții importate.`
			);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Import failed';
			toast.error('Import eșuat. Verifică erorile de mai jos.');
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
		clearExisting = false;
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

					<!-- Clear existing data option -->
					<div class="clear-option">
						<label class="checkbox-label">
							<input type="checkbox" bind:checked={clearExisting} />
							<span class="checkbox-text">Șterge datele existente înainte de import</span>
						</label>
						
						{#if clearExisting}
							<div class="warning-box">
								<svg class="warning-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
								</svg>
								<div class="warning-content">
									<strong>⚠️ Atenție!</strong>
									<p>Toate datele existente vor fi șterse permanent:</p>
									<ul>
										<li>Tranzacții, Conturi, Categorii</li>
										<li>Bugete și alocări</li>
										<li>Payee-uri și locații învățate</li>
									</ul>
									<p><strong>Această acțiune nu poate fi anulată!</strong></p>
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<div class="actions">
				{#if !analysis}
					<Button variant="secondary" onclick={analyzeCSV} disabled={!canAnalyze} loading={analyzing}>
						{analyzing ? 'Analyzing...' : 'Preview Import'}
					</Button>
				{:else}
					<div class="import-info">
						{#if analysis.totalTransactions > 1000}
							<p class="time-estimate">
								⏱️ Timp estimat: ~{Math.ceil(analysis.totalTransactions / (clearExisting ? 500 : 100))} secunde
								{#if !clearExisting}
									<span class="tip">(mai rapid cu "Șterge datele existente")</span>
								{/if}
							</p>
						{/if}
					</div>
					<div class="action-buttons">
						<Button onclick={importData} disabled={!canImport} loading={loading}>
							{#if loading}
								Importing... please wait
							{:else}
								Import {analysis.totalTransactions.toLocaleString()} Transactions
							{/if}
						</Button>
						<Button variant="secondary" onclick={reset} disabled={loading}>
							Cancel
						</Button>
					</div>
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

	/* Clear existing option */
	.clear-option {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-border);
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-size: 0.875rem;
		color: var(--color-text-primary);
	}

	.checkbox-label input[type="checkbox"] {
		width: 1rem;
		height: 1rem;
		accent-color: var(--color-danger);
		cursor: pointer;
	}

	.checkbox-text {
		user-select: none;
	}

	.warning-box {
		display: flex;
		gap: 0.75rem;
		margin-top: 0.75rem;
		padding: 0.875rem;
		background-color: color-mix(in srgb, var(--color-danger) 10%, transparent);
		border: 1px solid var(--color-danger);
		border-radius: 0.5rem;
	}

	.warning-icon {
		width: 1.5rem;
		height: 1.5rem;
		flex-shrink: 0;
		color: var(--color-danger);
	}

	.warning-content {
		font-size: 0.8rem;
		color: var(--color-text-primary);
	}

	.warning-content strong {
		color: var(--color-danger);
	}

	.warning-content p {
		margin: 0.25rem 0;
	}

	.warning-content ul {
		margin: 0.25rem 0;
		padding-left: 1rem;
		color: var(--color-text-secondary);
	}

	.warning-content li {
		margin: 0.125rem 0;
	}

	/* Actions */
	.actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	.action-buttons {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-start;
	}

	.import-info {
		margin-bottom: 0.5rem;
	}

	.time-estimate {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.time-estimate .tip {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		font-style: italic;
	}

	/* Responsive */
	@media (min-width: 640px) {
		.stats-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}
</style>
