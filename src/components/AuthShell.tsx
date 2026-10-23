import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLockup } from "./HealthTwinBrand";

export function AuthShell({
  children,
  wide = false,
  backHref = "/",
  backLabel = "Platform Home",
}: {
  children: ReactNode;
  wide?: boolean;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <main className="apple-home ax-auth">
      <header className="ax-nav">
        <div className="ax-container ax-nav-inner">
          <BrandLockup compact />
          <Link href={backHref} className="ax-btn ax-btn-secondary ax-btn-sm">‹ {backLabel}</Link>
        </div>
      </header>
      <div className="ax-auth-main">
        <div className={`ax-auth-card${wide ? " is-wide" : ""}`}>{children}</div>
      </div>
    </main>
  );
}

export function AuthField({
  id, label, type = "text", value, onChange, placeholder, autoComplete,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div className="ax-fieldgroup">
      <label htmlFor={id} className="ax-label">{label}</label>
      <input id={id} name={id} type={type} value={value} placeholder={placeholder}
        autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} className="ax-input" />
    </div>
  );
}