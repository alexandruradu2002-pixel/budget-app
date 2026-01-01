<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let password = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let loading = $state(false);
	let checkingStatus = $state(true);
	let passwordInput = $state<HTMLInputElement | null>(null);

	// Check if already configured on mount
	onMount(async () => {
		try {
			const response = await fetch('/api/auth/setup');
			const data = await response.json();
			
			if (data.isConfigured) {
				// Already configured, redirect to login
				goto('/login');
				return;
			}
		} catch {
			// If check fails, show setup anyway
		}
		checkingStatus = false;
		passwordInput?.focus();
	});

	async function handleSetup() {
		loading = true;
		error = '';

		// Client-side validation
		if (password.length < 6) {
			error = 'Parola trebuie să aibă cel puțin 6 caractere';
			loading = false;
			return;
		}

		if (password !== confirmPassword) {
			error = 'Parolele nu coincid';
			loading = false;
			return;
		}

		try {
			const response = await fetch('/api/auth/setup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password, confirmPassword })
			});

			const data = await response.json();

			if (!response.ok) {
				error = data.error || 'Setup failed';
				return;
			}

			// Success - redirect to login
			goto('/login');
		} catch (err) {
			error = 'Network error. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

{#if checkingStatus}
	<div class="setup-page">
		<div class="setup-container">
			<div class="loading-state">
				<div class="spinner-large"></div>
				<p>Se verifică configurația...</p>
			</div>
		</div>
	</div>
{:else}
	<div class="setup-page">
		<div class="setup-container">
			<!-- Logo & Title -->
			<div class="setup-header">
				<div class="logo-icon">
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
					</svg>
				</div>
				<h1 class="setup-title">Configurare Inițială</h1>
				<p class="setup-subtitle">Bine ai venit! Setează o parolă pentru a-ți proteja aplicația.</p>
			</div>

			<!-- Setup Form -->
			<form onsubmit={(e) => { e.preventDefault(); handleSetup(); }} class="setup-form">
				{#if error}
					<div class="error-message">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span>{error}</span>
					</div>
				{/if}

				<div class="form-group">
					<label for="password" class="form-label">Parolă</label>
					<input
						type="password"
						id="password"
						bind:value={password}
						bind:this={passwordInput}
						required
						minlength="6"
						class="form-input"
						placeholder="Minimum 6 caractere"
					/>
				</div>

				<div class="form-group">
					<label for="confirmPassword" class="form-label">Confirmă parola</label>
					<input
						type="password"
						id="confirmPassword"
						bind:value={confirmPassword}
						required
						minlength="6"
						class="form-input"
						placeholder="Repetă parola"
					/>
				</div>

				<button
					type="submit"
					disabled={loading || !password || !confirmPassword}
					class="submit-button"
				>
					{#if loading}
						<span class="spinner"></span>
						Se configurează...
					{:else}
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
						</svg>
						Salvează și Continuă
					{/if}
				</button>
			</form>

			<!-- Info -->
			<div class="info-box">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<div>
					<p><strong>Sfaturi pentru parolă:</strong></p>
					<ul>
						<li>Folosește cel puțin 6 caractere</li>
						<li>Combină litere, cifre și simboluri</li>
						<li>Păstrează parola într-un loc sigur</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.setup-page {
		min-height: 100vh;
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: var(--color-bg-primary);
	}

	.setup-container {
		width: 100%;
		max-width: 400px;
		background: var(--color-bg-secondary);
		border-radius: 16px;
		border: 1px solid var(--color-border);
		padding: 2rem;
	}

	.loading-state {
		text-align: center;
		padding: 2rem;
		color: var(--color-text-secondary);
	}

	.spinner-large {
		width: 40px;
		height: 40px;
		margin: 0 auto 1rem;
		border: 3px solid var(--color-border);
		border-top-color: var(--color-primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.setup-header {
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

	.setup-title {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 0.5rem;
	}

	.setup-subtitle {
		font-size: 0.95rem;
		color: var(--color-text-secondary);
		margin: 0;
	}

	.setup-form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.form-input {
		padding: 0.875rem 1rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		color: var(--color-text-primary);
		font-size: 1rem;
		transition: border-color 0.2s, box-shadow 0.2s;
	}

	.form-input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.form-input::placeholder {
		color: var(--color-text-muted);
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: 8px;
		color: var(--color-danger);
		font-size: 0.875rem;
	}

	.error-message svg {
		width: 18px;
		height: 18px;
		flex-shrink: 0;
	}

	.submit-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.875rem 1.5rem;
		background: var(--color-primary);
		color: white;
		font-size: 1rem;
		font-weight: 600;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: background-color 0.2s, transform 0.1s;
	}

	.submit-button:hover:not(:disabled) {
		background: var(--color-primary-hover);
	}

	.submit-button:active:not(:disabled) {
		transform: scale(0.98);
	}

	.submit-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.submit-button svg {
		width: 20px;
		height: 20px;
	}

	.spinner {
		width: 20px;
		height: 20px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.info-box {
		margin-top: 1.5rem;
		padding: 1rem;
		background: var(--color-bg-tertiary);
		border-radius: 8px;
		display: flex;
		gap: 0.75rem;
		font-size: 0.85rem;
		color: var(--color-text-secondary);
	}

	.info-box svg {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
		color: var(--color-primary);
	}

	.info-box p {
		margin: 0 0 0.5rem;
	}

	.info-box ul {
		margin: 0;
		padding-left: 1.25rem;
	}

	.info-box li {
		margin-bottom: 0.25rem;
	}
</style>
