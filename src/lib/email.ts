interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
}

/**
 * Transactional email integration point (Task 2.6.2).
 *
 * No paid provider is wired up in Version 1 (per development_rules.md —
 * don't add dependencies without clear justification). This function is
 * the single seam a real provider (Resend, SES, Postmark, etc.) should
 * replace later without any caller changing.
 */
async function sendEmail({ to, subject, text }: SendEmailInput): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    // No provider configured yet — fail loudly in logs (without ever
    // logging the email body/token) so this is visible in production
    // monitoring rather than silently swallowed.
    console.warn("[email] No email provider configured; email not sent.", { to, subject });
    return;
  }

  // Development-only convenience: prints the email (including the
  // reset link/token) to the console so a developer can complete the
  // password-reset flow locally without a real provider. This is the
  // ONLY place a raw reset token is ever written anywhere, and it
  // never runs in production (see branch above).
  console.log(`[email:dev] To: ${to}\nSubject: ${subject}\n\n${text}`);
}

export async function sendPasswordResetEmail(to: string, rawToken: string): Promise<void> {
  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

  await sendEmail({
    to,
    subject: "Reset your KArt password",
    text: `We received a request to reset your KArt password.\n\nThis link expires in 30 minutes and can only be used once:\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
  });
}