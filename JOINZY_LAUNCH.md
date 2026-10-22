# Joinzy launch page

Run locally with `npm ci`, `npm run build`, then `npm start`. Open http://127.0.0.1:3000/ for the shared resident and business landing page. India is the default; the country selector switches illustrative prices and business membership pricing. Local resident, business and admin portals remain on their existing subdomains under `/app`.

The page includes responsive layouts, CSS 3D artwork and pointer motion, an animation pause control, reduced-motion support, a group-booking illustration, resident benefits, business onboarding, FAQs, and a working launch-interest form. Resident membership and the waitlist are free. Service bookings cost extra. Business membership is ₹499/month in India or AED 99/month in the UAE; the waitlist does not collect payment.

## Deploy the public page

Use this folder (`outputs/community-buy` if importing the entire workspace) as the project root. Vercel and Netlify configuration files are included. Use Node 22, install with `npm ci`, and build with `npm run build`. Netlify's Next.js integration handles the server route; this is not a static export.

Before publishing:

1. Create a Supabase project and run `supabase/011_launch_waitlist.sql` in its SQL editor. This migration can run independently for a landing-only launch.
2. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as server environment variables in Vercel or Netlify. Never prefix the service-role key with `NEXT_PUBLIC_`, commit it, or put it in browser code.
3. Deploy and submit a test interest from the hosted page; verify its row in Supabase's `launch_waitlist` table. Repeating the same email, audience and country does not create duplicate rows.
4. Configure your hosting provider's request-rate controls before a public campaign. The form includes a honeypot, input validation, a size limit and same-origin checking; these do not replace abuse monitoring.

On Vercel and Netlify the public landing page and waitlist endpoint are enabled, while `/app`, `/workspace` and `/api/demo` are disabled. The existing portals use local demo persistence and simulated payments and should not be presented as production services. Production portal authentication, payment processing and data integration are separate work.

Without Supabase credentials, hosted submissions report that the waitlist is unavailable rather than falsely confirming a saved entry. Locally, interests persist in `.demo/state.json` and appear in the Admin waitlist panel. Hosted entries are managed in Supabase; they do not automatically appear in the local Admin panel.

The table has row-level security and no anonymous/authenticated direct access. The server-only endpoint writes entries using the service-role credential. Contact details are excluded from resident and business state responses. Email sending is not connected; a successful submission confirms storage only. Set up an email provider and a contact/privacy support address before sending launch campaigns.

Documentation: [Vercel Next.js](https://vercel.com/docs/frameworks/full-stack/nextjs), [Netlify Next.js](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/).
