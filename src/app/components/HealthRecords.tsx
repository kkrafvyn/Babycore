import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AlertCircle, Pill, FileText, Plus, Trash2 } from 'lucide-react';
import {
  getHealthRecords,
  getAllergies,
  getMedications,
  deleteHealthRecord,
  HealthRecord,
  Allergy,
  Medication,
} from '@/lib/health-records-service';

interface HealthRecordsProps {
  babyId: string;
  babyName: string;
}

export function HealthRecords({ babyId, babyName }: HealthRecordsProps) {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHealthData();
  }, [babyId]);

  const loadHealthData = async () => {
    setLoading(true);
    const [healthRecords, allergyData, medicationData] = await Promise.all([
      getHealthRecords(babyId),
      getAllergies(babyId),
      getMedications(babyId),
    ]);

    setRecords(healthRecords);
    setAllergies(allergyData);
    setMedications(medicationData);
    setLoading(false);
  };

  const handleDeleteRecord = async (recordId: string, storageKey?: string) => {
    if (!confirm('Delete this record?')) return;

    const success = await deleteHealthRecord(recordId, storageKey);
    if (success) {
      setRecords(records.filter((r) => r.id !== recordId));
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading health records...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Health Records
        </CardTitle>
        <CardDescription>Track medical history for {babyName}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="allergies">Allergies</TabsTrigger>
            <TabsTrigger value="medications">Meds</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-3">
            {allergies.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Known Allergies ({allergies.length})
                </h4>
                {allergies.map((allergy) => (
                  <Card key={allergy.id} className="bg-red-50 dark:bg-red-900/10 border-red-200">
                    <CardContent className="pt-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 text-red-500 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{allergy.allergen}</div>
                          <div className="text-xs text-red-700 dark:text-red-300 capitalize">
                            Severity: {allergy.severity}
                          </div>
                          {allergy.reaction_description && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                              {allergy.reaction_description}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {medications.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Pill className="h-4 w-4 text-blue-500" />
                  Current Medications ({medications.length})
                </h4>
                {medications.map((med) => (
                  <Card key={med.id}>
                    <CardContent className="pt-3">
                      <div className="space-y-1">
                        <div className="font-semibold text-sm">{med.medication_name}</div>
                        {med.dosage && <div className="text-xs text-gray-600 dark:text-gray-400">Dose: {med.dosage}</div>}
                        {med.frequency && (
                          <div className="text-xs text-gray-600 dark:text-gray-400">Freq: {med.frequency}</div>
                        )}
                        {med.reason && <div className="text-xs text-gray-600 dark:text-gray-400">Reason: {med.reason}</div>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {allergies.length === 0 && medications.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No allergies or medications recorded yet.</p>
            )}
          </TabsContent>

          <TabsContent value="allergies">
            <div className="space-y-2">
              {allergies.map((allergy) => (
                <Card key={allergy.id}>
                  <CardContent className="pt-3">
                    <div className="space-y-1">
                      <div className="font-semibold text-sm">{allergy.allergen}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                        {allergy.severity} severity
                      </div>
                      {allergy.reaction_description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{allergy.reaction_description}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {allergies.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No allergies recorded.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="medications">
            <div className="space-y-2">
              {medications.map((med) => (
                <Card key={med.id}>
                  <CardContent className="pt-3">
                    <div className="space-y-1">
                      <div className="font-semibold text-sm">{med.medication_name}</div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                        {med.dosage && <div>Dose: {med.dosage}</div>}
                        {med.frequency && <div>Freq: {med.frequency}</div>}
                      </div>
                      {med.effectiveness_notes && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{med.effectiveness_notes}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {medications.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No medications recorded.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="all">
            <div className="space-y-2">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="flex items-start justify-between p-2 border rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{record.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {record.record_type}
                    </div>
                    {record.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{record.description}</p>
                    )}
                    <div className="text-xs text-gray-400 mt-1">{record.date_recorded}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteRecord(record.id, record.storage_key)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
              {records.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No health records.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
