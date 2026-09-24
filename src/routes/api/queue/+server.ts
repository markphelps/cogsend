import type { RequestHandler } from './$types';
import { handleError, ok } from '$lib/server/http';
import {
	QUEUE_LIST_LIMIT,
	QUEUE_LIST_MAX_LIMIT,
	loadQueueList,
	parseListLimit
} from '$lib/server/post-list';
import { requireScope, requireUser } from '$lib/server/require';

export const GET: RequestHandler = async ({ locals, url }) => {
	try {
		const user = requireUser(locals.user);
		requireScope(locals, 'read');
		const limit = parseListLimit(
			url?.searchParams.get('limit'),
			QUEUE_LIST_LIMIT,
			QUEUE_LIST_MAX_LIMIT
		);
		return ok(await loadQueueList(locals.db, user.id, limit));
	} catch (err) {
		return handleError(err);
	}
};
