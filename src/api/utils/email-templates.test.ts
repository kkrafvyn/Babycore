import { describe, expect, it } from 'vitest';

import {
  renderCustomEmail,
  renderDoctorReportEmail,
  renderInviteEmail,
  renderMilestoneEmail,
  renderMonthlyNewsletterEmail,
  renderPasswordResetEmail,
  renderPaymentConfirmationEmail,
  renderSubscriptionExpiredEmail,
  renderSubscriptionRenewalEmail,
  renderVaccinationReminderEmail,
  renderWeeklyDigestEmail,
  renderWeeklySummaryReportEmail,
  renderWelcomeEmail,
  wrapEmailHtml,
} from './email-templates.js';

const editorialMarkers = ['Journal', 'Sign In', 'Privacy Policy', 'Designed for your peace of mind'];

const expectEditorialHtml = (html: string) => {
  for (const marker of editorialMarkers) {
    expect(html).toContain(marker);
  }
  expect(html).toMatch(/<!doctype html>/i);
};

describe('email templates use editorial layout', () => {
  it('wraps custom html fragments', () => {
    const html = wrapEmailHtml('<p>Hello parent</p>', {
      preview: 'Preview copy',
      title: 'Custom update',
    });

    expectEditorialHtml(html);
    expect(html).toContain('Hello parent');
    expect(html).toContain('FROM THE EDITORIAL TEAM');
  });

  it('leaves full html documents untouched', () => {
    const fullDocument = '<!doctype html><html><body>Already wrapped</body></html>';
    expect(wrapEmailHtml(fullDocument, { preview: 'x', title: 'x' })).toBe(fullDocument);
  });

  it('renders all transactional templates with editorial chrome', () => {
    const samples = [
      renderInviteEmail({
        recipientName: 'Alex',
        babyName: 'Maya',
        role: 'caregiver',
        inviteLink: 'https://example.com/invite',
      }).html,
      renderWeeklyDigestEmail({
        babyName: 'Maya',
        stats: { feedings: 6, sleep: 42, diapers: 8, vaccinations: 1 },
        dashboardUrl: 'https://example.com/dashboard',
      }).html,
      renderMonthlyNewsletterEmail({
        babyName: 'Maya',
        stats: { feedings: 6, sleep: 180, diapers: 8, vaccinations: 2 },
        dashboardUrl: 'https://example.com/dashboard',
      }).html,
      renderMilestoneEmail({
        babyName: 'Maya',
        milestoneName: 'First smile',
        date: '2026-07-01',
        dashboardUrl: 'https://example.com/dashboard',
      }).html,
      renderDoctorReportEmail({
        babyName: 'Maya',
        reportType: 'Growth',
        reportUrl: 'https://example.com/report',
      }).html,
      renderPaymentConfirmationEmail({
        amount: 9.99,
        currency: 'USD',
        provider: 'paystack',
        planName: 'Premium',
        renewalDate: '2026-08-01',
        dashboardUrl: 'https://example.com/dashboard',
      }).html,
      renderSubscriptionRenewalEmail({
        planName: 'Premium',
        renewalDate: '2026-08-01',
        actionUrl: 'https://example.com/payment',
      }).html,
      renderSubscriptionExpiredEmail({
        planName: 'Premium',
        actionUrl: 'https://example.com/payment',
      }).html,
      renderPasswordResetEmail({
        resetLink: 'https://example.com/reset',
      }).html,
      renderWelcomeEmail({
        userName: 'Alex',
        getStartedUrl: 'https://example.com/dashboard',
      }).html,
      renderWeeklySummaryReportEmail({
        babyName: 'Maya',
        totalSleep: 42,
        totalFeedings: 35,
        diaperChanges: 56,
        growthProgress: 'On track',
        dashboardUrl: 'https://example.com/dashboard',
      }).html,
      renderVaccinationReminderEmail({
        babyName: 'Maya',
        vaccines: [{ name: 'MMR', dueDate: new Date('2026-08-01') }],
        calendarUrl: 'https://example.com/vaccination',
      }).html,
      renderCustomEmail({
        preview: 'Admin notice',
        title: 'Maintenance window',
        bodyHtml: '<p>Scheduled maintenance tonight.</p>',
      }).html,
    ];

    for (const html of samples) {
      expectEditorialHtml(html);
    }
  });
});
