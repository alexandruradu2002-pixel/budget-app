<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		icon = '📭',
		title = 'No data',
		subtitle = '',
		children
	}: {
		icon?: string;
		title?: string;
		subtitle?: string;
		children?: Snippet;
	} = $props();
</script>

<div class="empty-state">
	<div class="empty-icon">{icon}</div>
	<p class="empty-title">{title}</p>
	{#if subtitle}
		<p class="empty-subtitle">{subtitle}</p>
	{/if}
	{#if children}
		<div class="empty-actions">
			{@render children()}
		</div>
	{/if}
</div>

<style>
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 64px 24px;
		text-align: center;
	}

	.empty-icon {
		font-size: 64px;
		margin-bottom: 16px;
	}

	.empty-title {
		font-size: 18px;
		font-weight: 500;
		color: var(--color-text-secondary);
		margin: 0 0 8px 0;
	}

	.empty-subtitle {
		font-size: 14px;
		color: var(--color-text-muted);
		margin: 0;
	}

	.empty-actions {
		margin-top: 16px;
	}
</style>
