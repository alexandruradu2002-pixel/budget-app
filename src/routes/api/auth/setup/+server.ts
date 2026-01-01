// Setup endpoint - Initial password configuration for self-hosted instances
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import db from '$lib/server/db';
import crypto from 'crypto';
import { resetAppConfiguredCache } from '../../../../hooks.server';

// ============================================
// Hash password using SHA-256 with salt
// ============================================
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
	const useSalt = salt || crypto.randomBytes(16).toString('hex');
	const hash = crypto.createHash('sha256').update(password + useSalt).digest('hex');
	return { hash, salt: useSalt };
}

// ============================================
// GET - Check if setup is required
// ============================================
export const GET: RequestHandler = async () => {
	try {
		const result = await db.execute({
			sql: "SELECT value FROM app_config WHERE key = 'password_hash'",
			args: []
		});

		const isConfigured = result.rows.length > 0;

		return json({
			isConfigured,
			message: isConfigured 
				? 'App is configured and ready to use' 
				: 'Initial setup required - please set your password'
		});
	} catch (error) {
		console.error('Setup check error:', error);
		return json({ isConfigured: false, message: 'Setup required' });
	}
};

// ============================================
// POST - Set initial password (only works if not configured)
// ============================================
export const POST: RequestHandler = async ({ request }) => {
	try {
		// Check if already configured
		const existingConfig = await db.execute({
			sql: "SELECT value FROM app_config WHERE key = 'password_hash'",
			args: []
		});

		if (existingConfig.rows.length > 0) {
			return json(
				{ error: 'App is already configured. Use the password reset process to change your password.' },
				{ status: 400 }
			);
		}

		const { password, confirmPassword } = await request.json();

		// Validate password
		if (!password || password.length < 6) {
			return json(
				{ error: 'Password must be at least 6 characters long' },
				{ status: 400 }
			);
		}

		if (password !== confirmPassword) {
			return json(
				{ error: 'Passwords do not match' },
				{ status: 400 }
			);
		}

		// Hash password
		const { hash, salt } = hashPassword(password);

		// Store password hash and salt
		await db.execute({
			sql: `INSERT INTO app_config (key, value) VALUES ('password_hash', ?)`,
			args: [hash]
		});

		await db.execute({
			sql: `INSERT INTO app_config (key, value) VALUES ('password_salt', ?)`,
			args: [salt]
		});

		// Also ensure default user exists
		const userResult = await db.execute({
			sql: 'SELECT id FROM users WHERE id = 1',
			args: []
		});

		if (userResult.rows.length === 0) {
			await db.execute({
				sql: `INSERT INTO users (id, email, name, password_hash, roles) 
				      VALUES (1, 'user@budget.app', 'User', ?, '["user"]')`,
				args: [hash]
			});
		}

		// Reset cached configuration status so hooks.server.ts redirects correctly
		resetAppConfiguredCache();

		console.log('✅ Initial setup completed - password configured');

		return json({
			success: true,
			message: 'Password set successfully! You can now log in.'
		});
	} catch (error) {
		console.error('Setup error:', error);
		return json(
			{ error: 'Failed to complete setup' },
			{ status: 500 }
		);
	}
};
