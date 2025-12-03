import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Redirect to login if not authenticated, otherwise go to plan
	if (!locals.user) {
		redirect(307, '/login');
	}
	redirect(307, '/plan');
};
