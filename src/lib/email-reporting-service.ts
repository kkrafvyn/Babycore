import { supabase } from './supabase';

export interface EmailReport {
  id: string;
  user_id: string;
  baby_id: string;
  report_type: 'weekly_digest' | 'monthly_newsletter' | 'milestone_announcement';
  scheduled_for: string;
  sent_at?: string;
  email_html?: string;
  recipient_email: string;
}

/**
 * Schedule weekly digest email
 */
export async function scheduleWeeklyDigest(
  userId: string,
  babyId: string,
  recipientEmail: string
): Promise<EmailReport | null> {
  try {
    // Calculate next Monday at 9 AM
    const nextMonday = getNextWeekday(1);
    nextMonday.setHours(9, 0, 0, 0);

    const { data, error } = await supabase
      .from('email_reports')
      .insert({
        user_id: userId,
        baby_id: babyId,
        report_type: 'weekly_digest',
        scheduled_for: nextMonday.toISOString(),
        recipient_email: recipientEmail,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error scheduling weekly digest:', err);
    return null;
  }
}

/**
 * Schedule monthly newsletter
 */
export async function scheduleMonthlyNewsletter(
  userId: string,
  babyId: string,
  recipientEmail: string
): Promise<EmailReport | null> {
  try {
    // First day of next month at 9 AM
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(9, 0, 0, 0);

    const { data, error } = await supabase
      .from('email_reports')
      .insert({
        user_id: userId,
        baby_id: babyId,
        report_type: 'monthly_newsletter',
        scheduled_for: nextMonth.toISOString(),
        recipient_email: recipientEmail,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error scheduling monthly newsletter:', err);
    return null;
  }
}

/**
 * Send milestone announcement
 */
export async function sendMilestoneAnnouncement(
  babyId: string,
  milestoneType: string,
  babyName: string
): Promise<boolean> {
  try {
    const { data: milestone } = await supabase
      .from('milestone_announcements')
      .insert({
        baby_id: babyId,
        milestone_type: milestoneType,
        milestone_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (!milestone) return false;

    // Generate social media card
    const cardUrl = await generateSocialMediaCard(babyName, milestoneType);

    // Send email notification to parents/family
    const response = await fetch('/api/email/send-milestone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baby_id: babyId,
        baby_name: babyName,
        milestone_type: milestoneType,
        card_url: cardUrl,
      }),
    });

    return response.ok;
  } catch (err) {
    console.error('Error sending milestone announcement:', err);
    return false;
  }
}

/**
 * Generate social media card for milestone
 */
async function generateSocialMediaCard(babyName: string, milestoneType: string): Promise<string> {
  // This would call a backend service to generate an image
  // For now, return placeholder
  return `/api/milestone-card?name=${babyName}&type=${milestoneType}`;
}

/**
 * Generate weekly digest content
 */
export async function generateWeeklyDigestContent(babyId: string): Promise<string | null> {
  try {
    const response = await fetch('/api/reports/weekly-digest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baby_id: babyId }),
    });

    if (!response.ok) throw new Error('Failed to generate digest');
    const { html } = await response.json();
    return html;
  } catch (err) {
    console.error('Error generating weekly digest:', err);
    return null;
  }
}

/**
 * Generate monthly newsletter content
 */
export async function generateMonthlyNewsletterContent(babyId: string): Promise<string | null> {
  try {
    const response = await fetch('/api/reports/monthly-newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baby_id: babyId }),
    });

    if (!response.ok) throw new Error('Failed to generate newsletter');
    const { html } = await response.json();
    return html;
  } catch (err) {
    console.error('Error generating monthly newsletter:', err);
    return null;
  }
}

/**
 * Get user's email subscriptions
 */
export async function getEmailSubscriptions(userId: string): Promise<EmailReport[]> {
  try {
    const { data, error } = await supabase
      .from('email_reports')
      .select('*')
      .eq('user_id', userId)
      .is('sent_at', null)
      .order('scheduled_for', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching subscriptions:', err);
    return [];
  }
}

/**
 * Unsubscribe from email reports
 */
export async function unsubscribeFromEmailReports(
  userId: string,
  reportType: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from('email_reports').delete().eq('user_id', userId).eq('report_type', reportType);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error unsubscribing:', err);
    return false;
  }
}

/**
 * Helper: Get next occurrence of a weekday
 */
function getNextWeekday(dayOfWeek: number): Date {
  const today = new Date();
  const daysAhead = dayOfWeek - today.getDay();

  if (daysAhead <= 0) {
    daysAhead += 7;
  }

  const nextDay = new Date(today.setDate(today.getDate() + daysAhead));
  return nextDay;
}
