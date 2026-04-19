type Params = {
  displayName: string;
  email: string;
  password: string;
  loginUrl: string;
};

export function sellerWelcomeSubject(): string {
  return "You're in — Lokalsyon access is ready";
}

export function sellerWelcomeText({
  displayName,
  email,
  password,
  loginUrl,
}: Params): string {
  return [
    `Hi ${displayName},`,
    "",
    "Your Lokalsyon request has been approved. Here are your starter credentials:",
    "",
    `  Email:    ${email}`,
    `  Password: ${password}`,
    "",
    `Sign in:  ${loginUrl}`,
    "",
    "First-time setup takes about 60 seconds — pick your shop slug, shop name, and drop a pin at the center of your municipality. After that, you can generate a delivery link for every customer and see where they are on a map.",
    "",
    "For security, please change your password after signing in.",
    "",
    "Salamat,",
    "Lokalsyon",
  ].join("\r\n");
}

export function sellerWelcomeHtml({
  displayName,
  email,
  password,
  loginUrl,
}: Params): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 8px 32px;">
                <div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#71717a;">Lokalsyon</div>
                <h1 style="margin:14px 0 0 0;font-size:22px;line-height:1.3;color:#09090b;">You're in, ${escapeHtml(displayName)}.</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0 32px;color:#3f3f46;font-size:14px;line-height:1.55;">
                Your Lokalsyon request has been approved. Here are your starter credentials:
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 0 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f4f4f5;border-radius:8px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;color:#18181b;">
                  <tr>
                    <td style="padding:10px 14px;color:#71717a;width:90px;">Email</td>
                    <td style="padding:10px 14px 10px 0;word-break:break-all;">${escapeHtml(email)}</td>
                  </tr>
                  <tr>
                    <td style="padding:0 14px 10px 14px;color:#71717a;">Password</td>
                    <td style="padding:0 14px 10px 0;word-break:break-all;">${escapeHtml(password)}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0 32px;">
                <a href="${escapeAttr(loginUrl)}" style="display:inline-block;background:#09090b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;padding:12px 20px;border-radius:999px;">Sign in</a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0 32px;color:#3f3f46;font-size:14px;line-height:1.55;">
                First-time setup takes about a minute — pick your shop slug and drop a pin at the center of your municipality. From then on, generate a delivery link for every customer and watch their locations appear on a map.
              </td>
            </tr>
            <tr>
              <td style="padding:14px 32px 28px 32px;color:#71717a;font-size:12px;line-height:1.55;">
                For security, please change your password after signing in.<br>
                Salamat,<br>
                Lokalsyon
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
