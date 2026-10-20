import { createClient } from "@/utils/supabase/server";
import { escapeHtml, sendTransactionalEmail } from "@/lib/email";
import { isSameOrigin } from "@/lib/request-security";

type ContactBody = {
  name?: string;
  email?: string;
  category?: string;
  subject?: string;
  message?: string;
  website?: string;
};

const categories = new Set(["General", "Access", "Technical", "Research collaboration", "Other"]);

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  let body: ContactBody;
  try {
    body = await request.json() as ContactBody;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (body.website) return Response.json({ ok: true });

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const category = body.category?.trim() ?? "General";
  const subject = body.subject?.trim() ?? "";
  const message = body.message?.trim() ?? "";
  if (name.length < 2 || name.length > 120 || !/^\S+@\S+\.\S+$/.test(email)
    || !categories.has(category) || subject.length < 3 || subject.length > 160
    || message.length < 10 || message.length > 5000) {
    return Response.json({ error: "Please complete all fields with valid information." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.rpc("submit_contact_message", {
    p_name: name,
    p_email: email,
    p_category: category,
    p_subject: subject,
    p_message: message,
    p_user_id: user?.id ?? null,
  });
  if (error) {
    const isSetupError = error.code === "PGRST202" || error.code === "42883";
    return Response.json({
      error: isSetupError
        ? "Contact service setup is incomplete. Please try again after the administrator completes the database update."
        : error.message,
    }, { status: isSetupError ? 503 : 400 });
  }

  const recipient = process.env.CONTACT_RECIPIENT_EMAIL?.trim();
  if (recipient) {
    await sendTransactionalEmail({
      to: recipient,
      replyTo: email,
      subject: `[Engineering Nexus] ${category}: ${subject}`,
      text: `Contact request from ${name} (${email})\nCategory: ${category}\n\n${message}`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a"><h2>Engineering Nexus contact request</h2><p><strong>From:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p><p><strong>Category:</strong> ${escapeHtml(category)}</p><p><strong>Subject:</strong> ${escapeHtml(subject)}</p><hr><p style="white-space:pre-wrap">${escapeHtml(message)}</p></div>`,
    });
  }

  return Response.json({ ok: true });
}
