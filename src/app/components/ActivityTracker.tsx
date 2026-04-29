import React, { useEffect, useState } from 'react';
import { ChevronLeft, Plus, Edit2, Clock, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useAppContext } from '../AppContext';
import type { Activity } from '../../types';
import {
  deleteActivityLog,
  getActivityLogsByBaby,
  saveActivityLog,
} from '../../lib/activity-logs-service';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface ActivityTrackerProps {
  onBack: () => void;
}

const ACTIVITY_TYPES = [
  { value: 'tummy_time', label: 'Tummy Time', icon: 'self_improvement' },
  { value: 'reading', label: 'Reading', icon: 'book_2' },
  { value: 'outdoor', label: 'Outdoor Play', icon: 'park' },
  { value: 'music', label: 'Music', icon: 'music_note' },
  { value: 'sensory', label: 'Sensory Play', icon: 'toys_and_games' },
  { value: 'social', label: 'Social Time', icon: 'groups' },
  { value: 'other', label: 'Other', icon: 'interests' },
] satisfies Array<{ value: Activity['type']; label: string; icon: string }>;

const createEmptyForm = () => ({
  type: 'tummy_time' as Activity['type'],
  duration: '',
  description: '',
  timestamp: new Date().toISOString().split('T')[0],
  notes: '',
});

const sortActivities = (entries: Activity[]) =>
  [...entries].sort((left, right) => {
    const timestampDelta =
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();

    if (timestampDelta !== 0) {
      return timestampDelta;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });

export const ActivityTracker: React.FC<ActivityTrackerProps> = ({ onBack }) => {
  const { currentBaby } = useAppContext();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [formData, setFormData] = useState(createEmptyForm);

  useEffect(() => {
    void loadActivities();
  }, [currentBaby?.id]);

  const loadActivities = async () => {
    if (!currentBaby) {
      setActivities([]);
      return;
    }

    setLoading(true);

    try {
      const logs = await getActivityLogsByBaby(currentBaby.id);
      setActivities(sortActivities(logs));
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (activity?: Activity) => {
    if (activity) {
      setEditingActivity(activity);
      setFormData({
        type: activity.type,
        duration: activity.duration.toString(),
        description: activity.description || '',
        timestamp: activity.timestamp.split('T')[0],
        notes: activity.notes || '',
      });
    } else {
      setEditingActivity(null);
      setFormData(createEmptyForm());
    }

    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!currentBaby || !formData.duration) return;

    const duration = parseInt(formData.duration, 10);

    if (Number.isNaN(duration) || duration <= 0) {
      return;
    }

    try {
      const activity: Activity = {
        id: editingActivity?.id || crypto.randomUUID(),
        babyId: currentBaby.id,
        timestamp: new Date(`${formData.timestamp}T12:00:00`).toISOString(),
        type: formData.type,
        duration,
        description: formData.description || undefined,
        notes: formData.notes || undefined,
        createdAt: editingActivity?.createdAt || new Date().toISOString(),
      };

      const savedActivity = await saveActivityLog(activity);

      setActivities((prev) => {
        const remaining = prev.filter((entry) => entry.id !== savedActivity.id);
        return sortActivities([savedActivity, ...remaining]);
      });

      setEditingActivity(null);
      setFormData(createEmptyForm());
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save activity:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this activity log?')) {
      return;
    }

    try {
      await deleteActivityLog(id);
      setActivities((prev) => prev.filter((activity) => activity.id !== id));
    } catch (error) {
      console.error('Failed to delete activity:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9fc] dark:bg-[#0d0e10] font-['Manrope',sans-serif]">
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-[#1a1c1e]/80 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-800 h-20">
        <div className="max-w-2xl mx-auto px-8 h-full flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-[#f3f3f7] dark:bg-zinc-800 text-[#5e5f61] dark:text-zinc-400 hover:scale-105 active:scale-95 transition-all shadow-inner"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <h1 className="text-xl font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#2f3337] dark:text-white tracking-tighter">
              Activity Tracker
            </h1>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#afb2b8] -mt-1 italic">
              Play, movement, and development
            </p>
          </div>
          <button
            onClick={() => handleOpenDialog()}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-[#5e5f61] text-white hover:scale-105 active:scale-95 transition-all shadow-lg"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-8 py-10 pb-32">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#45627d]"></div>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-24 space-y-8">
            <div className="w-24 h-24 bg-white dark:bg-zinc-900 rounded-[2.5rem] mx-auto flex items-center justify-center border border-gray-100 dark:border-zinc-800 shadow-sm border-dashed">
              <span
                className="material-symbols-outlined text-4xl text-[#afb2b8]"
                style={{ fontVariationSettings: "'FILL' 0" }}
              >
                interests
              </span>
            </div>
            <div>
              <p className="text-[#2f3337] dark:text-white font-['Plus_Jakarta_Sans',sans-serif] font-black text-lg tracking-tight">
                No activities captured
              </p>
              <p className="text-[#afb2b8] dark:text-zinc-500 font-bold text-xs mt-1">
                Reading, tummy time, and play sessions will appear here.
              </p>
            </div>
            <button
              onClick={() => handleOpenDialog()}
              className="bg-[#5e5f61] text-white px-10 py-5 rounded-full font-['Plus_Jakarta_Sans',sans-serif] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-[#5e5f61]/20 active:scale-95 transition-all"
            >
              Record First Session
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {activities.map((activity, idx) => {
              const activityType = ACTIVITY_TYPES.find((type) => type.value === activity.type);

              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white dark:bg-[#1a1c1e] rounded-tr-[3rem] rounded-bl-[3rem] rounded-tl-2xl rounded-br-2xl p-8 border border-gray-100 dark:border-zinc-800 shadow-[0_16px_48px_rgba(47,51,55,0.02)] group hover:border-[#45627d] dark:hover:border-blue-500 transition-all"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 rounded-2xl bg-[#f3f3f7] dark:bg-zinc-800/50 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-[#5e5f61] dark:text-zinc-300">
                          {activityType?.icon || 'interests'}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-xl font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#2f3337] dark:text-white tracking-tight leading-tight">
                          {activityType?.label || 'Other Session'}
                        </h3>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#afb2b8] dark:text-zinc-500 mt-1">
                          {new Date(activity.timestamp).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenDialog(activity)}
                        className="w-10 h-10 rounded-xl bg-[#f3f3f7] dark:bg-zinc-800 flex items-center justify-center text-[#5e5f61] dark:text-zinc-400 hover:text-[#45627d] dark:hover:text-blue-300 transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(activity.id)}
                        className="w-10 h-10 rounded-xl bg-[#fef2f2] dark:bg-rose-900/10 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-[#fcfcff] dark:bg-zinc-900/50 p-6 rounded-2xl border border-gray-50 dark:border-zinc-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock size={12} className="text-[#45627d] dark:text-blue-400" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-[#afb2b8]">
                          Duration
                        </p>
                      </div>
                      <p className="text-2xl font-['Plus_Jakarta_Sans'] font-black text-[#2f3337] dark:text-white">
                        {activity.duration}
                        <span className="text-[10px] ml-1 uppercase text-[#afb2b8]">min</span>
                      </p>
                    </div>
                    <div className="bg-[#fcfcff] dark:bg-zinc-900/50 p-6 rounded-2xl border border-gray-50 dark:border-zinc-800">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-sm text-[#45627d] dark:text-blue-400">
                          monitoring
                        </span>
                        <p className="text-[9px] font-black uppercase tracking-widest text-[#afb2b8]">
                          Category
                        </p>
                      </div>
                      <p className="text-sm font-['Plus_Jakarta_Sans'] font-black text-[#5e5f61] dark:text-zinc-400 uppercase tracking-tight">
                        {activityType?.label || 'Other'}
                      </p>
                    </div>
                  </div>

                  {activity.description && (
                    <div className="bg-[#f3f3f7] dark:bg-zinc-800/30 p-6 rounded-2xl mb-4">
                      <p className="text-sm font-bold text-[#5e5f61] dark:text-zinc-400 font-['Manrope'] italic leading-relaxed">
                        "{activity.description}"
                      </p>
                    </div>
                  )}
                  {activity.notes && (
                    <div className="px-6">
                      <p className="text-[10px] font-black text-[#afb2b8] dark:text-zinc-500 uppercase tracking-widest mb-1 font-['Plus_Jakarta_Sans']">
                        Session Notes
                      </p>
                      <p className="text-xs text-[#787b80] dark:text-zinc-500 font-medium leading-relaxed">
                        {activity.notes}
                      </p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#faf9fc] dark:bg-[#0d0e10] border-none rounded-[3rem] p-10 max-w-lg font-['Manrope'] shadow-2xl">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-3xl font-['Plus_Jakarta_Sans',sans-serif] font-black text-[#2f3337] dark:text-white tracking-tighter text-center">
              {editingActivity ? 'Modify Session' : 'Record Activity'}
            </DialogTitle>
            <p className="text-[10px] font-black uppercase text-[#afb2b8] dark:text-zinc-500 tracking-[0.3em] text-center mt-1 italic">
              Save it straight to the activity log
            </p>
          </DialogHeader>

          <div className="space-y-8 py-4 px-2">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-[#afb2b8] dark:text-zinc-500 uppercase tracking-widest block px-2">
                Activity Type
              </label>
              <Select
                value={formData.type}
                onValueChange={(value: Activity['type']) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger className="h-16 px-6 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm font-bold text-[#2f3337] dark:text-white shadow-sm focus:ring-1 focus:ring-[#45627d]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 rounded-2xl">
                  {ACTIVITY_TYPES.map((type) => (
                    <SelectItem
                      key={type.value}
                      value={type.value}
                      className="text-sm font-bold text-[#2f3337] dark:text-zinc-400"
                    >
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-[#afb2b8] dark:text-zinc-500 uppercase tracking-widest block px-2">
                  Duration (min)
                </label>
                <Input
                  type="number"
                  placeholder="30"
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({ ...formData, duration: e.target.value })
                  }
                  min="1"
                  className="h-16 px-6 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm font-bold text-[#2f3337] dark:text-white shadow-sm focus:ring-1 focus:ring-[#45627d]"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-[#afb2b8] dark:text-zinc-500 uppercase tracking-widest block px-2">
                  Session Date
                </label>
                <Input
                  type="date"
                  value={formData.timestamp}
                  onChange={(e) =>
                    setFormData({ ...formData, timestamp: e.target.value })
                  }
                  className="h-16 px-6 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm font-bold text-[#2f3337] dark:text-white shadow-sm focus:ring-1 focus:ring-[#45627d]"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-[#afb2b8] dark:text-zinc-500 uppercase tracking-widest block px-2">
                Executive Summary
              </label>
              <Input
                placeholder="e.g., Mirror play and sound cards"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="h-16 px-6 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm font-bold text-[#2f3337] dark:text-white shadow-sm focus:ring-1 focus:ring-[#45627d] placeholder:text-[#afb2b8] placeholder:font-medium"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-[#afb2b8] dark:text-zinc-500 uppercase tracking-widest block px-2">
                Behavioral Observations
              </label>
              <Textarea
                placeholder="Observed milestones, engagement level, or fatigue..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="min-h-[120px] px-6 py-5 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl text-sm font-bold text-[#2f3337] dark:text-white shadow-sm focus:ring-1 focus:ring-[#45627d] placeholder:text-[#afb2b8] placeholder:font-medium resize-none"
              />
            </div>
          </div>

          <DialogFooter className="mt-12 flex items-center gap-4">
            <button
              onClick={() => setIsDialogOpen(false)}
              className="flex-1 py-5 rounded-full font-['Plus_Jakarta_Sans',sans-serif] font-black text-[10px] uppercase tracking-[0.2em] text-[#afb2b8] hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors"
            >
              Discard Entry
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-[#5e5f61] text-white py-5 rounded-full font-['Plus_Jakarta_Sans',sans-serif] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-[#5e5f61]/20 active:scale-95 transition-all"
            >
              Save Activity
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
