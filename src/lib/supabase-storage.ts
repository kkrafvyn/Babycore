// Storage wrapper - provides unified interface for IndexedDB (offline-first) and eventually Supabase (cloud sync)
// For now, all operations use local IndexedDB for offline-first functionality

import {
  Baby,
  SleepLog,
  FeedLog,
  DiaperLog,
  GrowthMeasurement,
  VaccinationRecord,
  UserSettings,
  Milestone,
  MemoryLog,
  HealthLog,
  JournalEntry,
  Achievement,
} from "../types/index";

import * as LocalStorage from "./storage";

// Baby operations
export const addBaby = async (baby: Baby): Promise<void> => LocalStorage.addBaby(baby);
export const getBabies = async (): Promise<Baby[]> => LocalStorage.getBabies();
export const getBaby = async (id: string): Promise<Baby | undefined> => LocalStorage.getBaby(id);
export const updateBaby = async (baby: Baby): Promise<void> => LocalStorage.updateBaby(baby);
export const deleteBaby = async (id: string): Promise<void> => LocalStorage.deleteBaby(id);

// Sleep log operations
export const addSleepLog = async (log: SleepLog): Promise<void> => LocalStorage.addSleepLog(log);
export const getSleepLogsByBaby = async (babyId: string): Promise<SleepLog[]> => LocalStorage.getSleepLogsByBaby(babyId);
export const updateSleepLog = async (log: SleepLog): Promise<void> => LocalStorage.updateSleepLog(log);
export const deleteSleepLog = async (id: string): Promise<void> => LocalStorage.deleteSleepLog(id);

// Feed log operations
export const addFeedLog = async (log: FeedLog): Promise<void> => LocalStorage.addFeedLog(log);
export const getFeedLogsByBaby = async (babyId: string): Promise<FeedLog[]> => LocalStorage.getFeedLogsByBaby(babyId);
export const updateFeedLog = async (log: FeedLog): Promise<void> => LocalStorage.updateFeedLog(log);
export const deleteFeedLog = async (id: string): Promise<void> => LocalStorage.deleteFeedLog(id);

// Diaper log operations
export const addDiaperLog = async (log: DiaperLog): Promise<void> => LocalStorage.addDiaperLog(log);
export const getDiaperLogsByBaby = async (babyId: string): Promise<DiaperLog[]> => LocalStorage.getDiaperLogsByBaby(babyId);
export const updateDiaperLog = async (log: DiaperLog): Promise<void> => LocalStorage.updateDiaperLog(log);
export const deleteDiaperLog = async (id: string): Promise<void> => LocalStorage.deleteDiaperLog(id);

// Growth measurement operations
export const addGrowthMeasurement = async (measurement: GrowthMeasurement): Promise<void> => LocalStorage.addGrowthMeasurement(measurement);
export const getGrowthMeasurementsByBaby = async (babyId: string): Promise<GrowthMeasurement[]> => LocalStorage.getGrowthMeasurementsByBaby(babyId);
export const updateGrowthMeasurement = async (measurement: GrowthMeasurement): Promise<void> => LocalStorage.updateGrowthMeasurement(measurement);
export const deleteGrowthMeasurement = async (id: string): Promise<void> => LocalStorage.deleteGrowthMeasurement(id);

// Vaccination record operations
export const addVaccinationRecord = async (record: VaccinationRecord): Promise<void> => LocalStorage.addVaccinationRecord(record);
export const getVaccinationRecordsByBaby = async (babyId: string): Promise<VaccinationRecord[]> => LocalStorage.getVaccinationRecordsByBaby(babyId);
export const updateVaccinationRecord = async (record: VaccinationRecord): Promise<void> => LocalStorage.updateVaccinationRecord(record);
export const deleteVaccinationRecord = async (id: string): Promise<void> => LocalStorage.deleteVaccinationRecord(id);

// Milestone operations
export const addMilestone = async (milestone: Milestone): Promise<void> => LocalStorage.addMilestone(milestone);
export const getMilestonesByBaby = async (babyId: string): Promise<Milestone[]> => LocalStorage.getMilestonesByBaby(babyId);
export const updateMilestone = async (milestone: Milestone): Promise<void> => LocalStorage.updateMilestone(milestone);
export const deleteMilestone = async (id: string): Promise<void> => LocalStorage.deleteMilestone(id);

// Memory log operations
export const addMemoryLog = async (log: MemoryLog): Promise<void> => LocalStorage.addMemoryLog(log);
export const getMemoryLogsByBaby = async (babyId: string): Promise<MemoryLog[]> => LocalStorage.getMemoryLogsByBaby(babyId);
export const updateMemoryLog = async (log: MemoryLog): Promise<void> => LocalStorage.updateMemoryLog(log);
export const deleteMemoryLog = async (id: string): Promise<void> => LocalStorage.deleteMemoryLog(id);

// Health log operations
export const addHealthLog = async (log: HealthLog): Promise<void> => LocalStorage.addHealthLog(log);
export const getHealthLogsByBaby = async (babyId: string): Promise<HealthLog[]> => LocalStorage.getHealthLogsByBaby(babyId);
export const updateHealthLog = async (log: HealthLog): Promise<void> => LocalStorage.updateHealthLog(log);
export const deleteHealthLog = async (id: string): Promise<void> => LocalStorage.deleteHealthLog(id);

// Journal entry operations
export const addJournalEntry = async (entry: JournalEntry): Promise<void> => LocalStorage.addJournalEntry(entry);
export const getJournalEntriesByBaby = async (babyId: string): Promise<JournalEntry[]> => LocalStorage.getJournalEntriesByBaby(babyId);
export const updateJournalEntry = async (entry: JournalEntry): Promise<void> => LocalStorage.updateJournalEntry(entry);
export const deleteJournalEntry = async (id: string): Promise<void> => LocalStorage.deleteJournalEntry(id);

// Achievement operations
export const addAchievement = async (achievement: Achievement): Promise<void> => LocalStorage.addAchievement(achievement);
export const getAchievementsByBaby = async (babyId: string): Promise<Achievement[]> => LocalStorage.getAchievementsByBaby(babyId);
export const updateAchievement = async (achievement: Achievement): Promise<void> => LocalStorage.updateAchievement(achievement);
export const deleteAchievement = async (id: string): Promise<void> => LocalStorage.deleteAchievement(id);

// Settings operations
export const setUserSettings = async (userId: string, settings: UserSettings): Promise<void> => {
  const settingsWithUserId = { ...settings, userId };
  return LocalStorage.saveUserSettings(settingsWithUserId);
};

export const saveUserSettings = async (settings: UserSettings): Promise<void> => LocalStorage.saveUserSettings(settings);

export const getUserSettings = async (userId?: string): Promise<UserSettings | undefined> => {
  if (!userId) return LocalStorage.getUserSettings('');
  return LocalStorage.getUserSettings(userId);
};
