# Business module — implemented scope

## Confirmed allocation rule
Different businesses may serve the same category on different days in one week. One category + community + calendar date has at most one active approved provider. Requests cover a Monday–Sunday week, but exclusivity is daily, not weekly. A business can request several days; Admin may approve a subset if the remaining appointment capacity still meets the minimum.

## Business workspace
- Overview with review counts, published offers, customer bookings and simulated deposit totals.
- Six separately scoped demo businesses; switching accounts changes their packages, offers, schedules and bookings.
- Editable business profile, contact information, credentials, category capabilities and community coverage. Capability/credential changes return the business to review.
- Reusable service packages with description, inclusions/exclusions, unit, duration, price, deposit, optional HTTPS photo, preparation instructions and cancellation text. AED and INR are separate packages.
- Weekly offers with package snapshot, service dates, working hours, per-slot capacity, total capacity, minimum participation, household limit, booking-open and expiry timestamps, service location and admin notes.
- Save draft, submit, edit unpublished requests, withdraw, receive admin feedback and resubmit. Approved pricing/schedules cannot be edited by the business.
- Weekly approved schedule, detailed offer previews, searchable/filterable bookings and CSV export.
- Complete individual appointments after the booking window is locked; demo balance is settled and the final completed booking completes the offer.

## Launch categories
Sofa cleaning; standard AC cleaning; appliance servicing packages; scheduled salon appointments; laundry pickup; standard handyman tasks; pest control; tuition batches; car detailing; licensed food orders.

Appointment duration and capacity support one-person visits, multiple crews, tuition seats and food-order pickup windows. Food packages include demo ingredient/allergen instructions. Credential requirements are configurable; the demo flags food and pest control for current credentials. This is a workflow demonstration, not a statement of jurisdiction-specific licensing requirements.

## Admin control
Pending requests include package details, dates, capacity and business notes. The rotation recommends eligible verified providers by:
1. Fewest active allocated days in that category/community during the requested week.
2. Oldest last award, with never-selected businesses first.
3. Business registration order for ties.

Price does not determine the order. Admin has the final decision and must record a decision reason. Selecting anyone other than the recommended provider also requires an override reason, retained with the allocation and activity log. Requests on occupied dates cannot be approved. Approving one provider does not silently approve or reject its competitors: the remaining request stays pending for an explicit decision or revision.

Cancelled and failed deals release their allocated dates. Completed service dates stay in rotation history. No changes are made automatically to resident supplier selections. Expired requests must be revised before approval.

## Resident publication
Only approved service offers appear in discovery, grouped/filterable by the launch categories. Offers approved ahead of their booking window show Scheduled and cannot be booked early. Residents inspect scope and instructions, choose a service/pickup slot, and reserve with a simulated deposit. Both overall capacity and per-slot capacity are enforced, as is the household limit. Unpublished drafts, pending requests, withdrawn requests and rejections remain hidden.

Legacy demo deals remain in persisted data. Existing resident bookings remain accessible, while discovery focuses on the service launch catalogue. No existing demo state is reset during module installation.

## Scheduling details
Weekly allocation uses local service dates. Dubai uses UTC+04:00 and the Indian sample community uses UTC+05:30. Booking close must precede the first service appointment. Slots are generated from the duration, service hours and per-slot capacity. Capacity cannot exceed those generated slots. All requested dates must be in the same week.

## Validation
24 automated tests cover lifecycle and booking arithmetic, request ownership, scheduling validation, currency matching, partial approvals, rotation overrides, date collisions, household limits, per-slot capacity, cancellation, refunds, verification and fulfillment. A persistent-store test verifies simultaneous approvals yield exactly one winner, and 20 requests for a one-capacity slot yield exactly one reservation.

Browser verification: create weekly offer → admin override validation → approval/calendar allocation → resident category discovery → appointment booking → correct business booking list. Desktop and 390px mobile layouts checked.

## Deployment boundary
The running application remains a local, single-process demo using `.demo/state.json`. The account/role switchers are deliberate impersonation controls, not real authentication. Payments, settlement, refunds and credential verification remain simulated.

`supabase/002_business_module.sql` extends the original schema with business profiles, service packages, slots, daily allocations, RLS, SQL rotation ranking and service booking/approval functions. Apply after `schema.sql` and `seed.sql`. A partial unique index guarantees one active category/community/date allocation. An approval transaction records the selection and allocation; a booking trigger prevents the older booking RPC from bypassing slot checks.

Hosted integration still requires authenticated business provisioning, a trusted offer-snapshot/slot creation adapter, independent credential review, real payment and refund workers, balance reconciliation and a scheduler calling `open_scheduled_services()` followed by `expire_deals()`. SQL artifacts do not connect the Next.js demo to Supabase. Demo deadline reconciliation happens on API requests.

Cross-category staff/crew conflict management, recurring tuition terms, dispatch routing, document uploads, real invoices and multi-business team permissions are outside this module's implemented MVP scope. Optional photos use HTTPS URLs, not uploads. INR seed prices are illustrative sample amounts, not currency conversions or market quotations.

Additional SQL validation: the original schema, seeds and Business migration all executed successfully in an isolated PGlite PostgreSQL test database with mocked Supabase auth roles. The SQL approval and booking RPCs were exercised: approval succeeded, a conflicting date was rejected, a service deposit was recorded, and a capacity-exceeding request was rejected. This validates migration execution and those transaction paths locally; it does not verify a hosted Supabase deployment or its complete RLS/auth integration.
