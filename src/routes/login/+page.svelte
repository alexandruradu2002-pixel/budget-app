<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/state';

	// Auth modes
	type AuthMode = 'choose' | 'email' | 'password' | 'otp' | 'forgot-password' | 'reset-password';
	let authMode = $state<AuthMode>('choose');
	
	// Form state
	let email = $state('');
	let otpCode = $state('');
	let password = $state('');
	let newPassword = $state('');
	let error = $state('');
	let success = $state('');
	let loading = $state(false);
	
	// Email service status
	let emailLimitReached = $state(false);
	let emailConfigured = $state(true);
	let checkingEmailStatus = $state(true);
	
	// Reset password token
	let resetToken = $state('');
	
	// Input refs
	let emailInput = $state<HTMLInputElement | undefined>(undefined);
	let otpInput = $state<HTMLInputElement | undefined>(undefined);
	let passwordInput = $state<HTMLInputElement | undefined>(undefined);

	// Check email status and URL params on mount
	onMount(async () => {
		// Clear any existing demo session
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
		} catch {
			// Ignore logout errors
		}

		// Check for reset token in URL
		const tokenParam = page.url.searchParams.get('reset_token');
		if (tokenParam) {
			resetToken = tokenParam;
			authMode = 'reset-password';
			checkingEmailStatus = false;
			setTimeout(() => passwordInput?.focus(), 100);
			return;
		}

		// Check URL params for errors
		const errorParam = page.url.searchParams.get('error');
		if (errorParam === 'missing_token') {
			error = 'Link de login invalid. Cere unul nou.';
		} else if (errorParam === 'invalid_token') {
			error = 'Link-ul a expirat sau a fost deja folosit.';
		} else if (errorParam === 'user_cap') {
			error = 'Limita de utilizatori a fost atinsă.';
		}

		// Check email service status
		try {
			const response = await fetch('/api/auth/email-status');
			const data = await response.json();
			emailConfigured = data.configured;
			emailLimitReached = data.limitReached;
		} catch {
			// Default to password-only if can't check
			emailConfigured = false;
			emailLimitReached = true;
		}
		
		checkingEmailStatus = false;
		
		// If email is not configured (self-hosted without Resend), go directly to password login
		if (!emailConfigured) {
			authMode = 'password';
			setTimeout(() => emailInput?.focus(), 100);
		}
	});

	// Choose email login
	function chooseEmail() {
		authMode = 'email';
		error = '';
		success = '';
		setTimeout(() => emailInput?.focus(), 100);
	}

	// Choose password login
	function choosePassword() {
		authMode = 'password';
		error = '';
		success = '';
		setTimeout(() => emailInput?.focus(), 100);
	}

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
				if (data.emailLimitReached) {
					emailLimitReached = true;
					error = 'Limita zilnică de emailuri a fost atinsă. Folosește login cu parolă.';
					authMode = 'choose';
					return;
				}
				error = data.message || data.error || 'Nu am putut trimite codul';
				return;
			}

			success = data.message || 'Verifică emailul pentru link-ul de login!';
			authMode = 'otp';
			setTimeout(() => otpInput?.focus(), 100);
		} catch (err) {
			error = 'Eroare de rețea. Încearcă din nou.';
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
				error = data.error || 'Cod invalid';
				return;
			}

			if (data.isNewUser) {
				goto('/dashboard?welcome=true');
			} else {
				goto('/dashboard');
			}
		} catch (err) {
			error = 'Eroare de rețea. Încearcă din nou.';
		} finally {
			loading = false;
		}
	}

	// Email + Password login
	async function handlePasswordLogin() {
		if (!email || !password) return;
		if (password.length < 6) {
			error = 'Parola trebuie să aibă minim 6 caractere';
			return;
		}
		
		loading = true;
		error = '';

		try {
			const response = await fetch('/api/auth/login-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ email, password })
			});

			const data = await response.json();

			if (!response.ok) {
				error = data.error || 'Login eșuat';
				return;
			}

			if (data.passwordSet) {
				success = data.message || 'Parola a fost setată cu succes!';
			}

			if (data.isNewUser) {
				goto('/dashboard?welcome=true');
			} else {
				goto('/dashboard');
			}
		} catch (err) {
			error = 'Eroare de rețea. Încearcă din nou.';
		} finally {
			loading = false;
		}
	}

	// Forgot password
	async function handleForgotPassword() {
		if (!email) return;
		
		loading = true;
		error = '';
		success = '';

		try {
			const response = await fetch('/api/auth/forgot-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});

			const data = await response.json();

			if (!response.ok) {
				if (data.emailLimitReached) {
					error = 'Limita zilnică de emailuri a fost atinsă. Încearcă mâine.';
					return;
				}
				error = data.message || data.error || 'Nu am putut trimite emailul';
				return;
			}

			success = data.message || 'Verifică emailul pentru link-ul de resetare.';
		} catch (err) {
			error = 'Eroare de rețea. Încearcă din nou.';
		} finally {
			loading = false;
		}
	}

	// Reset password with token
	async function handleResetPassword() {
		if (!newPassword || newPassword.length < 6) {
			error = 'Parola trebuie să aibă minim 6 caractere';
			return;
		}
		
		loading = true;
		error = '';

		try {
			const response = await fetch('/api/auth/reset-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ token: resetToken, password: newPassword })
			});

			const data = await response.json();

			if (!response.ok) {
				error = data.message || data.error || 'Nu am putut reseta parola';
				return;
			}

			success = data.message || 'Parola a fost schimbată!';
			goto('/dashboard');
		} catch (err) {
			error = 'Eroare de rețea. Încearcă din nou.';
		} finally {
			loading = false;
		}
	}

	// Go back to choose
	function goBack() {
		authMode = 'choose';
		otpCode = '';
		password = '';
		error = '';
		success = '';
	}

	// Go to forgot password
	function goToForgotPassword() {
		authMode = 'forgot-password';
		error = '';
		success = '';
	}

	// Format OTP input
	function handleOtpInput(e: Event) {
		const target = e.target as HTMLInputElement;
		otpCode = target.value.replace(/\D/g, '').slice(0, 6);
		
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
			
			{#if authMode === 'choose'}
				<p class="login-subtitle">Alege metoda de autentificare</p>
			{:else if authMode === 'email'}
				<p class="login-subtitle">Introdu emailul pentru a primi un link</p>
			{:else if authMode === 'otp'}
				<p class="login-subtitle">Introdu codul primit pe email</p>
			{:else if authMode === 'password'}
				<p class="login-subtitle">Conectează-te cu email și parolă</p>
			{:else if authMode === 'forgot-password'}
				<p class="login-subtitle">Resetează-ți parola</p>
			{:else if authMode === 'reset-password'}
				<p class="login-subtitle">Setează o parolă nouă</p>
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
		{#if success}
			<div class="success-message">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<span>{success}</span>
			</div>
		{/if}

		<!-- Loading state -->
		{#if checkingEmailStatus}
			<div class="loading-state">
				<span class="spinner"></span>
				<span>Se încarcă...</span>
			</div>

		<!-- Choose Login Method -->
		{:else if authMode === 'choose'}
			<div class="login-options">
				{#if !emailLimitReached && emailConfigured}
					<button type="button" class="option-button" onclick={chooseEmail}>
						<div class="option-icon">
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
							</svg>
						</div>
						<div class="option-content">
							<span class="option-title">Login cu Email</span>
							<span class="option-desc">Primești un link magic pe email</span>
						</div>
						<svg class="option-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
					</button>
				{/if}

				<button type="button" class="option-button" onclick={choosePassword}>
					<div class="option-icon">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
						</svg>
					</div>
					<div class="option-content">
						<span class="option-title">Login cu Parolă</span>
						<span class="option-desc">Folosește email și parolă</span>
					</div>
					<svg class="option-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</button>

				{#if emailLimitReached}
					<div class="info-message" style="margin-top: 1rem;">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span>Limita zilnică de emailuri a fost atinsă. Folosește login cu parolă.</span>
					</div>
				{/if}
			</div>

		<!-- Email Login Form -->
		{:else if authMode === 'email'}
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
						placeholder="exemplu@email.com"
						autocomplete="email"
					/>
				</div>

				<button type="submit" disabled={loading || !email} class="submit-button">
					{#if loading}
						<span class="spinner"></span>
						Se trimite...
					{:else}
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
						</svg>
						Trimite Link de Login
					{/if}
				</button>

				<button type="button" class="back-link" onclick={goBack}>
					← Înapoi
				</button>
			</form>

		<!-- OTP Form -->
		{:else if authMode === 'otp'}
			<form onsubmit={(e) => { e.preventDefault(); handleVerifyOtp(); }} class="login-form">
				<div class="email-display">
					<div class="email-label">Email:</div>
					<div>
						<span class="email-value">{email}</span>
						<button type="button" class="change-email" onclick={goBack}>Schimbă</button>
					</div>
				</div>

				<div class="form-group">
					<label for="otp" class="form-label">Cod din 6 cifre</label>
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

				<button type="submit" disabled={loading || otpCode.length !== 6} class="submit-button">
					{#if loading}
						<span class="spinner"></span>
						Se verifică...
					{:else}
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						Verifică Codul
					{/if}
				</button>

				<button type="button" class="resend-link" onclick={handleSendCode} disabled={loading}>
					Nu ai primit codul? Retrimite
				</button>
			</form>

		<!-- Password Login Form -->
		{:else if authMode === 'password'}
			<form onsubmit={(e) => { e.preventDefault(); handlePasswordLogin(); }} class="login-form">
				<div class="form-group">
					<label for="email-pass" class="form-label">Email</label>
					<input
						type="email"
						id="email-pass"
						bind:value={email}
						bind:this={emailInput}
						required
						class="form-input"
						placeholder="exemplu@email.com"
						autocomplete="email"
					/>
				</div>

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
						placeholder="Introdu parola"
						autocomplete="current-password"
					/>
				</div>

				<button type="submit" disabled={loading || !email || !password || password.length < 6} class="submit-button">
					{#if loading}
						<span class="spinner"></span>
						Se conectează...
					{:else}
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
						</svg>
						Conectare
					{/if}
				</button>

				<div class="form-links">
					{#if !emailLimitReached && emailConfigured}
						<button type="button" class="text-link" onclick={goToForgotPassword}>
							Ai uitat parola?
						</button>
						<button type="button" class="back-link" onclick={goBack}>
							← Înapoi
						</button>
					{/if}
				</div>

				<p class="form-hint">
					Dacă nu ai cont, se va crea automat. Dacă nu ai parolă setată, parola introdusă va deveni parola ta.
				</p>
			</form>

		<!-- Forgot Password Form -->
		{:else if authMode === 'forgot-password'}
			<form onsubmit={(e) => { e.preventDefault(); handleForgotPassword(); }} class="login-form">
				<div class="form-group">
					<label for="email-forgot" class="form-label">Email</label>
					<input
						type="email"
						id="email-forgot"
						bind:value={email}
						required
						class="form-input"
						placeholder="exemplu@email.com"
						autocomplete="email"
					/>
				</div>

				<button type="submit" disabled={loading || !email} class="submit-button">
					{#if loading}
						<span class="spinner"></span>
						Se trimite...
					{:else}
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
						</svg>
						Trimite Link de Resetare
					{/if}
				</button>

				<button type="button" class="back-link" onclick={() => { authMode = 'password'; error = ''; success = ''; }}>
					← Înapoi la login
				</button>
			</form>

		<!-- Reset Password Form (from email link) -->
		{:else if authMode === 'reset-password'}
			<form onsubmit={(e) => { e.preventDefault(); handleResetPassword(); }} class="login-form">
				<div class="form-group">
					<label for="new-password" class="form-label">Parolă nouă (min. 6 caractere)</label>
					<input
						type="password"
						id="new-password"
						bind:value={newPassword}
						bind:this={passwordInput}
						required
						minlength="6"
						class="form-input"
						placeholder="Introdu parola nouă"
						autocomplete="new-password"
					/>
				</div>

				<button type="submit" disabled={loading || !newPassword || newPassword.length < 6} class="submit-button">
					{#if loading}
						<span class="spinner"></span>
						Se salvează...
					{:else}
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						Salvează Parola
					{/if}
				</button>
			</form>
		{/if}

		<!-- Demo Link -->
		<div class="demo-section">
			<span class="demo-divider">sau</span>
			<a href="/demo" class="demo-link">
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				Încearcă Demo (fără cont)
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

	.loading-state {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 2rem;
		color: var(--color-text-muted);
	}

	.login-options {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.option-button {
		display: flex;
		align-items: center;
		gap: 1rem;
		width: 100%;
		padding: 1rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
	}

	.option-button:hover {
		border-color: var(--color-primary);
		background: var(--color-bg-secondary);
	}

	.option-icon {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-primary);
		border-radius: 12px;
		flex-shrink: 0;
	}

	.option-icon svg {
		width: 24px;
		height: 24px;
		color: white;
	}

	.option-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.option-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.option-desc {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	.option-arrow {
		width: 20px;
		height: 20px;
		color: var(--color-text-muted);
		flex-shrink: 0;
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
		padding: 0.875rem 1rem;
		background: var(--color-bg-tertiary);
		border-radius: 8px;
		font-size: 0.875rem;
	}

	.email-label {
		display: block;
		color: var(--color-text-muted);
		font-size: 0.8rem;
		margin-bottom: 0.5rem;
	}

	.email-value {
		display: inline-block;
		color: var(--color-text-primary);
		font-weight: 500;
		font-size: 1rem;
		margin-right: 0.75rem;
	}

	.change-email {
		background: none;
		border: none;
		color: var(--color-primary);
		cursor: pointer;
		font-size: 0.875rem;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		transition: all 0.2s ease;
	}

	.change-email:hover {
		background: rgba(59, 130, 246, 0.1);
		text-decoration: none;
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

	.form-links {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	.text-link {
		background: none;
		border: none;
		color: var(--color-primary);
		cursor: pointer;
		font-size: 0.875rem;
		padding: 0.5rem;
	}

	.text-link:hover {
		text-decoration: underline;
	}

	.form-hint {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		text-align: center;
		margin: 0;
		padding: 0.5rem;
		background: var(--color-bg-tertiary);
		border-radius: 8px;
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
