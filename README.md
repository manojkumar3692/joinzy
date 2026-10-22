# Together — Community Group-Buying MVP

A Next.js 15 / React 19 demo with Resident, Business and Admin portals. Includes an implementation PRD, Supabase/PostgreSQL schema with RLS and transactional RPCs, and two seeded communities.

## Run locally
Requires Node.js 20.9+ (Node 24 recommended).

```sh
npm install
npm run dev
```

Open http://localhost:3000. The demo server binds to loopback. Use `npm run build && npm start` for a production build of the **demo**, not a production payment service.

In the Codex environment, Node 24 is available at:
`/Users/manoj/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`.
Place that directory first in PATH if the system Node is older.

## Walkthrough
1. Resident → Wasl Village → join the home cleaning offer for one unit. It crosses the eight-unit minimum. Inspect My bookings and its deposit/balance.
2. Admin → close bookings for that offer. Status becomes Ready to fulfill.
3. Business → fulfill and settle the demo balance. The booking becomes completed.
4. Resident → switch to Palm Meadows Society → reserve one laundry unit.
5. Admin → close that laundry offer below its minimum. The booking is refunded.
6. Business → Create a deal → provide title, retail/group/deposit amounts, minimum and capacity. Admin can approve it; residents can then book it.
7. Admin → Reset demo restores original sample offers and clears your test reservations.

Payments and refunds are simulated. No card, payment key or Supabase credential is needed. The app never charges money. Deadline processing occurs when the API is read or written; refresh to reconcile an elapsed window.

## Structure
- `app/page.tsx` — responsive portals and demo interactions.
- `app/api/demo/route.ts` — demo API.
- `lib/domain.mjs` — validated booking and lifecycle transitions.
- `lib/store.mjs` — serialized single-process persistence in `.demo/state.json` (gitignored).
- `supabase/schema.sql` — tables, constraints, RLS, transactional booking, cancellation, expiry, refunds and fulfillment.
- `supabase/seed.sql` — communities and offers with zero real commitments.
- `tests/lifecycle.test.mjs` — domain regression tests.
- `PRD.md` — requirements, assumptions and production boundaries.

## Supabase setup and integration boundary
Apply `schema.sql`, then `seed.sql`, to a fresh Supabase project. Provision authenticated profiles and community memberships through a trusted service. Set business ownership on offers. Configure a scheduled service call to `expire_deals()` and a payment/refund worker. The `book_paid_deposit` function is restricted to service_role and must only be called after signature, amount, currency and payment identity verification. Refunds are queued before being marked complete. `fulfill_deal` requires paid balances, which a verified payment adapter must reconcile.

The supplied Next.js app does **not** connect to Supabase yet. `.env.example` lists integration placeholders. Replace the demo API with authenticated Supabase access before public launch; never trust its caller-provided demo role in production. Keep the service-role key exclusively on the server. The SQL has not been executed against a Supabase project in this session.

The JSON store is for one local process, not multiple server instances or serverless deployment. Synthetic seeded demand has no backing payment records. Refunds release newly created demo reservations; illustrative baseline participation remains unchanged. The business selector switches between seven demo providers; this is not authenticated account isolation.

## Validation
Run `npm test` for lifecycle regressions. Build and browser/API verification results are added below after execution.

Verified on 22 October 2026:
- Production build and TypeScript checks passed on Next.js 15.5.28 / Node 24.
- Eight automated lifecycle tests passed.
- API concurrency check: 20 simultaneous requests for nine remaining slots accepted exactly nine and rejected eleven. Idempotency, wrong-role rejection, fulfillment and failed-deal refunds passed. Re-run with `node tests/api-check.mjs` only against disposable demo data; it resets the store.
- Browser walkthrough: resident deposit → admin close → business fulfillment → completed booking with zero balance.
- INR community switch verified; 390px and 1440px layouts inspected, no horizontal overflow.
- Dependency audit after the PostCSS override: zero reported vulnerabilities.
- Supabase SQL was prepared but not executed against a hosted database; payment, auth and database deployment integrations remain unverified.

The local server was left running at http://127.0.0.1:3000, with fresh sample data after the tests. It runs only while its local process remains alive.

## Business module (expanded)
Open http://127.0.0.1:3000/?portal=business for the new Business workspace. The top-right selector opens Admin or Resident; the demo-business selector switches the seven seeded providers. See `BUSINESS_MODULE.md` for the implemented rules and deployment boundary. The service launch catalogue has ten categories in Wasl Village and four sample service offers in the Indian community.

The confirmed allocation rule is **one approved provider per category, community and date**, with different providers permitted on different days of the week. Weekly round-robin recommendations inform the administrator; an explicit reason is required for overrides. See `supabase/002_business_module.sql` for the database extension.

Updated validation: 24 automated tests pass, including concurrent approval and appointment-capacity checks. Browser-tested offer submission, override rejection/approval, calendar publication, resident slot booking and business booking visibility. An illustrative Friday request and its resident booking from that walkthrough remain available in the demo.

## Hira Kitchen simplified food flow
Open http://127.0.0.1:3000/?portal=business&business=kitchen and choose **Create food offer**. Four steps cover Package → Communities & dates → Slots → Review. See `HIRA_KITCHEN_FLOW.md`. Per-slot minimums are independent in each selected community; no pooling. Minimums count paid portions. A two-community/two-slot example is saved as a draft. Application verification is now 31 passing tests, plus successful build and local SQL slot-expiry checks. Apply `003_food_slot_minimums.sql` after migration 002 for the schema extension.

## Wecare car cleaning and category rules
Open http://127.0.0.1:3000/?portal=business&business=wecare. The three-step offer flow covers vehicle variants, community/date/publication/cutoff, team capacity, independent window minimums, and admin submission. Friday's sample uses 13:00–15:00, a minimum of 10 cars, capacity 12 and three parallel teams. Sedan AED15, SUV AED20 and crossover AED18 are editable sample prices; each has an AED5 demo deposit.

See [SERVICE_RULES_ARCHITECTURE.md](SERVICE_RULES_ARCHITECTURE.md) for the shared lifecycle, category-specific rules, business defaults and immutable offer snapshots. Apply `004_service_rules_and_vehicles.sql` after 003. SQL vehicle prices use minor currency units; local demo prices use major units.

Latest validation (22 October 2026): 41 application tests and production build passed. All SQL migrations and booking checks ran in local PGlite, including car quotes and duplicate plates; hosted Supabase integration remains unverified. Browser-tested capacity rejection, submission, admin allocation, resident SUV pricing/deposit and business visibility of plate and parking details. A clearly labeled demo SUV booking remains in Wecare's Friday offer. Mobile service rules rendered at 390px with no horizontal overflow. Existing demo data was preserved. Payments remain simulated and the local app still uses JSON persistence.

## Current clean workspace (22 October 2026)
The local demo now starts with only Hira Kitchen, Wecare Car Cleaning and Mohan AC Cleaning. Starter packages remain; all offers, bookings, allocations and activity have been cleared in both communities. Mohan's Basic AC Cleaning covers accessible dusting, removable filter cleaning and a function check, with editable sample pricing AED59 / AED15 deposit and 45-minute duration. `lib/freshSeed.mjs` is the runtime/reset baseline; the older domain seed remains a regression fixture. No hosted database was reset. Current validation: 42 passing tests, production build, three-business selector, Mohan package and empty Resident portal checked in browser.

## Resident membership and booking targets
Resident offer cards and checkout now show the remaining paid units needed to reach the minimum, separately for each service window. Capacity is shown separately. Food counts portions, car cleaning counts cars, and AC counts AC units. An uncompleted reserved booking may be cancelled for a full refund of the deposit paid, including after cutoff; service cancellation and failed minimums also refund. Local refunds are simulated. Completed services are not cancellable through this flow.

Residents sign up with name, email, password, one database community and a sample PNG/JPG/PDF residence proof (2 MB). Membership starts pending; Admin → Resident approvals accepts or requests new proof with a reason. Rejected applicants can resubmit proof for the same community. Server checks a hashed session token, approved membership and the offer community before booking; booking ownership is checked for cancellation and idempotent retries. Passwords use salted scrypt and session cookies are HTTP-only. Resident responses exclude other residents' booking details and proof documents; slot counts are aggregated on the server.

This is still a local prototype: business/admin access uses the existing demo switcher, proof files live in local JSON, and payments are simulated. Upload sample documents only. Production needs authenticated community administrators, private object storage with upload validation and retention/deletion controls, verified email/password recovery, login throttling, and a real payment/refund adapter. Migration `005_resident_membership.sql` provides application RLS, one-community membership uniqueness, approval RPCs and updated cancellation; it does not deploy Supabase Auth or Storage.

Validation: 47 automated tests, production build, local PGlite migrations and membership uniqueness/approval checks passed. Browser-tested signup with synthetic proof, pending state, admin approval and the clean Resident portal; 390px layout has no horizontal overflow. The sample test account was removed and the previous clean workspace restored. Booking target rendering was tested without adding live offers.

## India launch service scopes
Four fictional India providers and eight INR packages now extend the three existing businesses. See [INDIA_LAUNCH_PACKAGES.md](INDIA_LAUNCH_PACKAGES.md) for exact sofa seat/mattress limits, basic AC scope, BHK plus carpet-area pest tiers, fixed-weight laundry, exclusions and operational limits. Businesses edit structured scope fields; offers snapshot the scope; residents must acknowledge it and provide applicable size/weight details. Server validation rejects mismatches and impossible appointment capacity. Pest verification starts pending. The catalogue migration publishes no offers and creates no bookings. Migration 006 adds database scope snapshots and a scoped booking RPC. Latest validation: 51 application tests, production build, all local PGlite migrations and scoped RPC checks passed; browser verified automatic India community selection, scoped editor and one-crew overcapacity rejection. Hosted Supabase and real payments remain unconnected.
