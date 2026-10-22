# Resident discovery, price stages and waitlists

Implemented 22 October 2026 in the existing local MVP.

## Reference review

[GroupServe](https://groupserve.kumawat.co.in/) communicates collective savings with a clear hero, participation counts, illustrative price stages and a simulator. Its [service partner page](https://groupserve.kumawat.co.in/for-service-partners) describes verification and clustered work, while the [partner app](https://groupserve.kumawat.co.in/partner-app) and [download page](https://groupserve.kumawat.co.in/download) describe app experiences with coming-soon download links. This review establishes public presentation and described features, not a verified operational backend.

Our application now uses an original community illustration, stronger resident discovery, real community counts, visible minimums and price stages. An explicitly illustrative simulator is shown when no live deals exist. Existing exact package scopes, community approval, day allocation, deposits and refunds remain part of the flow.

## Pricing rules

Business offer forms support up to three optional additional stages. Each stage defines a higher paid quantity and a larger percentage discount from the starting group price. Thresholds must be achievable within capacity; every variant's lowest stage price must cover its fixed deposit. Published stages cannot be silently changed.

Earlier reserved bookings benefit when a stage unlocks: their total and remaining balance decrease. The deposit stays fixed. Once earned, a discount does not reverse after a cancellation. The minimum still must be met at cutoff; otherwise the existing cancellation/refund lifecycle applies. Closed campaign totals are frozen.

Food and car cleaning count each service window independently. Scoped service campaigns count their configured booking units. Car variants retain different base prices and receive the same earned percentage discount. Waitlist interest never contributes to price stages or minimums.

## Waitlists

Residents can request a category or join an offer's availability list. Signed-in residents are tied to their approved/requested community and can track and withdraw their own requests. Guests can submit contact details and consent; their requests are visible for admin review. Guest requests are not automatically linked to a later signup.

Businesses can register interest in society opportunities within their existing coverage and categories, and see aggregate resident demand without resident contact details. New service businesses can register interest through the guest form. Admin can review, invite or close requests with a note. Invitation does not reserve a service day, bypass round robin/admin allocation, approve a membership or create a booking.

Availability is recalculated from actual matching bookable offers, remaining capacity and future service windows. It does not hold capacity or guarantee FIFO promotion. A successful signed-in resident booking converts the matching active request. The demo provides in-app updates only; email/SMS is not connected.

## Architecture and validation

`lib/tierPricing.mjs` owns pricing policy; `lib/waitlists.mjs` owns request policy. Food, car and generic offer flows use these shared rules. `supabase/007_tiers_and_waitlists.sql` adds SQL pricing guards, stage repricing and waitlist storage/RLS. The local app continues to use its serialized demo store; the hosted Supabase adapter and notification delivery worker are not deployed.

Validation: 57 automated application tests passed, production Next.js build passed, and the local PostgreSQL-compatible migration harness passed through migration 007, including earlier-booking repricing. Browser checks cover desktop/mobile resident discovery and waitlist form, guest business interest, and business opportunity controls. No live demo offers or paid bookings were added for presentation.

## Remaining production work

Replace demo Business/Admin role switching with authenticated authorization, connect hosted Supabase and private proof storage, integrate payment/refund provider and verified webhooks, and add consent-aware notification delivery. Provider verification, real settlement, push tracking and native mobile apps are not claimed as implemented.
