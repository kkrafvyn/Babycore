/**
 * Data Export Module
 * Generates PDF and CSV exports of baby logs for sharing with pediatricians
 */

import { Baby, SleepLog, FeedLog, DiaperLog, GrowthMeasurement, VaccinationRecord, Milestone, MemoryLog } from '../types/index';
import { formatDate, formatTime, formatDuration } from './utils';

interface ExportData {
  baby: Baby;
  sleepLogs: SleepLog[];
  feedLogs: FeedLog[];
  diaperLogs: DiaperLog[];
  growthMeasurements: GrowthMeasurement[];
  vaccinationRecords: VaccinationRecord[];
  milestones: Milestone[];
  memories: MemoryLog[];
  dateRange: { start: Date; end: Date };
}

/**
 * Generate CSV export string from baby data
 */
export const generateCSV = (data: ExportData): string => {
  const lines: string[] = [];
  
  // Header with baby info
  lines.push('Baby Log Export');
  lines.push(`Baby Name,Age,Gender,Country`);
  const dob = new Date(data.baby.dateOfBirth);
  const ageDays = Math.floor((new Date().getTime() - dob.getTime()) / (1000 * 60 * 60 * 24));
  lines.push(`"${data.baby.name}","${ageDays} days","${data.baby.gender || 'Not specified'}","${data.baby.country}"`);
  lines.push('');

  // Sleep logs section
  lines.push('SLEEP LOGS');
  lines.push('Date,Start Time,End Time,Duration (minutes),Notes');
  data.sleepLogs.forEach((log) => {
    lines.push(`${formatDate(new Date(log.startTime))},${formatTime(new Date(log.startTime))},${formatTime(new Date(log.endTime))},${log.duration},"${log.notes || ''}"`);
  });
  lines.push('');

  // Feed logs section
  lines.push('FEEDING LOGS');
  lines.push('Date,Time,Type,Details,Notes');
  data.feedLogs.forEach((log) => {
    let details = '';
    if (log.type === 'breast') {
      const sides = [];
      if (log.breastLeft) sides.push('Left');
      if (log.breastRight) sides.push('Right');
      details = sides.join(' & ');
    } else if (log.type === 'bottle') {
      details = `${log.bottleAmount}ml - ${log.bottleType}`;
    } else {
      details = log.solidDescription || '';
    }
    lines.push(`${formatDate(new Date(log.timestamp))},${formatTime(new Date(log.timestamp))},${log.type},"${details}","${log.notes || ''}"`);
  });
  lines.push('');

  // Diaper logs section
  lines.push('DIAPER LOGS');
  lines.push('Date,Time,Type,Notes');
  data.diaperLogs.forEach((log) => {
    lines.push(`${formatDate(new Date(log.timestamp))},${formatTime(new Date(log.timestamp))},${log.type},"${log.notes || ''}"`);
  });
  lines.push('');

  // Growth measurements section
  lines.push('GROWTH MEASUREMENTS');
  lines.push('Date,Weight,Height,Head Circumference');
  data.growthMeasurements.forEach((m) => {
    lines.push(`${formatDate(new Date(m.date))},${m.weight || ''},${m.height || ''},${m.headCircumference || ''}`);
  });
  lines.push('');

  // Vaccination records section
  lines.push('VACCINATION RECORDS');
  lines.push('Vaccine,Due Date,Status,Given Date,Notes');
  data.vaccinationRecords.forEach((v) => {
    lines.push(`"${v.name}",${formatDate(new Date(v.dueDate))},${v.status},"${v.givenDate ? formatDate(new Date(v.givenDate)) : ''}","${v.notes || ''}"`);
  });
  lines.push('');

  // Milestones section
  lines.push('MILESTONES');
  lines.push('Date,Type,Description,Notes');
  data.milestones.forEach((m) => {
    lines.push(`${formatDate(new Date(m.date))},${m.type},"${m.description}","${m.notes || ''}"`);
  });
  lines.push('');

  // Memories section
  lines.push('MEMORIES & JOURNAL');
  lines.push('Date,Time,Text,Is Milestone');
  data.memories.forEach((m) => {
    lines.push(`${formatDate(new Date(m.timestamp))},${formatTime(new Date(m.timestamp))},"${m.text}",${m.isMilestone ? 'Yes' : 'No'}`);
  });

  return lines.join('\n');
};

/**
 * Generate PDF report (simple HTML-based for browser printing)
 */
export const generatePDFHTML = (data: ExportData): string => {
  const dob = new Date(data.baby.dateOfBirth);
  const ageDays = Math.floor((new Date().getTime() - dob.getTime()) / (1000 * 60 * 60 * 24));
  const ageMonths = Math.floor(ageDays / 30);
  const ageYears = Math.floor(ageMonths / 12);
  const ageDisplay = ageYears > 0 ? `${ageYears}y ${ageMonths % 12}m` : ageMonths > 0 ? `${ageMonths}m` : `${ageDays}d`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Baby Log Report - ${data.baby.name}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px;
      color: #1a1a1a;
      line-height: 1.5;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #6366f1;
      padding-bottom: 20px;
      margin-bottom: 40px;
    }
    .header h1 { margin: 0; color: #6366f1; font-size: 32px; font-weight: 800; }
    .baby-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      background: #f8fafc;
      padding: 20px;
      border-radius: 16px;
      margin-bottom: 30px;
      border: 1px solid #e2e8f0;
    }
    .section {
      margin: 40px 0;
      page-break-inside: avoid;
    }
    .section h2 {
      color: #6366f1;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 10px;
      font-size: 20px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #f1f5f9;
      font-size: 13px;
    }
    th {
      background: #f8fafc;
      font-weight: 700;
      color: #475569;
    }
    .summary {
      background: #eef2ff;
      padding: 15px;
      border-left: 4px solid #6366f1;
      margin: 10px 0;
      border-radius: 8px;
      font-size: 14px;
    }
    .tag {
      display: inline-block;
      padding: 2px 8px;
      background: #e2e8f0;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .milestone-tag { background: #fef3c7; color: #92400e; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>BabyLog Health Report</h1>
    <p>Generated on ${new Date().toLocaleDateString()} for pediatric review</p>
  </div>

  <div class="baby-info">
    <div><strong>Baby Name:</strong> ${data.baby.name}</div>
    <div><strong>Current Age:</strong> ${ageDisplay}</div>
    <div><strong>Birth Date:</strong> ${formatDate(dob)}</div>
    <div><strong>Gender:</strong> ${data.baby.gender || 'Not specified'}</div>
    <div><strong>Region:</strong> ${data.baby.country}</div>
    <div><strong>Report Range:</strong> ${formatDate(data.dateRange.start)} - ${formatDate(data.dateRange.end)}</div>
  </div>

  <div class="section">
    <h2>Sleep Statistics</h2>
    ${data.sleepLogs.length > 0 ? `
      <div class="summary">
        Total Sessions: <strong>${data.sleepLogs.length}</strong> | 
        Avg Duration: <strong>${formatDuration(Math.round(data.sleepLogs.reduce((acc, log) => acc + log.duration, 0) / data.sleepLogs.length))}</strong> | 
        Total Sleep: <strong>${formatDuration(data.sleepLogs.reduce((acc, log) => acc + log.duration, 0))}</strong>
      </div>
      <table>
        <tr><th>Date</th><th>Start</th><th>End</th><th>Duration</th><th>Notes</th></tr>
        ${data.sleepLogs.map(log => `
          <tr>
            <td>${formatDate(new Date(log.startTime))}</td>
            <td>${formatTime(new Date(log.startTime))}</td>
            <td>${formatTime(new Date(log.endTime))}</td>
            <td>${formatDuration(log.duration)}</td>
            <td>${log.notes || '-'}</td>
          </tr>
        `).join('')}
      </table>
    ` : '<p>No sleep data in this range.</p>'}
  </div>

  <div class="section">
    <h2>Feeding Records</h2>
    ${data.feedLogs.length > 0 ? `
      <div class="summary">
        Total Feedings: <strong>${data.feedLogs.length}</strong> | 
        Breast: <strong>${data.feedLogs.filter(f => f.type === 'breast').length}</strong> | 
        Bottle: <strong>${data.feedLogs.filter(f => f.type === 'bottle').length}</strong> | 
        Solids: <strong>${data.feedLogs.filter(f => f.type === 'solids').length}</strong>
      </div>
      <table>
        <tr><th>Date</th><th>Time</th><th>Type</th><th>Details</th><th>Notes</th></tr>
        ${data.feedLogs.map(log => {
          let details = '';
          if (log.type === 'breast') {
            const sides = [];
            if (log.breastLeft) sides.push('Left');
            if (log.breastRight) sides.push('Right');
            details = sides.join(' & ');
          } else if (log.type === 'bottle') {
            details = `${log.bottleAmount}ml - ${log.bottleType}`;
          } else {
            details = log.solidDescription || '';
          }
          return `<tr><td>${formatDate(new Date(log.timestamp))}</td><td>${formatTime(new Date(log.timestamp))}</td><td>${log.type}</td><td>${details}</td><td>${log.notes || '-'}</td></tr>`;
        }).join('')}
      </table>
    ` : '<p>No feeding data in this range.</p>'}
  </div>

  <div class="section">
    <h2>Diaper Changes</h2>
    ${data.diaperLogs.length > 0 ? `
      <table>
        <tr><th>Date</th><th>Time</th><th>Type</th><th>Notes</th></tr>
        ${data.diaperLogs.map(log => `<tr><td>${formatDate(new Date(log.timestamp))}</td><td>${formatTime(new Date(log.timestamp))}</td><td><strong>${log.type}</strong></td><td>${log.notes || '-'}</td></tr>`).join('')}
      </table>
    ` : '<p>No diaper data in this range.</p>'}
  </div>

  <div class="section">
    <h2>Growth Track</h2>
    ${data.growthMeasurements.length > 0 ? `
      <table>
        <tr><th>Date</th><th>Weight</th><th>Height</th><th>Head Circ.</th></tr>
        ${data.growthMeasurements.map(m => `<tr><td>${formatDate(new Date(m.date))}</td><td>${m.weight || '-'}</td><td>${m.height || '-'}</td><td>${m.headCircumference || '-'}</td></tr>`).join('')}
      </table>
    ` : '<p>No growth data recorded.</p>'}
  </div>

  <div class="section">
    <h2>Immunizations</h2>
    ${data.vaccinationRecords.length > 0 ? `
      <table>
        <tr><th>Vaccine</th><th>Due Date</th><th>Status</th><th>Applied On</th></tr>
        ${data.vaccinationRecords.map(v => `<tr><td><strong>${v.name}</strong></td><td>${formatDate(new Date(v.dueDate))}</td><td>${v.status}</td><td>${v.givenDate ? formatDate(new Date(v.givenDate)) : '-'}</td></tr>`).join('')}
      </table>
    ` : '<p>No vaccines recorded.</p>'}
  </div>

  <div class="section">
    <h2>Developmental Milestones</h2>
    ${data.milestones.length > 0 ? `
      <table>
        <tr><th>Date</th><th>Type</th><th>Description</th></tr>
        ${data.milestones.map(m => `<tr><td>${formatDate(new Date(m.date))}</td><td><span class="tag">${m.type}</span></td><td>${m.description}</td></tr>`).join('')}
      </table>
    ` : '<p>No milestones recorded.</p>'}
  </div>

  <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 11px;">
    <p>This document is an electronic health record generated by BabyLog Premium.</p>
  </div>

  <button class="no-print" onclick="window.print()" style="position: fixed; bottom: 40px; right: 40px; padding: 16px 32px; background: #6366f1; color: white; border: none; border-radius: 50px; cursor: pointer; font-size: 16px; font-weight: 800; box-shadow: 0 10px 25px rgba(99, 102, 241, 0.4);">Save as PDF</button>
</body>
</html>
  `;
};

/**
 * Download CSV file
 */
export const downloadCSV = (csv: string, filename: string): void => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Open PDF in new window for printing
 */
export const openPDFInNewWindow = (html: string): void => {
  const newWindow = window.open('', '_blank');
  if (newWindow) {
    newWindow.document.write(html);
    newWindow.document.close();
  }
};
