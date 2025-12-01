<script lang="ts">
	interface Props {
		value: number | string;
		label: string;
		variant?: 'default' | 'success' | 'primary';
	}

	let { value, label, variant = 'default' }: Props = $props();
</script>

<div class="stat-card" class:success={variant === 'success'} class:primary={variant === 'primary'}>
	<span class="stat-value">{value}</span>
	<span class="stat-label">{label}</span>
</div>

<style>
	.stat-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.75rem;
		background: var(--color-bg-secondary);
		border-radius: 8px;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-text-primary);
	}

	.stat-card.primary .stat-value {
		color: var(--color-primary);
	}

	.stat-card.success .stat-value {
		color: var(--color-success);
	}

	.stat-label {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		text-align: center;
	}
</style>
