<script lang="ts">
	import { SettingsSection } from '$lib/components';
	import { CURRENCY_SYMBOLS } from '$lib/constants';
	import { currencyStore } from '$lib/stores';

	// Initialize from localStorage on mount
	$effect(() => {
		currencyStore.init();
	});

	function toggleCurrency() {
		currencyStore.toggle();
	}
</script>

<SettingsSection title="Currency" description="Set your main currency for the app">
	{#snippet icon()}
		<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
			/>
		</svg>
	{/snippet}

	<div class="currency-setting">
		<div class="currency-info">
			<span class="currency-label">Main Currency</span>
			<span class="currency-hint">Used for displaying amounts across the app</span>
		</div>
		<button class="currency-toggle" onclick={toggleCurrency}>
			<span class="currency-code">{currencyStore.value}</span>
			<span class="currency-symbol">{CURRENCY_SYMBOLS[currencyStore.value]}</span>
		</button>
	</div>
</SettingsSection>

<style>
	.currency-setting {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.currency-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.currency-label {
		font-size: 0.95rem;
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.currency-hint {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	.currency-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s ease;
		min-width: 100px;
		justify-content: center;
	}

	.currency-toggle:hover {
		background: var(--color-primary);
		border-color: var(--color-primary);
	}

	.currency-toggle:hover .currency-code,
	.currency-toggle:hover .currency-symbol {
		color: white;
	}

	.currency-toggle:active {
		transform: scale(0.98);
	}

	.currency-code {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-text-primary);
		transition: color 0.2s ease;
	}

	.currency-symbol {
		font-size: 0.85rem;
		color: var(--color-text-muted);
		transition: color 0.2s ease;
	}
</style>
