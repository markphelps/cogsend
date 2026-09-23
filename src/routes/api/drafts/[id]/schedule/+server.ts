import type { RequestHandler } from './$types';
import { fail, handleError, ok } from '$lib/server/http';
import { requireScope, requireUser } from '$lib/server/require';
import { scheduleDraft } from '$lib/server/api/operations';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	try {
		const user = requireUser(locals.user);
		requireScope(locals, 'write');
		const body = await request.json().catch(() => null);
		if (!body || typeof body !== 'object') return fail('Invalid JSON body', 400);
		return ok(
			await scheduleDraft(
				locals,
				user.id,
				params.id,
				body as { connectionIds?: unknown; runAt?: unknown }
			)
		);
	} catch (err) {
		return handleError(err);
	}
};
