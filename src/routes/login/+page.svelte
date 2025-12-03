<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let password = $state('');
	let error = $state('');
	let loading = $state(false);
	let passwordInput: HTMLInputElement;

	// Focus input on mount (without autofocus attribute to avoid a11y warning)
	onMount(() => {
		passwordInput?.focus();
	});

	async function handleLogin() {
		loading = true;
		error = '';

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ password })
			});

			const data = await response.json();

			if (!response.ok) {
				error = data.error || 'Login failed';
				return;
			}

			goto('/plan');
		} catch (err) {
			error = 'Network error. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="login-page">
	<div class="login-container">
		<!-- Logo & Title -->
		<div class="login-header">
			<div class="logo-icon">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<!-- Stack of cash/banknotes icon -->
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
				</svg>
			</div>
			<h1 class="login-title">Budget App</h1>
			<p class="login-subtitle">Enter your password to continue</p>
		</div>

		<!-- Login Form -->
		<form onsubmit={(e) => { e.preventDefault(); handleLogin(); }} class="login-form">
			{#if error}
				<div class="error-message">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<span>{error}</span>
				</div>
			{/if}

			<div class="form-group">
				<label for="password" class="form-label">Password</label>
				<input
					type="password"
					id="password"
					bind:value={password}
					bind:this={passwordInput}
					required
					class="form-input"
					placeholder="Enter password"
				/>
			</div>

			<button
				type="submit"
				disabled={loading || !password}
				class="submit-button"
			>
				{#if loading}
					<span class="spinner"></span>
					Signing in...
				{:else}
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
					</svg>
					Sign In
				{/if}
			</button>
		</form>
	</div>
</div>

<style>
	.login-page {
		min-height: 100vh;
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: var(--color-bg-primary);
	}

	.login-container {
		width: 100%;
		max-width: 400px;
		background: var(--color-bg-secondary);
		border-radius: 16px;
		border: 1px solid var(--color-border);
		padding: 2rem;
	}

	.login-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.logo-icon {
		width: 64px;
		height: 64px;
		margin: 0 auto 1rem;
		background: var(--color-primary);
		border-radius: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.logo-icon svg {
		width: 36px;
		height: 36px;
		color: white;
	}

	.login-title {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 0.5rem;
	}

	.login-subtitle {
		font-size: 0.95rem;
		color: var(--color-text-muted);
		margin: 0;
	}

	.login-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid var(--color-danger);
		border-radius: 10px;
		color: var(--color-danger);
		font-size: 0.875rem;
	}

	.error-message svg {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-secondary);
	}

	.form-input {
		width: 100%;
		padding: 0.875rem 1rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		color: var(--color-text-primary);
		font-size: 1rem;
		transition: all 0.2s ease;
	}

	.form-input::placeholder {
		color: var(--color-text-muted);
	}

	.form-input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
	}

	.submit-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.875rem 1.5rem;
		background: var(--color-primary);
		color: white;
		border: none;
		border-radius: 10px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		min-height: 48px;
	}

	.submit-button:hover:not(:disabled) {
		background: var(--color-primary-hover);
	}

	.submit-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.submit-button svg {
		width: 20px;
		height: 20px;
	}

	.spinner {
		width: 18px;
		height: 18px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Responsive */
	@media (min-width: 640px) {
		.login-container {
			padding: 2.5rem;
		}
	}
</style>
