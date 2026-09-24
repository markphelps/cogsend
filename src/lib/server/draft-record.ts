import { and, eq, inArray, type InferSelectModel } from 'drizzle-orm';
import { batchQueries, chunkIds, type AppDb } from './db/client';
import { connections, draftMedia, drafts, draftVariants, publishTargets } from './db/schema';
import { serializeDraft } from './serialize';

/** One draft plus its variants, media, and targets. Null when it is not this user's. */
export async function loadOwnedDraft(db: AppDb, id: string, userId: string) {
	type TargetRow = InferSelectModel<typeof publishTargets>;
	const [draftRows, variants, media, targets] = (await batchQueries(db, [
		db
			.select()
			.from(drafts)
			.where(and(eq(drafts.id, id), eq(drafts.userId, userId))),
		db.select().from(draftVariants).where(eq(draftVariants.draftId, id)),
		db.select().from(draftMedia).where(eq(draftMedia.draftId, id)),
		db.select().from(publishTargets).where(eq(publishTargets.draftId, id))
	])) as [
		InferSelectModel<typeof drafts>[],
		InferSelectModel<typeof draftVariants>[],
		InferSelectModel<typeof draftMedia>[],
		TargetRow[]
	];
	const draft = draftRows[0];
	if (!draft) return null;
	media.sort((a, b) => a.sortOrder - b.sortOrder);
	const connIds = [...new Set(targets.map((t) => t.connectionId))];
	type ConnRow = {
		id: string;
		platform: string;
		handle: string | null;
		displayName: string | null;
	};
	// Chunked like every other id list: a draft with more than 100 targets
	// would otherwise exceed D1's bound-parameter cap.
	const connQueries = chunkIds(connIds).map((chunk) =>
		db
			.select({
				id: connections.id,
				platform: connections.platform,
				handle: connections.handle,
				displayName: connections.displayName
			})
			.from(connections)
			.where(inArray(connections.id, chunk))
	);
	const connRows: ConnRow[] = connIds.length
		? ((await batchQueries(db, connQueries)) as ConnRow[][]).flat()
		: [];
	const connById = new Map(connRows.map((c) => [c.id, c]));
	const withConn = targets.map((t) => ({ ...t, connection: connById.get(t.connectionId) }));
	return serializeDraft(draft, { variants, media, targets: withConn });
}
