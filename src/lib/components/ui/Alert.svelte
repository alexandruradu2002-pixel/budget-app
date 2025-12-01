<script lang="ts">
	interface Props {
		type?: 'error' | 'success' | 'warning' | 'info';
		message: string;
	}

	let { type = 'error', message }: Props = $props();
</script>

<div class="alert alert-{type}">
	<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
		{#if type === 'error'}
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
			/>
		{:else if type === 'success'}
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
			/>
		{:else if type === 'warning'}
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
			/>
		{:else}
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
			/>
		{/if}
	</svg>
	<span>{message}</span>
</div>

<style>
	.alert {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		font-size: 0.875rem;
	}

	.alert svg {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
	}

	.alert-error {
		background: rgba(239, 68, 68, 0.1);
		color: var(--color-danger);
	}

	.alert-success {
		background: rgba(34, 197, 94, 0.1);
		color: var(--color-success);
	}

	.alert-warning {
		background: rgba(245, 158, 11, 0.1);
		color: var(--color-warning);
	}

	.alert-info {
		background: rgba(59, 130, 246, 0.1);
		color: var(--color-primary);
	}
</style>
