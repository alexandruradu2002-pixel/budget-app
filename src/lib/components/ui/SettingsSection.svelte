<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		description?: string;
		icon?: Snippet;
		children: Snippet;
	}

	let { title, description, icon, children }: Props = $props();
</script>

<section class="settings-section">
	<div class="section-header">
		{#if icon}
			<div class="section-icon">
				{@render icon()}
			</div>
		{/if}
		<div class="section-title-group">
			<h2 class="section-title">{title}</h2>
			{#if description}
				<p class="section-description">{description}</p>
			{/if}
		</div>
	</div>
	<div class="section-content">
		{@render children()}
	</div>
</section>

<style>
	.settings-section {
		background: var(--color-bg-secondary);
		border-radius: 12px;
		padding: 1.25rem;
	}

	.section-header {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.section-icon {
		width: 40px;
		height: 40px;
		background: var(--color-primary);
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.section-icon :global(svg) {
		width: 20px;
		height: 20px;
		color: white;
	}

	.section-title-group {
		flex: 1;
	}

	.section-title {
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
	}

	.section-description {
		font-size: 0.875rem;
		color: var(--color-text-muted);
		margin: 0.25rem 0 0;
	}
</style>
