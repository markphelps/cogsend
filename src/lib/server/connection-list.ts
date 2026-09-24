import { and, desc, eq, ne } from 'drizzle-orm';
import { platformConfigured } from '$lib/domain/platform-setup';
import type { AppEnv } from './env';
import type { AppDb } from './db/client';
import { connections } from './db/schema';
import { serializeConnection } from './serialize';

/** Accounts the UI and `GET /api/connections` both show. Same payload either way. */
export async function listConnections(db: AppDb, env: AppEnv, userId: string) {
	const rows = await db
		.select({
			id: connections.id,
			platform: connections.platform,
			displayName: connections.displayName,
			handle: connections.handle,
			avatarUrl: connections.avatarUrl,
			instanceUrl: connections.instanceUrl,
			status: connections.status,
			metaJson: connections.metaJson,
			createdAt: connections.createdAt
		})
		.from(connections)
		.where(and(eq(connections.userId, userId), ne(connections.status, 'disconnected')))
		.orderBy(desc(connections.createdAt));
	const secrets = {
		LINKEDIN_CLIENT_ID: Boolean(env.LINKEDIN_CLIENT_ID),
		LINKEDIN_CLIENT_SECRET: Boolean(env.LINKEDIN_CLIENT_SECRET),
		THREADS_APP_ID: Boolean(env.THREADS_APP_ID),
		THREADS_APP_SECRET: Boolean(env.THREADS_APP_SECRET),
		X_CLIENT_ID: Boolean(env.X_CLIENT_ID),
		X_CLIENT_SECRET: Boolean(env.X_CLIENT_SECRET)
	};
	const configured = {
		linkedin: platformConfigured('linkedin', secrets),
		threads: platformConfigured('threads', secrets),
		x: platformConfigured('x', secrets)
	};
	return {
		connections: rows.map(serializeConnection),
		configured,
		secrets,
		appUrl: env.APP_URL
	};
}
