<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		children,
		onTitleClick
	}: {
		title: string;
		children?: Snippet;
		onTitleClick?: () => void;
	} = $props();
</script>

<header class="page-header">
	{#if onTitleClick}
		<button class="page-title clickable" onclick={onTitleClick}>
			{title}
			<svg class="title-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
	{:else}
		<h1 class="page-title">{title}</h1>
	{/if}
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

	.page-title.clickable {
		display: flex;
		align-items: center;
		gap: 8px;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
	}

	.page-title.clickable:active {
		opacity: 0.7;
	}

	.title-chevron {
		width: 20px;
		height: 20px;
		color: var(--color-text-muted);
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}
</style>
