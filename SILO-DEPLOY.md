# SILO and management reports

## Deploy the update

1. Preserve your current `.env.local` and Vercel project link when replacing the app files.
2. In the same Supabase project's **SQL Editor**, run `scripts/silo-and-reports.sql` once. It requires the previously applied `scripts/courses-and-silo.sql` and `scripts/visit-analytics.sql` migrations. The script is safe to rerun and retains existing visit history and course data.
3. In your local project folder on Windows, run `npx.cmd vercel --prod`.
4. Open the deployed dashboard. Give a user the **SILO** card under **Admin → User → Resource Access**. Optionally assign **SILO Editor** for permission to create and publish their own projects.

The new `/silo` page starts with the current public GitHub research artifact and its README. The administrator can edit it, add further projects, enter GitHub/HTTPS links, import or paste README Markdown, and optionally attach PDF/ZIP files up to 25 MB each. A project needs only a title to publish; no files or links are required. Supabase Storage is private and enforces access for each download. Links to GitHub files use the repository's own permissions and availability.

The admin analytics section gains a 30-day UTC trend and a ranked card list. Existing site visits remain counted, and SILO card opens are recorded after this update. These counts measure browser sessions and card clicks; they cannot reconstruct historical clicks before tracking was installed. The migration does not require changes to the Supabase public URL or publishable key.

## Troubleshooting

- If **Admin → Manage Access** says resource permissions are unavailable and specifically names `scripts/silo-and-reports.sql`, run that file in the same Supabase project's SQL Editor and refresh the page.
- If a user selects SILO and appears to return to the dashboard, read the notice shown at the top of the dashboard. A setup notice means the SILO migration is missing; an access notice means the user's SILO checkbox has not been saved by an administrator.
- The migration is safe to rerun. It uses `if not exists`, `create or replace`, and conflict-safe seeding, and it does not reset existing course, resource-access, or analytics data.
