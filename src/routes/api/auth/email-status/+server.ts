// Check email service status endpoint
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isEmailConfigured, isEmailLimitReached, getEmailStats } from '$lib/server/email';

export const GET: RequestHandler = async () => {
	const configured = isEmailConfigured();
	const limitReached = configured ? isEmailLimitReached() : true;
	const stats = getEmailStats();

	return json({
		configured,
		limitReached,
		stats: {
			sent: stats.sent,
			limit: stats.limit,
			remaining: stats.remaining
		}
	});
};
