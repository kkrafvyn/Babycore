import { supabase } from './supabase';
import QRCode from 'qrcode';

export interface DoctorReport {
  id: string;
  baby_id: string;
  report_url: string;
  storage_key?: string;
  report_type: 'pediatrician' | 'vaccination' | 'health_summary';
  date_range_start?: string;
  date_range_end?: string;
  shared_token?: string;
  shared_with?: string[];
  expires_at?: string;
  created_at: string;
}

export interface PediatricianContact {
  id: string;
  baby_id: string;
  name: string;
  clinic_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  specialty?: string;
  is_primary: boolean;
}

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const auth = supabase.auth as any;
  const {
    data: { session },
  } = await auth.getSession();
  const accessToken: string | undefined = session?.access_token;

  return {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
};

/**
 * Generate doctor report PDF (would call backend service)
 */
export async function generateDoctorReport(
  babyId: string,
  reportType: 'pediatrician' | 'vaccination' | 'health_summary',
  dateStart?: string,
  dateEnd?: string
): Promise<DoctorReport | null> {
  try {
    // Call backend endpoint to generate PDF
    // This would include charts, data summaries, vaccination records, etc.
    const headers = await getAuthHeaders();
    const response = await fetch('/api/reports/generate', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        baby_id: babyId,
        report_type: reportType,
        date_range_start: dateStart,
        date_range_end: dateEnd,
      }),
    });

    if (!response.ok) throw new Error('Failed to generate report');
    const pdfBuffer = await response.arrayBuffer();

    // Upload to storage
    const fileName = `reports/${babyId}/${reportType}_${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('doctor-reports')
      .upload(fileName, new Blob([pdfBuffer], { type: 'application/pdf' }));

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from('doctor-reports')
      .getPublicUrl(fileName);

    // Save to database
    const { data, error } = await supabase
      .from('doctor_reports')
      .insert({
        baby_id: babyId,
        report_url: publicUrl.publicUrl,
        storage_key: fileName,
        report_type: reportType,
        date_range_start: dateStart,
        date_range_end: dateEnd,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error generating doctor report:', err);
    return null;
  }
}

/**
 * Create shareable link with QR code
 */
export async function createShareableReportLink(
  reportId: string,
  expiresIn: number = 7 // days
): Promise<{ token: string; qrCodeUrl: string } | null> {
  try {
    // Generate unique token
    const token = `${reportId}_${Math.random().toString(36).substring(7)}`;

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresIn);

    // Update report with sharing info
    const { error: updateError } = await supabase
      .from('doctor_reports')
      .update({
        shared_token: token,
        expires_at: expiresAt.toISOString(),
      })
      .eq('id', reportId);

    if (updateError) throw updateError;

    // Generate QR code
    const shareUrl = `${window.location.origin}/shared-report/${token}`;
    const qrCodeUrl = await QRCode.toDataURL(shareUrl);

    return { token, qrCodeUrl };
  } catch (err) {
    console.error('Error creating shareable link:', err);
    return null;
  }
}

/**
 * Get report by share token
 */
export async function getSharedReport(token: string): Promise<DoctorReport | null> {
  try {
    const { data, error } = await supabase
      .from('doctor_reports')
      .select('*')
      .eq('shared_token', token)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error fetching shared report:', err);
    return null;
  }
}

/**
 * Email report to doctor
 */
export async function emailReportToDoctor(
  reportId: string,
  doctorEmail: string,
  babyName: string
): Promise<boolean> {
  try {
    const { data: report } = await supabase
      .from('doctor_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (!report) return false;

    // Call email service (backend)
    const headers = await getAuthHeaders();
    const response = await fetch('/api/email/send-report', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        recipient_email: doctorEmail,
        baby_name: babyName,
        report_url: report.report_url,
        report_type: report.report_type,
      }),
    });

    if (!response.ok) throw new Error('Failed to send email');

    // Update shared_with list
    const currentSharedWith = report.shared_with || [];
    await supabase
      .from('doctor_reports')
      .update({
        shared_with: [...new Set([...currentSharedWith, doctorEmail])],
      })
      .eq('id', reportId);

    return true;
  } catch (err) {
    console.error('Error emailing report:', err);
    return false;
  }
}

/**
 * Add or update pediatrician contact
 */
export async function savePediatricianContact(
  babyId: string,
  contact: Omit<PediatricianContact, 'id'>
): Promise<PediatricianContact | null> {
  try {
    if (contact.is_primary) {
      // Unset previous primary
      await supabase
        .from('pediatrician_contacts')
        .update({ is_primary: false })
        .eq('baby_id', babyId)
        .eq('is_primary', true);
    }

    const { data, error } = await supabase
      .from('pediatrician_contacts')
      .insert(contact)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error saving pediatrician contact:', err);
    return null;
  }
}

/**
 * Get all pediatrician contacts for a baby
 */
export async function getPediatricianContacts(babyId: string): Promise<PediatricianContact[]> {
  try {
    const { data, error } = await supabase
      .from('pediatrician_contacts')
      .select('*')
      .eq('baby_id', babyId)
      .order('is_primary', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching pediatrician contacts:', err);
    return [];
  }
}

/**
 * Delete pediatrician contact
 */
export async function deletePediatricianContact(contactId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('pediatrician_contacts')
      .delete()
      .eq('id', contactId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error deleting contact:', err);
    return false;
  }
}

/**
 * Revoke share access
 */
export async function revokeReportShare(reportId: string, email: string): Promise<boolean> {
  try {
    const { data: report } = await supabase
      .from('doctor_reports')
      .select('shared_with')
      .eq('id', reportId)
      .single();

    if (!report) return false;

    const updatedList = (report.shared_with || []).filter((entry: string) => entry !== email);

    const { error } = await supabase
      .from('doctor_reports')
      .update({ shared_with: updatedList })
      .eq('id', reportId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error revoking share:', err);
    return false;
  }
}
