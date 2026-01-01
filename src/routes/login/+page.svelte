<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/state';

	// Auth mode: 'email' for magic link/OTP, 'password' for legacy
	let authMode = $state<'email' | 'password' | 'otp'>('email');
	
	// Form state
	let email = $state('');
	let otpCode = $state('');
	let password = $state('');
	let error = $state('');
	let success = $state('');
	let loading = $state(false);
	let usePasswordFallback = $state(false);
	
	// Input refs
	let emailInput = $state<HTMLInputElement | undefined>(undefined);
	let otpInput = $state<HTMLInputElement | undefined>(undefined);
	let passwordInput = $state<HTMLInputElement | undefined>(undefined);

	// Check URL params for errors/messages
	onMount(async () => {
		// Clear any existing demo session
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
		} catch {
			// Ignore logout errors
		}

		const errorParam = page.url.searchParams.get('error');
		if (errorParam === 'missing_token') {
			error = 'Invalid login link. Please request a new one.';
		} else if (errorParam === 'invalid_token') {
			error = 'Login link expired or already used. Please request a new one.';
		} else if (errorParam === 'user_cap') {
			error = 'This instance has reached its user limit. Try self-hosting your own instance.';
		}
		
		emailInput?.focus();
	});

	// Send magic link / OTP
	async function handleSendCode() {
		if (!email) return;
		
		loading = true;
		error = '';
		success = '';

		try {
			const response = await fetch('/api/auth/send-code', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});

			const data = await response.json();

			if (!response.ok) {
				if (data.usePasswordAuth) {
					// Email not configured, fall back to password
					usePasswordFallback = true;
					authMode = 'password';
					setTimeout(() => passwordInput?.focus(), 100);
					return;
				}
				error = data.message || data.error || 'Failed to send code';
				return;
			}

			success = data.message || 'Check your email for a sign-in link!';
			authMode = 'otp';
			setTimeout(() => otpInput?.focus(), 100);
		} catch (err) {
			error = 'Network error. Please try again.';
		} finally {
			loading = false;
		}
	}

	// Verify OTP
	async function handleVerifyOtp() {
		if (otpCode.length !== 6) return;
		
		loading = true;
		error = '';

		try {
			const response = await fetch('/api/auth/verify-otp', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, code: otpCode })
			});

			const data = await response.json();

			if (!response.ok) {
				error = data.error || 'Invalid code';
				return;
			}

			// Success - redirect
			if (data.isNewUser) {
				goto('/dashboard?welcome=true');
			} else {
				goto('/dashboard');
			}
		} catch (err) {
			error = 'Network error. Please try again.';
		} finally {
			loading = false;
		}
	}

	// Legacy password login
	async function handlePasswordLogin() {
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

	// Go back to email step
	function goBack() {
		authMode = 'email';
		otpCode = '';
		error = '';
		success = '';
		setTimeout(() => emailInput?.focus(), 100);
	}

	// Format OTP input (digits only)
	function handleOtpInput(e: Event) {
		const target = e.target as HTMLInputElement;
		otpCode = target.value.replace(/\D/g, '').slice(0, 6);
		
		// Auto-submit when 6 digits entered
		if (otpCode.length === 6) {
			handleVerifyOtp();
		}
	}
</script>

<div class="login-page">
	<div class="login-container">
		<!-- Logo & Title -->
		<div class="login-header">
			<div class="logo-icon">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
				</svg>
			</div>
			<h1 class="login-title">Budget App</h1>
			
			{#if authMode === 'email'}
				<p class="login-subtitle">Enter your email to sign in</p>
			{:else if authMode === 'otp'}
				<p class="login-subtitle">Enter the code sent to your email</p>
			{:else}
				<p class="login-subtitle">Enter your password to continue</p>
			{/if}
		</div>

		<!-- Error Message -->
		{#if error}
			<div class="error-message">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<span>{error}</span>
			</div>
		{/if}

		<!-- Success Message -->
		{#if success && authMode === 'otp'}
			<div class="success-message">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
				</svg>
				<span>{success}</span>
			</div>
		{/if}

		<!-- Email Form -->
		{#if authMode === 'email'}
			<form onsubmit={(e) => { e.preventDefault(); handleSendCode(); }} class="login-form">
				<div class="form-group">
					<label for="email" class="form-label">Email</label>
					<input
						type="email"
						id="email"
						bind:value={email}
						bind:this={emailInput}
						required
						class="form-input"
						placeholder="you@example.com"
						autocomplete="email"
					/>
				</div>

				<button
					type="submit"
					disabled={loading || !email}
					class="submit-button"
				>
					{#if loading}
						<span class="spinner"></span>
						Sending...
					{:else}
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
						</svg>
						Continue with Email
					{/if}
				</button>
			</form>

		<!-- OTP Form -->
		{:else if authMode === 'otp'}
			<form onsubmit={(e) => { e.preventDefault(); handleVerifyOtp(); }} class="login-form">
				<div class="email-display">
					<span class="email-label">Sending to:</span>
					<span class="email-value">{email}</span>
					<button type="button" class="change-email" onclick={goBack}>Change</button>
				</div>

				<div class="form-group">
					<label for="otp" class="form-label">6-Digit Code</label>
					<input
						type="text"
						id="otp"
						value={otpCode}
						oninput={handleOtpInput}
						bind:this={otpInput}
						required
						class="form-input otp-input"
						placeholder="000000"
						autocomplete="one-time-code"
						inputmode="numeric"
						maxlength="6"
					/>
				</div>

				<button
					type="submit"
					disabled={loading || otpCode.length !== 6}
					class="submit-button"
				>
					{#if loading}
						<span class="spinner"></span>
						Verifying...
					{:else}
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						Verify Code
					{/if}
				</button>

				<button type="button" class="resend-link" onclick={handleSendCode} disabled={loading}>
					Didn't receive the code? Send again
				</button>
			</form>

		<!-- Password Form (Fallback) -->
		{:else}
			<form onsubmit={(e) => { e.preventDefault(); handlePasswordLogin(); }} class="login-form">
				{#if usePasswordFallback}
					<div class="info-message">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span>Email login not configured. Use password.</span>
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

				{#if usePasswordFallback}
					<button type="button" class="back-link" onclick={goBack}>
						← Back to email login
					</button>
				{/if}
			</form>
		{/if}

		<!-- Demo Link -->
		<div class="demo-section">
			<span class="demo-divider">or</span>
			<a href="/demo" class="demo-link">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				Try Demo (no sign up required)
			</a>
		</div>
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
		gap: 1.25rem;
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
		margin-bottom: 1rem;
	}

	.success-message {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1rem;
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid var(--color-success);
		border-radius: 10px;
		color: var(--color-success);
		font-size: 0.875rem;
		margin-bottom: 1rem;
	}

	.info-message {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1rem;
		background: rgba(59, 130, 246, 0.1);
		border: 1px solid var(--color-primary);
		border-radius: 10px;
		color: var(--color-primary);
		font-size: 0.875rem;
	}

	.error-message svg,
	.success-message svg,
	.info-message svg {
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

	.otp-input {
		text-align: center;
		font-size: 1.5rem;
		font-weight: 600;
		letter-spacing: 0.5rem;
		font-family: monospace;
	}

	.email-display {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: var(--color-bg-tertiary);
		border-radius: 8px;
		font-size: 0.875rem;
	}

	.email-label {
		color: var(--color-text-muted);
	}

	.email-value {
		color: var(--color-text-primary);
		font-weight: 500;
		flex: 1;
	}

	.change-email {
		background: none;
		border: none;
		color: var(--color-primary);
		cursor: pointer;
		font-size: 0.875rem;
		padding: 0;
	}

	.change-email:hover {
		text-decoration: underline;
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

	.resend-link,
	.back-link {
		background: none;
		border: none;
		color: var(--color-text-muted);
		cursor: pointer;
		font-size: 0.875rem;
		text-align: center;
		padding: 0.5rem;
	}

	.resend-link:hover:not(:disabled),
	.back-link:hover {
		color: var(--color-primary);
	}

	.resend-link:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.demo-section {
		margin-top: 1.5rem;
		text-align: center;
	}

	.demo-divider {
		display: block;
		color: var(--color-text-muted);
		font-size: 0.875rem;
		margin-bottom: 1rem;
		position: relative;
	}

	.demo-divider::before,
	.demo-divider::after {
		content: '';
		position: absolute;
		top: 50%;
		width: 40%;
		height: 1px;
		background: var(--color-border);
	}

	.demo-divider::before {
		left: 0;
	}

	.demo-divider::after {
		right: 0;
	}

	.demo-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--color-text-secondary);
		text-decoration: none;
		font-size: 0.9rem;
		padding: 0.5rem 1rem;
		border-radius: 8px;
		transition: all 0.2s ease;
	}

	.demo-link:hover {
		color: var(--color-primary);
		background: var(--color-bg-tertiary);
	}

	.demo-link svg {
		width: 18px;
		height: 18px;
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
