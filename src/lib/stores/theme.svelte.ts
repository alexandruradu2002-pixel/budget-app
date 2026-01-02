// ============================================
// Theme Store - Manage app themes using Svelte 5 runes
// ============================================

export type ThemeId = 
	| 'midnight-blue' 
	| 'emerald-dark' 
	| 'sunset-orange' 
	| 'royal-purple' 
	| 'ocean-teal'
	| 'rose-pink'
	| 'cyber-neon'
	| 'coffee-brown'
	| 'arctic-blue'
	| 'dracula';

export interface Theme {
	id: ThemeId;
	name: string;
	description: string;
	preview: {
		primary: string;
		bg: string;
		accent: string;
	};
}

export const THEMES: Theme[] = [
	{
		id: 'midnight-blue',
		name: 'Midnight Blue',
		description: 'Tema implicită cu nuanțe de albastru',
		preview: { primary: '#3B82F6', bg: '#0F172A', accent: '#2563EB' }
	},
	{
		id: 'emerald-dark',
		name: 'Emerald Dark',
		description: 'Verde smarald pe fundal întunecat',
		preview: { primary: '#10B981', bg: '#0D1117', accent: '#059669' }
	},
	{
		id: 'sunset-orange',
		name: 'Sunset Orange',
		description: 'Portocaliu cald și vibrant',
		preview: { primary: '#F97316', bg: '#18181B', accent: '#EA580C' }
	},
	{
		id: 'royal-purple',
		name: 'Royal Purple',
		description: 'Violet regal și elegant',
		preview: { primary: '#8B5CF6', bg: '#1A1625', accent: '#7C3AED' }
	},
	{
		id: 'ocean-teal',
		name: 'Ocean Teal',
		description: 'Teal relaxant ca oceanul',
		preview: { primary: '#14B8A6', bg: '#0F1419', accent: '#0D9488' }
	},
	{
		id: 'rose-pink',
		name: 'Rose Pink',
		description: 'Roz romantic și elegant',
		preview: { primary: '#EC4899', bg: '#1A1018', accent: '#DB2777' }
	},
	{
		id: 'cyber-neon',
		name: 'Cyber Neon',
		description: 'Neon futurist cyberpunk',
		preview: { primary: '#00FF88', bg: '#0A0A0F', accent: '#00CC6A' }
	},
	{
		id: 'coffee-brown',
		name: 'Coffee Brown',
		description: 'Maro cald ca o cafea',
		preview: { primary: '#D97706', bg: '#1C1410', accent: '#B45309' }
	},
	{
		id: 'arctic-blue',
		name: 'Arctic Blue',
		description: 'Albastru rece ca ghețarii',
		preview: { primary: '#38BDF8', bg: '#0C1929', accent: '#0EA5E9' }
	},
	{
		id: 'dracula',
		name: 'Dracula',
		description: 'Tema clasică Dracula pentru programatori',
		preview: { primary: '#BD93F9', bg: '#282A36', accent: '#A370F7' }
	}
];

const STORAGE_KEY = 'budget-app-theme';

function createThemeStore() {
	let currentTheme = $state<ThemeId>('midnight-blue');
	let loading = $state(false);

	// Initialize theme - first from localStorage (instant), then from server
	async function init() {
		if (typeof window === 'undefined') return;
		
		// Instant apply from localStorage for fast initial render
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored && THEMES.find(t => t.id === stored)) {
			currentTheme = stored as ThemeId;
			applyTheme(currentTheme);
		}
		
		// Then fetch from server and sync
		await loadFromServer();
	}

	// Load theme from server (database)
	async function loadFromServer() {
		// Skip if on login/public pages (no session)
		const publicPaths = ['/login', '/demo', '/setup', '/'];
		if (typeof window !== 'undefined' && publicPaths.some(p => window.location.pathname === p || window.location.pathname.startsWith('/login'))) {
			return;
		}
		
		loading = true;
		try {
			const response = await fetch('/api/user/settings');
			if (response.ok) {
				const data = await response.json();
				if (data.theme && THEMES.find(t => t.id === data.theme)) {
					currentTheme = data.theme as ThemeId;
					localStorage.setItem(STORAGE_KEY, currentTheme);
					applyTheme(currentTheme);
				}
			}
		} catch (err) {
			console.error('Failed to load theme from server:', err);
		} finally {
			loading = false;
		}
	}

	// Set theme and save to both localStorage and server
	async function setTheme(themeId: ThemeId) {
		currentTheme = themeId;
		applyTheme(themeId);
		
		if (typeof window !== 'undefined') {
			// Save to localStorage immediately for persistence
			localStorage.setItem(STORAGE_KEY, themeId);
			
			// Save to server (database)
			try {
				await fetch('/api/user/settings', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ theme: themeId })
				});
			} catch (err) {
				console.error('Failed to save theme to server:', err);
			}
		}
	}

	function applyTheme(themeId: ThemeId) {
		if (typeof document === 'undefined') return;
		
		// Remove all theme classes
		document.documentElement.classList.remove(
			'theme-midnight-blue',
			'theme-emerald-dark',
			'theme-sunset-orange',
			'theme-royal-purple',
			'theme-ocean-teal',
			'theme-rose-pink',
			'theme-cyber-neon',
			'theme-coffee-brown',
			'theme-arctic-blue',
			'theme-dracula'
		);
		
		// Add current theme class
		document.documentElement.classList.add(`theme-${themeId}`);
	}

	function getThemeInfo(themeId: ThemeId): Theme | undefined {
		return THEMES.find(t => t.id === themeId);
	}

	return {
		get current() {
			return currentTheme;
		},
		get loading() {
			return loading;
		},
		get currentThemeInfo() {
			return THEMES.find(t => t.id === currentTheme);
		},
		get themes() {
			return THEMES;
		},
		init,
		setTheme,
		getThemeInfo
	};
}

export const themeStore = createThemeStore();
