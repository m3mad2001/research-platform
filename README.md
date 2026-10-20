# Engineering Nexus

Integrated Engineering Research Platform · From Silicon to Intelligent Healthcare

Next.js 16 platform for engineering education, software, interactive research tools, and HEMOX. Authentication and access control use Supabase.

Approval notifications, subscriber card/item visibility, and the private Contact Us inbox are configured in [COMMUNICATIONS-VISIBILITY-SETUP.md](COMMUNICATIONS-VISIBILITY-SETUP.md).

## Android app preparation

This version includes an installable web manifest, mobile launcher icons, and a verified-domain setup helper for a Trusted Web Activity. See [android/README.md](android/README.md) for the steps that require the final live site URL, Android package ID, Play signing certificate, and Play Console account. The Android App Bundle is generated after those values are confirmed; the included ZIP is the web source and Android release instructions, not a signed Play submission.

For discussion threads, replies, and administrator-assigned responder permissions, run the new Supabase migration described in [RESEARCH-DISCUSSIONS-SETUP.md](RESEARCH-DISCUSSIONS-SETUP.md) before using `/discussions`.

## Run locally

1. Run `npm ci` with Node.js 20.9 or newer.
2. In the project root (the directory containing `package.json`), copy `.env.example` to `.env.local` (`Copy-Item .env.example .env.local` in PowerShell). In the [Supabase project Connect dialog](https://supabase.com/docs/guides/getting-started/api-keys#find-your-keys), find the Project URL and **publishable** key. Replace the two sample values with your actual values, keeping the names `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Do not use a secret or service-role key. Keep `.env.local` private.
3. Run `npm run dev` and open `http://localhost:3000`.

If you already have a working `.env.local`, keep it rather than replacing it. This file is intentionally excluded from the delivered ZIP. The supplied `node_modules` and `.next` folders were also excluded: reinstall dependencies with `npm ci`. Restart `npm run dev` after editing `.env.local`; if running a production build, set the values before `npm run build` and rebuild after changes. With missing or sample values, `/login` and `/register` show a setup message until configured.

## Publish on Vercel

Follow [DEPLOY-VERCEL.md](DEPLOY-VERCEL.md) to link this folder directly to a Vercel account, set the two public Supabase variables before the first deployment, and configure the final URL in Supabase Auth. A Git repository or purchased domain is not required for the CLI route.

## Sign-in and access

Run the SQL update in [ADMIN-ACCESS-SETUP.md](ADMIN-ACCESS-SETUP.md) before deploying this version. Administrators can choose an expiry or no expiry, extend access, renew expired accounts, and suspend or revoke access from **Manage Access**.

- Password sign-in uses Supabase Auth; approval, role, and expiry come from the `public.profiles` row for the authenticated user's ID.
- Approved admins go to `/admin`; approved users with a future expiry or administrator-selected no expiry go to `/dashboard`.
- Pending, suspended, expired, and unconfigured users see an access message on the sign-in page.
- A missing or inaccessible profile cannot be repaired by changing the email in the UI. Run the **read-only** `scripts/check-account.sql` in the Supabase SQL Editor for the project used by `.env.local`. It checks `ahmed.mohamed@kfupm.edu.sa` and the `profiles` SELECT policies. Set up/approve the correct profile in Supabase using your existing administrator workflow after verifying the account owner. Do not assign the admin role on the client.
- If password authentication fails, check whether the user exists, whether the email is confirmed, and whether the password is correct in Supabase Authentication. If the password is accepted but the profile lookup fails, check the profile row and RLS policies.

The database and authentication service are external to this source archive; changes to them require access to the matching Supabase project. The home page is public; the admin and dashboard pages independently verify the current user and profile on the server.

## HEMOX Android download

The Software & APK section of the user dashboard links to the bundled `assets/software/HEMOXV1.3.7.1.apk`. The APK is **outside** `public/`; `/api/software/hemox/download` checks the signed-in Supabase user and approved profile before serving it. Approved users require an unexpired access period; approved admins can also download. Include the `assets/software` directory when deploying the project. The Next.js file trace is configured to bundle this APK in traced server deployments. Avoid hosting this archive on an unprotected static server if access control is required.
