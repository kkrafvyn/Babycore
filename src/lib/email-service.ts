/**
 * Email Service
 * Sends email notifications using a backend provider (SendGrid, Resend, etc.)
 */

import { supabase } from './supabase';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
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
    const response = await fetch('/api/send-email', {
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
  const html = `
    <h2>Payment Confirmation</h2>
    <p>Thank you for your payment!</p>
    <p><strong>Amount:</strong> ${amount} ${currency}</p>
    <p><strong>Plan:</strong> ${planName}</p>
    <p><strong>Provider:</strong> ${provider === 'paystack' ? 'Paystack' : 'Flutterwave'}</p>
    <p><strong>Status:</strong> Completed</p>
    <p>Your subscription is now active. You can access premium features immediately.</p>
    <p>If you have any questions, contact our support team.</p>
  `;

  return sendEmail({
    to: email,
    subject: 'Payment Confirmation - BabyLog Premium',
    html,
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
  const html = `
    <h2>Subscription Renewal Reminder</h2>
    <p>Your ${planName} subscription will renew on ${renewalDate.toLocaleDateString()}.</p>
    <p>Make sure your payment method is up to date.</p>
    <p><a href="https://babylog.app/account/billing">Manage Subscription</a></p>
  `;

  return sendEmail({
    to: email,
    subject: 'Subscription Renewal Reminder - BabyLog',
    html,
  });
}

/**
 * Send subscription expiry notification
 */
export async function sendSubscriptionExpiredEmail(
  email: string,
  planName: string
): Promise<boolean> {
  const html = `
    <h2>Subscription Expired</h2>
    <p>Your ${planName} subscription has expired.</p>
    <p>Renew your subscription to continue enjoying premium features:</p>
    <ul>
      <li>Advanced growth tracking</li>
      <li>Unlimited data backup</li>
      <li>Family sharing</li>
      <li>Analytics and reports</li>
    </ul>
    <p><a href="https://babylog.app/subscribe">Renew Subscription</a></p>
  `;

  return sendEmail({
    to: email,
    subject: 'Subscription Expired - BabyLog Premium',
    html,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetLink: string
): Promise<boolean> {
  const html = `
    <h2>Reset Your Password</h2>
    <p>Click the link below to reset your password:</p>
    <p><a href="${resetLink}">Reset Password</a></p>
    <p>This link expires in 24 hours.</p>
    <p>If you didn't request this, ignore this email.</p>
  `;

  return sendEmail({
    to: email,
    subject: 'Password Reset - BabyLog',
    html,
  });
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(email: string, userName: string): Promise<boolean> {
  const html = `
    <h2>Welcome to BabyLog!</h2>
    <p>Hi ${userName},</p>
    <p>Welcome to BabyLog, the all-in-one baby tracking app for parents worldwide.</p>
    <p>Get started:</p>
    <ul>
      <li>Add your baby's profile</li>
      <li>Start tracking sleep, feeding, and diaper changes</li>
      <li>Monitor growth with WHO percentile charts</li>
      <li>Keep up with vaccination schedules</li>
    </ul>
    <p><a href="https://babylog.app/get-started">Get Started</a></p>
    <p>Happy tracking!</p>
  `;

  return sendEmail({
    to: email,
    subject: 'Welcome to BabyLog!',
    html,
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
  const html = `
    <h2>Weekly Summary for ${babyName}</h2>
    <p>Here's how ${babyName} is doing this week:</p>
    <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
      <tr style="background-color: #f0f0f0;">
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Metric</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Value</strong></td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;">Total Sleep</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${summaryStats.totalSleep} hours</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;">Feeding Sessions</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${summaryStats.totalFeedings}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;">Diaper Changes</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${summaryStats.diaperChanges}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;">Growth Progress</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${summaryStats.growthProgress}</td>
      </tr>
    </table>
    <p><a href="https://babylog.app/dashboard">View Full Report</a></p>
  `;

  return sendEmail({
    to: email,
    subject: `Weekly Summary: ${babyName}`,
    html,
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
  const vaccinesList = vaccines.map((v) => `<li>${v.name} - Due: ${v.dueDate.toLocaleDateString()}</li>`).join('');

  const html = `
    <h2>Vaccination Reminder</h2>
    <p>Hi, ${babyName} has upcoming vaccinations:</p>
    <ul>${vaccinesList}</ul>
    <p>Schedule an appointment with your pediatrician to keep ${babyName} protected.</p>
    <p><a href="https://babylog.app/vaccinations">View Vaccination Calendar</a></p>
  `;

  return sendEmail({
    to: email,
    subject: `Vaccination Reminder: ${babyName}`,
    html,
  });
}
