// Public values are embedded in the browser bundle by Next.js at build time.
export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  return Boolean(
    url &&
      key &&
      !url.includes("YOUR_PROJECT") &&
      key !== "YOUR_PUBLISHABLE_KEY"
  );
}
