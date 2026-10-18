import "server-only";
import { env } from "./env";

import type { Mailer } from "@/server/trpc/init";

interface Email {
  to: string;
  subject: string;
  text: string;
  html: string;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const button = (url: string, label: string) =>
  `<p><a href="${escapeHtml(url)}" style="display:inline-block;background:#00a3ff;color:#011627;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">${label}</a></p>`;

/** Sends through Resend when configured; otherwise prints the email for local development. */
async function send(email: Email) {
  if (!env.RESEND_API_KEY) {
    console.info(`\n  Email to ${email.to}: ${email.subject}\n  ${email.text.replaceAll("\n", "\n  ")}\n`);
    return;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM, ...email }),
  });
  if (!response.ok) throw new Error(`Resend responded ${response.status}: ${await response.text()}`);
}

export function sendMagicLinkEmail(to: string, url: string) {
  return send({
    to,
    subject: "Your Flowcraft sign-in link",
    text: `Sign in to Flowcraft:\n${url}\nThis link expires in 5 minutes. If you didn't request it, ignore this email.`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px">
  <h2 style="margin:0 0 16px">Sign in to Flowcraft</h2>
  ${button(url, "Sign in")}
  <p style="color:#666;font-size:13px">This link expires in 5 minutes. If you didn't request it, you can ignore this email.</p>
</div>`,
  });
}

export const mailer: Mailer = {
  sendInvite: (to, { flowTitle, inviterName, url }) =>
    send({
      to,
      subject: `${inviterName} shared "${flowTitle}" with you`,
      text: `${inviterName} invited you to "${flowTitle}" on Flowcraft:\n${url}\nSign in with this email address to open it.`,
      html: `<div style="font-family:system-ui,sans-serif;max-width:480px">
  <h2 style="margin:0 0 16px">${escapeHtml(inviterName)} shared a flow with you</h2>
  <p>You've been invited to <strong>${escapeHtml(flowTitle)}</strong>.</p>
  ${button(url, "Open flow")}
  <p style="color:#666;font-size:13px">Sign in with this email address to open it.</p>
</div>`,
    }),
};
