# Research Discussions setup

Engineering Nexus includes a gated, asynchronous research discussion area at `/discussions`.

## Enable the database tables

1. Confirm `scripts/resource-access.sql` and `scripts/courses-and-silo.sql` have been applied to the **same Supabase project** used by this deployment.
2. In the Supabase SQL Editor for that project, run `scripts/research-discussions.sql`. It creates only new discussion tables, functions, triggers, and policies; it does not modify existing profiles or resource grants. The script can be rerun.
3. Open `/discussions` with an approved account. Before the migration is run, the list displays a setup message. Afterward, post a general question and add a reply from an authorized account.
4. To give an ordinary user permission to answer other people's questions, open **Admin → Users → that user → Resource Access**, check **Discussion Responder**, and save. Course instructors can also answer discussions in resources they can access. Administrators can answer any discussion.

## Permissions

- Approved, unexpired accounts can read and create general discussions and access discussion topics for resources granted to them. Approved admins can access all topics.
- The question author can reply within their thread. Instructors, administrators, and users explicitly granted Discussion Responder may answer questions in topics they can access.
- Only a question's author or an approved administrator may accept an answer, close or reopen the discussion.
- Expired, suspended, pending, and signed-out accounts have no access. Restrictions are enforced by database grants, RLS, and security-checked functions, as well as page checks.
- The author's profile name is shown alongside their question or reply. The text is displayed as plain text; no HTML or markdown is rendered.
- Posting is limited to two questions and eight replies per minute per user. The first release uses normal page refreshes; it does not send emails or require realtime subscriptions.

## Quick checks

- A user without a SILO grant must not see or create SILO discussions, even via a direct URL or database API.
- A user without responder permission must not answer someone else's question. The question author must be able to follow up in their own open thread.
- Accepting a reply must mark only a reply belonging to that discussion. Closing it must prevent new replies, including direct API inserts.
- An administrator can grant and revoke Discussion Responder without changing the user's existing resource grants.

Deployment: keep `.env.local` and the existing `.vercel` link when replacing local source, run the migration in Supabase, then build and deploy the updated project using `npx.cmd vercel --prod` from the project directory. The new migration is necessary before the feature becomes usable.
