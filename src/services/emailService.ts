import nodemailer from 'nodemailer';
import { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } from '../config';

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
});

export async function sendEmail(to: string, subject: string, html: string) {
  if (!SMTP_HOST) {
    throw new Error('SMTP is not configured');
  }
  await transporter.sendMail({ from: MAIL_FROM, to, subject, html });
}
