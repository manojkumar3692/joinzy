# Food prices by order quantity

The food offer wizard now supports a base per-portion price plus up to three optional bulk breaks per currency. Configure them under Communities & dates → pricing → Bulk prices for one order. The review step, admin approval preview, resident deal cards and booking dialog show the quantity rates.

Example (illustrative, not added to live offers): 1–4 portions at AED 20 each, 5–9 portions at AED 18 each, 10 portions at AED 16 each. Orders of 1, 5 and 10 cost AED 20, AED 90 and AED 160 respectively. Every unit in the order uses its eligible rate. Separate orders are not pooled. Current household/order maximum remains 10 portions.

Community price stages remain separate and optional. If enabled, the reached percentage discount applies on top of each order's quantity rate. Earlier bookings retain their own quantity-price base when community discounts unlock. Reaching a bulk break does not bypass the slot minimum or capacity. Minimums still count all paid portions; failed slots and cancelled bookings retain the existing full-deposit refund behavior.

Thresholds must increase and fit every selected window. Bulk unit prices must decrease and use at most two decimals. Deposits cannot exceed the lowest combined bulk and community-stage price. Published offer families cannot be silently repriced. Rules and tables are snapshotted on offers; quantities and final totals are recomputed server-side, not trusted from the browser.

Application validation: 67 tests passed, including 1/4/5/6/9/10 portion boundaries, deposit floors, independent order pricing, community repricing and cancellation. Production build passes. SQL migration 009 validates quantity-price snapshots and extends booking repricing; migrations and existing SQL regression checks pass. The hosted database/payment adapter is still not connected.

Admin opens at http://admin.localhost:3000/app. This remains a local demo administration workspace, without production administrator login.
