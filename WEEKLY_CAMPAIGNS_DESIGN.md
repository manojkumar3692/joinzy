> Update: Sunday recurrence is now implemented in the local demo. See WEEKLY_CAMPAIGNS_IMPLEMENTATION.md for the implemented rules and remaining hosted-database limitations.

# Weekly campaigns — proposed operating model

Status: proposal, not implemented recurrence. The approval-screen routing and missing-date display fixes are implemented separately. Existing campaigns still require schedules before publication.

## Why approval was blocked

CLP/bakery seed campaigns deliberately have no booking dates or service dates. The general approval queue incorrectly opened the date-allocation modal instead of the dedicated scheduler. There were no requested dates to select; blank timestamps displayed as Invalid Date. The queue now routes to the correct campaign panel and expands the selected campaign. Missing timestamps display Awaiting scheduling, and Chennai timestamps display IST.

Current publication checks remain: approved vendor and society/category coverage; future booking cutoff before service/pickup; sufficient capacity. CLP reserves ten single-crew appointments without overlapping its other campaigns. Bakery requires a pickup window and confirmed food details. These checks are not bypassed by the UI fix.

## Recommended recurring model

Separate a reusable approved campaign template from its dated weekly occurrences. Template approval covers vendor, society, exact product/service, price, 10% deposit, minimum, maximum, cancellation policy, and fulfillment rules. Weekly instances own their bookings, payment records, counts, cutoff and service window. Never clear or reuse an old week's booking records.

Default local schedule for Chennai:
- Monday 00:00 IST: open the new week's booking cycle if the owner enabled weekly recurrence and confirmed available capacity.
- Friday 18:00 IST: close weekend bookings. This is a configurable recommendation, not a deployed rule.
- Saturday/Sunday: planned service or pickup window disclosed before payment.
- When a campaign reaches its minimum, notify the business and residents. The business coordinates exact appointments within the promised window. Continue accepting orders up to the campaign cap until cutoff.
- At cutoff, qualifying campaigns enter fulfillment. Under-minimum campaigns close and queue deposit refunds. Counts never carry between products or weeks.
- The following Monday creates a fresh occurrence with zero bookings if enabled. A prior week's refund or service remains attached to that prior week until resolved.

If the provider cannot fulfill the promised window, propose a new date to affected residents. Only consenting residents are rescheduled; others get a cancellation/refund route. Never automatically extend dates or transfer a deposit into next week's campaign. The UI must show real refund progress rather than reporting a refund before payment-provider confirmation.

## Owner controls

Enable/pause weekly recurrence, restart next week manually, skip a week, nominate Saturday/Sunday/both, set booking cutoff, set availability and crew capacity, and confirm appointment times after the minimum is reached. Admin approves the template once. Material changes to vendor, society, product/scope, price or policies require reapproval; ordinary weekly date generation within the approved rules does not.

Restart means creating a new occurrence, never resetting a failed or fulfilled one. Use a unique template ID plus local week-start key to prevent duplicate occurrences across job retries. Monday automation requires a durable scheduled worker, not just a page load or a local app being left open.

## Category differences

- AC/cleaning: weekly collection with a planned weekend window; exact appointments coordinated when minimum is reached. Reserve the vendor's shared crew capacity before taking deposits. Seven campaigns capped at ten each must not promise seventy jobs if the vendor can perform only ten jobs that weekend. Provider availability must account for all campaigns and societies.
- Bakery/food: same weekly campaign mechanism, but a fixed pickup/delivery window and preparation cutoff are required upfront. Do not wait until enough orders arrive to tell customers when their food will be available.
- Other categories: configurable fulfillment windows and lead times. Reuse the recurrence mechanism, not one fixed schedule for every business.

Existing business rules: bakery minimum 3 orders, maximum 10 per product campaign; CLP minimum 5, maximum 10 per campaign. Deposit 10% for both. Do not invent AC minimum/capacity; use that provider's approved offer rules.

## Implementation boundary

Implementing this model requires template/occurrence database tables and uniqueness constraints, owner controls, approval separation, capacity reservations across campaigns, a scheduled occurrence/expiry worker, notification events, explicit reschedule consent, and payment/refund integration. The current local demo does not provide that automation or live payment processing.
