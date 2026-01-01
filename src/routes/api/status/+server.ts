// Instance status endpoint - public info about this instance
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserCap, getCurrentUserCount } from '$lib/server/auth';
import { isEmailConfigured } from '$lib/server/email';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async () => {
	const userCap = getUserCap();
	const currentUsers = await getCurrentUserCount();
	const emailConfigured = isEmailConfigured();
	const allowDemo = env.ALLOW_DEMO === 'true';
	const isUnlimited = env.USER_CAP === '0' || env.USER_CAP === 'unlimited';
	
	return json({
		// Auth mode
		authMode: emailConfigured ? 'email' : 'password',
		
		// User capacity
		users: {
			current: currentUsers,
			cap: isUnlimited ? null : userCap,
			unlimited: isUnlimited,
			available: isUnlimited ? true : currentUsers < userCap
		},
		
		// Features
		features: {
			demo: allowDemo,
			emailAuth: emailConfigured
		},
		
		// Version info
		version: '1.0.0'
	});
};
