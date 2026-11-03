# HOUSE OF EON — Osian Chlorophyll

Approved and opened in the local JOINZY app on 3 November 2026 by explicit owner request. Listing approval is recorded as an owner-authorized document exception, not independently verified credentials.

- Perfume discovery trial pack: three 8 ml samples, ₹249, free shipping.
- Minimum 3 active bookings, maximum 10; one pack per member per weekly occurrence.
- First cutoff: Saturday 7 November 2026, 23:59 IST (exclusive boundary Sunday 00:00).
- Weekly recurrence opens the next occurrence on Sunday, preserving prior bookings and resetting the new occurrence's count. Missed weeks are skipped on restart. Local server must run for the worker.
- Existing 10% deposit policy: ₹24.90 planned deposit, ₹224.10 planned balance. Joinzy does not collect payment. No deposit-credit integration exists with the external checkout; customers must confirm the final ₹249 payable on HOUSE OF EON, and must not be charged an extra Joinzy deposit without such integration.

## Redemption
The owner supplied https://www.houseofeon.in/trial-pack and coupon JOINZY. These are stored separately from offer snapshots. The server exposes them only to approved members in the correct society who have an active booking in that occurrence, once at least three active bookings exist. The business must remain verified and the occurrence cannot be cancelled/failed. Cancellation below the minimum removes access; a code already seen cannot be recalled or invalidated on the external site.

Delivery is in My bookings, not email/SMS. No external message or purchase is sent. Admin → Weekly campaigns → HOUSE OF EON → Trial-pack redemption can update the HTTPS link/code. An authenticated account belonging to the business can do the same. No business login was provisioned in this request.

The external page was read and supports the pack/price/free-shipping description. Coupon acceptance was not transaction-tested and no external checkout was submitted. Shipping is arranged by HOUSE OF EON after redemption; no Sunday arrival or service appointment is promised.

## Implementation and validation
`lib/eonCampaign.mjs` adds idempotent provider/category/template setup, redemption ownership gating and scoped configuration edits. `lib/store.mjs`, `domain.mjs`, `weeklyCampaigns.mjs`, `residents.mjs`, `businessAccounts.mjs`, and `types.ts` integrate it. API allowlists permit scoped coupon updates. `CouponRedemption.tsx`, `CampaignTiming.tsx`, `CustomerPortal.tsx`, `WeeklyCampaigns.tsx`, `OfferArtwork.tsx`, and customer CSS implement the UI. Existing SQL migrations are unchanged; the active app uses its local file store.

106 tests pass, including 3-booking access gating, no guest/unbooked-member coupon exposure, cancellation, exact price/deposit, capacity 10, one-pack restriction, recurrence and idempotent seeding. Production build passes. Browser checked the active customer listing and checkout without making a test reservation in the real local campaign.

## Artwork
Built-in image generation produced `public/images/services/perfume-3d.png`, optimized to `perfume-3d.webp` (about 15 KB). It is explicitly labeled as an illustration rather than the vendor's actual packaging.

Prompt: Premium 3D clay-render category illustration for a perfume discovery trial pack on a friendly neighbourhood marketplace. Exactly three small elegant 8 ml glass fragrance sample spray vials, pale amber perfume, matte lilac caps, arranged on a cream sculptural plinth with one muted lavender ribbon. Soft rounded tactile aesthetic, subtle glass reflections, warm studio light, seamless pale lilac background. Landscape 3:2, centered with generous empty margins, all three vials fully visible. No text, no labels, no logos. Illustration only, not a depiction of actual branded packaging.
