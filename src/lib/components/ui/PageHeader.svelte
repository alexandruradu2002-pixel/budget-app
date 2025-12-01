<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		children
	}: {
		title: string;
		children?: Snippet;
	} = $props();
</script>

<header class="page-header">
	<h1 class="page-title">{title}</h1>
	{#if children}
		<div class="header-actions">
			{@render children()}
		</div>
	{/if}
</header>

<style>
	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px;
		background-color: var(--color-bg-primary);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.page-title {
		font-size: 24px;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}
</style>
