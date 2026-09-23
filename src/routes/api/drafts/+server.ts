import type { RequestHandler } from './$types';
import { fail, handleError, ok } from '$lib/server/http';
import { requireScope, requireUser } from '$lib/server/require';
import { createDraft, listDrafts } from '$lib/server/api/operations';

export const GET: RequestHandler = async ({ locals, url }) => {
	try {
		const user = requireUser(locals.user);
		requireScope(locals, 'read');
		const requested = parseInt(url?.searchParams.get('limit') ?? '', 10);
		return ok(await listDrafts(locals, user.id, requested));
	} catch (error) {
		return handleError(error);
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const user = requireUser(locals.user);
		requireScope(locals, 'write');
		const raw = await request.text().catch(() => '');
		let body: unknown = {};
		if (raw.trim()) {
			try {
				body = JSON.parse(raw);
			} catch {
				return fail('Invalid JSON body', 400);
			}
		}
		if (!body || typeof body !== 'object') return fail('Invalid JSON body', 400);
		const result = await createDraft(locals, user.id, body as Record<string, unknown>);
		return ok(result, 201);
	} catch (error) {
		return handleError(error);
	}
};
