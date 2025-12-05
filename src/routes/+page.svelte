<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	
	let { data }: { data: PageData } = $props();
	
	onMount(() => {
		// Client-side redirect - allows service worker to cache this page
		if (browser) {
			if (data?.isAuthenticated) {
				goto('/plan', { replaceState: true });
			} else {
				goto('/login', { replaceState: true });
			}
		}
	});
</script>

<!-- Loading state while redirect happens -->
<div class="loading-container">
	<div class="spinner"></div>
	<p>Se încarcă...</p>
</div>

<style>
	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		min-height: 100dvh;
		background-color: var(--color-bg-primary, #0F172A);
		color: var(--color-text-primary, #F8FAFC);
		gap: 1rem;
	}
	
	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid var(--color-border, #334155);
		border-top-color: var(--color-primary, #3B82F6);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}
	
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
	
	p {
		color: var(--color-text-secondary, #CBD5E1);
		font-size: 0.875rem;
	}
</style>
