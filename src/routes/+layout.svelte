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
			navigator.serviceWorker.register('/sw.js').catch((err) => {
				console.log('Service worker registration failed:', err);
			});
		}
	});
</script>

{@render children()}
