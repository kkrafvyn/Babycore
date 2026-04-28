import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { FileText, Share2, Download, Copy } from 'lucide-react';
import {
  generateDoctorReport,
  createShareableReportLink,
  emailReportToDoctor,
  DoctorReport,
} from '@/lib/doctor-integration-service';
import {
  buildEmergencyHealthCard,
  formatEmergencyHealthCard,
  type EmergencyHealthCard,
} from '@/lib/emergency-health-card-service';
import {
  downloadEmergencyShareCardPdf,
  getEmergencyShareCard,
  type EmergencyShareCardResponse,
} from '@/lib/care-advanced-api';

interface DoctorReportGeneratorProps {
  babyId: string;
  babyName: string;
  onReportGenerated?: (report: DoctorReport) => void;
}

export function DoctorReportGenerator({ babyId, babyName, onReportGenerated }: DoctorReportGeneratorProps) {
  const [reportType, setReportType] = useState<'pediatrician' | 'vaccination' | 'health_summary'>('health_summary');
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState<DoctorReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<DoctorReport | null>(null);
  const [sharingUrl, setSharingUrl] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [emergencyCard, setEmergencyCard] = useState<EmergencyHealthCard | null>(null);
  const [emergencyShareCard, setEmergencyShareCard] = useState<EmergencyShareCardResponse | null>(null);
  const [buildingEmergencyCard, setBuildingEmergencyCard] = useState(false);
  const [downloadingEmergencyPdf, setDownloadingEmergencyPdf] = useState(false);

  const handleGenerateReport = async () => {
    setGenerating(true);
    const report = await generateDoctorReport(babyId, reportType);
    if (report) {
      setReports([report, ...reports]);
      setSelectedReport(report);
      onReportGenerated?.(report);
    }
    setGenerating(false);
  };

  const handleShare = async () => {
    if (!selectedReport) return;

    const result = await createShareableReportLink(selectedReport.id);
    if (result) {
      setSharingUrl(`${window.location.origin}/shared-report/${result.token}`);
      setQrCode(result.qrCodeUrl);
    }
  };

  const handleDownload = async () => {
    if (!selectedReport?.report_url) return;
    window.open(selectedReport.report_url, '_blank');
  };

  const handleCopyLink = async () => {
    if (sharingUrl) {
      await navigator.clipboard.writeText(sharingUrl);
      alert('Link copied to clipboard!');
    }
  };

  const handleGenerateEmergencyCard = async () => {
    setBuildingEmergencyCard(true);
    try {
      const card = await getEmergencyShareCard(babyId);
      setEmergencyShareCard(card);
    } catch (error) {
      console.warn('Falling back to local emergency card generator:', error);
    }
    const fallbackCard = await buildEmergencyHealthCard(babyId, babyName);
    setEmergencyCard(fallbackCard);
    setBuildingEmergencyCard(false);
  };

  const handleCopyEmergencyCard = async () => {
    if (emergencyShareCard?.text) {
      await navigator.clipboard.writeText(emergencyShareCard.text);
      alert('Emergency card copied to clipboard.');
      return;
    }
    if (!emergencyCard) return;
    await navigator.clipboard.writeText(formatEmergencyHealthCard(emergencyCard));
    alert('Emergency card copied to clipboard.');
  };

  const handleDownloadEmergencyCardPdf = async () => {
    setDownloadingEmergencyPdf(true);
    try {
      await downloadEmergencyShareCardPdf(babyId);
    } catch (error: any) {
      alert(error?.message || 'Failed to download emergency card PDF.');
    } finally {
      setDownloadingEmergencyPdf(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Doctor Report
          </CardTitle>
          <CardDescription>Create PDF reports to share with pediatrician</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {(['health_summary', 'pediatrician', 'vaccination'] as const).map((type) => (
              <Button
                key={type}
                variant={reportType === type ? 'default' : 'outline'}
                onClick={() => setReportType(type)}
              >
                {type === 'health_summary' && 'Health Summary'}
                {type === 'pediatrician' && 'Pediatrician'}
                {type === 'vaccination' && 'Vaccination'}
              </Button>
            ))}
          </div>

          <Button onClick={handleGenerateReport} disabled={generating} className="w-full">
            {generating ? 'Generating...' : 'Generate Report'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Emergency Health Card</CardTitle>
          <CardDescription>
            Fast summary for urgent care visits, triage, or caregiver handoff.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleGenerateEmergencyCard} disabled={buildingEmergencyCard} variant="outline" className="w-full">
            {buildingEmergencyCard ? 'Building card...' : 'Generate Emergency Card'}
          </Button>

          {(emergencyCard || emergencyShareCard) && (
            <div className="rounded-lg border border-border-gray dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Allergies:{' '}
                {emergencyShareCard
                  ? emergencyShareCard.allergies.length
                    ? emergencyShareCard.allergies
                        .map((item: any) => `${item.allergen} (${item.severity})`)
                        .join(', ')
                    : 'None recorded'
                  : emergencyCard?.knownAllergies.length
                  ? emergencyCard.knownAllergies.join(', ')
                  : 'None recorded'}
              </p>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Active meds:{' '}
                {emergencyShareCard
                  ? emergencyShareCard.medications.length
                    ? emergencyShareCard.medications
                        .map((item: any) => `${item.medication_name}${item.dosage ? ` ${item.dosage}` : ''}`)
                        .join(', ')
                    : 'None recorded'
                  : emergencyCard?.activeMedications.length
                  ? emergencyCard.activeMedications.join(', ')
                  : 'None recorded'}
              </p>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Vaccines to review:{' '}
                {emergencyShareCard
                  ? emergencyShareCard.vaccines.length
                    ? emergencyShareCard.vaccines
                        .map((item: any) => `${item.vaccine_name} (${item.status})`)
                        .join(', ')
                    : 'None'
                  : emergencyCard?.overdueVaccines.length
                  ? emergencyCard.overdueVaccines.join(', ')
                  : 'None'}
              </p>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Doctor contacts: {emergencyShareCard?.doctorContacts.length ?? 0}
              </p>
              {emergencyShareCard?.qrCodeDataUrl && (
                <div className="flex justify-center bg-white rounded-md p-2">
                  <img src={emergencyShareCard.qrCodeDataUrl} alt="Emergency QR" className="w-32 h-32" />
                </div>
              )}
              <Button
                onClick={handleDownloadEmergencyCardPdf}
                size="sm"
                variant="outline"
                className="w-full"
                disabled={downloadingEmergencyPdf}
              >
                <Download className="mr-2 h-4 w-4" />
                {downloadingEmergencyPdf ? 'Preparing PDF...' : 'Download Emergency PDF'}
              </Button>
              <Button onClick={handleCopyEmergencyCard} size="sm" variant="outline" className="w-full">
                <Copy className="mr-2 h-4 w-4" />
                Copy Full Emergency Card
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {reports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {reports.map((report) => (
              <button
                key={report.id}
                onClick={() => {
                  setSelectedReport(report);
                  setSharingUrl(null);
                  setQrCode(null);
                }}
                className={`w-full text-left p-2 rounded border transition-colors ${
                  selectedReport?.id === report.id
                    ? 'bg-blue-50 border-blue-300 dark:bg-blue-900 dark:border-blue-700'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <div className="font-semibold text-sm capitalize">{report.report_type}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(report.created_at).toLocaleDateString()}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {selectedReport && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Share Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={handleDownload} variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>

            <Button onClick={handleShare} className="w-full">
              <Share2 className="mr-2 h-4 w-4" />
              Generate Shareable Link
            </Button>

            {sharingUrl && (
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    id="sharing-url-input"
                    type="text"
                    readOnly
                    value={sharingUrl}
                    title="Sharing URL - click copy button to copy"
                    className="flex-1 px-2 py-1 text-xs border rounded bg-white dark:bg-gray-700"
                  />
                  <Button size="sm" onClick={handleCopyLink} variant="outline" title="Copy sharing URL">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                {qrCode && (
                  <div className="flex justify-center bg-white p-3 rounded">
                    <img src={qrCode} alt="QR Code" className="w-32 h-32" />
                  </div>
                )}

                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Link expires in 7 days. Anyone with this link can view the report.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
