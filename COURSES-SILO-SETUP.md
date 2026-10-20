# SILO and Courses update

## Apply to the existing site

1. Back up the Supabase database. This update assumes `scripts/resource-access.sql` was already run for the earlier per-card access feature. If it was never run, apply it **once** first. Do not run it again if `user_resource_access` already exists: doing so will raise a table-exists error.
2. In the Supabase **SQL Editor**, run the new `scripts/courses-and-silo.sql` file **once**. It adds the SILO permission, instructor assignment, course tables, RLS policies and a **private** `course-materials` Storage bucket. It does not grant SILO to existing accounts or change their six existing grants.
3. Copy the files from this ZIP's `research-platform` directory into your existing Windows project directory, keeping your `.env.local` and `.vercel` linkage. Then run `npx.cmd vercel --prod` in that project directory. No new environment variables or npm dependencies are needed.
4. Sign in as admin and open **Manage Access** for a regular user. Select **Courses**, optionally select **Course Instructor**, and save. Set **SILO** independently for the users who need its card. Admin accounts can access Courses and create courses without an Instructor assignment.
5. Open **Courses**. An Instructor can create a course with title, description, up to 50 video lesson links (HTTPS), and PDF/ZIP files up to 25 MB each. **Save Draft** keeps it invisible to other users; **Publish Course** makes it visible to users with Courses access. Instructors edit their own courses; admins can edit all.

## Additional update: optional supplementary link and empty courses

If you already ran `scripts/courses-and-silo.sql`, run **only** `scripts/course-supplementary-link.sql` once in the Supabase SQL Editor before publishing the updated code. Do **not** rerun the original migration. For a new install, run `scripts/resource-access.sql`, `scripts/courses-and-silo.sql`, then `scripts/course-supplementary-link.sql`, each once, in that order.

The course name is the only required content: instructors can publish without video lessons or PDF/ZIP files. They can optionally supply a supplementary HTTPS link (for example, a project page or repository). The course page shows this link to users who can view that course. Content hosted at that external URL is governed by its host, not by platform permissions.

## Fix for "new row violates row-level security policy for table courses"

For existing installations, run `scripts/course-rls-fix.sql` in the Supabase SQL Editor, then retry **Save Draft** or **Publish Course**. This fixes the SELECT policy on newly inserted course rows and does not change who may create, view, or edit courses. The script can safely be run again. New installations using the bundled `scripts/courses-and-silo.sql` already contain the corrected policy.

## README.md on courses

Run `scripts/course-readme.sql` in the same Supabase project's SQL Editor before deploying code with the README feature. It adds an optional `readme_markdown` text column to existing courses; it is safe to rerun and leaves existing content intact. Deploy the updated code after this SQL succeeds.

Course authors can paste Markdown or import a `.md` / `.markdown` file (128 KB maximum) from **Edit Course**. The editor has Edit and Preview tabs, and the formatted README appears above lessons on the course page. Course creation still requires only the course name. Rich Markdown tables, lists, code blocks, images and limited HTML are rendered with sanitization; scripts and unsafe links are discarded.

For a README copied from GitHub, put the repository URL in **Supplementary link** (for example, `https://github.com/Ahmed-Reda-SILO/ECE326-Integrated-Circuits`). Relative links such as `./lectures/ECE326_Lec01_Course_Introduction.pdf` and images such as `./assets/ece326-banner.svg` then open files from that **external GitHub repository**. This does not copy those files into the platform, and repository content remains subject to GitHub's visibility. Upload private PDF/ZIP materials separately using the existing course files control; README links are not converted to private file links.

## Check permissions

- A user without the Courses grant cannot open `/courses`, or access the private course files via Storage.
- A user with the Courses grant can see published courses and download their files; without Instructor they cannot create or edit courses.
- A user assigned Instructor can create/edit their own draft and published courses.
- Removing the Courses grant also removes Instructor permission. Removing either permission blocks future protected actions; existing files cannot be served from a public bucket.

Files upload directly from the browser to Supabase Storage and download through authenticated Storage requests, so Supabase checks permissions on every download. Videos are **external HTTPS links**; anyone who obtains the source link may still access that external video according to the video host's own settings. For stronger video protection, a private video host would be needed separately.

Large uploads above roughly 6 MB use Supabase's standard upload in this first release, which may require retrying on unreliable networks. Supabase recommends resumable uploads for those files. The 25 MB app and bucket limits are deliberate until that upload method is added.

The previous `RESOURCE-ACCESS-SETUP.md` describes the original six-card migration only; follow this file for this update.
