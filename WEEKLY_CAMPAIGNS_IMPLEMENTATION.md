# Weekly Sunday campaigns — local implementation

Enabled 18 existing CLP and Deepthi’s campaigns on 2 November 2026 in Osian Chlorophyll. First service Sunday: 8 November. Cutoff is Sunday 00:00 IST, so all of Saturday is bookable. At that boundary old cycles lock if their own minimum is met; otherwise their demo deposits are refunded. A new independent cycle opens for 15 November. No booking counts carry forward.

Weekly templates are stored in `.demo/state.json`; each occurrence has a stable template/date identity. Repeated refreshes and worker runs cannot create duplicate occurrences. Existing pending, unbooked seed campaigns are adopted without duplication. Historical prices, deposits, bookings and outcomes remain on each occurrence. Missed weeks during downtime are not fabricated.

Admin → Weekly campaigns: approve new/changed templates, pause/resume recurrence, inspect weekly history, adjust shared Sunday service capacity. Business → Weekly campaigns: create an offer with society/category, prices, minimum/capacity, scope, exclusions, preparation and location; edit future offers; pause/resume approved templates. Edits require Admin approval and do not rewrite the current week.

CLP has a default shared Sunday capacity of 10 appointments across its offers. Each offer still separately needs five bookings. Bakery orders count once regardless of quantity, with three minimum and ten maximum per product. The 09:00–18:00 service window is not an exact appointment: the business coordinates timing after minimum participation. Admin should set shared capacity to the actual team's available staffing.

Deposits are 10% of order total, credited against the full price. Payments/refunds are simulated; production collection, webhook confirmation, settlement and actual refunds remain unimplemented.

The local Node worker runs every minute with `npm start` or `npm run dev`; reads/actions also reconcile. It needs the local server running and catches up when restarted. No hosted scheduler or Supabase recurrence migration has been deployed. Existing SQL migrations are unchanged: this recurrence feature currently uses the local file store only. Production needs durable template/occurrence tables, a unique template/service-date constraint, transactional booking/capacity locks, ownership RLS, and an authenticated scheduled worker before this can be claimed as hosted support.

## Changed files
- lib/weeklyCampaigns.mjs: templates, lifecycle, ownership, capacity and date validation.
- lib/domain.mjs, lib/store.mjs: lifecycle integration and shared transaction queue.
- lib/businessAccounts.mjs, lib/residents.mjs: scoped template visibility.
- lib/business.mjs, lib/adminReview.mjs, lib/types.ts: category support, routing, types.
- app/components/WeeklyCampaigns.tsx, BusinessModule.tsx, BusinessAccess.tsx: management and login.
- app/app/page.tsx: coordinated Sunday-window wording.
- app/api/demo/route.ts: portal action allowlists.
- instrumentation.ts, package.json: local lifecycle worker.
- scripts/provision-clp-login.mjs: one-time targeted account provisioning, hashed password only, refuses duplicates.
- tests/weekly.test.mjs: rollover, idempotency, ownership, approval, minimum isolation, refunds, shared capacity and deposits.

Validation: 96 unit tests passed; production build passed. Browser verification caught and fixed the initial society selection crash for scoped business accounts. CLP credentials are provided directly to the user, not stored in source documentation.
