<script lang="ts">
	import { SettingsSection } from '$lib/components';
	import { themeStore, THEMES, type ThemeId } from '$lib/stores';
	
	function selectTheme(themeId: ThemeId) {
		themeStore.setTheme(themeId);
	}
</script>

<SettingsSection title="Theme" description="Personalizează aspectul aplicației">
	{#snippet icon()}
		<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
			/>
		</svg>
	{/snippet}

	<div class="theme-grid">
		{#each THEMES as theme}
			<button
				class="theme-card"
				class:active={themeStore.current === theme.id}
				onclick={() => selectTheme(theme.id)}
			>
				<div class="theme-preview" style="background: {theme.preview.bg};">
					<div class="preview-primary" style="background: {theme.preview.primary};"></div>
					<div class="preview-accent" style="background: {theme.preview.accent};"></div>
				</div>
				<div class="theme-info">
					<span class="theme-name">{theme.name}</span>
					{#if themeStore.current === theme.id}
						<svg class="check-icon" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
						</svg>
					{/if}
				</div>
			</button>
		{/each}
	</div>
</SettingsSection>

<style>
	.theme-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
	}

	@media (min-width: 480px) {
		.theme-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.theme-card {
		display: flex;
		flex-direction: column;
		border: 2px solid var(--color-border);
		border-radius: 0.75rem;
		overflow: hidden;
		background: var(--color-bg-tertiary);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.theme-card:hover {
		border-color: var(--color-text-muted);
		transform: translateY(-2px);
	}

	.theme-card.active {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 2px var(--color-primary);
	}

	.theme-preview {
		height: 60px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem;
	}

	.preview-primary {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}

	.preview-accent {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}

	.theme-info {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
		background: var(--color-bg-secondary);
	}

	.theme-name {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.check-icon {
		width: 16px;
		height: 16px;
		color: var(--color-success);
	}
</style>
