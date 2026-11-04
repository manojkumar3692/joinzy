# Supabase runtime connection

Target project: `vzvxttuhorlfkaglugot`. Application source: `/Users/manoj/Documents/joinz`.

## Implementation status

Completed 2026-11-04: the runtime migration was applied through the SQL Editor, and the Data API import passed full record-by-record verification. Imported 8 communities, 11 businesses, 20 campaigns, 19 recurring templates, 2 bookings and 2 residents. A local backup remains under `.demo/backups/`. The local `.env.local` now selects `JOINZY_DATA_BACKEND=supabase`. Vercel has not been updated by this step.

Running HTTP verification passed: anonymous visitors cannot see offers, the existing test resident can log in and view offers, authenticated requests work, logout clears access, and the database revision advances. Direct publishable-key access to resident records and the state RPC returned HTTP 401. Repeating the import left the initialized database unchanged. The prior validation run passed all 114 tests, TypeScript and the production build.

`supabase/runtime/001_app_storage.sql` is the migration for this version of the running app. Do not apply the historical `supabase/schema.sql` and numbered migrations as a prerequisite. Those describe a different earlier relational/payment model. The runtime migration is additive and rerunnable and uses distinct `joinzy_` names.

The runtime schema stores each record as JSONB in separate tables for communities, categories, businesses, packages, campaigns, weekly templates, bookings, residents, resident sessions, business accounts/sessions, allocations, audit events, waitlists and society requests. This transitional persistence layer preserves all existing IDs, password hashes and campaign snapshots. It is not a claim that Supabase Auth has been integrated or that all fields have been normalized into relational columns.

All tables enable RLS and revoke privileges from anon/authenticated/PUBLIC. The server-only service role calls `joinzy_read_state` and `joinzy_commit_state`. The latter locks the metadata revision and rejects stale writes atomically; the app reloads and revalidates actions after conflicts. Whole-state transactions serialize the small initial marketplace safely, but should be replaced by targeted relational queries/transactions as traffic grows.

## Apply and import

1. Stop local app servers so the file is not changing during cutover.
2. Add `SUPABASE_DB_URL` from Supabase Connect → Session pooler to `.env.local`, including the actual database password. It is separate from SUPABASE_SECRET_KEY. Never put the connection string in chat or Git.
3. Run `npm run db:migrate`. TLS certificate verification is enabled. The script validates the project identity, applies the schema and imports `.demo/state.json` only when the remote revision is zero. It retains a local backup under `.demo/backups/` and verifies imported counts. Rerunning does not overwrite populated database records.
4. Run `npm run db:check`. Both schema access and an initialized state must be confirmed.
5. Set `JOINZY_DATA_BACKEND=supabase` in `.env.local` and restart the app. Keep the local source backup. The app never silently falls back to the file backend when Supabase fails.
6. Set SUPABASE_URL, SUPABASE_SECRET_KEY and JOINZY_DATA_BACKEND=supabase in Vercel and redeploy only after the remaining launch gates are addressed.

If SQL Editor is used instead, run the migration there first. Then run `npm run db:import` using the existing API key; no PostgreSQL password is required for that import. do not paste resident records into a saved SQL-editor query.

## Validation and limits

Tests cover PostgreSQL schema reruns, lossless record readback, duplicate-key rollback, stale revision rejection, server-only access, retry behavior, no-op reads and database outage handling. Existing domain tests cover society scoping, independent campaign minimums and capacities.

Not included in this step: migration to Supabase Auth, production administrator login, private document object storage, payment/refund collection, durable recurrence scheduler, or Vercel deployment. Existing uploaded proof data remains server-only in resident records until the private-storage step. Staff portal hosting restrictions remain enabled. Do not present this storage migration alone as public-launch readiness.
