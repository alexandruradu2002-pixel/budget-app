<script lang="ts">
	let {
		message = 'Loading...'
	} = $props();
</script>

<div class="loading-state">
	<div class="loading-spinner"></div>
	<span>{message}</span>
</div>

<style>
	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 48px 16px;
		color: var(--color-text-muted);
	}

	.loading-spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--color-bg-tertiary);
		border-top-color: var(--color-primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
