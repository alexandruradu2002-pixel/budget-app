<script lang="ts">
	import { goto } from '$app/navigation';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleLogin() {
		loading = true;
		error = '';

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ email, password })
			});

			const data = await response.json();

			if (!response.ok) {
				error = data.error || 'Login failed';
				return;
			}

			goto('/dashboard');
		} catch (err) {
			error = 'Network error. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center p-4">
	<div class="max-w-md w-full space-y-8 bg-[var(--color-bg-secondary)] p-8 rounded-lg border border-[var(--color-border)]">
		<div>
			<h2 class="text-3xl font-bold text-[var(--color-text-primary)]">Login</h2>
			<p class="mt-2 text-[var(--color-text-muted)]">Sign in to your budget account</p>
		</div>

		<form onsubmit={(e) => { e.preventDefault(); handleLogin(); }} class="space-y-6">
			{#if error}
				<div class="p-3 bg-[var(--color-danger)] bg-opacity-10 border border-[var(--color-danger)] rounded-lg text-[var(--color-danger)] text-sm">
					{error}
				</div>
			{/if}

			<div>
				<label for="email" class="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
					Email
				</label>
				<input
					type="email"
					id="email"
					bind:value={email}
					required
					class="w-full px-4 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
				/>
			</div>

			<div>
				<label for="password" class="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
					Password
				</label>
				<input
					type="password"
					id="password"
					bind:value={password}
					required
					class="w-full px-4 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
				/>
			</div>

			<button
				type="submit"
				disabled={loading}
				class="w-full py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
			>
				{loading ? 'Signing in...' : 'Sign In'}
			</button>
		</form>

		<div class="text-center text-sm text-[var(--color-text-muted)]">
			Don't have an account?
			<a href="/signup" class="text-[var(--color-primary)] hover:underline">Sign up</a>
		</div>
	</div>
</div>
