# Separate portals and signup

## Local addresses

- Shared public home: http://localhost:3000/ (also http://127.0.0.1:3000/)
- Resident home: http://resident.localhost:3000/
- Resident dashboard/signup: http://resident.localhost:3000/app?join=1
- Business home: http://business.localhost:3000/
- Business dashboard/signup: http://business.localhost:3000/app
- Admin entry: http://admin.localhost:3000/
- Admin workspace: http://admin.localhost:3000/app

Resident and Business homes use the same landing page. Both explain the resident and business journeys and have separate Join buttons. There is no role-switch dropdown in the dashboards. Old `?portal=` links redirect to the corresponding subdomain. Modern browsers resolve `.localhost` to loopback; the server remains bound to 127.0.0.1.

## Signup and monthly plans

Residents retain free signup, one database-selected community, residence proof submission and admin approval. Existing accounts are preserved; users may need to log in again on the new resident hostname because cookies are host-only.

Businesses register a business/contact name, email, password, phone, country, service categories and covered communities. The server assigns AED 99/month for UAE or INR 499/month for India. Form-supplied price/status values cannot override those plans. Country and community currency must match. Signup requires acknowledgement of the selected plan and creates a pending profile with a demo-pending subscription. No card details are requested and no payment or recurring charge is made.

Businesses can log in, prepare packages and submit requests from their own workspace. Add licence details in Business profile for admin verification. A subscription selection never grants verification or a calendar allocation. Existing sample providers remain in the admin catalogue; they do not receive invented passwords or automatic ownership assignments.

## Boundaries

API role comes from the hostname, not the request body or query string. Action allowlists reject cross-portal mutations. Business identity comes from its host-only HTTP-only session, and forged business IDs are overridden. Business responses contain that business's packages, offers, bookings and requests. Passwords use scrypt; raw passwords, credential hashes and session records are omitted from responses. Logout revokes the session. Changing the sign-in email or subscription country through profile editing is blocked.

Admin is still an explicitly labelled local demo workspace, not production administrator authentication. Do not expose this development server publicly. Real subscription checkout, billing lifecycle, email verification, password reset and production Admin authorization are future integrations. Supabase migration 008 supplies the subscription table with fixed country prices, pending-payment default and owner/admin reads; a trusted billing adapter must write payment state.

## Deployment configuration

Set `PORTAL_ROOT_DOMAIN` to the deployment's root domain, configure resident/business/admin DNS and TLS, and keep host-only session cookies. The public page constructs the matching subdomain links on the server. Subdomains separate navigation and sessions; production access still needs authenticated authorization on every role.

## Validation

62 automated tests passed, including business signup for both plans, invalid coverage/consent, duplicate emails, password login/logout, private response filtering and persistent session isolation. Production build and SQL migrations through 008 passed. Browser checks inspect landing, country pricing, resident signup, business signup and separate Admin navigation without creating extra demo accounts.
