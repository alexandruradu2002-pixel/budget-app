<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		onclick,
		children
	}: {
		label: string;
		onclick?: () => void;
		children?: Snippet;
	} = $props();
</script>

<button aria-label={label} class="header-btn" {onclick}>
	{#if children}
		{@render children()}
	{/if}
</button>

<style>
	.header-btn {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		color: var(--color-text-secondary);
		border-radius: 8px;
		transition: background-color 0.2s;
	}

	.header-btn:active {
		background-color: var(--color-bg-secondary);
	}

	.header-btn :global(svg) {
		width: 22px;
		height: 22px;
	}
</style>
