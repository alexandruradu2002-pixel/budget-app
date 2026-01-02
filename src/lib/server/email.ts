// Email service using Resend
import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

// Initialize Resend client (lazy - only when API key is available)
let resend: Resend | null = null;

function getResendClient(): Resend | null {
	if (!env.RESEND_API_KEY) {
		return null;
	}
	if (!resend) {
		resend = new Resend(env.RESEND_API_KEY);
	}
	return resend;
}

// ============================================
// Email Configuration
// ============================================
const EMAIL_FROM = env.EMAIL_FROM || 'Budget App <onboarding@resend.dev>';
const APP_NAME = env.APP_NAME || 'Budget App';
const APP_URL = env.APP_URL || 'http://localhost:5173';

// ============================================
// Daily Email Rate Limiting (Resend Free Tier)
// ============================================
// Resend Free: 100 emails/day, 3000 emails/month
const DEFAULT_DAILY_EMAIL_LIMIT = 100;

interface DailyEmailCount {
	count: number;
	date: string; // YYYY-MM-DD
}

// In-memory daily email counter (resets at midnight)
let dailyEmailCount: DailyEmailCount = {
	count: 0,
	date: new Date().toISOString().split('T')[0]
};

function getDailyEmailLimit(): number {
	const limit = env.DAILY_EMAIL_LIMIT;
	if (limit === '0' || limit === 'unlimited') {
		return Infinity; // Paid plans - no limit
	}
	if (limit) {
		const parsed = parseInt(limit, 10);
		if (!isNaN(parsed) && parsed > 0) return parsed;
	}
	return DEFAULT_DAILY_EMAIL_LIMIT;
}

function getCurrentDate(): string {
	return new Date().toISOString().split('T')[0];
}

function canSendEmail(): boolean {
	const today = getCurrentDate();
	
	// Reset counter if it's a new day
	if (dailyEmailCount.date !== today) {
		dailyEmailCount = { count: 0, date: today };
	}
	
	const limit = getDailyEmailLimit();
	return dailyEmailCount.count < limit;
}

function incrementEmailCount(): void {
	const today = getCurrentDate();
	
	if (dailyEmailCount.date !== today) {
		dailyEmailCount = { count: 1, date: today };
	} else {
		dailyEmailCount.count++;
	}
}

export function getEmailStats(): { sent: number; limit: number; remaining: number; date: string } {
	const today = getCurrentDate();
	if (dailyEmailCount.date !== today) {
		dailyEmailCount = { count: 0, date: today };
	}
	
	const limit = getDailyEmailLimit();
	return {
		sent: dailyEmailCount.count,
		limit: limit === Infinity ? -1 : limit, // -1 indicates unlimited
		remaining: limit === Infinity ? -1 : Math.max(0, limit - dailyEmailCount.count),
		date: today
	};
}

// ============================================
// Check if email limit is reached
// ============================================
export function isEmailLimitReached(): boolean {
	return !canSendEmail();
}

// ============================================
// Check if email is configured
// ============================================
export function isEmailConfigured(): boolean {
	return !!env.RESEND_API_KEY;
}

// ============================================
// Send Magic Link Email
// ============================================
export async function sendMagicLinkEmail(
	email: string,
	token: string,
	otp: string
): Promise<{ success: boolean; error?: string }> {
	const client = getResendClient();
	
	if (!client) {
		console.warn('⚠️ Email not configured - RESEND_API_KEY missing');
		return { success: false, error: 'Email service not configured' };
	}

	// Check daily email limit (Resend free tier: 100/day)
	if (!canSendEmail()) {
		const stats = getEmailStats();
		console.warn(`⚠️ Daily email limit reached: ${stats.sent}/${stats.limit}`);
		return { success: false, error: 'Daily email limit reached. Please try again tomorrow.' };
	}

	const magicLinkUrl = `${APP_URL}/api/auth/verify?token=${token}`;
	
	try {
		const { error } = await client.emails.send({
			from: EMAIL_FROM,
			to: email,
			subject: `Sign in to ${APP_NAME}`,
			html: `
				<!DOCTYPE html>
				<html>
				<head>
					<meta charset="utf-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<title>Sign in to ${APP_NAME}</title>
				</head>
				<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
					<div style="text-align: center; margin-bottom: 30px;">
						<h1 style="color: #3B82F6; margin: 0;">${APP_NAME}</h1>
					</div>
					
					<div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
						<h2 style="margin-top: 0; color: #1e293b;">Sign in to your account</h2>
						<p style="color: #64748b; margin-bottom: 25px;">
							Click the button below to sign in. This link expires in 15 minutes.
						</p>
						
						<div style="text-align: center; margin: 30px 0;">
							<a href="${magicLinkUrl}" 
							   style="display: inline-block; background: #3B82F6; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
								Sign In to ${APP_NAME}
							</a>
						</div>
						
						<div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px;">
							<p style="color: #64748b; font-size: 14px; margin-bottom: 10px;">
								Or enter this code manually:
							</p>
							<div style="text-align: center; background: white; border: 2px solid #e2e8f0; border-radius: 8px; padding: 15px; font-size: 32px; font-weight: bold; letter-spacing: 8px; font-family: monospace; color: #1e293b;">
								${otp}
							</div>
						</div>
					</div>
					
					<div style="color: #94a3b8; font-size: 13px; text-align: center;">
						<p style="margin-bottom: 5px;">
							If you didn't request this email, you can safely ignore it.
						</p>
						<p style="margin: 0;">
							This link expires in 15 minutes for security.
						</p>
					</div>
				</body>
				</html>
			`,
			text: `
Sign in to ${APP_NAME}

Click this link to sign in (expires in 15 minutes):
${magicLinkUrl}

Or enter this code manually: ${otp}

If you didn't request this email, you can safely ignore it.
			`.trim()
		});

		if (error) {
			console.error('Failed to send email:', error);
			return { success: false, error: error.message };
		}

		// Increment counter only on successful send
		incrementEmailCount();
		return { success: true };
	} catch (err) {
		console.error('Email send error:', err);
		return { success: false, error: 'Failed to send email' };
	}
}

// ============================================
// Send Welcome Email (optional - for new users)
// ============================================
export async function sendWelcomeEmail(
	email: string,
	name: string
): Promise<{ success: boolean; error?: string }> {
	const client = getResendClient();
	
	if (!client) {
		return { success: false, error: 'Email service not configured' };
	}

	// Check daily email limit (Resend free tier: 100/day)
	if (!canSendEmail()) {
		// Welcome email is optional, silently fail if limit reached
		console.warn('⚠️ Skipping welcome email - daily limit reached');
		return { success: false, error: 'Daily email limit reached' };
	}

	try {
		const { error } = await client.emails.send({
			from: EMAIL_FROM,
			to: email,
			subject: `Welcome to ${APP_NAME}!`,
			html: `
				<!DOCTYPE html>
				<html>
				<head>
					<meta charset="utf-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
				</head>
				<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
					<div style="text-align: center; margin-bottom: 30px;">
						<h1 style="color: #3B82F6; margin: 0;">${APP_NAME}</h1>
					</div>
					
					<div style="background: #f8fafc; border-radius: 12px; padding: 30px;">
						<h2 style="margin-top: 0; color: #1e293b;">Welcome, ${name}! 🎉</h2>
						<p style="color: #64748b;">
							Your account has been created. You can now start tracking your finances!
						</p>
						
						<div style="text-align: center; margin: 30px 0;">
							<a href="${APP_URL}/dashboard" 
							   style="display: inline-block; background: #3B82F6; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">
								Go to Dashboard
							</a>
						</div>
					</div>
				</body>
				</html>
			`
		});

		if (error) {
			return { success: false, error: error.message };
		}

		// Increment counter only on successful send
		incrementEmailCount();
		return { success: true };
	} catch (err) {
		console.error('Welcome email error:', err);
		return { success: false, error: 'Failed to send welcome email' };
	}
}

// ============================================
// Send Password Reset Email
// ============================================
export async function sendPasswordResetEmail(
	email: string,
	token: string
): Promise<{ success: boolean; error?: string }> {
	const client = getResendClient();
	
	if (!client) {
		console.warn('⚠️ Email not configured - RESEND_API_KEY missing');
		return { success: false, error: 'Email service not configured' };
	}

	// Check daily email limit
	if (!canSendEmail()) {
		const stats = getEmailStats();
		console.warn(`⚠️ Daily email limit reached: ${stats.sent}/${stats.limit}`);
		return { success: false, error: 'Daily email limit reached. Please try again tomorrow.' };
	}

	const resetUrl = `${APP_URL}/login?reset_token=${token}`;
	
	try {
		const { error } = await client.emails.send({
			from: EMAIL_FROM,
			to: email,
			subject: `Reset your ${APP_NAME} password`,
			html: `
				<!DOCTYPE html>
				<html>
				<head>
					<meta charset="utf-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<title>Reset your password</title>
				</head>
				<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
					<div style="text-align: center; margin-bottom: 30px;">
						<h1 style="color: #3B82F6; margin: 0;">${APP_NAME}</h1>
					</div>
					
					<div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
						<h2 style="margin-top: 0; color: #1e293b;">Resetează parola</h2>
						<p style="color: #64748b; margin-bottom: 25px;">
							Ai primit acest email pentru că ai cerut resetarea parolei. Link-ul expiră în 15 minute.
						</p>
						
						<div style="text-align: center; margin: 30px 0;">
							<a href="${resetUrl}" 
							   style="display: inline-block; background: #3B82F6; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
								Resetează Parola
							</a>
						</div>
					</div>
					
					<div style="color: #94a3b8; font-size: 13px; text-align: center;">
						<p style="margin-bottom: 5px;">
							Dacă nu ai cerut resetarea parolei, poți ignora acest email.
						</p>
						<p style="margin: 0;">
							Link-ul expiră în 15 minute pentru securitate.
						</p>
					</div>
				</body>
				</html>
			`,
			text: `
Resetează parola pentru ${APP_NAME}

Accesează acest link pentru a-ți reseta parola (expiră în 15 minute):
${resetUrl}

Dacă nu ai cerut resetarea parolei, poți ignora acest email.
			`.trim()
		});

		if (error) {
			console.error('Failed to send password reset email:', error);
			return { success: false, error: error.message };
		}

		// Increment counter only on successful send
		incrementEmailCount();
		return { success: true };
	} catch (err) {
		console.error('Password reset email error:', err);
		return { success: false, error: 'Failed to send password reset email' };
	}
}
