<script lang="ts">
	import { offlineStore } from '$lib/stores';

	let showSyncDetails = $state(false);

	// Reactive values from store
	let isOnline = $derived(offlineStore.isOnline);
	let isSyncing = $derived(offlineStore.isSyncing);
	let pendingChanges = $derived(offlineStore.pendingChanges);

	function handleSync() {
		offlineStore.syncPendingChanges();
	}
</script>

{#if !isOnline || pendingChanges > 0}
	<div class="offline-indicator" class:offline={!isOnline} class:syncing={isSyncing}>
		<button
			class="indicator-content"
			onclick={() => showSyncDetails = !showSyncDetails}
			aria-expanded={showSyncDetails}
		>
			{#if !isOnline}
				<!-- Offline icon -->
				<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
				</svg>
				<span class="label">Offline</span>
			{:else if isSyncing}
				<!-- Syncing icon (animated) -->
				<svg class="icon spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
				</svg>
				<span class="label">Syncing...</span>
			{:else if pendingChanges > 0}
				<!-- Pending changes icon -->
				<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
				</svg>
				<span class="label">{pendingChanges} pending</span>
			{/if}
		</button>

		{#if showSyncDetails && (pendingChanges > 0 || !isOnline)}
			<div class="sync-details">
				{#if !isOnline}
					<p class="detail-text">
						You're currently offline. Changes will be saved locally and synced when you reconnect.
					</p>
				{:else if pendingChanges > 0}
					<p class="detail-text">
						{pendingChanges} change{pendingChanges > 1 ? 's' : ''} waiting to sync.
					</p>
					<button class="sync-button" onclick={handleSync} disabled={isSyncing}>
						{isSyncing ? 'Syncing...' : 'Sync Now'}
					</button>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	.offline-indicator {
		position: fixed;
		bottom: 80px; /* Above bottom nav */
		left: 50%;
		transform: translateX(-50%);
		z-index: 1000;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: 20px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		transition: all 0.3s ease;
	}

	.offline-indicator.offline {
		background: var(--color-danger);
		border-color: var(--color-danger);
	}

	.offline-indicator.syncing {
		background: var(--color-warning);
		border-color: var(--color-warning);
	}

	.indicator-content {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 16px;
		background: transparent;
		border: none;
		color: var(--color-text-primary);
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.offline .indicator-content,
	.syncing .indicator-content {
		color: white;
	}

	.icon {
		width: 18px;
		height: 18px;
		flex-shrink: 0;
	}

	.icon.spinning {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.label {
		white-space: nowrap;
	}

	.sync-details {
		padding: 12px 16px;
		border-top: 1px solid var(--color-border);
		background: var(--color-bg-tertiary);
		border-radius: 0 0 20px 20px;
	}

	.offline .sync-details {
		background: rgba(0, 0, 0, 0.2);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.detail-text {
		margin: 0 0 8px;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		line-height: 1.4;
	}

	.offline .detail-text {
		color: rgba(255, 255, 255, 0.9);
	}

	.sync-button {
		width: 100%;
		padding: 8px 16px;
		background: var(--color-primary);
		color: var(--color-text-primary);
		border: none;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.2s;
	}

	.sync-button:hover:not(:disabled) {
		background: var(--color-primary-hover);
	}

	.sync-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
