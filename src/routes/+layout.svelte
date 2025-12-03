<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	
	let { children } = $props();

	onMount(() => {
		if (browser && 'serviceWorker' in navigator) {
			navigator.serviceWorker.register('/sw.js').catch((err) => {
				console.log('Service worker registration failed:', err);
			});
		}
	});
</script>

{@render children()}
