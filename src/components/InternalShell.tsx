import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLockup } from "./HealthTwinBrand";

export default function InternalShell({
  section, children, backHref = "/dashboard", backLabel = "Dashboard", extra,
}: {
  section: string;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  extra?: ReactNode;
}) {
  return (
    <main className="apple-home ax-dash">
      <header className="ax-nav">
        <div className="ax-container ax-nav-inner">
          <div className="ax-shell-title">
            <BrandLockup compact />
            <span className="ax-section-tag">{section}</span>
          </div>
          <div className="ax-actions">
            {extra}
            <Link href={backHref} className="ax-btn ax-btn-secondary ax-btn-sm">‹ {backLabel}</Link>
          </div>
        </div>
      </header>
      <div className="ax-page">{children}</div>
    </main>
  );
}