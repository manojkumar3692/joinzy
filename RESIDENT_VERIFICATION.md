# Resident signup and verification

Implemented in the canonical `/Users/manoj/Documents/joinz` project.

Signup requires name, one of the two active societies, email, phone number, block/building, flat/door number and password. No document is required to create an account. Signup establishes a session, with membership pending. Residents can browse their society's offers; booking remains server-side gated on admin approval.

The Account page accepts maintenance receipts, current rental agreements, electricity/piped-gas bills, society-issued confirmation, or optional masked Aadhaar. UI requests bills within three months, current tenancy dates, visible name/address/flat/date and allows redacting unrelated information. Document review is manual. Phone and email are collected but not OTP-verified.

Documents are PNG/JPG/PDF up to 2 MiB. Residents declare whether their name appears and explain the relationship if it does not. Pending or rejected residents can submit or replace proof; replacement returns to pending and clears the previous feedback. Approved residents cannot replace proof via this endpoint.

Admin sees contact and society/address details, submission type/time, name mismatch explanation, downloadable proof and an image preview. Admin can approve or request another document with a reason. The backend prevents approval without proof. Resident and business responses never expose other residents' proofs or credentials.

Existing accounts retain their status. Older accounts without contact/address fields display those details as not provided; no fabricated values are added.

Validation: 110 tests pass, production build passes, signup inspected in-browser, and isolated HTTP verification covered signup → browse → blocked booking/approval → upload → admin details → replacement request → resubmit → approval → logout. No live records changed by the isolated test.

Changed implementation: `lib/residents.mjs`, `lib/types.ts`, `app/components/ResidentAccess.tsx`, `app/components/ResidentReviews.tsx`, `app/components/CustomerPortal.tsx`. Updated resident signup test fixtures and test-account provisioning script; added `tests/residentVerification.test.mjs`.

Launch boundary: this local app still uses file-backed state and host-based admin access. Real resident documents require authenticated admin access, private production document storage and a defined retention/deletion policy before public launch. These changes do not add SMS/email verification or production document storage.

## Admin navigation update
Resident verification is in the admin sidebar with a count of uploaded documents awaiting review. Signup society choices include Chennai. Customer header navigation is vertically aligned; signed-in navigation uses a dedicated row on narrow screens.

Recurring offers are now managed through one Campaigns section with business/status filters. The original CLP and bakery setup panels remain under Initial catalogue setup tools for compatibility. New businesses use Business → Weekly campaigns → Create new campaign; admin verifies the business and approves the campaign before publication. Approving a business alone does not create a campaign. Coupon/shipping package configuration still requires the existing special setup; the standard new-campaign form covers service and food offers.

Validation of navigation changes: 110 regression tests and TypeScript checks pass. Browser verified Chennai choices, resident verification, all 19 recurring campaigns, and filtering HOUSE OF EON to one campaign. The user's running development server was left running and was not restarted.
