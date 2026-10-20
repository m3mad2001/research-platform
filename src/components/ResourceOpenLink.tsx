"use client";

import Link from "next/link";

export default function ResourceOpenLink({
  resourceKey,
  href,
  className,
  ariaLabel,
  children,
}: {
  resourceKey: "courses" | "software" | "silo";
  href: string;
  className: string;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={className} aria-label={ariaLabel} onClick={() => {
      // keepalive lets internal navigation continue while recording the open.
      void fetch("/api/analytics/resource-open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceKey }),
        credentials: "same-origin",
        keepalive: true,
      }).catch(() => {});
    }}>
      {children}
    </Link>
  );
}
