# Deepthi’s Delicacy — Osian Chlorophyll

Added **Deepthi's Delicacy - Home made Cakes & Bakery** and 11 separate bakery campaigns to Osian Chlorophyll, Chennai. Prices are final selling prices supplied by the organiser; no unprovided discounts are claimed.

| Product / sale unit | Price | 10% deposit per unit |
|---|---:|---:|
| Brownie / piece | ₹95 | ₹9.50 |
| Wheat brownie / piece | ₹120 | ₹12 |
| Nutella brownie / piece | ₹105 | ₹10.50 |
| Triple chocolate brownie / piece | ₹110 | ₹11 |
| Biscoff brownie / piece | ₹105 | ₹10.50 |
| Korean bun / piece | ₹120 | ₹12 |
| Bomboloni, chocolate filling / piece | ₹110 | ₹11 |
| Bomboloni, vanilla filling / piece | ₹120 | ₹12 |
| Bomboloni, Nutella filling / piece | ₹130 | ₹13 |
| Cookies / 250 g pack | ₹350 | ₹35 |
| Brownie box / 250 g, 4 larger pieces | ₹440 | ₹44 |

The ₹440 box is a distinct product containing four pieces larger than the standard ₹95 brownie. No unspecified egg/eggless, ingredients or allergen claims were added.

## Campaign and deposit rules

- Each bakery campaign independently needs **3 confirmed orders**, maximum **10 orders**. Waitlist entries do not count.
- A checkout order can contain 1–10 sale units of its one product; it still counts as one order. Different products remain separate campaigns/checkouts. Four standard brownies cost ₹380: ₹38 deposit and ₹342 balance at pickup.
- Deposits are **10% of the order total**, calculated in paise and credited toward the total. Cancellation/failure affects only that campaign and its recorded booking amounts.
- As explicitly confirmed, new **CLP** bookings also use 10% instead of ₹99. CLP retains its independent minimum 5 / maximum 10 booking rule. Existing booking deposits, balances and refund amounts are preserved.
- Stable vendor, package and campaign keys prevent duplicate seed entries or resets of existing campaign state.

## Admin and residents

Resident listings show the bakery’s 11 items under Osian Chlorophyll alongside the seven CLP campaigns. Admin → **Bakery campaigns** lists each item, its price, order count and status, with per-item publishing, closing and cancellation controls.

The bakery starts pending approval, with no fabricated contact information or credentials. The existing Businesses review supports an explicit document exception if Admin chooses it. Before publication, Admin must enter a future pickup date/window, booking cutoff, pickup location, confirmed ingredient/allergen information and a decision reason. India time is used. Publication checks vendor approval, food credential review, society scope and the cutoff. Booking checks membership, quantity and campaign/slot capacity. Orders cannot be settled as completed before the pickup window ends.

## Database and payments

Migration `supabase/014_bakery_and_percentage_deposits.sql` follows migrations through 013. It is repeatable and updates future CLP deposits while preserving booking snapshots. Provision the real bakery owner, then call `seed_deepthi_campaigns(owner_uuid)` using a trusted service role. The seed refuses to reassign campaigns to a different owner. It creates 11 pending rows with no invented service dates. `schedule_bakery_campaign` is society-admin-only. `book_bakery_deposit` is service-role-only and must be invoked after real payment verification.

In SQL, `bookings.quantity=1` represents one bakery **order**; `bakery_units` stores its purchased product quantity. This lets the existing capacity, cancellation, expiry and refund lifecycle count orders correctly. Totals and deposits use sale units. Other booking types retain their existing quantity semantics.

This remains a **local demo**, not a hosted release. No real money is collected or refunded. Hosted deployment still requires a real owner account, production authentication/persistence adapter, verified payment webhooks, expiry/refund workers and reconciliation. No hosted Supabase data was changed.

## Verification

- 90 application tests pass; production build and TypeScript checks pass.
- Full SQL migration chain through 014 passes in local PGlite, including migration/seed reruns, exact prices, approval gating, multiple units counted as one order, 10% deposits, independent thresholds, ten-order cap, invalid payment/RPC rejection, refunds and historic CLP deposits preserved.
- Running HTTP checks verify 11 bakery + 7 CLP campaigns, correct 10% deposits, society association, duplicate-safe reads and authorization failures.
- Browser check verifies resident listings and the dedicated Bakery campaigns admin panel.

## Main files

- `lib/bakeryCatalog.mjs`: vendor, eleven packages/campaigns, pickup scheduling and seed upgrade.
- `lib/depositPolicy.mjs`: 10% policy and per-order campaign counts.
- `lib/clpCampaigns.mjs`, `lib/domain.mjs`, `lib/business.mjs`, `lib/residents.mjs`, `lib/freshSeed.mjs`, `lib/store.mjs`, `lib/types.ts`: deposit/count/lifecycle integration.
- `app/components/BakeryMenu.tsx`, `BusinessModule.tsx`, `ClpCampaignAdmin.tsx`, `BookingTarget.tsx`, `app/app/page.tsx`, `app/api/demo/route.ts`: admin management, resident listings, booking presentation and action routing.
- `supabase/014_bakery_and_percentage_deposits.sql`: repeatable migration, vendor seed and guarded scheduling/booking RPCs.
- `tests/bakeryCampaigns.test.mjs` and updated regression fixtures; `scripts/verify-clp-sql.mjs`, `scripts/verify-clp-http.mjs`: automated verification.

Review locally at http://resident.localhost:3012/app (choose Osian Chlorophyll) or http://admin.localhost:3012/app → Bakery campaigns.
