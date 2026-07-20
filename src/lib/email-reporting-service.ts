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

const getAuthHeaders = async (): Promise<HeadersInit> => {
  const auth = supabase.auth as any;
  const {
    data: { session },
  } = await auth.getSession();

  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
};

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
    // Generate social media card
    const cardUrl = await generateSocialMediaCard(babyName, milestoneType);
    const headers = await getAuthHeaders();

    // Send milestone email through the API route
    const response = await fetch('/api/email-reports/send-milestone-announcement', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        babyId,
        milestone: milestoneType,
        details: {
          babyName,
          cardUrl,
          announcedAt: new Date().toISOString(),
        },
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
  const safeName = babyName || 'Baby';
  const safeMilestone = milestoneType.replace(/[-_]/g, ' ');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1d2a44" />
          <stop offset="100%" stop-color="#3d6f8a" />
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#bg)" />
      <text x="80" y="230" font-size="62" fill="#ffffff" font-family="Arial, sans-serif" font-weight="700">
        ${safeName}
      </text>
      <text x="80" y="320" font-size="46" fill="#d7f3ff" font-family="Arial, sans-serif">
        Milestone: ${safeMilestone}
      </text>
      <text x="80" y="410" font-size="30" fill="#d7f3ff" font-family="Arial, sans-serif">
        Captured with Cradlyn
      </text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Generate weekly digest content
 */
export async function generateWeeklyDigestContent(babyId: string): Promise<string | null> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch('/api/email-reports/preview', {
      method: 'POST',
      headers,
      body: JSON.stringify({ babyId, reportType: 'weekly' }),
    });

    if (!response.ok) throw new Error('Failed to generate digest');
    const { preview } = await response.json();
    return preview;
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
    const headers = await getAuthHeaders();
    const response = await fetch('/api/email-reports/preview', {
      method: 'POST',
      headers,
      body: JSON.stringify({ babyId, reportType: 'monthly' }),
    });

    if (!response.ok) throw new Error('Failed to generate newsletter');
    const { preview } = await response.json();
    return preview;
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
  let daysAhead = dayOfWeek - today.getDay();

  if (daysAhead <= 0) {
    daysAhead += 7;
  }

  const nextDay = new Date(today.setDate(today.getDate() + daysAhead));
  return nextDay;
}
