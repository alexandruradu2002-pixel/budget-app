// ============================================
// Toast Store - Global notifications using Svelte 5 runes
// ============================================

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
	id: string;
	type: ToastType;
	message: string;
	duration: number;
}

// Create reactive state using Svelte 5 runes pattern
function createToastStore() {
	let toasts = $state<Toast[]>([]);

	function add(message: string, type: ToastType = 'info', duration = 3000) {
		const id = crypto.randomUUID();
		const toast: Toast = { id, type, message, duration };
		
		toasts = [...toasts, toast];

		if (duration > 0) {
			setTimeout(() => remove(id), duration);
		}

		return id;
	}

	function remove(id: string) {
		toasts = toasts.filter((t) => t.id !== id);
	}

	function clear() {
		toasts = [];
	}

	// Convenience methods
	function success(message: string, duration = 3000) {
		return add(message, 'success', duration);
	}

	function error(message: string, duration = 5000) {
		return add(message, 'error', duration);
	}

	function warning(message: string, duration = 4000) {
		return add(message, 'warning', duration);
	}

	function info(message: string, duration = 3000) {
		return add(message, 'info', duration);
	}

	return {
		get items() {
			return toasts;
		},
		add,
		remove,
		clear,
		success,
		error,
		warning,
		info
	};
}

export const toast = createToastStore();
