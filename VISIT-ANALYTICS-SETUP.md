# Visit analytics deployment

This update adds a public platform visit counter on `/register`, open counts on live resource cards, and detailed administration reports. No additional environment variables or packages are required.

1. Open your existing Supabase project → **SQL Editor**. Run the complete `scripts/visit-analytics.sql` file. It creates the visit tables, aggregate functions and administrator-only access to individual card opens. It can be run again if needed. **Run this before publishing the site code.** It expects the earlier `profiles` and `user_resource_access` tables to exist.
2. Copy this project into your existing local `research-platform` folder, keeping its existing `.env.local` and `.vercel` files. Do not overwrite them. From PowerShell in that folder, run `npx.cmd vercel --prod`.
3. Open the production `/register` page and refresh it: **Platform visits** should increase for a fresh browser session, and refreshing again in the same session should leave the count unchanged. In a signed-in user dashboard, open **Courses** or **Software & APK** and check the public card count and **Admin → Analytics**. Admins can open an individual user report for that person's card usage.

One platform visit is one browser session, renewed after 30 minutes without navigation. Visiting the registration page is counted once per session; card opens are counted per click. The public counters show aggregated counts only. Cards marked **Coming Next** have no open count until their destinations are implemented. These counters begin at zero when the SQL migration runs and do not reconstruct past visits. As with all browser-driven counters, automated or deliberately generated traffic can affect totals.
