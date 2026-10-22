# Together — Community Group-Buying MVP

## Source and assumptions
The user requested a Next.js/React project, Resident/Business/Admin portals, Supabase schema, Wasl Village and a sample Indian society, deposits, capacity-aware deals and a running demo. No earlier specification was present in the supplied conversation or workspace. This PRD records the implemented interpretation rather than claiming to reproduce unavailable requirements.

## Product outcome
Residents pool neighborhood demand to unlock a fixed discounted unit price. Suppliers commit to a minimum order quantity and a hard capacity ceiling. A per-unit deposit reserves capacity. Community administrators approve and manage offers.

The product is named Together. Wasl Village uses AED. Palm Meadows Society is fictional sample data in Bengaluru and uses INR. All suppliers, residents, participation counts and offers are illustrative, not verified affiliations. Prices do not mix currencies across communities.

## MVP scope
- Resident: switch community, search and filter offers, inspect price/threshold/capacity, pay a simulated deposit, view bookings and outstanding balances, cancel before closing.
- Business: inspect community offer demand and bookings, submit a new offer, fulfill a locked deal and simulate balance settlement.
- Admin: approve pending offers, close booking windows, cancel deals and simulate refunds, review activity, reset demonstration data.
- Responsive desktop, tablet and phone layouts; accessible labels, keyboard focus styles and status announcements.
- Server-owned state survives refresh and restart in a local JSON store. It is serialized within a single server process to prevent concurrent overbooking. Production SQL supplies transactional row locking and RLS boundaries.

## Lifecycle and invariants
1. Business submission starts `pending`. Deposit > 0, deposit ≤ deal price ≤ retail price, minimum > 0, capacity ≥ minimum.
2. Admin approval starts `open` with a 48-hour deadline measured from submission.
3. Every accepted booking increases committed units atomically. Quantity is an integer 1–10. It cannot exceed remaining capacity. A request identifier prevents a repeated submission from charging/reserving twice.
4. At the minimum, status is `confirmed`; at capacity, `full`. Confirmation remains provisional until closing: cancellations may take participation below minimum again.
5. Resident cancellation before the deadline releases capacity and refunds the demo deposit. Cancellation after closing is disallowed.
6. At deadline, a deal with enough commitments becomes `locked`; otherwise `failed` and its active demo bookings are refunded. Deadline reconciliation runs on every demo API read/write. Production needs a scheduled call to `expire_deals()`.
7. A business fulfills only a locked deal. The demo simulates collection of the remaining balance. Production requires verified balance settlement before fulfillment.
8. Admin cancellation of an unfulfilled deal releases active reservations and initiates refunds. Completed deals cannot be cancelled in the MVP.
9. Real refund workflows use `refund_pending` until the payment provider confirms the refund; the demo completes that simulation instantly.

## Deposits and money
Total = group unit price × quantity. Deposit = deposit per unit × quantity. Balance = total − deposit. The server calculates amounts; browser totals are informational. Supabase stores integer minor units. The demo uses human-readable currency units and rounds display to two decimals. No tax, fees, delivery charges, partial refunds, coupons, cross-currency conversion or real card handling are included.

## Data model
Communities → memberships/profiles → deals → bookings. Refund jobs provide retryable provider work; audit events track lifecycle actions. Deal counters and bookings change in the same transaction in production. Memberships and role grants are trusted-service operations; clients cannot grant themselves privileges. Supabase reads are community-scoped; booking creation is a service-only RPC after payment verification.

## Demo versus production
The portal switcher intentionally impersonates all three roles. All suppliers are represented by one demo business operator. Seed participation counts are synthetic baseline commitments and have no individual customer/payment records; new demo reservations have complete records. SQL seeds start at zero commitments and do not invent auth users. Production must assign the seeded deals to authenticated businesses.

The running app uses the local store, not Supabase. The SQL is a deployment foundation, not a connected hosted database. Supabase authentication, memberships, provider webhooks, payment authorization/capture, job scheduling, refund workers and live balance settlement are integration work. Production should authorize a deposit first, then atomically reserve/capture or refund a charge rejected for capacity. Never deploy the open demo role switcher as production authorization.

## Acceptance and verification
- Booking exactly fills capacity; an additional request fails.
- Retrying a request does not create another booking.
- Cancellation releases capacity and can revert confirmation.
- Closing above minimum locks, closing below minimum refunds.
- Fulfillment cannot occur before locking.
- Invalid quantities, invalid offer amounts and wrong-role transitions fail.
- A new business offer stays pending until admin approval.
- Portal data reflects the same server state; AED/INR display follows the community.
- Automated domain tests, TypeScript/build, API concurrency checks and browser checks are recorded in README.

## Deliberately deferred
Real payments and notifications; inventory per date/time slot; multiple supplier accounts; supplier onboarding; delivery routing; disputes; tax invoices; deposits expiring during checkout; waitlists; tiered prices; multi-instance file-store deployment. Further specification may change these decisions.

## Business module revision
The subsequent user decision supersedes the earlier competing-offer model: only one approved provider may serve a category in a community on a given date, but different providers may serve different days within the same week. Admin makes the final allocation using a round-robin recommendation, with recorded override reasons. The complete implemented Business-module specification is in `BUSINESS_MODULE.md`; it supersedes the initial minimal business workflow and deferred appointment-slot support above.
