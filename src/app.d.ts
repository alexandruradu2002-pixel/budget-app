// See https://svelte.dev/docs/kit/types#app.d.ts

declare global {
	namespace App {
		interface Error {
			message: string;
			code?: string;
		}
		interface Locals {
			user: {
				userId: number;
				email: string;
				name: string;
				roles: string[];
				isDemo?: boolean;
			} | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
