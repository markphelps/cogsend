/**
 * `.dev.vars` reading, shared by every script that touches it.
 *
 * Two scripts uploaded from that file with different parsers: `setup.mjs`
 * trimmed, stripped a trailing comment and unquoted the value, while
 * `put-secrets.mjs` took everything after the first `=`. For a line like
 *
 *     APP_ENCRYPTION_KEY="abc" # rotate after the migration
 *
 * they disagreed — `abc` against `"abc" # rotate after the migration` — and
 * whichever ran last won. The value cannot be read back from Cloudflare, so a
 * mismatch silently orphans every stored credential. One parser, one answer.
 */
import { existsSync, readFileSync } from 'node:fs';

/** Values that ship with the repo and must never reach a deployment. Kept
 *  identical to PLACEHOLDER_SECRETS in src/lib/server/env.ts by a test that
 *  imports both lists. */
export const PLACEHOLDER_VALUES = new Set([
	'change-me',
	// Current .dev.vars.example values.
	'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
	'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
	// Earlier example values: still listed so a stale .dev.vars, or a deploy
	// that copied one, keeps being rejected after the rename.
	'dev-auth-secret-change-me',
	'0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
]);

/** The example admin address, which is not a secret but is just as wrong to
 *  keep: the account it creates is one an attacker already knows. */
export const PLACEHOLDER_EMAIL = 'admin@example.com';

/**
 * Split a file into lines. CRLF matters here: `.` does not match `\r` in a
 * JavaScript regex, so a file saved with Windows line endings — or by an editor
 * that rewrites them — parsed as no keys at all, and every value in it looked
 * missing.
 * @param {string} text
 */
function splitLines(text) {
	return String(text ?? '').split(/\r\n|\r|\n/);
}

/**
 * `KEY=value` → `value`: a trailing `# comment` removed, surrounding quotes
 * stripped. Shared so the parser and the "why is this key missing" lookup below
 * cannot disagree about what a line says.
 * @param {string} raw
 */
function normalizeValue(raw) {
	let value = String(raw ?? '').trim();
	// Strip a trailing comment first, then unquote: dotenv accepts
	// `KEY="value" # comment`, and the value is the quoted part.
	const comment = value.search(/\s+#/);
	if (comment !== -1) value = value.slice(0, comment).trim();
	if (/^".*"$/.test(value) || /^'.*'$/.test(value)) value = value.slice(1, -1);
	return value;
}

/**
 * Parse dotenv-style text the way the Worker's own loader does: `KEY=value`,
 * with an optional trailing `# comment` and optional surrounding quotes.
 * @param {string} text
 * @returns {Map<string, string>}
 */
export function parseDevVars(text) {
	const values = new Map();
	for (const line of splitLines(text)) {
		const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
		if (!match) continue;
		values.set(match[1], normalizeValue(match[2]));
	}
	return values;
}

/**
 * Why a key is not in what `parseDevVars` returns.
 *
 * "No local value" is true and useless: `.dev.vars.example` ships every optional
 * key as a commented `# KEY=`, so a value typed after that `=` while the `#`
 * stays behind parses as nothing at all — indistinguishable, from the outside,
 * from a key that is not in the file. Naming the line turns that into a
 * one-character fix.
 *
 * @param {string} text
 * @param {string} key
 * @returns {{ status: 'set' | 'empty' | 'commented' | 'absent', value: string, line: number | null }}
 */
export function inspectDevVarsKey(text, key) {
	const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const active = new RegExp(`^\\s*${escaped}\\s*=\\s*(.*)$`);
	const commented = new RegExp(`^\\s*#\\s*${escaped}\\s*=\\s*(.*)$`);
	let activeLine = null;
	let commentedLine = null;
	let commentedValue = '';
	for (const [index, line] of splitLines(text).entries()) {
		if (active.test(line)) {
			// Last one wins, the same way the Map in `parseDevVars` does.
			activeLine = index + 1;
			continue;
		}
		const match = commented.exec(line);
		if (match) {
			commentedLine = index + 1;
			commentedValue = normalizeValue(match[1]);
		}
	}
	const value = parseDevVars(text).get(key);
	if (value !== undefined) {
		return { status: value === '' ? 'empty' : 'set', value, line: activeLine };
	}
	if (commentedLine !== null) {
		return { status: 'commented', value: commentedValue, line: commentedLine };
	}
	return { status: 'absent', value: '', line: null };
}

/** The raw text, so a caller can point at a line number. Missing file → ''. */
export function readDevVarsText(file = '.dev.vars') {
	if (!existsSync(file)) return '';
	return readFileSync(file, 'utf8');
}

/**
 * Read a `.dev.vars` file. Missing file means no values, not an error — every
 * caller treats absence as "nothing to upload".
 * @param {string} [file]
 * @returns {Map<string, string>}
 */
export function readDevVars(file = '.dev.vars') {
	return parseDevVars(readDevVarsText(file));
}

/** @param {string | undefined | null} value */
export function isPlaceholderValue(value) {
	return value === undefined || value === null || PLACEHOLDER_VALUES.has(value.trim());
}
