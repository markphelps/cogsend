# Putting it behind Cloudflare Access

Optional. The app has its own login, so Access is an extra gate for an instance
only you (or a small team) reach. It does not replace the app login or the
secrets: `APP_ENCRYPTION_KEY` still encrypts your provider tokens and derives
the key that signs publish-time media URLs, and `AUTH_SECRET` still signs
sessions and OAuth state.

If you enable Access (Workers → your Worker → **Access**, or the `workers.dev`
one-click), account for these paths and clients:

- **Media for Meta's crawler.** `/api/media/public/*` must stay reachable
  without a login, or Threads and Mastodon cannot fetch images. Add a separate
  Access application for that path with a **Bypass / Include Everyone** policy.
- **Scripts and pingers.** A CogSend API key does not satisfy an Access Service
  Auth policy. For a protected API request, configure the required Access
  service token as well as the app credential (a personal API key for the
  CogSend API, or the scheduler token for `/api/internal/tick`).
- **MCP clients.** A protected `/api/mcp` request needs both the CogSend personal
  API key in `Authorization: Bearer …` and, when the Access policy uses Service
  Auth, the Access headers `CF-Access-Client-Id` and
  `CF-Access-Client-Secret`. Store the service-token values in your local
  environment or secret manager; do not put them in a URL or commit them to a
  client config. For example, the Inspector CLI accepts headers on each request:

  ```sh
  : "${COGSEND_INSTANCE_URL:?Set this to your instance origin}"
  : "${COGSEND_API_KEY:?Load it from a secret manager}"
  : "${CF_ACCESS_CLIENT_ID:?Load it from a secret manager}"
  : "${CF_ACCESS_CLIENT_SECRET:?Load it from a secret manager}"
  npx @modelcontextprotocol/inspector --cli \
    "$COGSEND_INSTANCE_URL/api/mcp" \
    --transport http \
    --protocol-era modern \
    --method tools/list \
    --header "Authorization: Bearer $COGSEND_API_KEY" \
    --header "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID" \
    --header "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET"
  ```

  The CogSend bearer key and the Cloudflare Access service token are separate
  credentials. The Access headers are optional only when the request is not
  behind a policy that requires them. If your MCP client cannot send custom
  headers, choose an Access policy deliberately: use a client that supports
  Service Auth, or consider a narrowly scoped bypass for `/api/mcp` only if you
  accept that Access will not authenticate those requests.
  CogSend's personal-key authentication remains required either way. Do not
  bypass Access for the whole instance as a workaround.

- **OAuth callbacks.** If a provider redirects back while your Access session
  has expired, Access intercepts it before the app sees the code. Bypass
  `/api/connections/*/callback` if that happens.

The cron trigger is unaffected: the scheduled handler calls the Worker
in-process, never over HTTP. Access also requires Zero Trust to be enabled,
which asks for payment details even on the free plan (50 users; service tokens
do not consume seats). On `workers.dev`, set it up through the Workers dashboard
flow because the Zero Trust domain picker only lists domains from a zone. An
account-wide **Protect all Workers** setting applies to new deployments too and
needs the same exemptions.
