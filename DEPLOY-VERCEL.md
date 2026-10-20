# Publish the Research Platform on Vercel

This project uses Next.js server routes, Supabase Auth, and an access-controlled APK download. Deploy the whole project folder; the generated `*.vercel.app` address is enough to make the site publicly reachable. Users still need an approved Supabase account to open protected pages or download the APK.

## 1. Prepare the project on your computer

Extract the delivered ZIP. Open PowerShell in the inner `research-platform` directory, the one containing `package.json`, then run `npm ci`. Keep your already-working `.env.local` from your local project; it is deliberately absent from the archive. It must contain the Project URL and publishable key for the **same Supabase project** your two accounts currently use. Do not place a service-role or secret key in a `NEXT_PUBLIC_` variable.

Before making the site public, verify the `profiles` table has appropriate RLS policies and that admin approval functions enforce the caller's role in the database. `scripts/check-account.sql` includes a read-only policy/account check; the authenticated UI and the APK route already check the current user and active profile on the server.

## 2. Link the folder to Vercel

Run these commands in PowerShell (Node.js and npm are required):

```powershell
npx vercel login
npx vercel link
```

Sign in to your own Vercel account in the browser. At the link prompts, choose your account, create a new project if no Research Platform project exists, and use `research-platform` as the project name if it is available. Keep the root directory as the current folder (`./`). Vercel writes a local `.vercel` directory, which this project already excludes from ZIPs and Git.

## 3. Configure the production environment **before** deploying

Read the values from your existing `.env.local` on your computer. Run the following commands separately and paste the corresponding value into the Vercel CLI prompt for each one:

```powershell
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
```

Use the same variable names and values that make local sign-in work. These are browser-visible Supabase configuration values, **not** service-role keys. Do not send credentials or Vercel login codes in chat, include `.env.local` in a ZIP, or commit it to Git. Environment variables configured after a deployment need a fresh deployment to take effect.

## 4. Publish and connect Supabase Auth

```powershell
npx vercel --prod
```

Copy the actual production URL shown by Vercel (for example `https://research-platform.vercel.app`; your project name may differ). In the **same** Supabase project, go to **Authentication → URL Configuration**. Set **Site URL** to the exact production URL. Add the exact hostname followed by `/**` under **Redirect URLs** (for example `https://research-platform.vercel.app/**`); keep `http://localhost:3000/**` there if you still use local development. Avoid a broad `*.vercel.app` production allowlist. If you later change the production domain, update Supabase again.

## 5. Verify from a separate device or private browser window

1. Open the actual public URL without signing in: the home and sign-in pages should load.
2. Sign in with an approved user: the user dashboard should load, and Software & APK should download `HEMOXV1.3.7.1.apk`.
3. Sign out and verify `/api/software/hemox/download` responds with `401` without an active session.
4. Sign in as an approved administrator: `/admin` should load; a suspended, pending, or expired normal user should not gain protected access.
5. Submit a test registration if needed: any confirmation email should point to the production URL, and the newly registered user should stay pending until approved.

The APK is stored at `assets/software/HEMOXV1.3.7.1.apk`, outside `public/`. `next.config.ts` explicitly includes it in the protected download route's server file trace; include the `assets` directory on every redeployment. Supabase approval and RLS data remain in your existing Supabase project.

Vercel's free Hobby plan is for personal, non-commercial use. Review the hosting plan if this becomes an institutional or commercial service.
