import { createClient } from "../../../../utils/supabase/server";

export async function POST(request: Request) {
  // Block cross-origin POSTs using the user's authenticated cookies.
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return new Response(null, { status: 403 });
  }
  let resourceKey: unknown;
  try {
    ({ resourceKey } = await request.json());
  } catch {
    return new Response(null, { status: 400 });
  }
  if (resourceKey !== "courses" && resourceKey !== "software" && resourceKey !== "silo") {
    return new Response(null, { status: 400 });
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_resource_visit", { p_resource_key: resourceKey });
  return new Response(null, {
    status: error ? 403 : 204,
    headers: { "Cache-Control": "no-store" },
  });
}
