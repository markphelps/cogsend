import type { RequestHandler } from './$types';
import { handleError, ok } from '$lib/server/http';
import { requireScope, requireUser } from '$lib/server/require';
import { publishDraft } from '$lib/server/api/operations';

export const POST: RequestHandler = async ({ params, request, locals, platform }) => {
	try {
		const user = requireUser(locals.user);
		requireScope(locals, 'write');
		const body = await request.json().catch(() => null);
		const context = platform?.ctx?.waitUntil
			? {
					...locals,
					waitUntil: (promise: Promise<unknown>) =>
						platform.ctx.waitUntil(promise.then(() => undefined))
				}
			: locals;
		return ok(await publishDraft(context, user.id, params.id, body));
	} catch (error) {
		return handleError(error);
	}
};
