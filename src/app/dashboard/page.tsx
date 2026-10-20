import Link from "next/link";
import { BrandLockup, PillarStrip } from "../../components/HealthTwinBrand";
import { redirect } from "next/navigation";
import { createClient } from "../../utils/supabase/server";
import LogoutButton from "../../components/LogoutButton";
import { defaultResourceVisibility, type ResourceKey, type ResourceVisibilityMode } from "../../lib/resources";
import ResourceOpenLink from "../../components/ResourceOpenLink";
import { formatAccessExpiry, hasActiveAccess, hasNoExpiry, remainingAccessDays } from "../../lib/access-policy";
import NotificationCenter, { type PlatformNotification } from "../../components/NotificationCenter";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string | string[] }>;
}) {
  const noticeValue = (await searchParams).notice;
  const notice = Array.isArray(noticeValue) ? noticeValue[0] : noticeValue;
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
  // USER PROFILE
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
      approved_at,
      expires_at
      `
    )
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    redirect("/login");
  }

  // Admin should never remain in user dashboard
  if (
    profile.role === "admin" &&
    profile.status === "approved"
  ) {
    redirect("/admin");
  }

  // Only approved normal users can enter
  if (
    profile.role !== "user" ||
    profile.status !== "approved"
  ) {
    redirect("/login");
  }

  if (!hasActiveAccess(profile)) redirect("/login");
  const remainingDays = remainingAccessDays(profile.expires_at);

  const { data: accessRows, error: accessError } = await supabase
    .from("user_resource_access")
    .select("resource_key")
    .eq("user_id", user.id);
  // A failed permission lookup must never make a resource available.
  const granted = new Set<ResourceKey>(
    accessError ? [] : (accessRows ?? []).map((row) => row.resource_key as ResourceKey)
  );
  const { data: resourceCounts, error: countsError } = await supabase.rpc("get_resource_visit_counts");
  const visitCounts = countsError ? null : resourceCounts as Record<string, number> | null;
  const [{ data: visibilityRows }, { data: notificationRows }] = await Promise.all([
    supabase.from("resource_visibility").select("resource_key,display_mode"),
    supabase.from("user_notifications").select("id,title,message,read_at,created_at")
      .order("created_at", { ascending: false }).limit(6),
  ]);
  const visibility = { ...defaultResourceVisibility };
  for (const row of visibilityRows ?? []) {
    visibility[row.resource_key as ResourceKey] = row.display_mode as ResourceVisibilityMode;
  }
  const isCardAvailable = (key: ResourceKey) => visibility[key] !== "hidden";
  const shouldShowCard = (key: ResourceKey) => visibility[key] === "locked" ||
    (visibility[key] === "visible" && granted.has(key));

  return (
    <main className="research-shell dashboard-shell min-h-screen overflow-hidden text-white">
      {/* =====================================================
          TOP HEADER
      ===================================================== */}
      <header className="dashboard-topbar relative z-40 border-b border-cyan-400/10 bg-[#020817]/95 backdrop-blur-xl">
        <div className="flex h-[68px] items-center justify-between px-6 lg:px-8">
          <BrandLockup />

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="research-btn-primary hidden text-sm sm:inline-flex"
            >
              Platform Home
            </Link>

            <LogoutButton />
          </div>
        </div>
      </header>
      <nav className="healthtwin-mobile-links" aria-label="Workspace navigation">
        <Link href="/dashboard">Overview</Link>
        <Link href="/discussions">Discussions</Link>
        {granted.has("courses") && isCardAvailable("courses") && <Link href="/courses">Courses</Link>}
        {granted.has("hemox") && isCardAvailable("hemox") && <Link href="#resources">HEMOX</Link>}
        {granted.has("software") && isCardAvailable("software") && <Link href="#software">Software</Link>}
        {granted.has("firmware") && isCardAvailable("firmware") && <Link href="#resources">Firmware</Link>}
        {granted.has("explorers") && isCardAvailable("explorers") && <Link href="#resources">Explorers</Link>}
        {granted.has("datasets") && isCardAvailable("datasets") && <Link href="#resources">Datasets</Link>}
        {granted.has("silo") && isCardAvailable("silo") && <Link href="/silo">SILO</Link>}
        <Link href="/contact">Contact</Link>
      </nav>

      <div className="relative flex">
        {/* =====================================================
            SIDEBAR
        ===================================================== */}
        <aside className="dashboard-sidebar relative z-30 hidden min-h-[calc(100vh-68px)] w-[270px] shrink-0 border-r border-cyan-400/10 bg-[#020b19]/95 px-3 py-5 xl:block">
          <nav className="space-y-2">
            <SidebarLink
              icon={<HomeIcon />}
              label="Dashboard"
              href="/dashboard"
              active
            />

            <SidebarLink icon={<CourseIcon />} label="Research Discussions" href="/discussions" />

            {granted.has("courses") && isCardAvailable("courses") && <SidebarLink
              icon={<CourseIcon />}
              label="Courses"
              href="/courses"
            />}

            {granted.has("hemox") && isCardAvailable("hemox") && <SidebarLink
              icon={<WaveIcon />}
              label="HEMOX Suite"
              href="#resources"
            />}

            {granted.has("software") && isCardAvailable("software") && <SidebarLink
              icon={<CodeIcon />}
              label="Software & APK"
              href="#software"
            />}

            {granted.has("firmware") && isCardAvailable("firmware") && <SidebarLink
              icon={<ChipIcon />}
              label="Firmware"
              href="#resources"
            />}

            {granted.has("explorers") && isCardAvailable("explorers") && <SidebarLink
              icon={<ExplorerIcon />}
              label="Explorers"
              href="#resources"
            />}

            {granted.has("datasets") && isCardAvailable("datasets") && <SidebarLink
              icon={<DatabaseIcon />}
              label="Datasets"
              href="#resources"
            />}

            {granted.has("silo") && isCardAvailable("silo") && <SidebarLink
              icon={<CodeIcon />}
              label="SILO"
              href="/silo"
            />}
          </nav>

          {/* Decorative lower sidebar */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 overflow-hidden">
            <svg
              viewBox="0 0 300 180"
              className="absolute bottom-0 h-full w-full opacity-35"
            >
              <path
                d="M0 135 C45 90 85 160 130 115 C175 70 220 145 300 85"
                fill="none"
                stroke="#22d3ee"
                strokeWidth="1.5"
              />

              <path
                d="M0 150 C55 105 100 170 145 130 C205 75 235 150 300 110"
                fill="none"
                stroke="#14f1c6"
                strokeWidth="1"
                opacity="0.6"
              />
            </svg>

            <div className="absolute bottom-24 left-7">
              <p className="text-xs font-semibold text-cyan-400">
                Research Together
              </p>

              <p className="mt-1 text-xs text-cyan-300/70">
                Create a Better Future
              </p>
            </div>
          </div>
        </aside>

        {/* =====================================================
            CONTENT
        ===================================================== */}
        <div className="dashboard-content relative min-w-0 flex-1">
          {/* Background effects */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="research-grid absolute inset-0 opacity-20" />
            <div className="research-orb research-orb-one" />
            <div className="research-orb research-orb-two" />
            <div className="research-scanline" />
          </div>

          <div className="relative z-10">
            {/* =================================================
                HERO
            ================================================= */}
            <section className="dashboard-banner relative min-h-[216px] overflow-hidden border-b border-cyan-400/20 bg-[#031329]">
              {/* Left content */}
              <div className="dashboard-banner-copy relative z-20 max-w-[710px] px-8 py-7 lg:px-8">
                <p className="research-section-title">
                  Research Access
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                  Welcome,{" "}
                  <span className="text-cyan-400">
                    {profile.full_name || "Researcher"}
                  </span>
                </h1>

                <p className="mt-1 text-sm text-slate-300 sm:text-base">
                  {profile.email}
                </p>

                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                  Access your engineering courses, research software,
                  firmware, datasets, interactive explorers, and HEMOX
                  research tools.
                </p>
              </div>

              {/* Cinematic right visual */}
              <div className="dashboard-banner-art absolute inset-y-0 right-0 hidden w-[63%] lg:block">
                <BiomedicalHeroVisual />
              </div>

              {/* Angled overlay */}
              <div
                className="dashboard-banner-angle absolute inset-y-0 left-[47%] hidden w-32 bg-[#031329] lg:block"
                style={{
                  clipPath:
                    "polygon(0 0, 100% 0, 35% 100%, 0 100%)",
                }}
              />

              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />
            </section>

            {/* =================================================
                MAIN BODY
            ================================================= */}
            <div className="healthtwin-dashboard-pillars"><PillarStrip compact /></div>
            <div className="dashboard-body px-6 py-4 lg:px-8">
              {notice === "silo-setup-required" && (
                <div role="alert" className="mb-4 rounded-2xl border border-amber-400/35 bg-amber-400/10 p-5 text-sm leading-6 text-amber-100">
                  <strong className="block text-base text-amber-200">SILO database setup is incomplete</strong>
                  Ask the administrator to run <code className="rounded bg-black/30 px-1.5 py-0.5">scripts/silo-and-reports.sql</code> in the Supabase SQL Editor, then refresh this page.
                </div>
              )}
              {notice === "silo-access-required" && (
                <div role="alert" className="mb-4 rounded-2xl border border-cyan-400/30 bg-cyan-400/[0.07] p-5 text-sm leading-6 text-cyan-100">
                  <strong className="block text-base text-cyan-200">SILO access is not assigned</strong>
                  An administrator must enable the SILO resource for this account from Manage Access.
                </div>
              )}
              <Link href="/discussions" className="research-panel mb-4 flex flex-wrap items-center justify-between gap-4 p-5 transition hover:border-cyan-400/50">
                <span><strong className="text-lg text-cyan-200">Research Discussions</strong><span className="mt-1 block text-sm text-slate-300">Ask a question, follow research conversations, and share answers.</span></span>
                <span className="text-sm font-semibold text-cyan-300">Explore discussions →</span>
              </Link>
              <NotificationCenter initialNotifications={(notificationRows ?? []) as PlatformNotification[]} />
              {/* =================================================
                  STATUS CARDS
              ================================================= */}
              <section className="dashboard-status-grid grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatusCard
                  icon={<CheckIcon />}
                  label="Access Status"
                  value="Active"
                  tone="green"
                />

                <StatusCard
                  icon={<CalendarIcon />}
                  label="Days Remaining"
                  value={hasNoExpiry(profile.expires_at) ? "Unlimited" : String(remainingDays ?? 0)}
                  tone="cyan"
                />

                <StatusCard
                  icon={<CalendarIcon />}
                  label="Approved"
                  value={formatDate(profile.approved_at)}
                  tone="cyan"
                />

                <StatusCard
                  icon={<CalendarIcon />}
                  label="Expires"
                  value={formatAccessExpiry(profile.expires_at)}
                  tone="cyan"
                />
              </section>

              {/* =================================================
                  ACCOUNT DATA
              ================================================= */}
              <section className="research-glass dashboard-account mt-4 grid gap-5 rounded-2xl px-6 py-4 md:grid-cols-3">
                <AccountField
                  icon={<EmailIcon />}
                  label="Email"
                  value={profile.email}
                />

                <AccountField
                  icon={<InstitutionIcon />}
                  label="Institution"
                  value={profile.institution}
                />

                <AccountField
                  icon={<TargetIcon />}
                  label="Intended Use"
                  value={profile.intended_use}
                  last
                />
              </section>

              {/* =================================================
                  RESOURCE PANEL
              ================================================= */}
              <section
                id="resources"
                className="research-panel dashboard-resources mt-4 p-5 lg:p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="research-section-title">
                      My Platform
                    </p>

                    <h2 className="mt-1 text-2xl font-bold tracking-tight">
                      Research &amp; Learning Resources
                    </h2>

                    <p className="mt-2 text-sm text-slate-400">
                      Your approved resources are available from
                      this dashboard.
                    </p>
                  </div>

                  <div className="hidden items-center gap-4 lg:flex">
                    <div className="h-px w-10 bg-cyan-400" />

                    <p className="text-right text-xs italic leading-5 text-cyan-200/70">
                      Better Tools. Deeper Learning.
                      <br />
                      Greater Impact.
                    </p>
                  </div>
                </div>

                <div className="dashboard-resource-grid mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {shouldShowCard("courses") && <ResourceCard
                    number="01"
                    allowed={granted.has("courses")}
                    resourceKey="courses"
                    visitCount={visitCounts ? Number(visitCounts.courses ?? 0) : undefined}
                    title="Courses"
                    description="Structured engineering courses, tutorials, videos, PDFs, and practical laboratories."
                    href="/courses"
                    actionLabel="Browse courses →"
                    tone="blue"
                    icon={<CourseIcon />}
                    visual="books"
                  />}

                  {shouldShowCard("hemox") && <ResourceCard
                    number="02"
                    allowed={granted.has("hemox")}
                    title="HEMOX Research Suite"
                    description="Wearable physiological sensing, synchronized acquisition, visualization, validation, and research analysis."
                    tone="teal"
                    icon={<WaveIcon />}
                    visual="wave"
                  />}

                  {shouldShowCard("software") && <ResourceCard
                    number="03"
                    allowed={granted.has("software")}
                    resourceKey="software"
                    visitCount={visitCounts ? Number(visitCounts.software ?? 0) : undefined}
                    title="Software & APK"
                    description="Android applications, engineering software, scripts, and versioned releases."
                    href="#software"
                    tone="purple"
                    icon={<CodeIcon />}
                    visual="software"
                  />}

                  {shouldShowCard("firmware") && <ResourceCard
                    number="04"
                    allowed={granted.has("firmware")}
                    title="Firmware"
                    description="Embedded firmware releases, documentation, configuration files, and device resources."
                    tone="amber"
                    icon={<ChipIcon />}
                    visual="chip"
                  />}

                  {shouldShowCard("explorers") && <ResourceCard
                    number="05"
                    allowed={granted.has("explorers")}
                    title="Interactive Explorers"
                    description="Browser-based tools for visualization, signal analysis, validation, and reporting."
                    tone="pink"
                    icon={<ExplorerIcon />}
                    visual="signal"
                  />}

                  {shouldShowCard("datasets") && <ResourceCard
                    number="06"
                    allowed={granted.has("datasets")}
                    title="Datasets"
                    description="Approved research datasets, example recordings, validation material, and technical resources."
                    tone="indigo"
                    icon={<DatabaseIcon />}
                    visual="database"
                  />}

                  {shouldShowCard("silo") && <ResourceCard
                    number="07"
                    allowed={granted.has("silo")}
                    resourceKey="silo"
                    visitCount={visitCounts ? Number(visitCounts.silo ?? 0) : undefined}
                    title="SILO — Simulator-in-the-Loop Analog/RFIC Design"
                    description="Spectre-in-the-Loop RFIC design: research artifact, documentation, reports, and optional data."
                    href="/silo"
                    actionLabel="Explore SILO →"
                    tone="purple"
                    icon={<CodeIcon />}
                    visual="code"
                  />}
                </div>
              </section>

              {granted.has("software") && isCardAvailable("software") && <section id="software" className="research-panel mt-5 scroll-mt-24 p-6 lg:p-8">
                <p className="research-section-title">Software &amp; APK</p>
                <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                  Available Downloads
                </h2>
                <div className="research-glass mt-6 flex flex-col gap-5 rounded-2xl border border-cyan-400/20 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                      <CodeIcon />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">HEMOX Android App</p>
                      <p className="mt-1 text-sm text-slate-300">Version 1.3.7.1 · Android APK</p>
                      <p className="mt-2 text-xs text-slate-400">HEMOXV1.3.7.1.apk · 554 KB</p>
                    </div>
                  </div>
                  <a
                    href="/api/software/hemox/download"
                    className="research-btn-primary inline-flex shrink-0 items-center justify-center text-sm"
                  >
                    Download APK
                  </a>
                </div>
              </section>}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* =========================================================
   SIDEBAR
========================================================= */

function SidebarLink({
  icon,
  label,
  href,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 rounded-xl border px-3 py-3 text-sm font-medium transition-all duration-300 ${
        active
          ? "border-cyan-400/20 bg-gradient-to-r from-cyan-500/25 to-cyan-400/10 text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,0.08)]"
          : "border-transparent text-slate-300 hover:translate-x-1 hover:border-cyan-400/10 hover:bg-white/5 hover:text-white"
      }`}
    >
      <span className="flex h-6 w-6 items-center justify-center text-cyan-300">
        {icon}
      </span>

      {label}
    </Link>
  );
}

/* =========================================================
   STATUS CARD
========================================================= */

function StatusCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "green" | "cyan";
}) {
  const green = tone === "green";

  return (
    <div
      className={`dashboard-status-card group relative overflow-hidden rounded-2xl border bg-gradient-to-br from-[#08223b] to-[#041426] p-4 transition duration-300 hover:-translate-y-1 ${
        green
          ? "border-emerald-400/30"
          : "border-cyan-400/30"
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
            green
              ? "bg-emerald-400/15 text-emerald-300"
              : "bg-cyan-400/15 text-cyan-300"
          }`}
        >
          {icon}
        </div>

        <div>
          <p className="text-sm text-slate-300">
            {label}
          </p>

          <p
            className={`mt-1 text-xl font-bold ${
              green
                ? "text-emerald-300"
                : "text-cyan-300"
            }`}
          >
            {value}
          </p>
        </div>
      </div>

      <div className="absolute -bottom-16 -right-12 h-28 w-28 rounded-full bg-cyan-400/10 blur-3xl transition group-hover:bg-cyan-400/20" />
    </div>
  );
}

/* =========================================================
   ACCOUNT FIELD
========================================================= */

function AccountField({
  icon,
  label,
  value,
  last = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-4 ${
        !last
          ? "md:border-r md:border-white/10"
          : ""
      }`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
        {icon}
      </div>

      <div>
        <p className="text-xs text-slate-400">
          {label}
        </p>

        <p className="mt-1 text-sm font-medium text-white">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   RESOURCE CARD
========================================================= */

function ResourceCard({
  number,
  allowed,
  resourceKey,
  visitCount,
  title,
  description,
  icon,
  tone,
  visual,
  href,
  actionLabel,
}: {
  number: string;
  allowed: boolean;
  resourceKey?: "courses" | "software" | "silo";
  visitCount?: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
  actionLabel?: string;
  tone:
    | "blue"
    | "teal"
    | "purple"
    | "amber"
    | "pink"
    | "indigo";
  visual:
    | "books"
    | "wave"
    | "software"
    | "code"
    | "chip"
    | "signal"
    | "database";
}) {
  const styles = {
    blue:
      "border-cyan-400/45 from-cyan-500/12 to-blue-950/50",
    teal:
      "border-teal-400/45 from-teal-500/12 to-emerald-950/45",
    purple:
      "border-violet-400/45 from-violet-500/15 to-purple-950/45",
    amber:
      "border-amber-400/45 from-amber-500/12 to-orange-950/45",
    pink:
      "border-pink-400/45 from-pink-500/12 to-fuchsia-950/45",
    indigo:
      "border-indigo-400/45 from-indigo-500/15 to-blue-950/45",
  };

  return (
    <div
      className={`platform-card dashboard-resource-card group relative min-h-[226px] overflow-hidden rounded-2xl border bg-gradient-to-br ${allowed ? styles[tone] : "border-slate-600/30 from-slate-800/30 to-slate-950/70 opacity-60"} p-4 ${allowed && href ? "cursor-pointer transition hover:-translate-y-1 hover:shadow-[0_16px_45px_rgba(34,211,238,0.12)]" : ""}`}
    >
      {allowed && href && resourceKey && (
        <ResourceOpenLink
          resourceKey={resourceKey}
          href={href}
          ariaLabel={`Open ${title}`}
          className="absolute inset-0 z-20 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#061726]"
        >
          <span className="sr-only">Open {title}</span>
        </ResourceOpenLink>
      )}
      <ResourceVisual type={visual} />

      <div className="relative z-10">
        <p className="text-[10px] font-bold text-cyan-300">
          {number}
        </p>

        <div className="mt-2 flex h-11 w-11 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-200">
          {icon}
        </div>

        <h3 className="mt-3 text-sm font-bold text-white">
          {title}
        </h3>

        <p className="mt-1 text-xs leading-[1.35] text-slate-300">
          {description}
        </p>

        {allowed && href && visitCount !== undefined && (
          <p className="mt-3 text-xs font-semibold text-cyan-200/80">
            Opened {visitCount.toLocaleString("en-US")} times
          </p>
        )}

        {!allowed ? (
          <div className="mt-4 inline-flex rounded-full border border-slate-500/30 bg-slate-950/50 px-3 py-1.5 text-[11px] font-medium text-slate-300">
            Access not assigned
          </div>
        ) : href ? (
          <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-200 transition group-hover:bg-cyan-400/20">
            {actionLabel ?? "View download →"}
          </span>
        ) : (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-black/20 px-3 py-1.5 text-[11px] font-medium text-slate-300">
            <span className="text-cyan-300">◷</span>
            Coming Next
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   CARD VISUALS
========================================================= */

function ResourceVisual({
  type,
}: {
  type:
    | "books"
    | "wave"
    | "software"
    | "code"
    | "chip"
    | "signal"
    | "database";
}) {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-50">
      <div className="healthtwin-resource-visual absolute inset-0" style={{ backgroundImage: `linear-gradient(90deg,#071a2b 10%,rgba(7,26,43,.35)), url('/healthtwin/${({books:'data-ai.png',wave:'sensing.png',software:'software-app.svg',code:'silo.png',chip:'ic-design.png',signal:'digital-twin.png',database:'data-ai.png'} as const)[type]}')` }} />
      {type === "books" && (
        <div className="absolute right-2 top-7 h-24 w-28 rotate-[-5deg]">
          <div className="absolute right-0 top-8 h-5 w-24 rounded bg-cyan-400/25 shadow-lg" />
          <div className="absolute right-2 top-3 h-5 w-20 rounded bg-blue-400/25" />
          <div className="absolute right-4 top-[-10px] h-5 w-16 rounded bg-sky-300/20" />
        </div>
      )}

      {type === "wave" && (
        <svg
          viewBox="0 0 260 100"
          className="absolute right-0 top-5 w-full"
        >
          <path
            d="M0 55 L25 55 L38 50 L48 55 L70 55 L82 10 L98 90 L115 55 L145 55 L158 35 L172 70 L187 55 L220 55 L232 25 L245 80 L260 55"
            fill="none"
            stroke="#2dd4bf"
            strokeWidth="3"
          />
        </svg>
      )}

      {type === "code" && (
        <div className="absolute right-3 top-4 w-32 rotate-[-4deg] rounded-lg border border-violet-400/20 bg-black/50 p-3 font-mono text-[8px] leading-4 text-violet-300">
          <p>const data =</p>
          <p>analyze(signal);</p>
          <p className="text-cyan-300">
            plot(result);
          </p>
          <p>validate();</p>
        </div>
      )}

      {type === "chip" && (
        <div className="absolute right-5 top-4 h-28 w-28 rotate-12">
          <div className="absolute inset-7 rounded-md border border-amber-300/40 bg-amber-400/20 shadow-[0_0_30px_rgba(251,191,36,0.25)]" />

          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="absolute h-px bg-amber-300/30"
              style={{
                width: `${40 + index * 7}px`,
                top: `${15 + index * 15}px`,
                right: 0,
              }}
            />
          ))}
        </div>
      )}

      {type === "signal" && (
        <svg
          viewBox="0 0 260 120"
          className="absolute right-0 top-0 h-32 w-full"
        >
          <path
            d="M0 72 C20 30 38 110 58 60 C78 15 90 112 110 54 C128 18 148 98 165 55 C190 0 206 115 225 50 C240 20 250 65 260 60"
            fill="none"
            stroke="#f472b6"
            strokeWidth="2.5"
          />
        </svg>
      )}

      {type === "database" && (
        <div className="absolute right-5 top-4 h-28 w-24">
          <div className="absolute left-2 top-2 h-7 w-20 rounded-[50%] bg-indigo-400/30" />
          <div className="absolute left-2 top-5 h-16 w-20 border-x border-indigo-300/25 bg-indigo-400/15" />
          <div className="absolute bottom-3 left-2 h-7 w-20 rounded-[50%] border border-indigo-300/25 bg-indigo-400/20" />
        </div>
      )}
    </div>
  );
}

/* =========================================================
   CINEMATIC HERO VISUAL
========================================================= */

function BiomedicalHeroVisual() {
  const ecgTrace =
    "M0 50 H72 L82 46 L90 50 H122 L132 25 L143 78 L153 50 H242 L252 48 L260 50 H306 L316 18 L328 83 L338 50 H450 L460 47 L469 50 H515 L525 29 L537 75 L547 50 H636 L645 48 L653 50 H688 L698 20 L710 81 L720 50 H800";

  return (
    <div className="dashboard-biomedical-art absolute inset-0 overflow-hidden">
      <div className="dashboard-biomedical-image absolute inset-0" aria-hidden="true" />
      <div className="dashboard-biomedical-fade absolute inset-0" aria-hidden="true" />
      <svg
        className="dashboard-ecg-overlay absolute"
        viewBox="0 0 800 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d={ecgTrace} className="dashboard-ecg-base" />
        <path d={ecgTrace} pathLength="800" className="dashboard-ecg-beam" />
      </svg>
      <span className="dashboard-heart-halo absolute" aria-hidden="true" />
      <div className="dashboard-biomedical-caption absolute right-7 top-1/2 -translate-y-1/2 text-right">
        <div className="mb-3 ml-auto h-px w-12 bg-cyan-300" />
        <p className="text-[10px] font-bold uppercase leading-5 tracking-[0.18em] text-cyan-200">
          Engineering<br />Innovation<br />Through<br />Research
        </p>
        <div className="ml-auto mt-3 h-px w-12 bg-cyan-300/40" />
      </div>
    </div>
  );
}

/* =========================================================
   ICONS
========================================================= */

function IconShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function HomeIcon() {
  return (
    <IconShell>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10.5V20h14v-9.5" />
      <path d="M9.5 20v-6h5v6" />
    </IconShell>
  );
}

function CourseIcon() {
  return (
    <IconShell>
      <path d="m3 9 9-5 9 5-9 5-9-5Z" />
      <path d="M7 11.5V16c3 2 7 2 10 0v-4.5" />
    </IconShell>
  );
}

function WaveIcon() {
  return (
    <IconShell>
      <path d="M2 13h4l2-7 4 14 3-10 2 3h5" />
    </IconShell>
  );
}

function CodeIcon() {
  return (
    <IconShell>
      <path d="m8 6-5 6 5 6" />
      <path d="m16 6 5 6-5 6" />
      <path d="m14 4-4 16" />
    </IconShell>
  );
}

function ChipIcon() {
  return (
    <IconShell>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M9 9h6v6H9z" />
      <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
    </IconShell>
  );
}

function ExplorerIcon() {
  return (
    <IconShell>
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-2 5-5 2 2-5 5-2Z" />
    </IconShell>
  );
}

function DatabaseIcon() {
  return (
    <IconShell>
      <ellipse cx="12" cy="5" rx="7" ry="3" />
      <path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
      <path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </IconShell>
  );
}

function CheckIcon() {
  return (
    <IconShell>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </IconShell>
  );
}

function CalendarIcon() {
  return (
    <IconShell>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 9h16" />
      <path d="M9 13h2v2H9z" />
    </IconShell>
  );
}

function EmailIcon() {
  return (
    <IconShell>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </IconShell>
  );
}

function InstitutionIcon() {
  return (
    <IconShell>
      <path d="M3 9h18L12 3 3 9Z" />
      <path d="M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18" />
    </IconShell>
  );
}

function TargetIcon() {
  return (
    <IconShell>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" />
      <path d="m15 9 5-5" />
    </IconShell>
  );
}

/* =========================================================
   DATE
========================================================= */

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Riyadh",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
