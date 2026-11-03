# Customer experience update

Customer portal now shares the homepage's cream, lilac and purple styling, Joinzy logo and typography. The old resident sidebar, illustration, repeated rules, general service waitlist and inactive category buttons have been removed. Offer cards show price, savings, independent minimum progress and Sunday date; full scope and deposit terms appear in checkout. Search, actual available categories, business filters, ascending/descending price and percentage-savings sorting are available. Mobile uses a single-column card grid, wrapping controls and a scrollable checkout with keyboard focus handling.

Homepage Log in and Sign up lead to the resident portal. Only Altis Ashraya (Mangadu) and Osian Chlorophyll accept signup. Other societies have a dedicated request form backed by the existing society-interest endpoint. Existing Admin/business workflows and customer bookings are retained.

Server enforcement: unauthenticated resident responses contain no offers, vendors, packages, allocations or bookings. Authenticated offers are restricted to the member's society. Signup and booking reject inactive societies; membership approval is still required to book. This remains a local demo, not a production security/deployment claim. No SQL schema changes were necessary for the local implementation.

Changed: app/components/CustomerPortal.tsx, SocietyRequest.tsx, Landing.tsx; app/customer.css; app/layout.tsx; app/app/page.tsx; lib/customerAccess.mjs, residents.mjs, store.mjs; tests/customer-access.test.mjs and updated resident/community tests for the new launch restriction.

Verification: 99 tests pass, production build passes, live anonymous API contains no offers and only two active societies. Browser checked signed-in discovery, Bakery filter (11 cards), ascending price (₹95 brownie first), booking details and India-time cutoff. At 390px width the page and modal have no horizontal overflow. Existing test bookings remain intact. No extra live booking or charge was created during this redesign.
