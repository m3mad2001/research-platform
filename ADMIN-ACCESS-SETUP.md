# Administrator-controlled access

## Apply this update

1. Open the Supabase project used by your platform, then open **SQL Editor**.
2. Paste and run the complete contents of `scripts/admin-access-control.sql`.
3. Redeploy this project using your existing Vercel workflow.
4. Sign in as the administrator and open **Admin → Active Users → Manage Access**. Expired and suspended users also have **Manage Access** under **Inactive Accounts**.

The SQL update is safe to rerun. It preserves existing accounts, expiry dates, and resource permissions. No service-role key is needed in the application.

## Approve a new request

In **Pending Requests**, choose **7 days**, **30 days**, **90 days**, **Custom expiry date**, or **No expiry**, then click **Approve**. Any access settings already saved for the pending account are preselected. Preset durations begin when you approve the account.

## Change an existing user's access

Open **Manage Access → Access Period & Status**:

- Choose a custom expiry or **No expiry**, then click **Save Access Settings**.
- Use **+7 Days**, **+30 Days**, or **+90 Days** to extend the saved expiry. If that date has passed, the extension begins from today.
- An extension renews an expired account. A suspended account stays suspended until you click **Resume Access**.
- Use **Renew Access** to reactivate an expired account with the selected custom expiry or no expiry.
- Use **Suspend Access** to stop access while keeping its saved duration.
- Use **Revoke Access** to expire access immediately. You can renew the account later.

Saving a pending account's expiry does not approve it. Saving a suspended account's expiry does not resume it. Resource card permissions are managed separately in the existing **Resource Access** section.

Custom date fields explicitly use **Saudi time (UTC+03:00)**. The database stores the corresponding timestamp. **No expiry** displays as **Unlimited** for days remaining and **No expiry** for the expiry date.

## Verification

Run `npm ci`, `npm run test:access`, `npx tsc --noEmit`, and `npm run build`.

The access tests run an isolated PostgreSQL instance in memory; they do not connect to your Supabase database. They verify account transitions, administrator authorization, stale changes, invalid expiry values, and resource access rules.

For no expiry, the existing timestamp field stores PostgreSQL's positive `infinity`. Existing database checks such as `expires_at > now()` continue to work. Null or invalid expiry values do not grant access. The application uses the same authorization helper for sign-in, the dashboard, discussions, and APK downloads.

Only approved administrators may run the access-management function. Database updates to role, status, approval time, and expiry are also protected from ordinary signed-in users. If another administrator changes an account before you save it, refresh the page and review the current values.
