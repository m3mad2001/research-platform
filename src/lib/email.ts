import "server-only";

type EmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
};

export type EmailResult =
  | { sent: true }
  | { sent: false; reason: "not-configured" | "provider-error" };

export function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

/**
 * Sends transactional mail through Resend without exposing credentials or the
 * private contact recipient to the browser. Database actions must never depend
 * on email delivery succeeding.
 */
export async function sendTransactionalEmail(input: EmailInput): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.APP_EMAIL_FROM?.trim();
  if (!apiKey || !from) return { sent: false, reason: "not-configured" };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
      cache: "no-store",
    });
    return response.ok ? { sent: true } : { sent: false, reason: "provider-error" };
  } catch {
    return { sent: false, reason: "provider-error" };
  }
}
