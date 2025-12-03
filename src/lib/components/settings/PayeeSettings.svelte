<script lang="ts">
	import { SettingsSection } from '$lib/components';

	// Local storage key for the setting
	const STORAGE_KEY = 'payee_auto_categorize';

	// State for the toggle
	let autoCategorize = $state(false);

	// Initialize from localStorage on mount
	$effect(() => {
		const stored = localStorage.getItem(STORAGE_KEY);
		autoCategorize = stored === 'true';
	});

	function toggleAutoCategorize() {
		autoCategorize = !autoCategorize;
		localStorage.setItem(STORAGE_KEY, autoCategorize.toString());
	}
</script>

<SettingsSection title="Manage Payees" description="Configurează comportamentul payee-urilor">
	{#snippet icon()}
		<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
			/>
		</svg>
	{/snippet}

	<div class="payee-settings">
		<div class="setting-item">
			<div class="setting-info">
				<span class="setting-label">Automatically categorize payee</span>
				<span class="setting-hint">Când selectezi un payee, categoria va fi auto-selectată bazat pe categoria în care acel payee a apărut cel mai des</span>
			</div>
			<button 
				class="toggle-button" 
				class:active={autoCategorize}
				onclick={toggleAutoCategorize}
				aria-label="Toggle auto categorize"
			>
				<span class="toggle-track">
					<span class="toggle-thumb"></span>
				</span>
				{#if autoCategorize}
					<svg class="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
				{/if}
			</button>
		</div>
	</div>
</SettingsSection>

<style>
	.payee-settings {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.setting-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem;
		background: var(--color-bg-tertiary);
		border-radius: 0.5rem;
	}

	.setting-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
	}

	.setting-label {
		font-size: 0.95rem;
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.setting-hint {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		line-height: 1.4;
	}

	.toggle-button {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0;
		background: none;
		border: none;
		cursor: pointer;
		flex-shrink: 0;
	}

	.toggle-track {
		position: relative;
		width: 44px;
		height: 24px;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: 12px;
		transition: all 0.2s ease;
	}

	.toggle-button.active .toggle-track {
		background: var(--color-primary);
		border-color: var(--color-primary);
	}

	.toggle-thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 18px;
		height: 18px;
		background: var(--color-text-muted);
		border-radius: 50%;
		transition: all 0.2s ease;
	}

	.toggle-button.active .toggle-thumb {
		left: calc(100% - 20px);
		background: white;
	}

	.check-icon {
		position: absolute;
		right: -24px;
		width: 18px;
		height: 18px;
		color: var(--color-success);
	}
</style>
