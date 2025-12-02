<script lang="ts">
	import type { Snippet } from 'svelte';
	
	let { children }: { children?: Snippet } = $props();
</script>

<!-- Dark overlay that blocks all interactions - leaves bottom nav accessible (64px) -->
<div class="wip-overlay">
	<div class="wip-content">
		<div class="wip-card">
			<div class="text-5xl mb-4">🚧</div>
			<h2 class="text-xl font-bold text-[var(--color-text-primary)] mb-2">Work in Progress</h2>
			<p class="text-[var(--color-text-muted)] text-sm">
				This page is currently under development. Check back soon!
			</p>
		</div>
		
		<!-- Slot for accessible elements like settings button -->
		{#if children}
			<div class="mt-6">
				{@render children()}
			</div>
		{/if}
	</div>
</div>

<style>
	.wip-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 64px; /* Leave space for bottom nav */
		z-index: 9999;
		background-color: rgba(0, 0, 0, 0.9);
		pointer-events: all;
	}
	
	.wip-content {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
		padding: 1rem;
	}
	
	.wip-card {
		background-color: var(--color-bg-secondary);
		border-radius: 1rem;
		padding: 2rem;
		margin: 0 1rem;
		max-width: 24rem;
		text-align: center;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		border: 1px solid var(--color-border);
	}
</style>