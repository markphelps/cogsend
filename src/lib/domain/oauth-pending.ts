/**
 * How long a connect attempt stays valid: from the moment someone presses
 * Connect, which writes the pending row, until the provider redirects back.
 *
 * Ten minutes was too short in practice. LinkedIn's login, its 2FA prompt and
 * its consent screen are three pages the visitor has to get through, and the
 * only thing waiting at the end of a slow attempt was `oauth_expired` — a code
 * with nothing to act on. The row is single-use and bound to the session that
 * created it (see oauth-state.ts), so a longer window does not widen anything
 * an attacker can use: a state that was never issued still fails verification.
 */
export const OAUTH_PENDING_TTL_MS = 30 * 60 * 1000;

/** The same window in minutes, for the copy someone reads after it lapsed. */
export const OAUTH_PENDING_TTL_MINUTES = OAUTH_PENDING_TTL_MS / 60_000;
