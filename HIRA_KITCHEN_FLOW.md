# Hira Kitchen — first food-offer flow

Community Kitchen is renamed Hira Kitchen without changing its ID or existing bookings.

1. Package: name, description, what one portion includes, ingredients/allergens.
2. Communities & dates: select one or more covered communities, publish/open time, service date, booking cutoff, pickup/delivery instructions, portion price and deposit in each selected currency.
3. Slots: explicitly choose one or more non-overlapping windows. Each window has its own minimum paid portions and maximum capacity. Example: 12–1 PM, minimum 12, maximum 30; optional 6–7 PM with its own limits.
4. Review: inspect the package, publication schedule and slot thresholds under each community. Save draft or send for Admin approval.

One booking unit currently means one paid portion, not one unique household. Thresholds are independent per community and slot. No demand pooling or automatic transfer between slots. At cutoff, successful slots proceed and unsuccessful slots refund only their reservations. A community's daily allocation is released only if all of its slots fail. Existing daily category exclusivity and Admin approval remain in effect.

A multi-community submission creates linked community-specific offers atomically, with independent approval, currency, local time and booking counts. Prices include any delivery charge. One common local booking cutoff applies to all slots in the offer, before the earliest service slot. This intentionally does not add per-slot cutoff times or recurring service dates.

Future food offers are hidden from resident discovery until their publish time and require Admin approval. Existing published legacy offers and bookings are preserved. Once any linked community offer is approved, the entire linked request cannot be replaced through the draft editor.

Verification: 31 application tests pass; production build passes; browser-tested two-community, two-slot draft creation and reopening; mobile width 390px has no page overflow. SQL migration 003 and independent slot expiry were tested locally with PGlite. Supabase is not connected to the app; payments and refunds remain simulated.

The example Hyderabadi Biryani offer has been saved as an unpublished draft, with 12–1 PM and 6–7 PM slots, each minimum 12 and capacity 30, in the two demo communities. Confirm real ingredient/allergen details and operational coverage before using live data.
