import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, Edit2, Trash2, Pill, AlertCircle, Stethoscope } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { MedicalRecord } from '../../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { motion } from 'motion/react';

interface MedicalRecordsProps {
  onBack: () => void;
}

interface MedicalRecordFormData {
  type: 'doctor-visit' | 'medication' | 'allergy' | 'condition' | 'other';
  title: string;
  description: string;
  date: string;
  doctorName: string;
  clinic: string;
  medicationName: string;
  dosage: string;
  allergen: string;
  notes: string;
}

const RECORD_TYPES = [
  { value: 'doctor-visit', label: 'Doctor Visit', icon: Stethoscope },
  { value: 'medication', label: 'Medication', icon: Pill },
  { value: 'allergy', label: 'Allergy', icon: AlertCircle },
  { value: 'condition', label: 'Condition', icon: AlertCircle },
  { value: 'other', label: 'Other', icon: Pill },
];

const MEDICAL_RECORDS_STORAGE_KEY = 'babylog_medical_records';

function readMedicalRecordsFromStorage(): MedicalRecord[] {
  try {
    const raw = localStorage.getItem(MEDICAL_RECORDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeMedicalRecordsToStorage(records: MedicalRecord[]) {
  localStorage.setItem(MEDICAL_RECORDS_STORAGE_KEY, JSON.stringify(records));
}

export const MedicalRecords: React.FC<MedicalRecordsProps> = ({ onBack }) => {
  const { currentBaby } = useAppContext();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null);
  const [formData, setFormData] = useState<MedicalRecordFormData>({
    type: 'doctor-visit',
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    doctorName: '',
    clinic: '',
    medicationName: '',
    dosage: '',
    allergen: '',
    notes: '',
  });

  useEffect(() => {
    loadRecords();
  }, [currentBaby?.id]);

  const loadRecords = async () => {
    if (!currentBaby) return;
    setLoading(true);
    try {
      const allRecords = readMedicalRecordsFromStorage();
      const filtered = allRecords
        .filter((record) => record.babyId === currentBaby.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecords(filtered);
    } catch (error) {
      console.error('Failed to load records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (record?: MedicalRecord) => {
    if (record) {
      setEditingRecord(record);
      setFormData({
        type: record.type,
        title: record.title,
        description: record.description,
        date: record.date.split('T')[0],
        doctorName: record.doctorName || '',
        clinic: record.clinic || '',
        medicationName: record.medicationName || '',
        dosage: record.dosage || '',
        allergen: record.allergen || '',
        notes: record.notes || '',
      });
    } else {
      setEditingRecord(null);
      setFormData({
        type: 'doctor-visit',
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        doctorName: '',
        clinic: '',
        medicationName: '',
        dosage: '',
        allergen: '',
        notes: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!currentBaby || !formData.title) return;

    try {
      const date = new Date(`${formData.date}T12:00:00`).toISOString();
      const record: MedicalRecord = {
        id:
          editingRecord?.id ||
          (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`),
        babyId: currentBaby.id,
        date,
        type: formData.type,
        title: formData.title,
        description: formData.description,
        doctorName: formData.doctorName || undefined,
        clinic: formData.clinic || undefined,
        medicationName: formData.medicationName || undefined,
        dosage: formData.dosage || undefined,
        allergen: formData.allergen || undefined,
        notes: formData.notes,
        createdAt: editingRecord?.createdAt || new Date().toISOString(),
      };

      const allRecords = readMedicalRecordsFromStorage();
      const nextRecords = editingRecord
        ? allRecords.map((item) => (item.id === editingRecord.id ? record : item))
        : [record, ...allRecords];

      writeMedicalRecordsToStorage(nextRecords);

      setIsDialogOpen(false);
      await loadRecords();
    } catch (error) {
      console.error('Failed to save record:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this medical record?')) {
      try {
        const allRecords = readMedicalRecordsFromStorage();
        const nextRecords = allRecords.filter((record) => record.id !== id);
        writeMedicalRecordsToStorage(nextRecords);
        await loadRecords();
      } catch (error) {
        console.error('Failed to delete record:', error);
      }
    }
  };

  const getRecordColor = (type: string) => {
    switch (type) {
      case 'allergy':
        return 'border-l-4 border-danger';
      case 'medication':
        return 'border-l-4 border-warning';
      case 'condition':
        return 'border-l-4 border-info';
      default:
        return 'border-l-4 border-success';
    }
  };

  return (
    <div className="min-h-screen bg-background dark:bg-black">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white dark:bg-black/80 backdrop-blur border-b border-separator safe-top">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-primary hover:opacity-70"
          >
            <ChevronLeft size={24} />
            <span className="font-semibold">Back</span>
          </button>
          <h1 className="text-2xl font-bold text-label-primary">Medical Records</h1>
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-primary text-white rounded-lg px-4 py-2 flex items-center gap-2"
          >
            <Plus size={20} />
            Add Record
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-label-secondary text-lg mb-4">No medical records yet</p>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-primary text-white rounded-lg px-6 py-2"
            >
              Add First Record
            </Button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {records.map((record, idx) => {
              const type = RECORD_TYPES.find(t => t.value === record.type);
              const Icon = type?.icon || Pill;
              return (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`bg-secondary-bg dark:bg-tertiary-bg rounded-xl p-4 space-y-3 ${getRecordColor(
                    record.type
                  )}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon size={24} className="text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-label-primary">
                          {record.title}
                        </h3>
                        <p className="text-sm text-label-secondary">
                          {new Date(record.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenDialog(record)}
                        className="p-2 hover:bg-white/10 dark:hover:bg-black/20 rounded-lg transition"
                      >
                        <Edit2 size={18} className="text-primary" />
                      </button>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="p-2 hover:bg-white/10 dark:hover:bg-black/20 rounded-lg transition"
                      >
                        <Trash2 size={18} className="text-danger" />
                      </button>
                    </div>
                  </div>

                  <p className="text-label-secondary">{record.description}</p>

                  {(record.doctorName || record.clinic) && (
                    <div className="bg-white/5 dark:bg-black/20 rounded-lg p-2 text-sm text-label-secondary">
                      {record.doctorName && <p>Doctor: {record.doctorName}</p>}
                      {record.clinic && <p>Clinic: {record.clinic}</p>}
                    </div>
                  )}

                  {record.medicationName && (
                    <div className="bg-white/5 dark:bg-black/20 rounded-lg p-2 text-sm text-label-secondary">
                      <p>Medication: {record.medicationName}</p>
                      {record.dosage && <p>Dosage: {record.dosage}</p>}
                    </div>
                  )}

                  {record.allergen && (
                    <div className="bg-danger/10 rounded-lg p-2 text-sm text-danger font-medium">
                      Allergen: {record.allergen}
                    </div>
                  )}

                  {record.notes && (
                    <p className="text-label-tertiary text-xs italic">
                      Note: {record.notes}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? 'Edit Medical Record' : 'Add Medical Record'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-label-primary mb-2">
                Type
              </label>
              <Select
                value={formData.type}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECORD_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-label-primary mb-2">
                Title
              </label>
              <Input
                placeholder="e.g., Vaccination or Check-up"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-label-primary mb-2">
                Date
              </label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-label-primary mb-2">
                Description
              </label>
              <Textarea
                placeholder="Details about the record..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="h-20"
              />
            </div>

            {formData.type === 'doctor-visit' && (
              <>
                <Input
                  placeholder="Doctor name"
                  value={formData.doctorName}
                  onChange={(e) =>
                    setFormData({ ...formData, doctorName: e.target.value })
                  }
                />
                <Input
                  placeholder="Clinic/Hospital name"
                  value={formData.clinic}
                  onChange={(e) =>
                    setFormData({ ...formData, clinic: e.target.value })
                  }
                />
              </>
            )}

            {formData.type === 'medication' && (
              <>
                <Input
                  placeholder="Medication name"
                  value={formData.medicationName}
                  onChange={(e) =>
                    setFormData({ ...formData, medicationName: e.target.value })
                  }
                />
                <Input
                  placeholder="Dosage (e.g., 5ml twice daily)"
                  value={formData.dosage}
                  onChange={(e) =>
                    setFormData({ ...formData, dosage: e.target.value })
                  }
                />
              </>
            )}

            {formData.type === 'allergy' && (
              <Input
                placeholder="Allergen"
                value={formData.allergen}
                onChange={(e) =>
                  setFormData({ ...formData, allergen: e.target.value })
                }
              />
            )}

            <div>
              <label className="block text-sm font-medium text-label-primary mb-2">
                Notes
              </label>
              <Textarea
                placeholder="Additional notes..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="h-20"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setIsDialogOpen(false)}
              variant="outline"
              className="px-4 py-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-primary text-white px-4 py-2"
            >
              Save Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
