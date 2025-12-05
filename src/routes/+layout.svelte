<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { themeStore } from '$lib/stores';
	
	let { children } = $props();

	onMount(() => {
		// Initialize theme from localStorage
		themeStore.init();
		
		if (browser && 'serviceWorker' in navigator) {
			navigator.serviceWorker.register('/sw.js')
				.then((registration) => {
					console.log('[App] Service Worker registered:', registration.scope);
					
					// Check for updates
					registration.addEventListener('updatefound', () => {
						const newWorker = registration.installing;
						if (newWorker) {
							newWorker.addEventListener('statechange', () => {
								if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
									// New service worker available, activate it immediately
									newWorker.postMessage({ type: 'SKIP_WAITING' });
								}
							});
						}
					});
					
					// Force update check
					registration.update();
				})
				.catch((err) => {
					console.log('[App] Service worker registration failed:', err);
				});
				
			// Reload when new service worker takes over
			let refreshing = false;
			navigator.serviceWorker.addEventListener('controllerchange', () => {
				if (!refreshing) {
					refreshing = true;
					console.log('[App] New service worker activated, reloading...');
					window.location.reload();
				}
			});
		}
	});
</script>

{@render children()}
