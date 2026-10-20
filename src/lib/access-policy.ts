/** PostgreSQL's positive infinity keeps existing expiry checks valid in RLS. */
export const NO_EXPIRY = "infinity";

export type AccessProfile = {
  role: string | null;
  status: string | null;
  expires_at: string | null;
};

export function hasNoExpiry(expiresAt: string | null | undefined) {
  return expiresAt === NO_EXPIRY;
}

export function hasActiveAccess(profile: AccessProfile | null, now = Date.now()) {
  if (!profile || profile.status !== "approved") return false;
  if (profile.role === "admin") return true;
  if (profile.role !== "user") return false;
  if (hasNoExpiry(profile.expires_at)) return true;
  const expiry = profile.expires_at ? Date.parse(profile.expires_at) : NaN;
  return Number.isFinite(expiry) && expiry > now;
}

export function effectiveAccessStatus(profile: AccessProfile, now = Date.now()) {
  if (profile.status === "approved" && !hasActiveAccess(profile, now)) return "expired";
  return profile.status || "unconfigured";
}

export function remainingAccessDays(expiresAt: string | null, now = Date.now()) {
  if (hasNoExpiry(expiresAt)) return null;
  const expiry = expiresAt ? Date.parse(expiresAt) : NaN;
  return Number.isFinite(expiry) ? Math.max(0, Math.ceil((expiry - now) / 86_400_000)) : null;
}

export function formatAccessExpiry(expiresAt: string | null) {
  if (hasNoExpiry(expiresAt)) return "No expiry";
  const expiry = expiresAt ? Date.parse(expiresAt) : NaN;
  return Number.isFinite(expiry)
    ? new Date(expiry).toLocaleString("en-GB", { timeZone: "Asia/Riyadh", dateStyle: "medium", timeStyle: "short" })
    : "Not set";
}

/** The editor uses Saudi time explicitly, independent of the server/browser TZ. */
export function expiryInputValue(expiresAt: string | null) {
  const expiry = expiresAt && !hasNoExpiry(expiresAt) ? Date.parse(expiresAt) : NaN;
  return Number.isFinite(expiry) ? new Date(expiry + 10_800_000).toISOString().slice(0, 16) : "";
}

export function expiryInputToIso(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const time = Date.parse(`${value}:00+03:00`);
  // A round trip rejects dates which JavaScript silently rolls into another month.
  if (!Number.isFinite(time) || expiryInputValue(new Date(time).toISOString()) !== value) return null;
  return new Date(time).toISOString();
}

export function accessControlError(error: { code?: string; message: string }) {
  if (error.code === "PGRST202" || error.code === "42883") {
    return "Access controls are not configured. Complete the access-control setup included with this update.";
  }
  if (error.code === "40001") {
    return "This user's access changed in another session. Refresh the page before trying again.";
  }
  return error.message;
}
