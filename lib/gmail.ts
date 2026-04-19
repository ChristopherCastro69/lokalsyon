import { google } from "googleapis";

export function isGmailConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN,
  );
}

function getAuthClient() {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
  client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return client;
}

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
  fromName?: string;
};

/**
 * Send an email through Gmail API using the configured Google OAuth refresh
 * token. The From: address is the authenticated Gmail account (Gmail enforces
 * this — any other From: is silently replaced by the authed account's email).
 */
export async function sendGmail(input: SendEmailInput): Promise<{ ok: boolean; error?: string }> {
  if (!isGmailConfigured()) {
    return { ok: false, error: "Gmail not configured (GOOGLE_* env vars missing)." };
  }

  try {
    const auth = getAuthClient();
    const gmail = google.gmail({ version: "v1", auth });

    const boundary = `lokalsyon-${Date.now()}`;
    const subjectEncoded = needsEncoding(input.subject)
      ? encodeRfc2047(input.subject)
      : input.subject;
    const fromHeader = input.fromName
      ? `=?UTF-8?B?${Buffer.from(input.fromName).toString("base64")}?= <${process.env.GMAIL_FROM ?? "me"}>`
      : undefined;

    const headers: string[] = [
      `To: ${input.to}`,
      fromHeader ? `From: ${fromHeader}` : undefined,
      `Subject: ${subjectEncoded}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ].filter(Boolean) as string[];

    const raw = [
      ...headers,
      "",
      `--${boundary}`,
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: 7bit",
      "",
      input.text,
      "",
      `--${boundary}`,
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: 7bit",
      "",
      input.html,
      "",
      `--${boundary}--`,
    ].join("\r\n");

    const encoded = Buffer.from(raw)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encoded },
    });

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

function needsEncoding(s: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /[^\x00-\x7F]/.test(s);
}

function encodeRfc2047(s: string): string {
  return `=?UTF-8?B?${Buffer.from(s).toString("base64")}?=`;
}
