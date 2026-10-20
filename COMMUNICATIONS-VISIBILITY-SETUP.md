# Notifications, Visibility, and Contact Setup

This upgrade adds approval notifications, administrator-controlled card visibility, item-level visibility for Courses and SILO, and a private Contact Us workflow.

## 1. Apply the Supabase migration

Open **Supabase → SQL Editor**, paste the complete contents of `scripts/communications-and-visibility.sql`, and run it. The script is safe to rerun and does not delete existing users, grants, courses, SILO projects, or analytics.

## 2. Configure email in Vercel

The platform always creates an in-platform approval notification and stores Contact Us requests in the private admin inbox. To additionally deliver email, create a Resend account, verify a sender domain, then add these **Production** environment variables in Vercel:

- `RESEND_API_KEY`
- `APP_EMAIL_FROM` — for example `Engineering Nexus <notifications@your-verified-domain.example>`
- `CONTACT_RECIPIENT_EMAIL` — use `icasl.zu.eg@gmail.com`
- `NEXT_PUBLIC_SITE_URL` — for example `https://research-platform-eta-two.vercel.app`

The recipient address is read only by server code. It is not included in the Contact Us page or API response. Redeploy after changing Vercel environment variables.

## 3. Admin controls

- **Admin → Visibility** controls each dashboard card:
  - **Visible:** shown only to subscribers who have that resource grant.
  - **Locked:** shown to everyone; unassigned subscribers see a locked preview.
  - **Hidden:** hidden and blocked for non-admin accounts.
- Course and SILO editors include **Visible to assigned subscribers** for individual items.
- **Admin → Inbox** contains Contact Us messages and their workflow status.

## 4. Approval behavior

When an administrator approves a user, Supabase activates the existing access period, creates an in-platform notification, and the server attempts to send the approval email. Email failure never reverses approval; the admin button reports the delivery result.

## 5. Local verification

```powershell
npm ci
npm run test:access
npm run build
npm run dev
```

Then test Contact Us, user approval, all three card states, and hidden individual Course/SILO items with both admin and subscriber accounts.
