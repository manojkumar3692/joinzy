# CLP Cleaning Service campaigns — implementation and verification

**Updated policy:** New CLP bookings now use a **10% deposit**, replacing ₹99, as explicitly confirmed during bakery onboarding. Existing booking amounts are preserved. See [Bakery implementation](BAKERY_IMPLEMENTATION.md) and migration 014 for the current policy. The original implementation record below describes the prior ₹99 baseline.

Implemented in `/Users/manoj/Documents/ChatGPT/JOINZY`, using the existing source from `/Users/manoj/Documents/joinz` found through the “Build group-buying MVP” chat (`01a161e9-1b75-7b70-97f4-1be58402e326`). The original repository and its stored user/demo activity were not modified or copied. This workspace has no Git history; dependencies currently reuse the original node_modules through a local symlink. For an independent checkout, install the locked dependencies with npm ci.

## Campaigns

| Individual campaign | Regular | Group price | Deposit | Balance after service |
|---|---:|---:|---:|---:|
| 1 BHK occupied | ₹4,500 | ₹4,000 | ₹99 | ₹3,901 |
| 1 BHK empty | ₹3,500 | ₹3,000 | ₹99 | ₹2,901 |
| 2 BHK occupied | ₹5,500 | ₹5,000 | ₹99 | ₹4,901 |
| 2 BHK empty | ₹4,500 | ₹4,000 | ₹99 | ₹3,901 |
| 3 BHK occupied | ₹6,500 | ₹6,000 | ₹99 | ₹5,901 |
| 3 BHK empty | ₹5,500 | ₹5,000 | ₹99 | ₹4,901 |
| Per bathroom | ₹700 | ₹500 | ₹99 | ₹401 |

Every campaign belongs to CLP and Osian Chlorophyll, Chennai. Each independently requires five confirmed bookings and accepts at most ten. A booking is one appointment: one matching home or one bathroom. Bathroom appointments can be booked separately, including multiple bathrooms in one household. Waitlist entries do not count. Stable campaign/package keys prevent startup or migration reruns from duplicating or resetting existing campaigns.

## Scheduling and management

Residents can see all seven campaigns by selecting Osian Chlorophyll. Initially they are awaiting scheduling, with booking disabled. Admin → CLP campaigns lists all seven separately and provides scheduling, close and cancellation controls. Existing Businesses and Resident approvals screens manage the vendor and resident eligibility.

CLP starts pending because no owner account, credentials or verified contact details were supplied. The existing explicit Admin document-exception review remains available. No credentials or service availability were invented. Admin supplies actual service dates, working hours, duration and booking cutoff. All use India time. The scheduler requires room for ten appointments and conservatively reserves one crew, rejecting overlaps with other CLP campaigns even across societies. There is no multi-crew configuration in this addition. Service completion cannot settle the balance before the appointment ends.

The local demo serializes state writes in one server process. It is not a multi-instance production persistence adapter. Resident booking requires an approved membership for Osian Chlorophyll, an approved vendor, an open campaign, available campaign and appointment capacity, and acceptance of the package scope. Cancellation/failure affects only the selected campaign. SQL payment processing uses row/advisory locks and unique payment references.

## Supabase

Apply schema.sql, seed.sql and numbered migrations 002 through 013 in order. Migration 013 is repeatable. Provision the real CLP owner through the normal auth/profile onboarding process, then invoke `seed_clp_campaigns(real_owner_uuid)` using a trusted service role. This seeds a pending CLP provider and seven independent pending campaigns. It rejects reassigning existing campaigns to a different owner. Actual ownership must not be guessed or filled with a fake auth user.

An authenticated society admin can call `schedule_clp_campaign(deal_uuid, close_timestamp, slots_json, reason)`. Supply exactly ten `{start,end}` appointments with explicit `+05:30` offsets. Existing `book_service_deposit` is service-role-only and must be invoked after verifying the deposit. The full migration chain and seed were tested in local PostgreSQL-compatible PGlite. No hosted database was changed.

## Payment and launch requirements

No live payment integration was added. The demo's deposit-paid, completed and refunded states simulate money movement and are labelled as such. SQL records ₹99 in paise (9900). Before launch, connect the hosted booking adapter and real admin authentication, verify payment webhook signatures, amount/currency and replay handling, refund successfully charged deposits rejected for capacity, run expiry and refund workers, and reconcile actual refunds before marking them finished. Balance payment must be collected after service. The existing public Vercel/Netlify configuration intentionally hides the demo portals; these changes are not deployed.

## Verification

- 86 application tests pass, including seven exact prices, independent minimums, stable reruns, request retries, slot and overall capacity, approval/society checks, overlap rejection, cancellation/failure and post-service settlement.
- Next.js production build and TypeScript checks pass.
- `scripts/verify-clp-sql.mjs`: full migration chain, migration rerun, owner-bound seed rerun, seven rows, cross-campaign schedule conflicts, independent thresholds, payment retry, eleventh-booking rejection and four refund jobs on a failed campaign pass. Requires @electric-sql/pglite or PGLITE_PATH pointing to its module entry.
- `scripts/verify-clp-http.mjs`: running server returns seven scoped campaigns to resident/admin portals, denies resident scheduling and unauthenticated booking, and creates no duplicates on repeat reads.
- Browser verification: resident selector shows all seven exact offers; Admin exposes seven independent campaign controls. Pending campaigns remain unbookable.

Local server: http://resident.localhost:3012/app and http://admin.localhost:3012/app. Select Osian Chlorophyll in the resident portal; choose CLP campaigns in Admin.

## Changed/new implementation files relative to the original source

- [app/api/demo/route.ts](/Users/manoj/Documents/ChatGPT/JOINZY/app/api/demo/route.ts)
- [app/app/page.tsx](/Users/manoj/Documents/ChatGPT/JOINZY/app/app/page.tsx)
- [app/components/BookingTarget.tsx](/Users/manoj/Documents/ChatGPT/JOINZY/app/components/BookingTarget.tsx)
- [app/components/BusinessModule.tsx](/Users/manoj/Documents/ChatGPT/JOINZY/app/components/BusinessModule.tsx)
- [app/components/ClpCampaignAdmin.tsx](/Users/manoj/Documents/ChatGPT/JOINZY/app/components/ClpCampaignAdmin.tsx)
- [app/globals.css](/Users/manoj/Documents/ChatGPT/JOINZY/app/globals.css)
- [lib/business.mjs](/Users/manoj/Documents/ChatGPT/JOINZY/lib/business.mjs)
- [lib/clpCampaigns.mjs](/Users/manoj/Documents/ChatGPT/JOINZY/lib/clpCampaigns.mjs)
- [lib/domain.mjs](/Users/manoj/Documents/ChatGPT/JOINZY/lib/domain.mjs)
- [lib/freshSeed.mjs](/Users/manoj/Documents/ChatGPT/JOINZY/lib/freshSeed.mjs)
- [lib/serviceRules.mjs](/Users/manoj/Documents/ChatGPT/JOINZY/lib/serviceRules.mjs)
- [lib/store.mjs](/Users/manoj/Documents/ChatGPT/JOINZY/lib/store.mjs)
- [lib/types.ts](/Users/manoj/Documents/ChatGPT/JOINZY/lib/types.ts)
- [scripts/verify-clp-http.mjs](/Users/manoj/Documents/ChatGPT/JOINZY/scripts/verify-clp-http.mjs)
- [scripts/verify-clp-sql.mjs](/Users/manoj/Documents/ChatGPT/JOINZY/scripts/verify-clp-sql.mjs)
- [supabase/013_clp_campaigns.sql](/Users/manoj/Documents/ChatGPT/JOINZY/supabase/013_clp_campaigns.sql)
- [tests/clpCampaigns.test.mjs](/Users/manoj/Documents/ChatGPT/JOINZY/tests/clpCampaigns.test.mjs)
- [tests/freshSeed.test.mjs](/Users/manoj/Documents/ChatGPT/JOINZY/tests/freshSeed.test.mjs)
- [tests/indiaLaunch.test.mjs](/Users/manoj/Documents/ChatGPT/JOINZY/tests/indiaLaunch.test.mjs)
- [tests/store.test.mjs](/Users/manoj/Documents/ChatGPT/JOINZY/tests/store.test.mjs)
