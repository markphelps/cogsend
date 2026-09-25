# Backups

Drafts, schedules, publish history, accounts and settings all live in D1; media
lives in R2.

D1 keeps its own history for 30 days. Time Travel reports what it holds and
rewinds the database to an earlier point:

```sh
node scripts/wrangler.mjs d1 time-travel info DB
node scripts/wrangler.mjs d1 time-travel restore DB --timestamp 2026-09-21T09:00:00Z
```

For a copy of your own, export the database to SQL. `DB` is the binding in your
config, so the same command works on a database you renamed:

```sh
node scripts/wrangler.mjs d1 export DB --remote --skip-confirmation --output ~/cogsend-$(date +%F).sql
node scripts/wrangler.mjs d1 execute DB --remote --yes --file ~/cogsend-2026-09-22.sql
```

`--no-schema` exports rows without the schema and `--table` narrows the export to
one table. Restore into an empty database, or one Time Travel has just rewound: an
export carries `CREATE TABLE` statements, and its rows collide with rows that are
already there.

R2 has no export command. Copy the bucket with any S3 client (`rclone`, `aws s3
sync`) against its S3 endpoint, or fetch objects one at a time with:

```sh
node scripts/wrangler.mjs r2 object get cogsend-media/<key> --remote --file ./<key>
```

The bucket name is `bucket_name` in `wrangler.personal.jsonc`.
