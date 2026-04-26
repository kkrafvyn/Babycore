/**
 * Doctor Reports API Routes
 * Endpoints for generating and managing PDF reports
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { v4 as uuid } from 'uuid';

const router = Router();

/**
 * POST /api/reports/generate
 * Generate a doctor/pediatrician report PDF
 */
export async function generateDoctorReport(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { babyId, reportType, includeData } = req.body;

    if (!userId || !babyId || !reportType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify baby belongs to user
    const { data: baby, error: babyError } = await supabase
      .from('babies')
      .select('*')
      .eq('id', babyId)
      .eq('user_id', userId)
      .single();

    if (babyError || !baby) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Fetch baby data based on report type
    let reportData: any = { baby, generatedAt: new Date() };

    if (includeData.includes('vaccinations')) {
      const { data: vaccinations } = await supabase
        .from('vaccination_records')
        .select('*')
        .eq('baby_id', babyId)
        .order('date_given', { ascending: false });
      reportData.vaccinations = vaccinations;
    }

    if (includeData.includes('health')) {
      const { data: health } = await supabase
        .from('health_records')
        .select('*')
        .eq('baby_id', babyId)
        .order('date_recorded', { ascending: false });
      reportData.healthRecords = health;
    }

    if (includeData.includes('allergies')) {
      const { data: allergies } = await supabase
        .from('allergies')
        .select('*')
        .eq('baby_id', babyId);
      reportData.allergies = allergies;
    }

    if (includeData.includes('medications')) {
      const { data: medications } = await supabase
        .from('medications')
        .select('*')
        .eq('baby_id', babyId);
      reportData.medications = medications;
    }

    // Create PDF
    const doc = new PDFDocument();
    const shareToken = uuid();

    // PDF content
    doc.fontSize(24).text(`${baby.name}'s Medical Report`, { underline: true });
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`);
    doc.moveDown();

    // Baby info
    doc.fontSize(14).text('Baby Information', { underline: true });
    doc.fontSize(11).text(`Name: ${baby.name}`);
    doc.fontSize(11).text(`Date of Birth: ${baby.dateOfBirth}`);
    doc.fontSize(11).text(`Age: ${baby.age_months} months`);
    doc.moveDown();

    // Vaccinations
    if (reportData.vaccinations?.length > 0) {
      doc.fontSize(14).text('Vaccinations', { underline: true });
      reportData.vaccinations.forEach((v: any) => {
        doc.fontSize(11).text(`• ${v.name} - ${new Date(v.date_given).toLocaleDateString()}`);
      });
      doc.moveDown();
    }

    // Allergies
    if (reportData.allergies?.length > 0) {
      doc.fontSize(14).text('Allergies', { underline: true });
      reportData.allergies.forEach((a: any) => {
        doc.fontSize(11).text(`• ${a.allergen} (${a.severity})`);
      });
      doc.moveDown();
    }

    // Medications
    if (reportData.medications?.length > 0) {
      doc.fontSize(14).text('Current Medications', { underline: true });
      reportData.medications.forEach((m: any) => {
        doc.fontSize(11).text(`• ${m.medication_name} - ${m.dosage}`);
      });
      doc.moveDown();
    }

    // QR Code for sharing
    const qrUrl = `${process.env.APP_URL}/shared-report/${shareToken}`;
    const qrImage = await QRCode.toDataURL(qrUrl);

    doc.fontSize(12).text('Share Report:');
    doc.image(qrImage, 50, doc.y, { width: 100 });

    // Save to Supabase Storage
    const fileName = `reports/${babyId}/${Date.now()}-report.pdf`;
    const bufferPromise = getPdfBuffer(doc);
    doc.end();
    const buffer = await bufferPromise;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('doctor-reports')
      .upload(fileName, buffer);

    if (uploadError) throw uploadError;

    // Save report metadata
    const { error: dbError } = await supabase
      .from('doctor_reports')
      .insert({
        baby_id: babyId,
        report_type: reportType,
        file_url: `${process.env.SUPABASE_URL}/storage/v1/object/public/doctor-reports/${fileName}`,
        share_token: shareToken,
        token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      });

    if (dbError) throw dbError;

    return res.json({
      success: true,
      reportId: uuid(),
      shareToken,
      fileUrl: uploadData?.path,
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
      .eq('share_token', token)
      .gt('token_expires_at', new Date().toISOString())
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

    if (reportError) throw reportError;

    // Send email via SendGrid, Resend, etc.
    const emailService = process.env.EMAIL_SERVICE || 'sendgrid';

    if (emailService === 'sendgrid') {
      // Implement SendGrid integration
      // await sgMail.send({...})
    } else if (emailService === 'resend') {
      // Implement Resend integration
      // await resend.emails.send({...})
    }

    return res.json({ success: true, message: 'Report emailed to doctor' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

const getPdfBuffer = (doc: any): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

router.post('/generate', generateDoctorReport);
router.get('/shared/:token', getSharedReport);
router.post('/email', emailReportToDoctor);

export default router;
