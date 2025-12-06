// ============================================
// Keyboard Size Store - Manage calculator keyboard size
// ============================================

export type KeyboardSize = 1 | 2 | 3 | 4 | 5;

export interface KeyboardSizeOption {
	value: KeyboardSize;
	label: string;
	height: number; // Height in pixels for calc buttons
}

export const KEYBOARD_SIZES: KeyboardSizeOption[] = [
	{ value: 1, label: 'XS', height: 36 },
	{ value: 2, label: 'S', height: 40 },
	{ value: 3, label: 'M', height: 44 },
	{ value: 4, label: 'L', height: 52 },
	{ value: 5, label: 'XL', height: 60 }
];

const STORAGE_KEY = 'budget-app-keyboard-size';
const DEFAULT_SIZE: KeyboardSize = 3;

function createKeyboardStore() {
	let currentSize = $state<KeyboardSize>(DEFAULT_SIZE);
	let loading = $state(false);

	// Initialize from localStorage
	function init() {
		if (typeof window === 'undefined') return;
		
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = parseInt(stored, 10);
			if (parsed >= 1 && parsed <= 5) {
				currentSize = parsed as KeyboardSize;
			}
		}
	}

	// Set size and save to localStorage
	function setSize(size: KeyboardSize) {
		currentSize = size;
		
		if (typeof window !== 'undefined') {
			localStorage.setItem(STORAGE_KEY, size.toString());
		}
	}

	function getSizeOption(size: KeyboardSize): KeyboardSizeOption | undefined {
		return KEYBOARD_SIZES.find(s => s.value === size);
	}

	return {
		get current() {
			return currentSize;
		},
		get loading() {
			return loading;
		},
		get currentSizeOption() {
			return KEYBOARD_SIZES.find(s => s.value === currentSize);
		},
		get sizes() {
			return KEYBOARD_SIZES;
		},
		get buttonHeight() {
			return KEYBOARD_SIZES.find(s => s.value === currentSize)?.height ?? 44;
		},
		init,
		setSize,
		getSizeOption
	};
}

export const keyboardStore = createKeyboardStore();
