# India launch: explicit service packages

The four new providers are fictional demo businesses for Palm Meadows Society, Bengaluru. Hira Kitchen, Wecare and Mohan remain. This update adds catalogue packages only, with no published campaigns or resident bookings. All INR prices below are editable sample assumptions, not verified supplier quotations; confirm final tax-inclusive pricing before launch.

| Provider / package | Exactly one booking | Regular → group | Minimum |
|---|---|---|---|
| Society Fabric Care · combined pilot | 3 standard fabric sofa seating positions + top surface of 1 mattress, maximum 60 × 78 inches | ₹1,200 → ₹899 | 10 households |
| Fabric sofa alternative | 5 seating positions, no mattress | ₹1,500 → ₹1,199 | 10 households |
| Mattress alternative | 1 mattress up to 60 × 78 inches, top surface only | ₹800 → ₹599 | 10 households |
| Society Cooling Care | 1 wall-mounted split AC up to 2 ton; filter wash, accessible indoor dusting, function check | ₹699 → ₹499 | 15 AC units |
| Society Pest Care · 1 BHK | 1 flat, up to 800 sq ft carpet area; cockroaches only, one visit | ₹1,000 → ₹750 | 10 homes |
| Pest · 2 BHK | 1 flat, up to 1,200 sq ft carpet area; same defined treatment | ₹1,400 → ₹1,000 | 10 homes |
| Pest · 3 BHK | 1 flat, up to 1,600 sq ft carpet area; same defined treatment | ₹1,700 → ₹1,250 | 10 homes |
| Society Laundry Care | 1 bag of up to 5 kg accepted dry clothing; wash, dry and fold; pickup/return in society within 48 hours | ₹499 → ₹399 | 10 bags |

## Rules residents can understand

Seats are seating positions, not furniture pieces: a 3-seater plus two armchairs is five seats. The combined pilot includes only three positions. Loose cushions, recliners, leather, silk, velvet, extra mattresses, bed frames and king mattresses are excluded. Drying time depends on material and ventilation; provider confirms expectations. There are no guaranteed stain-removal claims.

AC service is basic indoor maintenance, not deep jet cleaning or repair. Gas, parts, outdoor units, ducts, window/cassette/central AC and inaccessible work are excluded. Each additional AC requires another appointment; the 15-unit target can be spread across several service days in one campaign. It is not 15 households.

Pest packages require both the stated BHK size and the floor-area limit. A 2 BHK is not eligible for the 1 BHK price even if small. Larger homes need another package or separate quote. One visit targets cockroaches only; no termite, bedbug, rodent, common-area or recurrence-warranty coverage. The provider must supply product-specific preparation, food/utensil protection, child/pet precautions and re-entry instructions. No blanket “safe for everyone” claim. The pest provider remains pending verification, so admin must verify credentials before approving offers.

Laundry is a fixed-price bag, not an open-ended per-kg estimate. Dry weight and item count are recorded with the resident at collection. A lighter bag still costs the stated package price. Excess or excluded items stay with the resident; no silent price increase. Dry-clean-only, silk/wool, delicate or embellished garments, blankets, curtains, shoes, ironing and stain guarantees are excluded. Pickup receipt, item tagging and existing-damage records are required; concerns can be reported within 48 hours for provider review. Compensation is not automatically promised.

## Scheduling and counting

One scoped booking reserves one appointment of the package duration. Sofa and pest home counts allow one active booking per resident account and normalized building/flat address in that campaign. Address entry is not independent verification of household uniqueness. AC bookings count units; laundry bookings count bags. Different package sizes have separate offers and targets; these are not pooled into a mixed-price campaign.

A 120-minute combined sofa appointment permits four homes per crew in a 09:00–17:00 day. Ten homes therefore require three equipped crews (12 available appointments), or more service days. The AC template suggests three days for the 15-unit campaign. The app rejects minimum/capacity promises larger than the generated appointment inventory. Travel/break buffers must be included in duration or available hours by the business.

The existing daily allocation rule remains: admin allocates one category/community/date to an offer. Schedule different package alternatives on separate dates. The system does not yet pool multiple package variants under one daily allocation.

## Implementation

`packageScope.mjs` validates structured quantities and booking fit. Businesses edit those fields in the package editor. `indiaLaunch.mjs` adds the catalogue idempotently and is used by fresh resets. Package scope is copied into the offer and the booking summary is retained; later package edits do not rewrite submitted offers. Resident checkout requires a scope acknowledgement and building/flat, plus BHK/area, AC tonnage or laundry weight where applicable. The server rejects mismatches and quantity greater than one per appointment. Business bookings and CSV exports include address and booked scope.

Migration 006 adds scope snapshots, confirmation details, a household uniqueness index and a service-only scoped payment RPC. A production publication adapter must copy the scope snapshot. The current app continues to use local JSON and simulated payments; Supabase deployment, private documents, provider verification and real payment collection remain separate integration work.

## Research used for scope design

Commercial menus distinguish sofa seats from mattress sizes ([Urban ProClean](https://urbanproclean.in/service), [Handych](https://www.handych.in/service/vacuum-cleaning)). Pest providers quote by home configuration and targeted treatment ([Rentokil PCI booking](https://booking.rentokil-pestcontrolindia.com/), [cockroach service](https://www.rentokil-pestcontrolindia.com/plp/pest-control-service-cockroach-treatment)). Laundry providers distinguish wash/fold from dry cleaning and use weight-based services ([Tumbledry](https://tumbledry.in/home/), [LaundryBaba](https://www.laundrybaba.in/laundry)). The precise package limits, prices and campaign minimums above are product decisions for this demo, not claims that those suppliers offer these packages.
