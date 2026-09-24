/**
 * AT Protocol timestamp identifiers (TIDs): 13 characters of base32-sortable
 * text encoding 53 bits of microseconds since the epoch and a 10-bit clock id.
 * `app.bsky.feed.post` declares `"key": "tid"`, and a PDS refuses a post whose
 * record key is anything else — see https://atproto.com/specs/tid.
 */
import { fnv1a } from './hash';

const S32 = '234567abcdefghijklmnopqrstuvwxyz';

export const TID_RE = /^[234567abcdefghij][234567abcdefghijklmnopqrstuvwxyz]{12}$/;

export function encodeTid(timestampMicros: number, clockId: number): string {
	if (!Number.isSafeInteger(timestampMicros) || timestampMicros < 0) {
		throw new Error('TID timestamp must be a non-negative safe integer');
	}
	let value = (BigInt(timestampMicros) << 10n) | BigInt(clockId & 1023);
	let out = '';
	for (let i = 0; i < 13; i++) {
		out = S32[Number(value & 31n)] + out;
		value >>= 5n;
	}
	return out;
}

/**
 * The record key for one segment of one publish target. It has to be the same
 * on every retry — that is what turns a retry after a lost response into "this
 * record already exists" instead of a second post — so it is derived from the
 * target rather than from the clock at publish time.
 *
 * Targets of one draft share a creation millisecond, but each belongs to a
 * different account (record keys are per repository). The id hash spreads the
 * sub-millisecond part and the clock id so that two targets on the same account
 * created in the same millisecond still get different keys.
 */
export function targetRecordKey(
	targetId: string,
	createdAtMs: number,
	segmentIndex: number
): string {
	const hash = fnv1a(targetId);
	// Segments add to the offset rather than replacing it, so every segment of a
	// thread gets its own key; a short thread stays inside the creation
	// millisecond, which keeps the key sorting where the target was created.
	const offset = (hash % 900) + Math.max(0, Math.floor(segmentIndex));
	const micros = Math.max(0, Math.floor(createdAtMs)) * 1000 + offset;
	return encodeTid(micros, (hash >>> 10) & 1023);
}
