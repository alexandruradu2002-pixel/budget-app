// ============================================
// User Store - Session state using Svelte 5 runes
// ============================================

interface UserSession {
	userId: number;
	email: string;
	name: string;
	roles: string[];
}

function createUserStore() {
	let user = $state<UserSession | null>(null);
	let loading = $state(true);

	async function load() {
		loading = true;
		try {
			const response = await fetch('/api/auth/me');
			if (response.ok) {
				user = await response.json();
			} else {
				user = null;
			}
		} catch {
			user = null;
		} finally {
			loading = false;
		}
	}

	async function logout() {
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
			user = null;
		} catch (e) {
			console.error('Logout failed:', e);
		}
	}

	function set(session: UserSession) {
		user = session;
		loading = false;
	}

	function clear() {
		user = null;
	}

	return {
		get current() {
			return user;
		},
		get isLoading() {
			return loading;
		},
		get isAuthenticated() {
			return user !== null;
		},
		get isAdmin() {
			return user?.roles.includes('admin') ?? false;
		},
		load,
		logout,
		set,
		clear
	};
}

export const userStore = createUserStore();
