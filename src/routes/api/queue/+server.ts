import type { RequestHandler } from './$types';
import { handleError, ok } from '$lib/server/http';
import { requireScope, requireUser } from '$lib/server/require';
import { listQueue } from '$lib/server/api/operations';

export const GET: RequestHandler = async ({ locals, url }) => {
	try {
		const user = requireUser(locals.user);
		requireScope(locals, 'read');
		const requested = parseInt(url?.searchParams.get('limit') ?? '', 10);
		return ok(await listQueue(locals, user.id, requested));
	} catch (error) {
		return handleError(error);
	}
};
