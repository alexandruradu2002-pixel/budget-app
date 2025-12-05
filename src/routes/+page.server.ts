import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Return auth status for client-side handling
	// This allows the page to be cached by service worker
	return {
		isAuthenticated: !!locals.user
	};
};
