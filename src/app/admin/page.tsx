import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../utils/supabase/server";
import ApproveButton from "./ApproveButton";
import { effectiveAccessStatus, formatAccessExpiry, hasActiveAccess } from "../../lib/access-policy";
import LogoutButton from "../../components/LogoutButton";
import { resourceOptions } from "../../lib/resources";
import AdminVisitChart from "../../components/AdminVisitChart";
import { BrandLockup, PillarStrip } from "../../components/HealthTwinBrand";

export default async function AdminPage() {
  const supabase = await createClient();

  // =========================================================
  // AUTHENTICATION
  // =========================================================
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // =========================================================
  // VERIFY ADMIN
  // =========================================================
  const { data: adminProfile, error: adminError } = await supabase
    .from("profiles")
    .select("full_name, email, role, status")
    .eq("id", user.id)
    .single();

  if (
    adminError ||
    !adminProfile ||
    adminProfile.role !== "admin" ||
    adminProfile.status !== "approved"
  ) {
    redirect("/");
  }

  // =========================================================
  // LOAD USERS
  // =========================================================
  const { data: users, error: usersError } = await supabase
    .from("profiles")
    .select(
      `
      id,
      full_name,
      email,
      institution,
      intended_use,
      role,
      status,
      created_at,
      approved_at,
      expires_at
      `
    )
    .eq("role", "user")
    .order("created_at", {
      ascending: false,
    });

  const userList = users ?? [];

  const pendingUsers = userList.filter(
    (profile) => profile.status === "pending"
  );

  const approvedUsers = userList.filter(
    (profile) => hasActiveAccess(profile)
  );

  const expiredUsers = userList.filter(
    (profile) => effectiveAccessStatus(profile) === "expired"
  );

  const suspendedUsers = userList.filter(
    (profile) => profile.status === "suspended"
  );

  const [siteStatsResult, resourceMetricsResult, recentResourceResult, trendsResult] = await Promise.all([
    supabase.rpc("get_site_visit_stats"),
    supabase.rpc("get_admin_resource_metrics"),
    supabase.from("resource_visits")
      .select("id, user_id, resource_key, opened_at")
      .order("opened_at", { ascending: false }).limit(25),
    supabase.rpc("get_admin_visit_trends", { p_days: 30 }),
  ]);
  const siteStats = siteStatsResult.error ? null : siteStatsResult.data as {
    site_visits: number; registration_visits: number; since: string | null;
  } | null;
  const resourceMetrics = (resourceMetricsResult.data ?? []) as Array<{
    resource_key: string; total_visits: number; unique_users: number;
    last_7_days: number; last_30_days: number;
  }>;
  const recentResourceOpens = recentResourceResult.data ?? [];
  const trends = (trendsResult.data ?? []) as Array<{
    visit_date: string; site_visits: number; registration_visits: number; resource_opens: number;
  }>;
  const rankedCards = resourceOptions.filter((item) => ["courses", "software", "silo"].includes(item.key))
    .map((item) => ({ ...item, metrics: resourceMetrics.find((row) => row.resource_key === item.key) }))
    .sort((a, b) => Number(b.metrics?.total_visits ?? 0) - Number(a.metrics?.total_visits ?? 0));
  const userNames = new Map(userList.map((member) => [member.id, member.full_name || member.email]));

  return (
    <main className="research-shell min-h-screen overflow-hidden text-white">
      {/* =====================================================
          TOP HEADER
      ===================================================== */}
      <header className="relative z-40 border-b border-cyan-400/10 bg-[#020817]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between px-6 py-4 lg:px-8">
          {/* Brand */}
          <BrandLockup />

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link href="/courses" className="research-btn-secondary hidden text-sm sm:inline-flex">Courses</Link>
            <Link href="/silo" className="research-btn-secondary hidden text-sm sm:inline-flex">SILO</Link>
            <Link href="/discussions" className="research-btn-secondary hidden text-sm sm:inline-flex">Discussions</Link>
            <Link href="/admin/resources" className="research-btn-secondary hidden text-sm lg:inline-flex">Visibility</Link>
            <Link href="/admin/contact" className="research-btn-secondary hidden text-sm lg:inline-flex">Inbox</Link>
            <Link
              href="/"
              className="research-btn-secondary text-sm"
            >
              Platform Home
            </Link>

            <LogoutButton />
          </div>
        </div>
      </header>
      <nav className="healthtwin-mobile-links" aria-label="Administration navigation"><Link href="/admin">Overview</Link><Link href="#pending">Requests</Link><Link href="#active-users">Users</Link><Link href="#analytics">Analytics</Link><Link href="/admin/resources">Visibility</Link><Link href="/admin/contact">Inbox</Link><Link href="#inactive-users">Inactive</Link><Link href="/courses">Courses</Link><Link href="/silo">SILO</Link><Link href="/discussions">Discussions</Link></nav>

      <div className="relative mx-auto flex max-w-[1800px]">
        {/* =====================================================
            SIDEBAR
        ===================================================== */}
        <aside className="relative z-30 hidden min-h-[calc(100vh-77px)] w-64 shrink-0 border-r border-cyan-400/10 bg-[#020a19]/90 px-4 py-7 backdrop-blur-xl xl:block">
          <div className="mb-7 px-3">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-400">
              Administration
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Platform Control Center
            </p>
          </div>

          <nav className="space-y-2">
            <AdminNavItem
              href="/admin"
              icon="⌂"
              label="Overview"
              active
            />

            <AdminNavItem
              href="#pending"
              icon="◷"
              label="Pending Requests"
            />

            <AdminNavItem
              href="#active-users"
              icon="◎"
              label="Active Users"
            />

            <AdminNavItem
              href="#analytics"
              icon="⌁"
              label="Analytics"
            />

            <AdminNavItem
              href="#inactive-users"
              icon="◫"
              label="Inactive Accounts"
            />
            <AdminNavItem href="/discussions" icon="✦" label="Research Discussions" />
            <AdminNavItem href="/admin/resources" icon="◈" label="Card Visibility" />
            <AdminNavItem href="/admin/contact" icon="✉" label="Contact Inbox" />
          </nav>

          {/* Admin system status */}
          <div className="absolute bottom-8 left-5 right-5 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>

              <p className="text-xs font-semibold text-emerald-300">
                Admin System Active
              </p>
            </div>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Manual approval and administrator-controlled research access.
            </p>
          </div>
        </aside>

        {/* =====================================================
            MAIN CONTENT
        ===================================================== */}
        <div className="relative min-w-0 flex-1">
          {/* Dynamic background */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="research-grid absolute inset-0 opacity-25" />

            <div className="research-orb research-orb-one" />
            <div className="research-orb research-orb-two" />

            <div className="research-scanline" />
          </div>

          <div className="relative z-10 px-6 py-8 lg:px-10">
            {/* =================================================
                HERO
            ================================================= */}
            <section className="research-hero healthtwin-admin-hero relative overflow-hidden border border-cyan-400/15">
              <div className="research-hero-grid" />
              <div className="research-hero-glow" />

              {/* ECG */}
              <div className="absolute right-0 top-1/2 hidden w-[48%] -translate-y-1/2 opacity-35 lg:block">
                <svg
                  viewBox="0 0 800 180"
                  className="h-auto w-full overflow-visible"
                >
                  <path
                    className="ecg-path"
                    d="
                      M0 95
                      L70 95
                      L95 88
                      L115 95
                      L145 95
                      L170 30
                      L195 155
                      L220 95
                      L275 95
                      L305 80
                      L335 95
                      L375 95
                      L400 40
                      L425 148
                      L450 95
                      L510 95
                      L545 87
                      L565 95
                      L600 95
                      L625 28
                      L650 154
                      L675 95
                      L800 95
                    "
                  />
                </svg>
              </div>

              <div className="relative z-10 max-w-3xl px-8 py-10 lg:px-10 lg:py-12">
                <p className="research-section-title">
                  Administration
                </p>

                <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
                  Admin{" "}
                  <span className="text-cyan-400">
                    Dashboard
                  </span>
                </h1>

                <p className="mt-4 text-base text-slate-300">
                  Welcome,{" "}
                  <span className="font-semibold text-white">
                    {adminProfile.full_name || "Administrator"}
                  </span>
                  .
                </p>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
                  Manage research access, approve users, monitor
                  account status, and review individual platform
                  activity and engagement analytics.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <span className="research-badge research-badge-success">
                    ● Administrator Active
                  </span>

                  <span className="research-badge">
                    Manual Approval
                  </span>

                  <span className="research-badge">
                    Flexible User Access
                  </span>
                </div>
              </div>
            </section>

            <PillarStrip compact />

            {/* =================================================
                SUMMARY
            ================================================= */}
            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <AdminStatCard
                label="Pending Requests"
                value={pendingUsers.length}
                icon="◷"
                tone="amber"
              />

              <AdminStatCard
                label="Active Users"
                value={approvedUsers.length}
                icon="✓"
                tone="green"
              />

              <AdminStatCard
                label="Expired Users"
                value={expiredUsers.length}
                icon="⌛"
                tone="purple"
              />

              <AdminStatCard
                label="Suspended Users"
                value={suspendedUsers.length}
                icon="!"
                tone="red"
              />
            </section>

            {/* =================================================
                SYSTEM STATUS
            ================================================= */}
            <section className="research-glass mt-5 grid gap-6 rounded-2xl p-6 sm:grid-cols-2 xl:grid-cols-4">
              <SystemField
                label="Administrator"
                value={adminProfile.full_name || "Administrator"}
              />

              <SystemField
                label="Approval Mode"
                value="Manual"
              />

              <SystemField
                label="Access Duration"
                value="Set per user"
              />

              <SystemField
                label="Platform Status"
                value="Operational"
                highlight
              />
            </section>

            {/* =================================================
                PENDING USERS
            ================================================= */}
            <section
              id="pending"
              className="research-panel mt-8 p-6 lg:p-8"
            >
              <SectionHeader
                eyebrow="User Management"
                title="Pending Access Requests"
                description="Review registration requests. Choose an access duration before approving each user."
                count={pendingUsers.length}
              />

              {usersError && (
                <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/5 p-5 text-sm text-red-300">
                  Unable to load users: {usersError.message}
                </div>
              )}

              {!usersError && pendingUsers.length === 0 && (
                <EmptyState
                  icon="✓"
                  title="No pending requests"
                  text="New registration requests will appear here automatically."
                />
              )}

              {!usersError && pendingUsers.length > 0 && (
                <div className="mt-6 space-y-4">
                  {pendingUsers.map((pendingUser) => (
                    <div
                      key={pendingUser.id}
                      className="group grid gap-6 rounded-2xl border border-white/10 bg-[#061226]/80 p-6 transition duration-300 hover:border-cyan-400/20 hover:bg-[#08172e] xl:grid-cols-[1.3fr_0.8fr_0.9fr_auto] xl:items-center"
                    >
                      <UserIdentity
                        name={pendingUser.full_name}
                        email={pendingUser.email}
                      />

                      <UserInformation
                        label="Institution"
                        value={pendingUser.institution}
                      />

                      <UserInformation
                        label="Intended Use"
                        value={pendingUser.intended_use}
                      />

                      <div className="flex flex-col items-start gap-3">
                        <Link href={`/admin/users/${pendingUser.id}`} className="text-sm font-semibold text-cyan-300 hover:text-cyan-100">
                          Set Resources →
                        </Link>
                        <ApproveButton userId={pendingUser.id} initialExpiresAt={pendingUser.expires_at} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* =================================================
                ACTIVE USERS
            ================================================= */}
            <section
              id="active-users"
              className="research-panel mt-8 p-6 lg:p-8"
            >
              <SectionHeader
                eyebrow="Research Access"
                title="Active Users"
                description="Approved researchers with active platform access. Open a user report to review sessions, active time, and activity analytics."
                count={approvedUsers.length}
              />

              {approvedUsers.length === 0 ? (
                <EmptyState
                  icon="◎"
                  title="No active users"
                  text="Approved users will appear here."
                />
              ) : (
                <div className="mt-6 space-y-4">
                  {approvedUsers.map((approvedUser) => (
                    <div
                      key={approvedUser.id}
                      className="group grid gap-6 rounded-2xl border border-white/10 bg-[#061226]/80 p-6 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-400/25 hover:bg-[#08172e] xl:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_auto] xl:items-center"
                    >
                      <UserIdentity
                        name={approvedUser.full_name}
                        email={approvedUser.email}
                      />

                      <UserInformation
                        label="Institution"
                        value={approvedUser.institution}
                      />

                      <UserInformation
                        label="Approved"
                        value={formatDate(
                          approvedUser.approved_at
                        )}
                      />

                      <UserInformation
                        label="Expires"
                        value={formatAccessExpiry(approvedUser.expires_at)}
                      />

                      <Link
                        href={`/admin/users/${approvedUser.id}`}
                        className="research-btn-primary whitespace-nowrap text-sm"
                      >
                        Manage Access →
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* =================================================
                ANALYTICS
            ================================================= */}
            <section
              id="analytics"
              className="mt-8 grid gap-5 lg:grid-cols-3"
            >
              <AnalyticsFeature
                number="01"
                title="Session Analytics"
                description="Review login, logout, last-seen, session duration, and actual active-time metrics."
              />

              <AnalyticsFeature
                number="02"
                title="Daily Activity"
                description="Monitor active usage trends throughout the user's controlled access period."
              />

              <AnalyticsFeature
                number="03"
                title="Resource Analytics"
                description="Course, HEMOX, software, firmware, explorer, and dataset activity will be tracked as the modules are enabled."
              />
            </section>

            <section className="research-panel mt-5 p-6 lg:p-8" aria-label="Platform visit analytics">
              <div className="mb-6">
                <p className="research-section-title">Engagement</p>
                <h2 className="mt-2 text-2xl font-bold">Platform &amp; Resource Visits</h2>
                <p className="mt-2 text-sm text-slate-400">Browser sessions and resource opens recorded since tracking began.</p>
              </div>
              {!siteStats || resourceMetricsResult.error || recentResourceResult.error ? (
                <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
                  Visit analytics are unavailable. Run scripts/visit-analytics.sql in Supabase SQL Editor.
                </p>
              ) : <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="research-glass rounded-xl p-5">
                    <p className="text-sm text-slate-400">Platform visits</p>
                    <p className="mt-2 text-3xl font-bold text-cyan-300">{Number(siteStats.site_visits).toLocaleString("en-US")}</p>
                  </div>
                  <div className="research-glass rounded-xl p-5">
                    <p className="text-sm text-slate-400">Registration page visits</p>
                    <p className="mt-2 text-3xl font-bold text-cyan-300">{Number(siteStats.registration_visits).toLocaleString("en-US")}</p>
                  </div>
                  <div className="research-glass rounded-xl p-5">
                    <p className="text-sm text-slate-400">Registered accounts</p>
                    <p className="mt-2 text-3xl font-bold text-cyan-300">{userList.length.toLocaleString("en-US")}</p>
                    <p className="mt-1 text-xs text-slate-500">Includes accounts created before visit tracking.</p>
                  </div>
                </div>
                <h3 className="mt-8 text-lg font-semibold">Visits over the last 30 days</h3>
                {trendsResult.error ? <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
                  Run scripts/silo-and-reports.sql to enable the 30-day report.
                </p> : <><AdminVisitChart data={trends} />
                  <p className="mt-2 text-xs text-slate-400">Daily counts are in UTC. Platform visits represent browser sessions; card opens count every tracked click.</p></>}
                <h3 className="mt-7 text-lg font-semibold">Most used resource cards</h3>
                <div className="mt-6 overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full min-w-[650px] text-left text-sm">
                    <thead className="bg-slate-900 text-slate-300"><tr>
                      <th className="px-4 py-3">Rank</th><th className="px-4 py-3">Resource card</th><th className="px-4 py-3">Opens</th>
                      <th className="px-4 py-3">Users</th><th className="px-4 py-3">7 days</th><th className="px-4 py-3">30 days</th>
                    </tr></thead>
                    <tbody className="divide-y divide-white/10">
                      {rankedCards.map((item, index) => {
                        const row = item.metrics;
                        return <tr key={item.key}>
                          <td className="px-4 py-3">{index + 1}</td>
                          <td className="px-4 py-3 font-semibold text-cyan-200">{item.label}</td>
                          <td className="px-4 py-3">{Number(row?.total_visits ?? 0).toLocaleString("en-US")}</td>
                          <td className="px-4 py-3">{Number(row?.unique_users ?? 0).toLocaleString("en-US")}</td>
                          <td className="px-4 py-3">{Number(row?.last_7_days ?? 0).toLocaleString("en-US")}</td>
                          <td className="px-4 py-3">{Number(row?.last_30_days ?? 0).toLocaleString("en-US")}</td>
                        </tr>;
                      })}
                    </tbody>
                  </table>
                </div>
                <h3 className="mt-7 text-lg font-semibold">Recent card opens</h3>
                {recentResourceOpens.length === 0 ? <p className="mt-3 text-sm text-slate-400">No card opens recorded yet.</p> : (
                  <div className="mt-3 max-h-80 space-y-2 overflow-auto">
                    {recentResourceOpens.map((visit) => <div key={visit.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm">
                      <span><Link className="text-cyan-200 hover:underline" href={`/admin/users/${visit.user_id}`}>{userNames.get(visit.user_id) || "User"}</Link>
                        {" · "}{resourceOptions.find((option) => option.key === visit.resource_key)?.label || visit.resource_key}</span>
                      <time className="text-slate-400" dateTime={visit.opened_at}>{new Date(visit.opened_at).toLocaleString("en-GB")}</time>
                    </div>)}
                  </div>
                )}
              </>}
            </section>

            {/* =================================================
                INACTIVE ACCOUNTS
            ================================================= */}
            <section
              id="inactive-users"
              className="research-panel mt-8 p-6 lg:p-8"
            >
              <SectionHeader
                eyebrow="Access Control"
                title="Inactive Accounts"
                description="Expired and suspended accounts remain visible for historical access and analytics review."
                count={
                  expiredUsers.length +
                  suspendedUsers.length
                }
              />

              {expiredUsers.length === 0 &&
              suspendedUsers.length === 0 ? (
                <EmptyState
                  icon="✓"
                  title="No inactive accounts"
                  text="Expired or suspended users will appear here."
                />
              ) : (
                <div className="mt-6 space-y-4">
                  {[...expiredUsers, ...suspendedUsers].map(
                    (inactiveUser) => (
                      <div
                        key={inactiveUser.id}
                        className="grid gap-6 rounded-2xl border border-white/10 bg-[#061226]/75 p-6 md:grid-cols-[1.4fr_0.8fr_auto] md:items-center"
                      >
                        <UserIdentity
                          name={inactiveUser.full_name}
                          email={inactiveUser.email}
                        />

                        <div>
                          <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
                            Status
                          </p>

                          <p className="mt-2 font-semibold capitalize text-amber-300">
                            {effectiveAccessStatus(inactiveUser)}
                          </p>
                        </div>

                        <Link
                          href={`/admin/users/${inactiveUser.id}`}
                          className="research-btn-secondary whitespace-nowrap text-sm"
                        >
                          Manage Access →
                        </Link>
                      </div>
                    )
                  )}
                </div>
              )}
            </section>

            {/* =================================================
                FOOTER STATUS
            ================================================= */}
            <section className="mt-8 flex flex-col gap-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 px-6 py-5 lg:flex-row lg:items-center">
              <div className="flex shrink-0 items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
                  ◎
                </div>

                <div>
                  <p className="text-sm font-semibold text-cyan-300">
                    Research Platform Administration
                  </p>

                  <p className="text-xs text-slate-500">
                    Secure access management enabled
                  </p>
                </div>
              </div>

              <div className="hidden h-9 w-px bg-cyan-400/20 lg:block" />

              <p className="text-sm leading-6 text-slate-400">
                User access, sessions, activity analytics, and
                resource interactions are managed through the
                integrated research-platform environment.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

/* =========================================================
   ADMIN NAV
========================================================= */

function AdminNavItem({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`research-nav-link ${
        active
          ? "research-nav-link-active"
          : ""
      }`}
    >
      <span className="flex h-7 w-7 items-center justify-center text-lg text-cyan-400">
        {icon}
      </span>

      <span className="text-sm font-medium">
        {label}
      </span>
    </Link>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function AdminStatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: string;
  tone:
    | "amber"
    | "green"
    | "purple"
    | "red";
}) {
  const tones = {
    amber: {
      border: "border-amber-400/25",
      icon: "bg-amber-400/10 text-amber-300",
      value: "text-amber-300",
    },

    green: {
      border: "border-emerald-400/25",
      icon: "bg-emerald-400/10 text-emerald-300",
      value: "text-emerald-300",
    },

    purple: {
      border: "border-violet-400/25",
      icon: "bg-violet-400/10 text-violet-300",
      value: "text-violet-300",
    },

    red: {
      border: "border-red-400/25",
      icon: "bg-red-400/10 text-red-300",
      value: "text-red-300",
    },
  };

  const selected = tones[tone];

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border ${selected.border} bg-gradient-to-br from-[#09182f] to-[#051020] p-5 transition duration-300 hover:-translate-y-1`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl ${selected.icon}`}
        >
          {icon}
        </div>

        <div>
          <p className="text-sm text-slate-400">
            {label}
          </p>

          <p
            className={`mt-1 text-3xl font-bold ${selected.value}`}
          >
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SYSTEM FIELD
========================================================= */

function SystemField({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 text-sm font-semibold ${
          highlight
            ? "text-emerald-300"
            : "text-slate-200"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   SECTION HEADER
========================================================= */

function SectionHeader({
  eyebrow,
  title,
  description,
  count,
}: {
  eyebrow: string;
  title: string;
  description: string;
  count: number;
}) {
  return (
    <div className="flex flex-col gap-5 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="research-section-title">
          {eyebrow}
        </p>

        <h2 className="mt-2 text-2xl font-bold">
          {title}
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          {description}
        </p>
      </div>

      <div className="flex h-12 min-w-12 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/5 px-4 font-bold text-cyan-300">
        {count}
      </div>
    </div>
  );
}

/* =========================================================
   USER IDENTITY
========================================================= */

function UserIdentity({
  name,
  email,
}: {
  name: string | null;
  email: string | null;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-sm font-bold text-cyan-300">
        {(name || "U").charAt(0).toUpperCase()}
      </div>

      <div>
        <p className="font-semibold text-white">
          {name || "Unnamed User"}
        </p>

        <p className="mt-1 text-sm text-slate-400">
          {email || "—"}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   USER INFO
========================================================= */

function UserInformation({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-sm text-slate-300">
        {value || "—"}
      </p>
    </div>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="mt-6 flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-400/15 bg-cyan-400/[0.025] p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-400/15 bg-cyan-400/5 text-xl text-cyan-300">
        {icon}
      </div>

      <p className="mt-4 font-semibold">
        {title}
      </p>

      <p className="mt-2 text-sm text-slate-500">
        {text}
      </p>
    </div>
  );
}

/* =========================================================
   ANALYTICS FEATURE
========================================================= */

function AnalyticsFeature({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="platform-card p-6">
      <p className="text-xs font-bold tracking-[0.2em] text-cyan-400/70">
        {number}
      </p>

      <div className="mt-4 flex h-11 w-11 items-center justify-center rounded-full border border-cyan-400/15 bg-cyan-400/10 text-cyan-300">
        ⌁
      </div>

      <h3 className="mt-5 text-lg font-semibold">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-slate-400">
        {description}
      </p>
    </div>
  );
}

/* =========================================================
   DATE FORMAT
========================================================= */

function formatDate(
  value: string | null
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone: "Asia/Riyadh",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }
  ).format(new Date(value));
}
