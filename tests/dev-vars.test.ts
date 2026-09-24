import { describe, expect, it } from 'vitest';
import { inspectDevVarsKey, parseDevVars } from '../scripts/lib/dev-vars.mjs';

/**
 * One parser for `.dev.vars`, shared by `setup`, `doctor` and `secrets:put`, so
 * what it makes of a line decides whether a value reaches a deployment. These
 * are the shapes that reached it in practice: a value typed after the `=` on a
 * commented example line — the mistake `.dev.vars.example` invites — and a file
 * saved with CRLF endings by an editor that rewrites line breaks.
 */
describe('parseDevVars', () => {
	it('reads a plain file', () => {
		expect([...parseDevVars('API_TOKEN=tok\nNOTIFY_EMAIL=me@example.com')]).toEqual([
			['API_TOKEN', 'tok'],
			['NOTIFY_EMAIL', 'me@example.com']
		]);
	});

	it('reads a file saved with CRLF line endings', () => {
		// `.` does not match `\r`, so this used to come back empty: every key
		// looked missing and nothing was uploaded.
		expect([...parseDevVars('API_TOKEN=tok\r\nLINKEDIN_CLIENT_ID=abc\r\n')]).toEqual([
			['API_TOKEN', 'tok'],
			['LINKEDIN_CLIENT_ID', 'abc']
		]);
	});

	it('strips a trailing comment and surrounding quotes', () => {
		expect([...parseDevVars('APP_ENCRYPTION_KEY="abc123" # rotate after the migration')]).toEqual([
			['APP_ENCRYPTION_KEY', 'abc123']
		]);
		expect([...parseDevVars("API_TOKEN='tok_value'")]).toEqual([['API_TOKEN', 'tok_value']]);
	});

	it('ignores commented lines, including one with a value typed on it', () => {
		expect([...parseDevVars('# LINKEDIN_CLIENT_ID=abc123')]).toEqual([]);
	});

	it("lets the last duplicate win, as the Worker's loader does", () => {
		expect(parseDevVars('API_TOKEN=first\nAPI_TOKEN=second').get('API_TOKEN')).toBe('second');
	});
});

describe('inspectDevVarsKey', () => {
	it('names the commented line a value was typed on', () => {
		expect(inspectDevVarsKey('# LINKEDIN_CLIENT_ID=abc123', 'LINKEDIN_CLIENT_ID')).toEqual({
			status: 'commented',
			value: 'abc123',
			line: 1
		});
	});

	it('separates an empty line from a key that is not in the file', () => {
		expect(inspectDevVarsKey('API_TOKEN=', 'API_TOKEN').status).toBe('empty');
		expect(inspectDevVarsKey('API_TOKEN=', 'API_TOKEN').line).toBe(1);
		expect(inspectDevVarsKey('API_TOKEN=', 'OTHER').status).toBe('absent');
		expect(inspectDevVarsKey('API_TOKEN=', 'OTHER').line).toBeNull();
	});

	it('reports the line of an active key, ignoring a commented one', () => {
		expect(inspectDevVarsKey('# API_TOKEN=old\nAPI_TOKEN=real', 'API_TOKEN')).toEqual({
			status: 'set',
			value: 'real',
			line: 2
		});
	});

	it('does not match a longer key or a mention inside a comment', () => {
		expect(inspectDevVarsKey('LINKEDIN_CLIENT_ID_EXTRA=1', 'LINKEDIN_CLIENT_ID').status).toBe(
			'absent'
		);
		expect(inspectDevVarsKey('# see LINKEDIN_CLIENT_ID= below', 'LINKEDIN_CLIENT_ID').status).toBe(
			'absent'
		);
		// The real comment above those keys in .dev.vars.example.
		expect(
			inspectDevVarsKey(
				'# Optional. Enables the LinkedIn / Threads / X connect buttons (OAuth apps).',
				'LINKEDIN_CLIENT_ID'
			).status
		).toBe('absent');
	});

	it('counts lines the same way with CRLF endings', () => {
		expect(inspectDevVarsKey('# API_TOKEN=old\r\nAPI_TOKEN=real\r\n', 'API_TOKEN')).toEqual({
			status: 'set',
			value: 'real',
			line: 2
		});
		expect(inspectDevVarsKey('API_TOKEN=\r\n', 'API_TOKEN').status).toBe('empty');
	});
});
