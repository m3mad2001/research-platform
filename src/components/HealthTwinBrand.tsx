import Link from "next/link";

export const BRAND_NAME = "Engineering Nexus";
export const BRAND_SUBTITLE = "Integrated Engineering Research Platform";

export function BrandMark({ size = 42 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Engineering Nexus"
    >
      <defs>
        <linearGradient id="engineering-mark-cyan" x1="8" y1="8" x2="46" y2="55">
          <stop stopColor="#76F0FA" />
          <stop offset="1" stopColor="#35D8ED" />
        </linearGradient>
        <linearGradient id="engineering-mark-violet" x1="22" y1="54" x2="58" y2="10">
          <stop stopColor="#35D8ED" />
          <stop offset="1" stopColor="#7161ED" />
        </linearGradient>
      </defs>
      <path d="M7 18h11l6 7m22-7h11l-6 7M7 46h11l6-7m22 7h11l-6-7" stroke="url(#engineering-mark-cyan)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="20" y="20" width="24" height="24" rx="5" stroke="url(#engineering-mark-violet)" strokeWidth="3.5" />
      <path d="M25 34h4l2-5 3 8 2-4h3" stroke="#8EDFED" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7" cy="18" r="3" fill="#35D8ED" /><circle cx="57" cy="18" r="3" fill="#7161ED" />
      <circle cx="7" cy="46" r="3" fill="#35D8ED" /><circle cx="57" cy="46" r="3" fill="#7161ED" />
    </svg>
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className={`healthtwin-brand ${compact ? "healthtwin-brand-compact" : ""}`}>
      <BrandMark size={compact ? 38 : 54} />
      <span className="healthtwin-brand-copy">
        <span className="healthtwin-brand-name">Engineering <span>Nexus</span></span>
        {!compact && <span className="healthtwin-brand-subtitle">{BRAND_SUBTITLE}</span>}
      </span>
    </Link>
  );
}

const pillars = [
  { label: "IC Design", icon: "chip" },
  { label: "Sensing Systems", icon: "wave" },
  { label: "Data & AI", icon: "network" },
  { label: "Healthcare Digital Twin", icon: "twin" },
  { label: "Real-World Impact", icon: "impact" },
] as const;

function PillarIcon({ type }: { type: (typeof pillars)[number]["icon"] }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {type === "chip" && <><rect x="8" y="8" width="16" height="16" rx="2" /><path d="M12 12h8v8h-8zM12 3v5m8-5v5M12 24v5m8-5v5M3 12h5m-5 8h5m16-8h5m-5 8h5" /></>}
      {type === "wave" && <><path d="M2 17h6l2-6 4 13 4-16 4 9h8" /><path d="M4 26h24" /></>}
      {type === "network" && <><rect x="11" y="11" width="10" height="10" rx="2" /><path d="M16 4v7m0 10v7M4 16h7m10 0h7M7 7l4 4m10 10 4 4M25 7l-4 4M11 21l-4 4" /><circle cx="16" cy="16" r="1" /></>}
      {type === "twin" && <><circle cx="12" cy="9" r="3" /><path d="M5 27v-5a7 7 0 0 1 14 0v5M17 6a4 4 0 0 1 5 4M23 16a7 7 0 0 1 4 6v5" /><path d="M21 3v3m0 8v2" /></>}
      {type === "impact" && <><circle cx="10" cy="10" r="3" /><circle cx="22" cy="10" r="3" /><path d="M3 25v-3a7 7 0 0 1 14 0v3m0 0v-3a7 7 0 0 1 12 0v3" /></>}
    </svg>
  );
}

export function PillarStrip({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`healthtwin-pillars ${compact ? "healthtwin-pillars-compact" : ""}`} aria-label="Five research pillars">
      {pillars.map((pillar) => (
        <div className="healthtwin-pillar" key={pillar.label}>
          <span className="healthtwin-pillar-icon"><PillarIcon type={pillar.icon} /></span>
          <span>{pillar.label}</span>
        </div>
      ))}
    </div>
  );
}
