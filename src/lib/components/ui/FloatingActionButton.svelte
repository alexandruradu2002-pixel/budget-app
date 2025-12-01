<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		onclick,
		label = 'Action',
		icon,
		children
	}: {
		onclick: () => void;
		label?: string;
		icon?: Snippet;
		children?: Snippet;
	} = $props();
</script>

<button {onclick} class="fab">
	{#if icon}
		{@render icon()}
	{:else if children}
		{@render children()}
	{:else}
		<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
		</svg>
	{/if}
	<span>{label}</span>
</button>

<style>
	.fab {
		position: fixed;
		bottom: 84px;
		right: 16px;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 20px;
		background-color: var(--color-primary);
		color: white;
		border: none;
		border-radius: 24px;
		font-weight: 500;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		z-index: 50;
		min-height: 48px;
		cursor: pointer;
	}

	.fab:active {
		transform: scale(0.96);
	}

	.fab :global(svg) {
		width: 20px;
		height: 20px;
	}
</style>
