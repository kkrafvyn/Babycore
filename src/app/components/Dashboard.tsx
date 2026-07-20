import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Settings } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { SleepLog, FeedLog, DiaperLog } from '../../types/index';
import { getSleepLogsByBaby, getFeedLogsByBaby, getDiaperLogsByBaby } from '../../lib/supabase-storage';
import { formatBabyAge, formatDuration, formatTime, getTimeSince } from '../../lib/utils';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { MoonStarsSVG, BottleSVG, DiaperSVG, VaccineSVG } from './svg-icons';
import { SleepTracker } from './SleepTracker';
import { FeedingTracker } from './FeedingTracker';
import { DiaperLogScreen as DiaperTracker } from './DiaperLog';
import { VaccinationCalendar } from './VaccinationCalendar';
import { SettingsScreen } from './SettingsScreen';
import { useI18n } from './LanguageSwitcher';
import { getDefaultAvatar } from '../../lib/baby-utils';

interface ActivityCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  color: string;
  delay: number;
  onClick?: () => void;
}

function ActivityCard({ icon, title, value, subtitle, color, delay, onClick }: ActivityCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative ${color} rounded-2xl p-5 text-left w-full shadow-sm active:shadow-none transition-shadow`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
          {icon}
        </div>
      </div>

      <h3 className="text-white/80 text-sm font-medium mb-1">{title}</h3>
      <p className="text-white text-2xl font-semibold mb-0.5 tracking-tight">{value}</p>
      <p className="text-white/70 text-sm">{subtitle}</p>

      <ChevronRight className="absolute top-5 right-5 w-5 h-5 text-white/40" />
    </motion.button>
  );
}

interface DashboardProps {
  onNavigate: (view: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { currentBaby, isLoading } = useAppContext();
  const { t } = useI18n();
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [feedLogs, setFeedLogs] = useState<FeedLog[]>([]);
  const [diaperLogs, setDiaperLogs] = useState<DiaperLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [subView, setSubView] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBaby) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const [sleep, feed, diaper] = await Promise.all([
          getSleepLogsByBaby(currentBaby.id),
          getFeedLogsByBaby(currentBaby.id),
          getDiaperLogsByBaby(currentBaby.id),
        ]);
        setSleepLogs(sleep);
        setFeedLogs(feed);
        setDiaperLogs(diaper);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentBaby]);

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-black">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  if (!currentBaby) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-black">
        <p className="text-gray-600">{t('common.noBabySelected', 'No baby selected')}</p>
      </div>
    );
  }

  // Handle sub-views
  if (subView === 'sleep') return <SleepTracker onBack={() => setSubView(null)} />;
  if (subView === 'feeding') return <FeedingTracker onBack={() => setSubView(null)} />;
  if (subView === 'diaper') return <DiaperTracker onBack={() => setSubView(null)} />;
  if (subView === 'vaccination') return <VaccinationCalendar onBack={() => setSubView(null)} />;
  if (subView === 'settings') return <SettingsScreen onBack={() => setSubView(null)} onLogout={() => {}} />;

  // Get today's stats
  const today = new Date().toISOString().split('T')[0];
  const getToday = (timestamp: string) => timestamp.split('T')[0];

  const todaySleep = sleepLogs.filter(log => getToday(log.startTime) === today);
  const todayFeeds = feedLogs.filter(log => getToday(log.timestamp) === today);
  const todayDiapers = diaperLogs.filter(log => getToday(log.timestamp) === today);

  const lastSleep = sleepLogs[0];
  const lastFeed = feedLogs[0];
  const lastDiaper = diaperLogs[0];

  const totalSleep24h = sleepLogs
    .filter(log => {
      const logDate = new Date(log.startTime);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return logDate > dayAgo;
    })
    .reduce((sum, log) => sum + log.duration, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black transition-colors pb-24">
      <div className="max-w-7xl mx-auto px-4 py-6 pb-safe">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight mb-1">
                {t('common.appName', 'Cradlyn')}
              </h1>
              <p className="text-base text-gray-500 dark:text-gray-400">{t('dashboard.todaySummary', "Today's summary")}</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setSubView('settings')}
              className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <Settings size={24} />
            </motion.button>
          </div>

          {/* Baby Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-8 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-700">
                <ImageWithFallback
                  src={currentBaby.photoUrl || getDefaultAvatar(currentBaby.gender, currentBaby.name)}
                  alt={currentBaby.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
                  {currentBaby.name}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatBabyAge(currentBaby.dateOfBirth)} old
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Activity Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <ActivityCard
            icon={<MoonStarsSVG className="w-7 h-7 text-white" />}
            title={t('dashboard.sleep', 'Sleep')}
            value={formatDuration(totalSleep24h) || t('common.noData', 'No data')}
            subtitle={t('dashboard.napsToday', `${todaySleep.length} naps today`)}
            color="bg-indigo-500 dark:bg-indigo-600"
            delay={0.2}
            onClick={() => setSubView('sleep')}
          />

          <ActivityCard
            icon={<BottleSVG className="w-7 h-7 text-white" />}
            title={t('dashboard.feeding', 'Feeding')}
            value={todayFeeds.length.toString()}
            subtitle={lastFeed ? getTimeSince(lastFeed.timestamp) : t('dashboard.noFeedsLogged', 'No feeds logged')}
            color="bg-teal-500 dark:bg-teal-600"
            delay={0.3}
            onClick={() => setSubView('feeding')}
          />

          <ActivityCard
            icon={<DiaperSVG className="w-7 h-7 text-white" />}
            title={t('dashboard.diapers', 'Diapers')}
            value={todayDiapers.length.toString()}
            subtitle={lastDiaper ? getTimeSince(lastDiaper.timestamp) : t('dashboard.noDiapersLogged', 'No diapers logged')}
            color="bg-orange-500 dark:bg-orange-600"
            delay={0.4}
            onClick={() => setSubView('diaper')}
          />

          <ActivityCard
            icon={<VaccineSVG className="w-7 h-7 text-white" />}
            title={t('dashboard.vaccinations', 'Vaccinations')}
            value={t('common.view', 'View')}
            subtitle={t('dashboard.vaccinationSchedule', 'Vaccination schedule')}
            color="bg-pink-500 dark:bg-pink-600"
            delay={0.5}
            onClick={() => setSubView('vaccination')}
          />
        </div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('dashboard.recentActivity', 'Recent Activity')}
          </h3>
          <div className="space-y-2">
            {[
              ...sleepLogs.map(log => ({ type: 'sleep', data: log, time: log.startTime })),
              ...feedLogs.map(log => ({ type: 'feed', data: log, time: log.timestamp })),
              ...diaperLogs.map(log => ({ type: 'diaper', data: log, time: log.timestamp })),
            ]
              .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
              .slice(0, 5)
              .map((entry, idx) => (
                <motion.div
                  key={`${entry.type}-${idx}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + idx * 0.05 }}
                  className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                      {entry.type === 'sleep' ? (
                        <MoonStarsSVG className="h-5 w-5" />
                      ) : entry.type === 'feed' ? (
                        <BottleSVG className="h-5 w-5" />
                      ) : (
                        <DiaperSVG className="h-5 w-5" />
                      )}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {entry.type === 'sleep'
                          ? t('dashboard.sleptDuration', `Slept ${formatDuration((entry.data as SleepLog).duration)}`)
                          : entry.type === 'feed'
                          ? (entry.data as FeedLog).type === 'breast'
                            ? t('dashboard.breastfed', 'Breastfed')
                            : t('dashboard.bottleFed', 'Bottle fed')
                          : `${(entry.data as DiaperLog).type} ${t('dashboard.diaper', 'diaper')}`}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTime(entry.time)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
