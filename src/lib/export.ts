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

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getReportPeriodDays = (data: ExportData): number => {
  const diffMs = Math.max(24 * 60 * 60 * 1000, data.dateRange.end.getTime() - data.dateRange.start.getTime());
  return Math.max(1, Math.round(diffMs / (24 * 60 * 60 * 1000)));
};

const buildVisitChecklist = (data: ExportData): string[] => {
  const items: string[] = [];
  const overdueVaccines = data.vaccinationRecords.filter((record) => record.status === 'overdue');
  const scheduledVaccines = data.vaccinationRecords
    .filter((record) => record.status === 'scheduled')
    .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime());
  const latestGrowth = [...data.growthMeasurements].sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
  )[0];
  const latestMilestone = [...data.milestones].sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
  )[0];

  if (overdueVaccines.length > 0) {
    items.push(`Review catch-up timing for ${overdueVaccines.length} overdue vaccine${overdueVaccines.length === 1 ? '' : 's'}.`);
  }

  if (scheduledVaccines[0]) {
    items.push(
      `Confirm the next vaccine window for ${scheduledVaccines[0].name} on ${formatDate(new Date(scheduledVaccines[0].dueDate))}.`,
    );
  }

  if (latestGrowth) {
    items.push(
      `Compare current weight ${latestGrowth.weight || '-'} and length ${latestGrowth.height || '-'} with prior growth trend.`,
    );
  } else {
    items.push('Capture a fresh growth check if weight and length have not been recorded recently.');
  }

  if (latestMilestone) {
    items.push(`Discuss recent milestone progress: ${latestMilestone.description}.`);
  }

  if (data.feedLogs.length > 0) {
    items.push('Review feeding tolerance, appetite, and any recent pattern changes.');
  }

  if (data.sleepLogs.length > 0) {
    items.push('Review sleep duration, wake windows, and overnight settling.');
  }

  return items.slice(0, 5);
};

export const buildDoctorVisitBrief = (data: ExportData): string => {
  const reportPeriodDays = getReportPeriodDays(data);
  const totalSleepMinutes = data.sleepLogs.reduce((sum, log) => sum + log.duration, 0);
  const avgFeeds = data.feedLogs.length / reportPeriodDays;
  const avgSleepMinutes = totalSleepMinutes / reportPeriodDays;
  const avgDiapers = data.diaperLogs.length / reportPeriodDays;
  const latestGrowth = [...data.growthMeasurements].sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
  )[0];
  const nextVaccine = [...data.vaccinationRecords]
    .filter((record) => record.status === 'scheduled' || record.status === 'overdue')
    .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime())[0];
  const checklist = buildVisitChecklist(data);

  return [
    `${data.baby.name} visit brief`,
    `Report range: ${formatDate(data.dateRange.start)} to ${formatDate(data.dateRange.end)}`,
    `Average feeds/day: ${avgFeeds.toFixed(1)}`,
    `Average sleep/day: ${formatDuration(Math.round(avgSleepMinutes))}`,
    `Average diapers/day: ${avgDiapers.toFixed(1)}`,
    latestGrowth
      ? `Latest growth: ${formatDate(new Date(latestGrowth.date))} · W ${latestGrowth.weight || '-'} · H ${latestGrowth.height || '-'} · HC ${latestGrowth.headCircumference || '-'}`
      : 'Latest growth: no growth entries in this period',
    nextVaccine
      ? `Next vaccine to review: ${nextVaccine.name} (${nextVaccine.status}) on ${formatDate(new Date(nextVaccine.dueDate))}`
      : 'Next vaccine to review: none currently scheduled',
    checklist.length > 0 ? `Visit checklist: ${checklist.join(' ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
};

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
      const sides: string[] = [];
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
            const sides: string[] = [];
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

export const generateDoctorVisitPacketHTML = (data: ExportData): string => {
  const reportPeriodDays = getReportPeriodDays(data);
  const totalSleepMinutes = data.sleepLogs.reduce((sum, log) => sum + log.duration, 0);
  const avgFeeds = data.feedLogs.length / reportPeriodDays;
  const avgSleepMinutes = totalSleepMinutes / reportPeriodDays;
  const avgDiapers = data.diaperLogs.length / reportPeriodDays;
  const latestGrowth = [...data.growthMeasurements].sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
  )[0];
  const upcomingVaccines = [...data.vaccinationRecords]
    .filter((record) => record.status === 'scheduled' || record.status === 'overdue')
    .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime())
    .slice(0, 4);
  const recentMilestones = [...data.milestones]
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
    .slice(0, 3);
  const recentMemories = [...data.memories]
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .slice(0, 3);
  const checklist = buildVisitChecklist(data);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(data.baby.name)} Visit Packet</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      max-width: 920px;
      margin: 0 auto;
      padding: 36px;
      color: #172033;
      background: #ffffff;
      line-height: 1.5;
    }
    h1, h2, h3, p { margin: 0; }
    .hero {
      border: 1px solid #dbe4f0;
      border-radius: 28px;
      padding: 28px;
      background: linear-gradient(135deg, #f8fbff 0%, #eef5fb 100%);
      margin-bottom: 24px;
    }
    .eyebrow {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #60708a;
      margin-bottom: 10px;
    }
    .hero h1 {
      font-size: 34px;
      font-weight: 900;
      letter-spacing: -0.04em;
      color: #1c2430;
    }
    .hero p {
      margin-top: 10px;
      font-size: 14px;
      color: #546174;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin: 24px 0;
    }
    .stat {
      border: 1px solid #e5edf5;
      border-radius: 22px;
      padding: 18px;
      background: #fff;
    }
    .stat-label {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #7a8798;
      margin-bottom: 8px;
    }
    .stat-value {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: -0.04em;
      color: #1f2a39;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      margin-top: 16px;
    }
    .panel {
      border: 1px solid #e5edf5;
      border-radius: 22px;
      padding: 18px;
      background: #fff;
      page-break-inside: avoid;
    }
    .panel h2 {
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #5d6b80;
      margin-bottom: 12px;
    }
    .panel h3 {
      font-size: 18px;
      font-weight: 800;
      color: #1f2a39;
      margin-bottom: 6px;
    }
    .muted {
      font-size: 13px;
      color: #667487;
    }
    ul {
      margin: 0;
      padding-left: 18px;
    }
    li {
      margin: 0 0 8px 0;
      font-size: 13px;
      color: #1f2a39;
    }
    .footer {
      margin-top: 24px;
      border-top: 1px solid #e5edf5;
      padding-top: 14px;
      font-size: 11px;
      color: #7a8798;
      text-align: center;
    }
    .print-button {
      position: fixed;
      right: 24px;
      bottom: 24px;
      border: none;
      background: #47607e;
      color: #fff;
      border-radius: 999px;
      padding: 14px 24px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 16px 36px rgba(71, 96, 126, 0.28);
    }
    @media print {
      body { padding: 0; }
      .print-button { display: none; }
    }
  </style>
</head>
<body>
  <section class="hero">
    <div class="eyebrow">BabyLog Visit Packet</div>
    <h1>${escapeHtml(data.baby.name)}</h1>
    <p>
      Prepared for pediatric review · ${escapeHtml(formatDate(data.dateRange.start))} to ${escapeHtml(
        formatDate(data.dateRange.end),
      )} · Generated ${escapeHtml(new Date().toLocaleDateString())}
    </p>

    <div class="stats">
      <div class="stat">
        <div class="stat-label">Feeds / Day</div>
        <div class="stat-value">${avgFeeds.toFixed(1)}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Sleep / Day</div>
        <div class="stat-value">${escapeHtml(formatDuration(Math.round(avgSleepMinutes)))}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Diapers / Day</div>
        <div class="stat-value">${avgDiapers.toFixed(1)}</div>
      </div>
    </div>
  </section>

  <section class="grid">
    <div class="panel">
      <h2>Growth Snapshot</h2>
      ${
        latestGrowth
          ? `
            <h3>${escapeHtml(formatDate(new Date(latestGrowth.date)))}</h3>
            <p class="muted">Weight ${escapeHtml(String(latestGrowth.weight || '-'))} · Length ${escapeHtml(
              String(latestGrowth.height || '-'),
            )} · Head ${escapeHtml(String(latestGrowth.headCircumference || '-'))}</p>
          `
          : '<p class="muted">No growth measurements were recorded in this report range.</p>'
      }
    </div>

    <div class="panel">
      <h2>Vaccines To Review</h2>
      ${
        upcomingVaccines.length > 0
          ? `<ul>${upcomingVaccines
              .map(
                (record) =>
                  `<li><strong>${escapeHtml(record.name)}</strong> · ${escapeHtml(record.status)} · ${escapeHtml(
                    formatDate(new Date(record.dueDate)),
                  )}</li>`,
              )
              .join('')}</ul>`
          : '<p class="muted">No scheduled or overdue vaccines are currently flagged.</p>'
      }
    </div>

    <div class="panel">
      <h2>Recent Development</h2>
      ${
        recentMilestones.length > 0
          ? `<ul>${recentMilestones
              .map(
                (milestone) =>
                  `<li><strong>${escapeHtml(formatDate(new Date(milestone.date)))}</strong> · ${escapeHtml(
                    milestone.description,
                  )}</li>`,
              )
              .join('')}</ul>`
          : '<p class="muted">No milestones were recorded in this report range.</p>'
      }
    </div>

    <div class="panel">
      <h2>Caregiver Notes</h2>
      ${
        recentMemories.length > 0
          ? `<ul>${recentMemories
              .map(
                (memory) =>
                  `<li><strong>${escapeHtml(formatDate(new Date(memory.timestamp)))}</strong> · ${escapeHtml(
                    memory.text,
                  )}</li>`,
              )
              .join('')}</ul>`
          : '<p class="muted">No recent memory notes were added in this report range.</p>'
      }
    </div>
  </section>

  <section class="panel" style="margin-top: 16px;">
    <h2>Suggested Review Checklist</h2>
    ${
      checklist.length > 0
        ? `<ul>${checklist.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
        : '<p class="muted">No specific review flags were generated for this packet.</p>'
    }
  </section>

  <div class="footer">
    BabyLog visit packet · This summary is intended to support, not replace, direct clinical review.
  </div>

  <button class="print-button" onclick="window.print()">Save as PDF</button>
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
