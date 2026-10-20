import { createClient } from "@/utils/supabase/server";
import { accessControlError } from "@/lib/access-policy";
import { escapeHtml, sendTransactionalEmail } from "@/lib/email";
import { isSameOrigin } from "@/lib/request-security";

type ApprovalBody = {
  expectedStatus?: string;
  expectedExpiresAt?: string | null;
  expiresAt?: string | null;
  days?: number | null;
  noExpiry?: boolean;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const { id } = await params;
  let body: ApprovalBody;
  try {
    body = await request.json() as ApprovalBody;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });

  const { data: admin } = await supabase.from("profiles").select("role,status")
    .eq("id", user.id).maybeSingle();
  if (admin?.role !== "admin" || admin.status !== "approved") {
    return Response.json({ error: "Administrator access is required." }, { status: 403 });
  }

  const { data: target } = await supabase.from("profiles")
    .select("full_name,email,role,status,expires_at").eq("id", id).maybeSingle();
  if (!target || target.role !== "user") return Response.json({ error: "User not found." }, { status: 404 });

  const { error } = await supabase.rpc("manage_user_access", {
    p_user_id: id,
    p_action: "approve",
    p_expected_status: body.expectedStatus ?? "pending",
    p_expected_expires_at: body.expectedExpiresAt ?? null,
    p_expires_at: body.expiresAt ?? null,
    p_days: body.days ?? null,
    p_no_expiry: body.noExpiry === true,
  });
  if (error) return Response.json({ error: accessControlError(error) }, { status: 400 });

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
  const name = target.full_name?.trim() || "Researcher";
  const safeName = escapeHtml(name);
  const emailResult = await sendTransactionalEmail({
    to: target.email,
    subject: "Your Engineering Nexus access is approved",
    text: `Hello ${name},\n\nYour Engineering Nexus research access has been approved. Sign in at ${siteUrl}/login\n\nEngineering Nexus`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a"><h2 style="color:#075985">Access approved</h2><p>Hello ${safeName},</p><p>Your Engineering Nexus research access has been approved.</p><p><a href="${siteUrl}/login" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#0891b2;color:#fff;text-decoration:none;font-weight:700">Sign in to the platform</a></p><p style="color:#64748b">Engineering Nexus<br>Integrated Engineering Research Platform</p></div>`,
  });

  return Response.json({ ok: true, emailSent: emailResult.sent });
}
