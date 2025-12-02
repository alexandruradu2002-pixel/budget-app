<script lang="ts">
	import { PageHeader, SettingsSection, CurrencySettings, YNABImport } from '$lib/components';
</script>

<div class="settings-page">
	<PageHeader title="Settings" />

	<div class="settings-content">
		<!-- Currency Settings Section -->
		<CurrencySettings />

		<!-- YNAB Import Section -->
		<YNABImport />

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

	/* Responsive */
	@media (min-width: 640px) {
		.settings-content {
			padding: 1.5rem;
			max-width: 600px;
			margin: 0 auto;
		}
	}
</style>
