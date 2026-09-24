import { describe, expect, it } from 'vitest';
import { encodeTid, targetRecordKey, TID_RE } from '$lib/domain/tid';

describe('encodeTid', () => {
	it('matches the reference encoding from the AT Protocol spec', () => {
		// Zero is the all-'2' TID, and the clock id fills the last two characters.
		expect(encodeTid(0, 0)).toBe('2222222222222');
		expect(encodeTid(0, 1)).toBe('2222222222223');
		expect(encodeTid(0, 1023)).toBe('22222222222zz');
		expect(encodeTid(1, 0)).toBe('2222222222322');
	});

	it('always yields valid TID syntax for real timestamps', () => {
		for (const ms of [0, Date.UTC(2023, 0, 1), Date.UTC(2026, 8, 24), Date.UTC(2200, 0, 1)]) {
			expect(encodeTid(ms * 1000, 512)).toMatch(TID_RE);
		}
	});

	it('sorts in timestamp order', () => {
		const a = encodeTid(Date.UTC(2026, 0, 1) * 1000, 900);
		const b = encodeTid(Date.UTC(2026, 0, 1) * 1000 + 1, 3);
		expect(a < b).toBe(true);
	});

	it('rejects timestamps it cannot encode', () => {
		expect(() => encodeTid(-1, 0)).toThrow();
		expect(() => encodeTid(Number.MAX_SAFE_INTEGER + 1, 0)).toThrow();
	});
});

describe('targetRecordKey', () => {
	const created = Date.UTC(2026, 8, 24, 12, 0, 0);

	it('is stable for the same target and segment, so a retry reuses the key', () => {
		expect(targetRecordKey('t-1', created, 0)).toBe(targetRecordKey('t-1', created, 0));
		expect(targetRecordKey('t-1', created, 0)).toMatch(TID_RE);
	});

	it('differs per segment and per target, even within one millisecond', () => {
		const keys = new Set<string>();
		for (let i = 0; i < 150; i++) keys.add(targetRecordKey('t-1', created, i));
		expect(keys.size).toBe(150);
		const ids = Array.from({ length: 500 }, () => crypto.randomUUID());
		const perTarget = new Set(ids.map((id) => targetRecordKey(id, created, 0)));
		expect(perTarget.size).toBe(ids.length);
	});

	it('encodes the creation time, so keys sort where the target was created', () => {
		const earlier = targetRecordKey('t-1', created, 0);
		const later = targetRecordKey('t-1', created + 60_000, 0);
		expect(earlier < later).toBe(true);
	});
});
