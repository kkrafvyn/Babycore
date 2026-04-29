/**
 * Doctor Reports API Routes
 * Endpoints for generating and managing PDF reports
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import PDFDocument from 'pdfkit';
import { v4 as uuid } from 'uuid';
import { sendTransactionalEmail } from '../utils/email.js';

const router = Router();

type SupportedIncludeData =
  | 'sleep'
  | 'feeding'
  | 'diaper'
  | 'growth'
  | 'vaccinations'
  | 'health';

const toIsoDate = (value?: string): string | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const resolveDateRange = (dateStart?: string, dateEnd?: string) => {
  const start = toIsoDate(dateStart);
  const end = toIsoDate(dateEnd);
  return { start, end };
};

const getPdfBuffer = (doc: any): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer | Uint8Array) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
    );
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

const hasBabyAccess = async (userId: string, userEmail: string | undefined, babyId: string) => {
  const ownerCheck = await supabase
    .from('babies')
    .select('id,user_id,name,date_of_birth,gender')
    .eq('id', babyId)
    .single();

  if (ownerCheck.error || !ownerCheck.data) {
    return { allowed: false, baby: null };
  }

  if (ownerCheck.data.user_id === userId) {
    return { allowed: true, baby: ownerCheck.data };
  }

  const acceptedInviteById = await supabase
    .from('family_sharing_invites')
    .select('id')
    .eq('baby_id', babyId)
    .eq('accepted_by', userId)
    .not('accepted_at', 'is', null)
    .maybeSingle();

  if (acceptedInviteById.data) {
    return { allowed: true, baby: ownerCheck.data };
  }

  if (userEmail) {
    const acceptedInviteByEmail = await supabase
      .from('family_sharing_invites')
      .select('id')
      .eq('baby_id', babyId)
      .ilike('invited_email', userEmail.toLowerCase())
      .not('accepted_at', 'is', null)
      .maybeSingle();

    if (acceptedInviteByEmail.data) {
      return { allowed: true, baby: ownerCheck.data };
    }
  }

  const doctorAssignment = await supabase
    .from('doctor_baby_assignments')
    .select('id,status')
    .eq('baby_id', babyId)
    .eq('doctor_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (doctorAssignment.data) {
    return { allowed: true, baby: ownerCheck.data };
  }

  return { allowed: false, baby: null };
};

/**
 * POST /api/reports/generate
 * Generate a doctor/pediatrician report PDF
 */
export async function generateDoctorReport(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email as string | undefined;
    const babyId = String(req.body?.babyId || req.body?.baby_id || '');
    const reportType = String(req.body?.reportType || req.body?.report_type || '');
    const includeData = (Array.isArray(req.body?.includeData) ? req.body.includeData : []) as SupportedIncludeData[];
    const dateStart = String(req.body?.dateStart || req.body?.date_range_start || '');
    const dateEnd = String(req.body?.dateEnd || req.body?.date_range_end || '');

    if (!userId || !babyId || !reportType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const access = await hasBabyAccess(userId, userEmail, babyId);
    if (!access.allowed || !access.baby) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { start, end } = resolveDateRange(dateStart, dateEnd);

    const dateFilters = {
      sleep: 'start_time',
      feeding: 'timestamp',
      diaper: 'timestamp',
      growth: 'date',
      vaccinations: 'due_date',
      health: 'date_recorded',
    } as const;

    const queryWithDateRange = (query: any, key: string) => {
      let next = query;
      if (start) next = next.gte(key, start);
      if (end) next = next.lte(key, end);
      return next;
    };

    const sections: Record<string, any[]> = {
      sleep: [],
      feeding: [],
      diaper: [],
      growth: [],
      vaccinations: [],
      health: [],
    };

    const safeFetch = async (
      key: SupportedIncludeData,
      table: string,
      columns: string,
      dateField: string,
      orderField: string,
    ) => {
      if (!includeData.includes(key)) return;
      const baseQuery = supabase.from(table).select(columns).eq('baby_id', babyId);
      const withDates = queryWithDateRange(baseQuery, dateField).order(orderField, { ascending: false });
      const { data, error } = await withDates;
      if (error) {
        console.warn(`Skipping ${key} in report due to query error:`, error.message);
        return;
      }
      sections[key] = data || [];
    };

    await Promise.all([
      safeFetch('sleep', 'sleep_logs', 'start_time,duration,notes', dateFilters.sleep, 'start_time'),
      safeFetch(
        'feeding',
        'feed_logs',
        'timestamp,type,amount,milk_type,food_description,notes,left_duration,right_duration',
        dateFilters.feeding,
        'timestamp',
      ),
      safeFetch('diaper', 'diaper_logs', 'timestamp,type,notes', dateFilters.diaper, 'timestamp'),
      safeFetch(
        'growth',
        'growth_measurements',
        'date,weight,height,head_circumference',
        dateFilters.growth,
        'date',
      ),
      safeFetch(
        'vaccinations',
        'vaccination_records',
        'name,due_date,given_date,status,notes',
        dateFilters.vaccinations,
        'due_date',
      ),
      safeFetch(
        'health',
        'health_records',
        'date_recorded,record_type,title,description,doctor_name',
        dateFilters.health,
        'date_recorded',
      ),
    ]);

    const doc = new PDFDocument({ margin: 50 });
    const bufferPromise = getPdfBuffer(doc);

    doc.fontSize(22).text(`${access.baby.name}'s Medical Report`);
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor('#4b5563').text(`Generated: ${new Date().toLocaleString()}`);
    doc.fillColor('#000000');
    doc.moveDown(1);

    doc.fontSize(14).text('Patient');
    doc.fontSize(11).text(`Name: ${access.baby.name}`);
    doc.text(`Date of Birth: ${access.baby.date_of_birth || 'N/A'}`);
    doc.text(`Gender: ${access.baby.gender || 'N/A'}`);
    doc.moveDown(1);

    if (start || end) {
      doc.fontSize(11).text(`Date range: ${start ? new Date(start).toLocaleDateString() : 'Any'} - ${end ? new Date(end).toLocaleDateString() : 'Any'}`);
      doc.moveDown(1);
    }

    const writeListSection = (title: string, rows: string[]) => {
      doc.fontSize(13).text(title, { underline: true });
      doc.moveDown(0.3);
      if (!rows.length) {
        doc.fontSize(10).text('No records for selected range.');
      } else {
        rows.slice(0, 25).forEach((row) => doc.fontSize(10).text(`• ${row}`));
      }
      doc.moveDown(0.8);
    };

    if (includeData.includes('sleep')) {
      writeListSection(
        'Sleep',
        sections.sleep.map(
          (row) =>
            `${new Date(row.start_time).toLocaleDateString()} - ${row.duration || 0} min${
              row.notes ? ` (${row.notes})` : ''
            }`,
        ),
      );
    }

    if (includeData.includes('feeding')) {
      writeListSection(
        'Feeding',
        sections.feeding.map(
          (row) =>
            `${new Date(row.timestamp).toLocaleDateString()} - ${row.type}${
              row.amount ? ` ${row.amount}` : ''
            }${row.food_description ? ` (${row.food_description})` : ''}`,
        ),
      );
    }

    if (includeData.includes('diaper')) {
      writeListSection(
        'Diaper',
        sections.diaper.map(
          (row) =>
            `${new Date(row.timestamp).toLocaleDateString()} - ${row.type}${row.notes ? ` (${row.notes})` : ''}`,
        ),
      );
    }

    if (includeData.includes('growth')) {
      writeListSection(
        'Growth',
        sections.growth.map(
          (row) =>
            `${new Date(row.date).toLocaleDateString()} - W:${row.weight || '-'} H:${row.height || '-'} HC:${
              row.head_circumference || '-'
            }`,
        ),
      );
    }

    if (includeData.includes('vaccinations')) {
      writeListSection(
        'Vaccinations',
        sections.vaccinations.map(
          (row) =>
            `${row.name} - due ${new Date(row.due_date).toLocaleDateString()} - ${row.status}${
              row.given_date ? ` (given ${new Date(row.given_date).toLocaleDateString()})` : ''
            }`,
        ),
      );
    }

    if (includeData.includes('health')) {
      writeListSection(
        'Health Records',
        sections.health.map(
          (row) =>
            `${new Date(row.date_recorded).toLocaleDateString()} - ${row.record_type}: ${row.title || ''}`,
        ),
      );
    }

    doc.fontSize(9).fillColor('#6b7280').text('Generated by BabyCore Doctor Report System');
    doc.end();

    const buffer = await bufferPromise;
    const fileName = `reports/${babyId}/${Date.now()}-${reportType}.pdf`;

    const upload = await supabase.storage.from('doctor-reports').upload(fileName, buffer, {
      contentType: 'application/pdf',
      upsert: false,
    });
    if (upload.error) {
      throw upload.error;
    }

    const publicUrl = supabase.storage.from('doctor-reports').getPublicUrl(fileName).data.publicUrl;
    const shareToken = uuid();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const insertResult = await supabase
      .from('doctor_reports')
      .insert({
        baby_id: babyId,
        report_url: publicUrl,
        storage_key: fileName,
        report_type: reportType,
        date_range_start: start ? start.slice(0, 10) : null,
        date_range_end: end ? end.slice(0, 10) : null,
        shared_token: shareToken,
        shared_with: [],
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (insertResult.error) {
      throw insertResult.error;
    }

    return res.json({
      success: true,
      report: insertResult.data,
    });
  } catch (error: any) {
    console.error('Report generation error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/reports/shared/:token
 * View shared report (public, no auth required)
 */
export async function getSharedReport(req: Request, res: Response) {
  try {
    const { token } = req.params;

    const { data: report, error } = await supabase
      .from('doctor_reports')
      .select('*, babies(*)')
      .eq('shared_token', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !report) {
      return res.status(404).json({ error: 'Report not found or expired' });
    }

    return res.json(report);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/reports/email
 * Email report to pediatrician
 */
export async function emailReportToDoctor(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { reportId, doctorEmail } = req.body;

    if (!userId || !reportId || !doctorEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: report, error: reportError } = await supabase
      .from('doctor_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const reportUrl = report.report_url;
    if (!reportUrl) {
      return res.status(400).json({ error: 'Report URL is missing' });
    }

    const { data: baby } = await supabase
      .from('babies')
      .select('name')
      .eq('id', report.baby_id)
      .maybeSingle();

    const babyName = baby?.name || 'Baby';
    const subject = `Medical Report for ${babyName}`;
    const html = `
      <h2>${subject}</h2>
      <p>A parent shared a BabyCore medical report with you.</p>
      <p><strong>Report type:</strong> ${report.report_type || 'General'}</p>
      <p><a href="${reportUrl}">Open report</a></p>
      <p>This link follows the report token expiration policy configured by the parent.</p>
    `;

    const text = [subject, `Report type: ${report.report_type || 'General'}`, `Open report: ${reportUrl}`].join('\n');

    await sendTransactionalEmail({
      to: doctorEmail,
      subject,
      html,
      text,
    });

    const existingRecipients = Array.isArray(report.shared_with) ? report.shared_with : [];
    await supabase
      .from('doctor_reports')
      .update({
        shared_with: Array.from(new Set([...existingRecipients, doctorEmail])),
      })
      .eq('id', report.id);

    return res.json({ success: true, message: 'Report emailed to doctor' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

router.post('/generate', generateDoctorReport);
router.get('/shared/:token', getSharedReport);
router.post('/email', emailReportToDoctor);

export default router;
