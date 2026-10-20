import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "../../../../../utils/supabase/server";
import { hasActiveAccess } from "../../../../../lib/access-policy";

export const runtime = "nodejs";

const fileName = "HEMOXV1.3.7.1.apk";

export async function GET() {
  const noStore = { "Cache-Control": "private, no-store" };
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response("Sign in to download this file.", {
      status: 401,
      headers: noStore,
    });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, status, expires_at")
    .eq("id", user.id)
    .single();

  const canDownload = !profileError && hasActiveAccess(profile);

  if (!canDownload) {
    return new Response("Your account does not have active download access.", {
      status: 403,
      headers: noStore,
    });
  }

  if (profile?.role === "user") {
    const [{ data: access, error: accessError }, { data: visibility }] = await Promise.all([
      supabase.from("user_resource_access").select("resource_key")
        .eq("user_id", user.id).eq("resource_key", "software").maybeSingle(),
      supabase.from("resource_visibility").select("display_mode")
        .eq("resource_key", "software").maybeSingle(),
    ]);

    if (accessError || !access || visibility?.display_mode === "hidden") {
      return new Response("Software access has not been assigned to your account.", {
        status: 403,
        headers: noStore,
      });
    }
  }

  try {
    const file = await readFile(join(process.cwd(), "assets", "software", fileName));

    return new Response(new Uint8Array(file), {
      headers: {
        ...noStore,
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(file.byteLength),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("HEMOX download unavailable:", error);
    return new Response("File temporarily unavailable.", {
      status: 503,
      headers: noStore,
    });
  }
}
