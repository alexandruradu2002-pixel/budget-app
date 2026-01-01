<script lang="ts">
	import { goto } from '$app/navigation';
	
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	async function startDemo() {
		isLoading = true;
		error = null;

		try {
			// First logout any existing session to ensure clean demo
			await fetch('/api/auth/logout', { method: 'POST' });
			
			const response = await fetch('/api/auth/demo', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to start demo');
			}

			// Force full page reload to clear any cached state
			window.location.href = '/dashboard';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to start demo';
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Try Demo - Budget App</title>
	<meta name="description" content="Try Budget App with sample data. No sign up required." />
</svelte:head>

<div class="demo-container">
	<div class="demo-card">
		<!-- Logo/Icon -->
		<div class="demo-icon">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
			</svg>
		</div>

		<h1 class="demo-title">Try Budget App</h1>
		
		<p class="demo-description">
			Explore the app with sample data. No sign up required.
			<br />
			See how easy it is to track your finances!
		</p>

		<!-- Features list -->
		<ul class="demo-features">
			<li>
				<span class="feature-icon">📊</span>
				<span>Dashboard with spending insights</span>
			</li>
			<li>
				<span class="feature-icon">💳</span>
				<span>Multiple accounts & currencies</span>
			</li>
			<li>
				<span class="feature-icon">📁</span>
				<span>Categories & budgets</span>
			</li>
			<li>
				<span class="feature-icon">📈</span>
				<span>Reports & analytics</span>
			</li>
		</ul>

		{#if error}
			<div class="demo-error">
				<span>⚠️</span> {error}
			</div>
		{/if}

		<button 
			class="demo-button" 
			onclick={startDemo}
			disabled={isLoading}
		>
			{#if isLoading}
				<span class="spinner"></span>
				<span>Loading demo...</span>
			{:else}
				<span>🚀</span>
				<span>Start Demo</span>
			{/if}
		</button>

		<p class="demo-note">
			<strong>Read-only mode:</strong> You can explore everything, but changes won't be saved.
		</p>

		<!-- Links -->
		<div class="demo-links">
			<a href="https://github.com/alexandruradu2002-pixel/budget_app" target="_blank" rel="noopener" class="demo-link">
				<strong>Self-host your own</strong>
			</a>
		</div>
	</div>
</div>

<style>
	.demo-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: linear-gradient(135deg, var(--color-bg-primary) 0%, var(--color-bg-secondary) 100%);
	}

	.demo-card {
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: 1rem;
		padding: 2rem;
		max-width: 420px;
		width: 100%;
		text-align: center;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
	}

	.demo-icon {
		width: 80px;
		height: 80px;
		margin: 0 auto 1.5rem;
		background: var(--color-primary);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
	}

	.demo-icon svg {
		width: 40px;
		height: 40px;
	}

	.demo-title {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 0.75rem;
	}

	.demo-description {
		color: var(--color-text-secondary);
		font-size: 0.95rem;
		line-height: 1.5;
		margin: 0 0 1.5rem;
	}

	.demo-features {
		list-style: none;
		padding: 0;
		margin: 0 0 1.5rem;
		text-align: left;
	}

	.demo-features li {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0;
		color: var(--color-text-secondary);
		font-size: 0.9rem;
	}

	.feature-icon {
		font-size: 1.25rem;
	}

	.demo-error {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #EF4444;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		margin-bottom: 1rem;
		font-size: 0.9rem;
	}

	.demo-button {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 1rem 1.5rem;
		background: var(--color-primary);
		color: white;
		border: none;
		border-radius: 0.75rem;
		font-size: 1.1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.demo-button:hover:not(:disabled) {
		background: var(--color-primary-hover);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.4);
	}

	.demo-button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.spinner {
		width: 20px;
		height: 20px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.demo-note {
		margin: 1rem 0;
		padding: 0.75rem;
		background: var(--color-bg-tertiary);
		border-radius: 0.5rem;
		color: var(--color-text-muted);
		font-size: 0.85rem;
	}

	.demo-links {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-top: 1rem;
	}

	.demo-link {
		color: var(--color-text-secondary);
		text-decoration: none;
		font-size: 0.9rem;
		transition: color 0.2s;
	}

	.demo-link:hover {
		color: var(--color-primary);
	}

	.demo-link strong {
		color: var(--color-primary);
	}
</style>
