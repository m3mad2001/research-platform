# Per-user resource access

1. Back up your current Supabase database. In your project, open **SQL Editor → New query**, paste the full contents of `scripts/resource-access.sql`, and run it **once**. This creates the permission table and an admin-only grant function. Existing approved users initially retain access to all six cards. Accounts approved after the migration have no resource grants until an admin assigns them.
2. Replace the project code with this ZIP, retaining your existing local `.env.local` and Vercel environment variables. From the project directory in PowerShell, run `npm ci`, then `npx.cmd vercel --prod`.
3. Log in as the admin. In **Pending Requests**, open **Set Resources** for a pending account and select any combination of cards, then **Save Access**. Approve the account when ready. For existing users, open **Manage Access** under **Active Users** and save your selection.
4. Sign in as the selected user and check that unauthorized cards show **Access not assigned**. Try `/api/software/hemox/download` as a user without Software & APK access; it must return HTTP 403. Check the same link as a user with the grant; it should download the APK.

Access status and account information remain visible. Courses, HEMOX, Firmware, Explorers, and Datasets currently have no released pages; a grant marks the card **Coming Next**. Protect any future download/page/API endpoint by checking the corresponding `user_resource_access` grant on the server before returning content.

**Important:** The SQL migration is intentionally one-time: running it a second time would hit the existing-table error instead of resetting admin choices. Run the SQL before deploying the code so the existing live version stays usable through the change.
