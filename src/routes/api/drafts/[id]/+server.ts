import type { RequestHandler } from './$types';
import { handleError, fail, ok } from '$lib/server/http';
import { requireScope, requireUser } from '$lib/server/require';
import { deleteDraft, getDraft, updateDraft } from '$lib/server/api/operations';

export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		const user = requireUser(locals.user);
		requireScope(locals, 'read');
		return ok(await getDraft(locals, user.id, params.id));
	} catch (err) {
		return handleError(err);
	}
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	try {
		const user = requireUser(locals.user);
		requireScope(locals, 'write');
		const body = await request.json().catch(() => null);
		if (!body || typeof body !== 'object') return fail('Invalid JSON body', 400);
		return ok(await updateDraft(locals, user.id, params.id, body as Record<string, unknown>));
	} catch (err) {
		return handleError(err);
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		const user = requireUser(locals.user);
		requireScope(locals, 'write');
		return ok(await deleteDraft(locals, user.id, params.id));
	} catch (err) {
		return handleError(err);
	}
};
