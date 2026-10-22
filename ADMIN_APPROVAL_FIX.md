# Admin approval flow repair

Business review now has explicit Approve business, Keep pending and Request changes actions. A pending status is no longer silently submitted when the admin expects approval. Admin can record a checked licence reference and expiry, with an explicit check acknowledgement. Validation runs before either credential or verification state changes. Missing, invalid or expired credentials retain the existing approval restriction.

The request dialog lists blocking conditions before submission and links directly to its business review. Successful business verification returns to the request. Selected dates exclude existing allocations even when opened from the dashboard. Request approval continues to enforce service-day credentials, capacity and round-robin override reasons. Errors are visible near the top of the modal.

The local Gajan Resturant application is still pending because no licence details were supplied. Its data and biryani request were not approved or modified during verification. The complete approve-business → approve-offer flow was tested on isolated fixtures, alongside invalid-credential rejection and pending/rejected actions. All 71 tests and the production build pass.

## Updated policy: document exceptions and blocking

Admin may now select “Approve with missing or unchecked documents” and record a decision reason. The business becomes approved with an explicit document-exception flag; credentials are not fabricated. This exception is honoured in food/pest offer approval and round-robin eligibility. The UI labels the business “Approved · documents pending”.

“Block business” requires a reason, displays it to the business and records it in the decision audit. New offers, offer approvals and bookings are prevented; resident availability lists exclude blocked providers. Existing bookings are retained for fulfilment or separate cancellation/refund decisions. Profile edits cannot remove a block. “Approve & unblock” is an Admin-only decision and clears the active block reason; the prior decision stays in audit history. Changes to a non-blocked business's scope/credentials trigger review again and clear its prior exception.

Validation: 76 application tests, production build, migrations through 010 and SQL regression checks pass. SQL checks include blocking new bookings, protecting blocks across profile changes and explicit Admin unblocking with a document exception. The running app remains the local demo store; the Supabase migration is provided for the future hosted adapter. No existing business was approved or blocked by these checks.
