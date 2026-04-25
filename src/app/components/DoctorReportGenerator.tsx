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
