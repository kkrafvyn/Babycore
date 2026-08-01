/**
 * Email Service
 * Sends email notifications using a backend provider (SendGrid, Resend, etc.)
 */

import {
  renderPasswordResetEmail,
  renderPaymentConfirmationEmail,
  renderSubscriptionExpiredEmail,
  renderSubscriptionRenewalEmail,
  renderVaccinationReminderEmail,
  renderWeeklySummaryReportEmail,
  renderWelcomeEmail,
} from '../api/utils/email-templates';
import { clientAppPath, getClientAppName } from './app-branding-client';
import { resolveApiUrl } from './api-base-url';
import { supabase } from './supabase';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

/**
 * Send email using your backend email service
 * Set up with your email provider (SendGrid, AWS SES, Resend, etc.)
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Provider API keys must stay server-side. Route all email sends through the backend.

    const auth = supabase.auth as any;
    const {
      data: { session },
    } = await auth.getSession();
    const accessToken: string | undefined = session?.access_token;

    // Option 3: Use your own backend endpoint
    const response = await fetch(resolveApiUrl('/send-email'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      throw new Error(`Email send failed: ${response.statusText}`);
    }

    console.log(`Email sent to ${options.to}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Send payment confirmation email
 */
export async function sendPaymentConfirmationEmail(
  email: string,
  amount: number,
  currency: string,
  provider: string,
  planName: string
): Promise<boolean> {
  const emailContent = renderPaymentConfirmationEmail({
    amount,
    currency,
    provider,
    planName,
    dashboardUrl: clientAppPath('/dashboard'),
  });

  return sendEmail({
    to: email,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
  });
}

/**
 * Send subscription renewal reminder
 */
export async function sendSubscriptionRenewalReminder(
  email: string,
  planName: string,
  renewalDate: Date
): Promise<boolean> {
  const appName = getClientAppName();
  const emailContent = renderSubscriptionRenewalEmail({
    planName,
    renewalDate: renewalDate.toLocaleDateString(),
    actionUrl: clientAppPath('/payment'),
  });

  return sendEmail({
    to: email,
    subject: `Subscription Renewal Reminder - ${appName}`,
    html: emailContent.html,
    text: emailContent.text,
  });
}

/**
 * Send subscription expiry notification
 */
export async function sendSubscriptionExpiredEmail(
  email: string,
  planName: string
): Promise<boolean> {
  const appName = getClientAppName();
  const emailContent = renderSubscriptionExpiredEmail({
    planName,
    actionUrl: clientAppPath('/payment'),
  });

  return sendEmail({
    to: email,
    subject: `Subscription Expired - ${appName} Premium`,
    html: emailContent.html,
    text: emailContent.text,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetLink: string
): Promise<boolean> {
  const appName = getClientAppName();
  const emailContent = renderPasswordResetEmail({ resetLink });

  return sendEmail({
    to: email,
    subject: `Password Reset - ${appName}`,
    html: emailContent.html,
    text: emailContent.text,
  });
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(email: string, userName: string): Promise<boolean> {
  const appName = getClientAppName();
  const emailContent = renderWelcomeEmail({
    userName,
    getStartedUrl: clientAppPath('/dashboard'),
  });

  return sendEmail({
    to: email,
    subject: `Welcome to ${appName}!`,
    html: emailContent.html,
    text: emailContent.text,
  });
}

/**
 * Send weekly summary report
 */
export async function sendWeeklySummaryEmail(
  email: string,
  babyName: string,
  summaryStats: {
    totalSleep: number;
    totalFeedings: number;
    diaperChanges: number;
    growthProgress: string;
  }
): Promise<boolean> {
  const emailContent = renderWeeklySummaryReportEmail({
    babyName,
    totalSleep: summaryStats.totalSleep,
    totalFeedings: summaryStats.totalFeedings,
    diaperChanges: summaryStats.diaperChanges,
    growthProgress: summaryStats.growthProgress,
    dashboardUrl: clientAppPath('/dashboard'),
  });

  return sendEmail({
    to: email,
    subject: `Weekly Summary: ${babyName}`,
    html: emailContent.html,
    text: emailContent.text,
  });
}

/**
 * Send vaccination reminder
 */
export async function sendVaccinationReminderEmail(
  email: string,
  babyName: string,
  vaccines: Array<{ name: string; dueDate: Date }>
): Promise<boolean> {
  const emailContent = renderVaccinationReminderEmail({
    babyName,
    vaccines,
    calendarUrl: clientAppPath('/vaccination'),
  });

  return sendEmail({
    to: email,
    subject: `Vaccination Reminder: ${babyName}`,
    html: emailContent.html,
    text: emailContent.text,
  });
}
