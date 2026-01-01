// Server-side data loading for demo page
import type { PageServerLoad } from './$types';
import {
	generateDemoAccounts,
	generateDemoCategories,
	generateDemoTransactions,
	generateDemoStats,
	generateDemoBudgets,
	generateDemoSpendingByCategory
} from '$lib/server/demo-data';

export const load: PageServerLoad = async () => {
	return {
		accounts: generateDemoAccounts(),
		categories: generateDemoCategories(),
		transactions: generateDemoTransactions(90),
		stats: generateDemoStats(),
		budgets: generateDemoBudgets(),
		spending: generateDemoSpendingByCategory()
	};
};
