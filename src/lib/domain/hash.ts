/**
 * 32-bit FNV-1a. Not cryptographic: for keys and fingerprints that must come
 * out the same in every isolate and every release.
 */
export function fnv1a(text: string): number {
	let hash = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) {
		hash ^= text.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193) >>> 0;
	}
	return hash >>> 0;
}
