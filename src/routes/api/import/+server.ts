// API Route: /api/import
// Handle YNAB CSV import

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware';
import { importYNABData, analyzeYNABRegister } from '$lib/server/import-ynab';

// POST /api/import - Import YNAB data
export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);

	try {
		const formData = await event.request.formData();
		const registerFile = formData.get('register') as File | null;
		const planFile = formData.get('plan') as File | null;
		const analyzeOnly = formData.get('analyzeOnly') === 'true';

		if (!registerFile) {
			return json({ error: 'Register CSV file is required' }, { status: 400 });
		}

		// Read CSV content
		const registerCSV = await registerFile.text();
		const planCSV = planFile ? await planFile.text() : undefined;

		// If analyze only, return preview data
		if (analyzeOnly) {
			const analysis = analyzeYNABRegister(registerCSV);
			return json({
				success: true,
				analysis
			});
		}

		// Import data
		const result = await importYNABData(user.userId, registerCSV, planCSV);

		if (!result.success) {
			return json(
				{
					error: 'Import failed',
					details: result.errors
				},
				{ status: 500 }
			);
		}

		return json({
			success: true,
			result
		});
	} catch (error) {
		console.error('Import API error:', error);
		return json(
			{
				error: error instanceof Error ? error.message : 'Failed to import data'
			},
			{ status: 500 }
		);
	}
};

// GET /api/import - Get import instructions/info
export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	return json({
		instructions: {
			title: 'YNAB Import',
			description: 'Import your budget data from YNAB (You Need A Budget)',
			steps: [
				'In YNAB, go to your budget and click "Export Budget"',
				'Download both the "Register" and "Plan" CSV files',
				'Upload the Register.csv file (required)',
				'Optionally upload the Plan.csv file for budget data',
				'Click Import to process your data'
			],
			supportedFiles: {
				register: {
					name: 'Register.csv',
					description: 'Contains all transactions',
					required: true
				},
				plan: {
					name: 'Plan.csv',
					description: 'Contains budget allocations per category/month',
					required: false
				}
			}
		}
	});
};
