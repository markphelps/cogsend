import type { RequestHandler } from './$types';
import { handleError, ok } from '$lib/server/http';
import { loadInsights } from '$lib/server/insights-report';
import { requireScope, requireUser } from '$lib/server/require';

export const GET: RequestHandler = async ({ locals, url }) => {
	try {
		const user = requireUser(locals.user);
		requireScope(locals, 'read');
		return ok(await loadInsights(locals.db, user.id, url.searchParams.get('days'), user.timezone));
	} catch (err) {
		return handleError(err);
	}
};
