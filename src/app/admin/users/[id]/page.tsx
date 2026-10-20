import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "../../../../utils/supabase/server";
import UserActivityChart from "../../../../components/UserActivityChart";
import ResourceAccessEditor from "./ResourceAccessEditor";
import AccessPeriodEditor from "./AccessPeriodEditor";
import { effectiveAccessStatus, formatAccessExpiry, hasNoExpiry, remainingAccessDays } from "../../../../lib/access-policy";
import { resourceOptions, type ResourceKey } from "../../../../lib/resources";
import { BrandLockup } from "../../../../components/HealthTwinBrand";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function UserAnalyticsPage({
  params,
}: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  // =========================================================
  // 1. Verify logged-in administrator
  // =========================================================
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: adminProfile, error: adminError } = await supabase
    .from("profiles")
    .select("role, status")
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
  // 2. Target user profile
  // =========================================================
  const { data: profile, error: profileError } = await supabase
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
    .eq("id", id)
    .single();

  if (profileError || !profile) {
    notFound();
  }

  const { data: resourceRows, error: resourceError } = profile.role === "user"
    ? await supabase.from("user_resource_access").select("resource_key").eq("user_id", id)
    : { data: [], error: null };
  const assignedResources = (resourceRows ?? [])
    .map((row) => row.resource_key as ResourceKey)
    .filter((key) => resourceOptions.some((option) => option.key === key));
  const { data: instructorRow, error: instructorError } = profile.role === "user"
    ? await supabase.from("course_instructors").select("user_id").eq("user_id", id).maybeSingle()
    : { data: null, error: null };
  const { data: siloEditorRow, error: siloEditorError } = profile.role === "user"
    ? await supabase.from("silo_editors").select("user_id").eq("user_id", id).maybeSingle()
    : { data: null, error: null };
  const { data: responderRow, error: responderError } = profile.role === "user"
    ? await supabase.from("discussion_responders").select("user_id").eq("user_id", id).maybeSingle()
    : { data: null, error: null };

  // =========================================================
  // 3. User sessions
  // =========================================================
  const { data: sessions } = await supabase
    .from("user_sessions")
    .select(
      `
      id,
      login_at,
      last_seen_at,
      logout_at,
      active_seconds
      `
    )
    .eq("user_id", id)
    .order("login_at", {
      ascending: false,
    });

  // =========================================================
  // 4. Daily activity - last 30 days
  // =========================================================
  const thirtyDaysAgo = new Date();

  thirtyDaysAgo.setUTCDate(
    thirtyDaysAgo.getUTCDate() - 29
  );

  const startDate = thirtyDaysAgo
    .toISOString()
    .slice(0, 10);

  const { data: dailyActivity } = await supabase
    .from("user_daily_activity")
    .select(
      `
      activity_date,
      active_seconds
      `
    )
    .eq("user_id", id)
    .gte("activity_date", startDate)
    .order("activity_date", {
      ascending: true,
    });

  // =========================================================
  // 5. Recent activity events
  // =========================================================
  const { data: recentEvents } = await supabase
    .from("activity_events")
    .select(
      `
      id,
      event_type,
      resource_type,
      resource_id,
      created_at
      `
    )
    .eq("user_id", id)
    .order("created_at", {
      ascending: false,
    })
    .limit(20);

  const [{ data: resourceMetricsData, error: resourceMetricsError }, { data: recentResourceOpens }] = await Promise.all([
    supabase.rpc("get_admin_user_resource_metrics", { p_user_id: id }),
    supabase.from("resource_visits").select("id, resource_key, opened_at")
      .eq("user_id", id).order("opened_at", { ascending: false }).limit(20),
  ]);
  const resourceMetrics = (resourceMetricsData ?? []) as Array<{ resource_key: string; total_visits: number }>;

  // =========================================================
  // 6. Analytics calculations
  // =========================================================
  const sessionList = sessions ?? [];

  const totalSessions = sessionList.length;

  const totalActiveSeconds = sessionList.reduce(
    (total, session) =>
      total + (session.active_seconds ?? 0),
    0
  );

  const totalSessionSeconds =
    sessionList.reduce((total, session) => {
      const start = new Date(
        session.login_at
      ).getTime();

      const end = new Date(
        session.logout_at ??
          session.last_seen_at ??
          session.login_at
      ).getTime();

      const seconds = Math.max(
        0,
        Math.round((end - start) / 1000)
      );

      return total + seconds;
    }, 0);

  const averageSessionSeconds =
    totalSessions > 0
      ? Math.round(
          totalSessionSeconds / totalSessions
        )
      : 0;

  const lastLogin =
    sessionList.length > 0
      ? sessionList[0].login_at
      : null;

  const lastSeen =
    sessionList.length > 0
      ? sessionList[0].last_seen_at
      : null;

  const remainingDays = remainingAccessDays(profile.expires_at);

  return (
    <main className="research-shell min-h-screen px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8"><BrandLockup compact /></div>

        {/* ===================================================
            Header
        =================================================== */}
        <div className="flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
              User Analytics
            </p>

            <h1 className="mt-3 text-4xl font-bold">
              {profile.full_name ||
                "Unnamed User"}
            </h1>

            <p className="mt-3 text-slate-400">
              {profile.email}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge>
                {profile.role}
              </Badge>

              <Badge>
                {effectiveAccessStatus(profile)}
              </Badge>

              {profile.institution && (
                <Badge>
                  {profile.institution}
                </Badge>
              )}
            </div>
          </div>

          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold transition hover:bg-white/10"
          >
            ← Back to Admin
          </Link>
        </div>

        {profile.role === "user" && <AccessPeriodEditor
          key={`${profile.id}-${profile.status}-${profile.expires_at ?? "unset"}`}
          userId={profile.id} initialStatus={profile.status} initialExpiresAt={profile.expires_at} />}

        {profile.role === "user" && (resourceError || instructorError || siloEditorError ? (
          <div className="mt-8 rounded-xl border border-amber-400/30 bg-amber-400/10 p-5 text-sm text-amber-200">
            <strong className="block text-base">Resource permissions are unavailable.</strong>
            <span className="mt-2 block text-amber-100">
              Run the missing SQL migration in Supabase, then refresh this page:
            </span>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {resourceError && <li><code>scripts/resource-access.sql</code> (run only if the resource-access table was never created)</li>}
              {instructorError && <li><code>scripts/courses-and-silo.sql</code> (course permissions)</li>}
              {siloEditorError && <li><code>scripts/silo-and-reports.sql</code> (SILO access and editor permissions)</li>}
            </ul>
          </div>
        ) : (
          <ResourceAccessEditor key={`${assignedResources.join(",")}-${Boolean(instructorRow)}-${Boolean(siloEditorRow)}-${Boolean(responderRow)}`}
            userId={id} initialKeys={assignedResources} initialInstructor={Boolean(instructorRow)}
            initialSiloEditor={Boolean(siloEditorRow)} initialResponder={Boolean(responderRow)}
            responderAvailable={!responderError} />
        ))}

        <section className="research-panel mt-8 rounded-2xl p-6" aria-label="Resource card usage">
          <h2 className="text-xl font-bold">Resource Card Usage</h2>
          {resourceMetricsError ? (
            <p className="mt-3 text-sm text-amber-200">Run scripts/visit-analytics.sql to enable resource analytics.</p>
          ) : <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(["courses", "software", "silo"] as const).map((key) => <div key={key} className="rounded-xl border border-white/10 bg-slate-900 p-4">
                <p className="text-sm text-slate-300">{resourceOptions.find((resource) => resource.key === key)?.label}</p>
                <p className="mt-1 text-2xl font-bold text-cyan-300">{Number(resourceMetrics?.find((row) => row.resource_key === key)?.total_visits ?? 0).toLocaleString("en-US")}</p>
                <p className="text-xs text-slate-400">card opens</p>
              </div>)}
            </div>
            <h3 className="mt-6 font-semibold">Recent card opens</h3>
            {recentResourceOpens?.length ? <div className="mt-3 space-y-2">
              {recentResourceOpens.map((visit) => <p key={visit.id} className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-300">
                {resourceOptions.find((resource) => resource.key === visit.resource_key)?.label || visit.resource_key}
                {" · "}<time dateTime={visit.opened_at}>{new Date(visit.opened_at).toLocaleString("en-GB")}</time>
              </p>)}
            </div> : <p className="mt-3 text-sm text-slate-400">No card opens recorded yet.</p>}
          </>}
        </section>

        {/* ===================================================
            Main Stats
        =================================================== */}
        <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Sessions"
            value={String(totalSessions)}
          />

          <StatCard
            label="Total Active Time"
            value={formatDuration(
              totalActiveSeconds
            )}
          />

          <StatCard
            label="Average Session"
            value={formatDuration(
              averageSessionSeconds
            )}
          />

          <StatCard
            label="Access Remaining"
            value={
              profile.role === "admin" || hasNoExpiry(profile.expires_at)
                ? "Unlimited"
                : remainingDays !== null
                  ? `${remainingDays} Days`
                  : "—"
            }
          />
        </section>

        {/* ===================================================
            Access + Recent Usage
        =================================================== */}
        <section className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <InfoCard
            label="Last Login"
            value={formatDate(lastLogin)}
          />

          <InfoCard
            label="Last Seen"
            value={formatDate(lastSeen)}
          />

          <InfoCard
            label="Approved"
            value={formatDate(
              profile.approved_at
            )}
          />

          <InfoCard
            label="Expires"
            value={
              profile.role === "admin"
                ? "No expiry"
                : formatAccessExpiry(profile.expires_at)
            }
          />
        </section>

        {/* ===================================================
            Daily Activity Chart
        =================================================== */}
        <section className="mt-10 rounded-3xl border border-white/10 bg-slate-900 p-6 lg:p-8">
          <div className="mb-7">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-400">
              Engagement
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Daily Active Time
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Actual active usage during the
              last 30 days. Hidden tabs and
              prolonged idle periods are not
              counted.
            </p>
          </div>

          <UserActivityChart
            data={dailyActivity ?? []}
          />
        </section>

        {/* ===================================================
            Session History
        =================================================== */}
        <section className="mt-10">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-400">
              Session Analytics
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Session History
            </h2>
          </div>

          {sessionList.length === 0 ? (
            <EmptyState text="No sessions recorded yet." />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-slate-900">
                  <tr className="text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-4">
                      Login
                    </th>

                    <th className="px-5 py-4">
                      Logout
                    </th>

                    <th className="px-5 py-4">
                      Last Seen
                    </th>

                    <th className="px-5 py-4">
                      Session Duration
                    </th>

                    <th className="px-5 py-4">
                      Active Time
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10 bg-slate-950/50">
                  {sessionList.map(
                    (session) => {
                      const sessionStart =
                        new Date(
                          session.login_at
                        ).getTime();

                      const sessionEnd =
                        new Date(
                          session.logout_at ??
                            session.last_seen_at ??
                            session.login_at
                        ).getTime();

                      const duration =
                        Math.max(
                          0,
                          Math.round(
                            (sessionEnd -
                              sessionStart) /
                              1000
                          )
                        );

                      return (
                        <tr
                          key={session.id}
                          className="text-sm text-slate-300"
                        >
                          <td className="px-5 py-4">
                            {formatDate(
                              session.login_at
                            )}
                          </td>

                          <td className="px-5 py-4">
                            {session.logout_at
                              ? formatDate(
                                  session.logout_at
                                )
                              : (
                                <span className="text-emerald-400">
                                  Active
                                </span>
                              )}
                          </td>

                          <td className="px-5 py-4">
                            {formatDate(
                              session.last_seen_at
                            )}
                          </td>

                          <td className="px-5 py-4">
                            {formatDuration(
                              duration
                            )}
                          </td>

                          <td className="px-5 py-4 font-semibold text-cyan-400">
                            {formatDuration(
                              session.active_seconds ??
                                0
                            )}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ===================================================
            Recent Activity Timeline
        =================================================== */}
        <section className="mt-10">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-400">
              Activity Timeline
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Recent Activity
            </h2>
          </div>

          {!recentEvents ||
          recentEvents.length === 0 ? (
            <EmptyState text="No activity events recorded yet." />
          ) : (
            <div className="space-y-3">
              {recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-white">
                      {formatEventName(
                        event.event_type
                      )}
                    </p>

                    {(event.resource_type ||
                      event.resource_id) && (
                      <p className="mt-1 text-sm text-slate-400">
                        {event.resource_type ||
                          "resource"}

                        {event.resource_id
                          ? ` · ${event.resource_id}`
                          : ""}
                      </p>
                    )}
                  </div>

                  <p className="text-sm text-slate-500">
                    {formatDate(
                      event.created_at
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/* =========================================================
   UI COMPONENTS
========================================================= */

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
      <p className="text-sm text-slate-400">
        {label}
      </p>

      <p className="mt-3 text-2xl font-bold text-cyan-400">
        {value}
      </p>
    </div>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
      <p className="text-xs uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-sm font-medium text-slate-200">
        {value}
      </p>
    </div>
  );
}

function Badge({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-3 py-1.5 text-xs font-medium capitalize text-cyan-300">
      {children}
    </span>
  );
}

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900 p-8 text-center text-slate-400">
      {text}
    </div>
  );
}

/* =========================================================
   HELPERS
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

function formatDuration(
  totalSeconds: number
) {
  const seconds = Math.max(
    0,
    Math.round(totalSeconds)
  );

  const hours = Math.floor(
    seconds / 3600
  );

  const minutes = Math.floor(
    (seconds % 3600) / 60
  );

  const remainingSeconds =
    seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  return `${remainingSeconds}s`;
}

function formatEventName(
  eventType: string
) {
  return eventType
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}
