import { getHealthSummary } from './health-records-service';
import { getGrowthMeasurementsByBaby, getVaccinationRecordsByBaby } from './supabase-storage';

export interface EmergencyHealthCard {
  babyId: string;
  babyName: string;
  generatedAt: string;
  knownAllergies: string[];
  activeMedications: string[];
  latestGrowth?: {
    date: string;
    weight?: number;
    height?: number;
    headCircumference?: number;
  };
  overdueVaccines: string[];
  emergencyNotes: string[];
}

export async function buildEmergencyHealthCard(
  babyId: string,
  babyName: string,
): Promise<EmergencyHealthCard> {
  const [healthSummary, growthRows, vaccineRows] = await Promise.all([
    getHealthSummary(babyId),
    getGrowthMeasurementsByBaby(babyId),
    getVaccinationRecordsByBaby(babyId),
  ]);

  const latestGrowth = [...growthRows]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .at(0);

  const overdueVaccines = vaccineRows
    .filter((item) => item.status === 'overdue')
    .map((item) => item.name);

  return {
    babyId,
    babyName,
    generatedAt: new Date().toISOString(),
    knownAllergies: healthSummary.allergies.map(
      (entry) => `${entry.allergen} (${entry.severity})`,
    ),
    activeMedications: healthSummary.medications.map((entry) =>
      entry.dosage
        ? `${entry.medication_name} - ${entry.dosage}${entry.frequency ? ` (${entry.frequency})` : ''}`
        : entry.medication_name,
    ),
    latestGrowth: latestGrowth
      ? {
          date: latestGrowth.date,
          weight: latestGrowth.weight,
          height: latestGrowth.height,
          headCircumference: latestGrowth.headCircumference,
        }
      : undefined,
    overdueVaccines,
    emergencyNotes: [
      'This summary is informational and should not replace professional medical judgment.',
      'In emergencies, contact local emergency services first.',
    ],
  };
}

export function formatEmergencyHealthCard(card: EmergencyHealthCard): string {
  const lines = [
    `Emergency Health Card - ${card.babyName}`,
    `Generated: ${new Date(card.generatedAt).toLocaleString()}`,
    '',
    `Known allergies: ${card.knownAllergies.length ? card.knownAllergies.join(', ') : 'None recorded'}`,
    `Active medications: ${card.activeMedications.length ? card.activeMedications.join(', ') : 'None recorded'}`,
    `Overdue vaccines: ${card.overdueVaccines.length ? card.overdueVaccines.join(', ') : 'None listed'}`,
  ];

  if (card.latestGrowth) {
    lines.push(
      `Latest growth (${new Date(card.latestGrowth.date).toLocaleDateString()}): ` +
        `W ${card.latestGrowth.weight ?? 'n/a'} | H ${card.latestGrowth.height ?? 'n/a'} | HC ${
          card.latestGrowth.headCircumference ?? 'n/a'
        }`,
    );
  }

  lines.push('', 'Medical note: Consult your pediatrician for diagnosis/treatment decisions.');

  return lines.join('\n');
}
