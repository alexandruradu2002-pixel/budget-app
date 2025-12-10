<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { themeStore, keyboardStore } from '$lib/stores';
	
	let { children } = $props();
	
	// Track if app has been properly hydrated
	let isHydrated = $state(false);

	// Hide initial loading indicator
	function hideAppLoading() {
		if (browser) {
			const loader = document.getElementById('app-loading');
			if (loader) {
				loader.classList.add('hidden');
				setTimeout(() => loader.remove(), 200);
			}
		}
	}
	
	// Handle visibility change (iOS background/foreground transitions)
	function handleVisibilityChange() {
		if (document.visibilityState === 'visible') {
			// App came back to foreground
			hideAppLoading();
			
			// Check if we need to re-validate session or reload data
			if (isHydrated) {
				// Trigger a soft refresh of data stores
				window.dispatchEvent(new CustomEvent('app:resumed'));
				
				// Ping service worker to check if it's still responsive
				if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
					const pingTimeout = setTimeout(() => {
						// Service worker didn't respond in time, might be stuck
						console.log('[App] Service worker unresponsive, checking app state...');
						checkAppState();
					}, 2000);
					
					navigator.serviceWorker.controller.postMessage({ type: 'PING' });
					
					// Listen for pong response
					const handlePong = (event: MessageEvent) => {
						if (event.data?.type === 'PONG') {
							clearTimeout(pingTimeout);
							navigator.serviceWorker.removeEventListener('message', handlePong);
						}
					};
					navigator.serviceWorker.addEventListener('message', handlePong);
				}
			}
		}
	}
	
	// Check if app is in a valid state, reload if stuck
	function checkAppState() {
		const appContent = document.querySelector('.app-container, main, [data-sveltekit-hydrate]');
		if (!appContent) {
			console.log('[App] App content missing, reloading...');
			window.location.reload();
		}
	}

	onMount(() => {
		// Mark as hydrated
		isHydrated = true;
		
		// Hide loading indicator immediately when component mounts
		hideAppLoading();
		
		// Initialize stores from localStorage
		themeStore.init();
		keyboardStore.init();
		
		// Listen for visibility changes (iOS PWA fix)
		document.addEventListener('visibilitychange', handleVisibilityChange);
		
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
			
			// Listen for reload messages from service worker
			navigator.serviceWorker.addEventListener('message', (event) => {
				if (event.data?.type === 'RELOAD') {
					console.log('[App] Service worker requested reload');
					window.location.reload();
				}
			});
		}
		
		// Cleanup on unmount
		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	});
</script>

{@render children()}
