import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer, { type Transporter } from "nodemailer";
import type { AppConfiguration } from "../config/configuration";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly config: AppConfiguration["mail"];

  constructor(private readonly configService: ConfigService<AppConfiguration, true>) {
    this.config = this.configService.get("mail", { infer: true });
    this.transporter = this.config.host
      ? nodemailer.createTransport({
          host: this.config.host,
          port: this.config.port,
          secure: this.config.secure,
          auth:
            this.config.user && this.config.pass
              ? { user: this.config.user, pass: this.config.pass }
              : undefined,
        })
      : null;

    if (!this.transporter) {
      this.logger.warn("SMTP is not configured; transactional emails will be logged to stdout");
    }
  }

  private link(path: string, token: string): string {
    return `${this.configService.get("publicWebUrl", { infer: true })}${path}?token=${encodeURIComponent(token)}`;
  }

  async sendVerificationEmail(to: string, name: string | null, token: string): Promise<void> {
    const url = this.link("/verify-email", token);
    await this.deliver({
      to,
      subject: "Verify your VeriFrame email",
      text: `Hi ${name ?? "there"},\n\nVerify your email to start analyzing videos:\n${url}\n\nThis link expires in 24 hours. If you did not create an account, ignore this email.`,
      html: layout(
        "Verify your email",
        `<p>Hi ${escapeHtml(name ?? "there")},</p><p>Confirm your email address to activate your VeriFrame account.</p><p><a class="button" href="${url}">Verify email</a></p><p class="muted">This link expires in 24 hours. If you did not create an account, you can ignore this message.</p>`,
      ),
    });
  }

  async sendPasswordResetEmail(to: string, name: string | null, token: string): Promise<void> {
    const url = this.link("/reset-password", token);
    await this.deliver({
      to,
      subject: "Reset your VeriFrame password",
      text: `Hi ${name ?? "there"},\n\nReset your password here:\n${url}\n\nThis link expires in 60 minutes. If you did not request a reset, ignore this email.`,
      html: layout(
        "Reset your password",
        `<p>Hi ${escapeHtml(name ?? "there")},</p><p>We received a request to reset your password. This link expires in 60 minutes.</p><p><a class="button" href="${url}">Reset password</a></p><p class="muted">If you did not request this, no action is required. Your password has not changed.</p>`,
      ),
    });
  }

  async sendContactNotification(input: {
    name: string;
    email: string;
    subject?: string;
    message: string;
  }): Promise<void> {
    await this.deliver({
      to: this.config.adminEmail,
      subject: `New contact message: ${input.subject ?? "General enquiry"}`,
      text: `From: ${input.name} <${input.email}>\n\n${input.message}`,
      html: layout(
        "New contact message",
        `<p><strong>${escapeHtml(input.name)}</strong> &lt;${escapeHtml(input.email)}&gt;</p><p><strong>Subject:</strong> ${escapeHtml(input.subject ?? "General enquiry")}</p><p style="white-space:pre-wrap">${escapeHtml(input.message)}</p>`,
      ),
    });
  }

  private async deliver(input: { to: string; subject: string; text: string; html: string }): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[mail:dev] to=${input.to} subject="${input.subject}"\n${input.text}`);
      return;
    }
    await this.transporter.sendMail({
      from: this.config.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
  }
}

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const layout = (title: string, body: string): string => `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f6f7fb;margin:0;padding:32px;color:#0f172a}
  .card{max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px}
  h1{font-size:22px;margin:0 0 16px} p{line-height:1.65;color:#334155}
  .button{display:inline-block;background:#4f46e5;color:#fff !important;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;margin:8px 0}
  .muted{font-size:13px;color:#64748b}
</style></head>
<body><div class="card"><h1>${escapeHtml(title)}</h1>${body}<p class="muted" style="margin-top:28px">VeriFrame · probabilistic deepfake detection</p></div></body></html>`;
