import { useState } from 'react';
import { motion } from 'motion/react';
import { useEffect } from 'react';
import {
  Home,
  Plus,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  Baby,
  Moon,
  Droplet,
  Activity,
  Calendar,
  Clock,
  ChevronRight,
  Syringe,
  Heart,
  TrendingUp,
  User,
  Menu,
  X,
  Ruler,
  Eye,
  Share2,
  HardDrive,
  Stethoscope,
  Star,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useAppContext } from '../AppContext';
import { onAuthStateChange, signOut } from '../../lib/supabase';
import { useIsMobile } from './ui/use-mobile';
import { updateBaby } from '../../lib/supabase-storage';
import { FeedingTracker } from './FeedingTracker';
import { SleepTracker } from './SleepTracker';
import { DiaperLogScreen } from './DiaperLog';
import { GrowthChart } from './GrowthChart';
import { VaccinationCalendar } from './VaccinationCalendar';
import { SettingsScreen } from './SettingsScreen';
import { ActivityTracker } from './ActivityTracker';
import { MilestonesTracker } from './MilestonesTracker';
import { MedicalRecords } from './MedicalRecords';
import { FamilySharing } from './FamilySharing';
import { DataBackup } from './DataBackup';

// Baby Avatar Display Component (Photo with SVG Fallback)
function BabyAvatarDisplay({ 
  photoUrl, 
  gender, 
  name = 'Baby',
  size = 'md',
  withRing = true 
}: { 
  photoUrl?: string;
  gender?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  withRing?: boolean;
}) {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24 sm:w-28 sm:h-28',
    lg: 'w-28 h-28 sm:w-32 sm:h-32'
  };

  const containerClasses = `relative ${sizeClasses[size]} rounded-3xl overflow-hidden ${
    withRing ? 'ring-4 ring-primary/10 shadow-lg' : 'shadow-md'
  } bg-gradient-to-br from-primary/20 to-primary/5`;

  const [showPhotoFallback, setShowPhotoFallback] = useState(false);

  useEffect(() => {
    setShowPhotoFallback(false);
  }, [photoUrl]);

  if (photoUrl && !showPhotoFallback) {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        className={containerClasses}
      >
        <img 
          src={photoUrl} 
          alt={name} 
          onError={() => setShowPhotoFallback(true)}
          className="w-full h-full object-cover"
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={containerClasses}
    >
      <BabyAvatarSVG gender={gender} />
    </motion.div>
  );
}

// SVG Baby Avatar Component
function BabyAvatarSVG({ gender = 'boy' }: { gender?: string }) {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Face */}
      <circle cx="50" cy="40" r="28" fill="#FFD4A3" stroke="#FFC591" strokeWidth="2" />
      
      {/* Eyes */}
      <circle cx="40" cy="35" r="3" fill="#333" />
      <circle cx="60" cy="35" r="3" fill="#333" />
      <circle cx="41" cy="34" r="1" fill="#fff" />
      <circle cx="61" cy="34" r="1" fill="#fff" />
      
      {/* Nose */}
      <path d="M 50 40 L 49 45 L 51 45" stroke="#FFC591" strokeWidth="1.5" fill="none" />
      
      {/* Mouth */}
      <path d="M 45 50 Q 50 52 55 50" stroke="#FF6B9D" strokeWidth="2" fill="none" strokeLinecap="round" />
      
      {/* Head/Hair */}
      {gender === 'boy' ? (
        <circle cx="50" cy="28" r="10" fill="#8B6F47" opacity="0.6" />
      ) : (
        <>
          <circle cx="50" cy="22" r="12" fill="#FFB6D9" opacity="0.7" />
          <circle cx="35" cy="25" r="4" fill="#FFB6D9" opacity="0.7" />
          <circle cx="65" cy="25" r="4" fill="#FFB6D9" opacity="0.7" />
        </>
      )}
      
      {/* Body */}
      <path d="M 30 65 Q 30 75 50 80 Q 70 75 70 65 L 65 55 L 35 55 Z" fill="#E8F4F8" stroke="#B3E5FC" strokeWidth="1.5" />
      
      {/* Arms */}
      <line x1="35" y1="58" x2="20" y2="62" stroke="#FFD4A3" strokeWidth="4" strokeLinecap="round" />
      <line x1="65" y1="58" x2="80" y2="62" stroke="#FFD4A3" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

// Photo Upload Component
function PhotoUploadButton({ 
  onPhotoSelect,
  label = 'Upload Photo',
  className = ''
}: { 
  onPhotoSelect?: (file: File) => void;
  label?: string;
  className?: string;
}) {
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onPhotoSelect) {
      onPhotoSelect(file);
    }
  };

  return (
    <motion.label
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`flex items-center gap-2 px-4 py-3 bg-primary text-white font-semibold rounded-xl cursor-pointer transition-all hover:opacity-90 ${className}`}
    >
      <Plus className="w-5 h-5" />
      {label}
      <input
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        aria-label={label}
      />
    </motion.label>
  );
}

// Logo Banner Header Component
function LogoBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 border-b border-primary/20 dark:border-primary/30 py-6 px-6 flex items-center justify-center"
    >
      <div className="flex items-center gap-4">
        <motion.img 
          src="/logo.svg" 
          alt="BabyLog Logo" 
          className="w-16 h-16 sm:w-20 sm:h-20" 
          whileHover={{ scale: 1.05 }}
        />
        <div className="flex flex-col">
          <div className="font-bold text-2xl sm:text-3xl tracking-tight">
            <span className="text-primary">Baby</span>
            <span className="text-label-primary">Log</span>
          </div>
          <p className="text-xs sm:text-sm text-label-secondary font-medium tracking-wide">Track Every Precious Moment</p>
        </div>
      </div>
    </motion.div>
  );
}

type TabType = 'home' | 'feeding' | 'sleep' | 'diaper' | 'growth' | 'vaccines' | 'activities' | 'milestones' | 'medical' | 'family' | 'backup' | 'settings' | 'profile';

const NAVIGATION_ITEMS = [
  { id: 'home', icon: Home, label: 'Home', group: 'main' },
  { id: 'feeding', icon: Droplet, label: 'Feeding', group: 'tracking' },
  { id: 'sleep', icon: Moon, label: 'Sleep', group: 'tracking' },
  { id: 'diaper', icon: Activity, label: 'Diaper', group: 'tracking' },
  { id: 'growth', icon: TrendingUp, label: 'Growth', group: 'tracking' },
  { id: 'vaccines', icon: Syringe, label: 'Vaccines', group: 'tracking' },
  { id: 'activities', icon: Activity, label: 'Activities', group: 'insights' },
  { id: 'milestones', icon: Star, label: 'Milestones', group: 'insights' },
  { id: 'medical', icon: Stethoscope, label: 'Medical', group: 'insights' },
  { id: 'family', icon: Share2, label: 'Family', group: 'social' },
  { id: 'backup', icon: HardDrive, label: 'Backup', group: 'social' },
  { id: 'settings', icon: Settings, label: 'Settings', group: 'settings' },
];

export function AppleDashboard() {
  const isMobile = useIsMobile();
  const { babies, currentBaby, setCurrentView, user } = useAppContext();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [showNewEntryMenu, setShowNewEntryMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleLogout = async () => {
    await signOut();
    setCurrentView('onboarding');
  };

  if (isMobile) {
    return <MobileLayout activeTab={activeTab} setActiveTab={setActiveTab} showNewEntryMenu={showNewEntryMenu} setShowNewEntryMenu={setShowNewEntryMenu} handleLogout={handleLogout} />;
  }

  return <WebLayout activeTab={activeTab} setActiveTab={setActiveTab} showNewEntryMenu={showNewEntryMenu} setShowNewEntryMenu={setShowNewEntryMenu} handleLogout={handleLogout} />;
}

interface LayoutProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  showNewEntryMenu: boolean;
  setShowNewEntryMenu: (show: boolean) => void;
  handleLogout: () => Promise<void>;
}

function WebLayout({ activeTab, setActiveTab, showNewEntryMenu, setShowNewEntryMenu, handleLogout }: LayoutProps) {
  const { currentBaby, user } = useAppContext();

  const handleBack = () => setActiveTab('home');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'feeding':
        return <FeedingTracker onBack={handleBack} />;
      case 'sleep':
        return <SleepTracker onBack={handleBack} />;
      case 'diaper':
        return <DiaperLogScreen onBack={handleBack} />;
      case 'growth':
        return <GrowthChart onBack={handleBack} />;
      case 'vaccines':
        return <VaccinationCalendar onBack={handleBack} />;
      case 'activities':
        return <ActivityTracker onBack={handleBack} />;
      case 'milestones':
        return <MilestonesTracker onBack={handleBack} />;
      case 'medical':
        return <MedicalRecords onBack={handleBack} />;
      case 'family':
        return <FamilySharing onBack={handleBack} />;
      case 'backup':
        return <DataBackup onBack={handleBack} />;
      case 'settings':
        return <SettingsScreen onBack={handleBack} onLogout={handleLogout} />;
      case 'profile':
        return <ProfileSection />;
      default:
        return <HomeContent setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-white to-gray-50 dark:from-black dark:to-zinc-950 flex overflow-hidden">
      {/* Sidebar Navigation - Web */}
      <motion.aside
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-72 bg-white dark:bg-zinc-900/50 backdrop-blur-lg border-r border-gray-200/50 dark:border-zinc-800/50 flex flex-col h-full overflow-y-auto"
      >
        {/* Logo Section */}
        <motion.div className="p-6 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <img src="/logo.svg" alt="BabyLog Logo" className="w-10 h-10" />
            <div className="font-bold text-xl tracking-tight">
              <span className="text-primary">Baby</span>
              <span className="text-label-primary">Log</span>
            </div>
          </div>
          <p className="text-xs text-label-secondary font-medium ml-13">Care Tracking</p>
        </motion.div>

        {/* Current Baby Card */}
        {currentBaby && (
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="mx-4 mb-6 p-4 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-2xl border border-primary/20 dark:border-primary/30 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <BabyAvatarDisplay 
                photoUrl={currentBaby?.photoUrl} 
                gender={currentBaby?.gender} 
                name={currentBaby?.name}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-label-secondary font-bold uppercase tracking-wider">Current</p>
                <p className="text-sm font-bold text-label-primary truncate">{currentBaby.name}</p>
                <p className="text-xs text-label-secondary">
                  {currentBaby.dateOfBirth ? new Date(currentBaby.dateOfBirth).toLocaleDateString() : 'DOB unknown'}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Navigation Sections */}
        <nav className="flex-1 px-4 space-y-6">
          {/* Quick Access */}
          <div>
            <p className="text-xs font-bold text-label-secondary uppercase tracking-wider px-3 mb-3">Quick Access</p>
            <div className="space-y-1">
              {NAVIGATION_ITEMS.filter(item => ['home', 'feeding', 'sleep', 'diaper', 'settings'].includes(item.id)).map((item) => (
                <motion.button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as TabType)}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    activeTab === item.id
                      ? 'bg-primary text-white font-semibold shadow-lg shadow-primary/25'
                      : 'text-label-secondary hover:bg-secondary-bg dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Tracking */}
          <div>
            <p className="text-xs font-bold text-label-secondary uppercase tracking-wider px-3 mb-3">Tracking</p>
            <div className="space-y-1">
              {NAVIGATION_ITEMS.filter(item => item.group === 'tracking').map((item) => (
                <motion.button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as TabType)}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                    activeTab === item.id
                      ? 'bg-primary text-white font-semibold shadow-lg shadow-primary/25'
                      : 'text-label-secondary hover:bg-secondary-bg dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{item.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* More */}
          <div>
            <p className="text-xs font-bold text-label-secondary uppercase tracking-wider px-3 mb-3">More</p>
            <div className="space-y-1">
              {NAVIGATION_ITEMS.filter(item => ['activities', 'milestones', 'medical', 'family', 'backup'].includes(item.id)).map((item) => (
                <motion.button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as TabType)}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                    activeTab === item.id
                      ? 'bg-primary text-white font-semibold shadow-lg shadow-primary/25'
                      : 'text-label-secondary hover:bg-secondary-bg dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{item.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </nav>

        {/* Bottom Actions */}
        <motion.div className="space-y-3 border-t border-gray-200/50 dark:border-zinc-800/50 p-4 mt-4">
          <div className="flex items-center justify-between px-3">
            <span className="text-xs text-label-secondary font-semibold">Theme</span>
            <ThemeToggle />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all font-semibold text-sm"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </motion.button>
        </motion.div>
      </motion.aside>

      {/* Main Content - Web */}
      <motion.main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border-b border-gray-200/50 dark:border-zinc-800/50 px-8 py-6 flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-label-primary">
              {NAVIGATION_ITEMS.find(item => item.id === activeTab)?.label || 'Dashboard'}
            </h1>
            <p className="text-sm text-label-secondary mt-1">
              {activeTab === 'home' ? 'Welcome back!' : 'Manage your baby\'s health and development'}
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </motion.button>
        </motion.header>

        {/* Content Area */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 overflow-y-auto px-8 py-8"
        >
          <div className="max-w-6xl">
            {renderTabContent()}
          </div>
        </motion.div>
      </motion.main>

      {/* Floating Action Button - Web */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowNewEntryMenu(!showNewEntryMenu)}
        className="fixed bottom-8 right-8 bg-primary text-white rounded-full p-4 shadow-2xl z-30 shadow-primary/40 hover:shadow-xl hover:shadow-primary/50 transition-all"
        aria-label="Add new entry"
      >
        <Plus className="w-7 h-7" />
      </motion.button>

      {/* New Entry Menu - Web */}
      <motion.div
        animate={showNewEntryMenu ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.95, y: 10, pointerEvents: 'none' }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-24 right-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden z-30 border border-gray-200 dark:border-zinc-800 backdrop-blur-sm"
      >
        {[
          { icon: Droplet, label: 'Feeding', color: 'text-blue-500' },
          { icon: Moon, label: 'Sleep', color: 'text-indigo-500' },
          { icon: Activity, label: 'Diaper', color: 'text-yellow-500' },
          { icon: Ruler, label: 'Measurement', color: 'text-green-500' },
        ].map((action) => (
          <motion.button
            key={action.label}
            whileHover={{ backgroundColor: 'var(--secondary-bg)', x: 2 }}
            className="w-full px-6 py-3 flex items-center gap-4 hover:bg-secondary-bg dark:hover:bg-zinc-800 border-b dark:border-zinc-800 last:border-0 transition-all text-label-primary font-medium text-sm"
          >
            <action.icon className={`w-5 h-5 ${action.color}`} />
            {action.label}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}

function MobileLayout({ activeTab, setActiveTab, showNewEntryMenu, setShowNewEntryMenu, handleLogout }: LayoutProps) {
  const { currentBaby } = useAppContext();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleBack = () => setActiveTab('home');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'feeding':
        return <FeedingTracker onBack={handleBack} />;
      case 'sleep':
        return <SleepTracker onBack={handleBack} />;
      case 'diaper':
        return <DiaperLogScreen onBack={handleBack} />;
      case 'growth':
        return <GrowthChart onBack={handleBack} />;
      case 'vaccines':
        return <VaccinationCalendar onBack={handleBack} />;
      case 'activities':
        return <ActivityTracker onBack={handleBack} />;
      case 'milestones':
        return <MilestonesTracker onBack={handleBack} />;
      case 'medical':
        return <MedicalRecords onBack={handleBack} />;
      case 'family':
        return <FamilySharing onBack={handleBack} />;
      case 'backup':
        return <DataBackup onBack={handleBack} />;
      case 'settings':
        return <SettingsScreen onBack={handleBack} onLogout={handleLogout} />;
      case 'profile':
        return <ProfileSection />;
      default:
        return <HomeContent setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="w-screen h-screen bg-gradient-to-b from-black via-zinc-900 to-black flex flex-col overflow-hidden">
      {/* Logo Banner - Mobile */}
      <LogoBanner />

      {/* Apple Style Header - Mobile */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-800"
      >
        <div className="max-w-full px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Apple-style Logo */}
            <motion.div
              className="flex items-center gap-3 flex-1"
              whileHover={{ scale: 1.01 }}
            >
              <img src="/logo.svg" alt="BabyLog Logo" className="w-8 h-8" />
              <div className="font-bold text-xl tracking-tight">
                <span className="text-primary">Baby</span>
                <span className="text-label-primary">Log</span>
              </div>
              {currentBaby && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="ml-2 px-2 py-1 bg-secondary-bg rounded-full text-[10px] font-semibold text-label-secondary truncate"
                >
                  {currentBaby?.name || 'Baby'}
                </motion.div>
              )}
            </motion.div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-xl bg-gray-50 dark:bg-zinc-800 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </motion.button>
              <ThemeToggle />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 rounded-xl bg-gray-50 dark:bg-zinc-800 transition-colors"
                aria-label="Menu"
              >
                {showMobileMenu ? (
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                ) : (
                  <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                )}
              </motion.button>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          <motion.div
            animate={showMobileMenu ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mt-4 space-y-1"
          >
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all font-semibold text-sm"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </motion.button>
          </motion.div>
        </div>
      </motion.header>

      {/* Main Content - Mobile */}
      <main className="flex-1 overflow-y-auto pb-24">
        {renderTabContent()}
      </main>

      {/* Bottom Navigation - Apple Style */}
      <motion.nav
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-t border-gray-100 dark:border-zinc-800 px-2 py-1 flex justify-around z-40"
      >
        {[
          { id: 'home', icon: Home, label: 'Home' },
          { id: 'feeding', icon: Droplet, label: 'Feeding' },
          { id: 'sleep', icon: Moon, label: 'Sleep' },
          { id: 'diaper', icon: Activity, label: 'Diaper' },
          { id: 'settings', icon: Settings, label: 'Settings' },
        ].map((tab) => (
          <motion.button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            whileTap={{ scale: 0.9 }}
            className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all ${
              activeTab === tab.id
                ? 'text-primary'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            <tab.icon className={`w-6 h-6 mb-1 ${activeTab === tab.id ? 'fill-primary/10' : ''}`} />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </motion.button>
        ))}
      </motion.nav>

      {/* Floating Action Button - Mobile */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowNewEntryMenu(!showNewEntryMenu)}
        className="fixed bottom-24 right-6 bg-primary text-white rounded-full p-4 shadow-2xl z-30 shadow-primary/40"
        aria-label="Add new entry"
      >
        <Plus className="w-7 h-7" />
      </motion.button>

      {/* New Entry Menu - Mobile */}
      <motion.div
        animate={showNewEntryMenu ? { opacity: 1, y: 0 } : { opacity: 0, y: 10, pointerEvents: 'none' }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-32 right-4 bg-gradient-to-b from-gray-800 to-black rounded-xl shadow-2xl overflow-hidden z-30 border border-red-900/30 backdrop-blur-sm"
      >
        {[
          { icon: Droplet, label: 'Feeding', color: 'text-blue-400' },
          { icon: Moon, label: 'Sleep', color: 'text-purple-400' },
          { icon: Activity, label: 'Diaper', color: 'text-yellow-400' },
          { icon: Ruler, label: 'Measurement', color: 'text-green-400' },
        ].map((action) => (
          <motion.button
            key={action.label}
            whileHover={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', x: 2 }}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-900/20 border-b border-gray-700 last:border-0 transition-all text-white"
          >
            <action.icon className={`w-5 h-5 ${action.color}`} />
            <span className="text-sm font-medium">{action.label}</span>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}

interface ActivityItemProps {
  activity: {
    time: string;
    title: string;
    type?: string;
    duration?: string;
  };
}

function ActivityItem({ activity }: ActivityItemProps) {
  const getActivityIcon = (type: string) => {
    const icons: Record<string, any> = {
      bottle: Droplet,
      breast: Activity,
      nap: Moon,
      wet: Activity,
    };
    return icons[type] || Activity;
  };

  const Icon = activity.type ? getActivityIcon(activity.type) : Activity;

  return (
    <motion.div
      whileHover={{ x: 4 }}
      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2">
          <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-white text-sm">
            {activity.title}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {activity.time}
          </p>
        </div>
      </div>
      {activity.duration && (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {activity.duration}
        </span>
      )}
    </motion.div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function HomeContent({ setActiveTab }: { setActiveTab: (tab: TabType) => void }) {
  const { currentBaby } = useAppContext();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' as any },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
    >
      {/* Hero Section - Apple Style */}
      <motion.div
        variants={itemVariants}
        className="mb-10 pt-4"
      >
        <div className="flex items-center gap-6 mb-8">
          <BabyAvatarDisplay 
            photoUrl={currentBaby?.photoUrl} 
            gender={currentBaby?.gender} 
            name={currentBaby?.name}
            size="md"
          />
          <div>
            <p className="text-primary font-bold tracking-tight uppercase text-xs mb-1">
              Current Focus
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-label-primary tracking-tight">
              {currentBaby?.name || 'Your Baby'}
            </h1>
            <p className="text-label-secondary font-medium mt-1">
              {currentBaby?.dateOfBirth ? `${new Date(currentBaby.dateOfBirth).toLocaleDateString()}` : 'Add birth date'}
            </p>
          </div>
        </div>
      </motion.div>

        {/* Quick Stats - Apple Style */}
        <motion.section variants={itemVariants}>
          <h2 className="text-xl sm:text-2xl font-bold text-label-primary mb-5 tracking-tight">Today's Summary</h2>
          <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800">
            <p className="text-label-secondary font-medium">No tracking data yet. Start by logging your baby's activities!</p>
          </div>
        </motion.section>

        {/* Today's Activity - Apple Style */}
        <motion.section variants={itemVariants}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl sm:text-2xl font-bold text-label-primary tracking-tight">Recent Activity</h2>
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="text-primary hover:opacity-80 font-semibold text-sm flex items-center gap-1"
            >
              See All <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
          <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800">
            <p className="text-label-secondary font-medium">No activities logged yet</p>
          </div>
        </motion.section>

        {/* Growth & Milestones */}
        <motion.section variants={itemVariants}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Growth Metrics</h2>
            <motion.button
              whileHover={{ x: 4 }}
              className="text-red-500 hover:text-red-400 font-bold text-sm flex items-center gap-2"
            >
              Details <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
          <div className="text-center py-12 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-gray-700">
            <p className="text-gray-400 font-medium">No measurements recorded yet</p>
          </div>
        </motion.section>

        {/* Reminders & Alerts - Apple Style */}
        <motion.section variants={itemVariants}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl sm:text-2xl font-bold text-label-primary tracking-tight">Reminders</h2>
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="text-primary hover:opacity-80 font-semibold text-sm flex items-center gap-1"
            >
              Schedule <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
          <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800">
            <p className="text-label-secondary font-medium">No reminders set yet</p>
          </div>
        </motion.section>

        {/* Advanced Tracking Features */}
        <motion.section variants={itemVariants}>
          <h2 className="text-xl sm:text-2xl font-bold text-label-primary mb-5 tracking-tight">More Tracking</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              { icon: Activity, label: 'Activities', tab: 'activities', color: 'bg-blue-500/10 text-blue-600' },
              { icon: Star, label: 'Milestones', tab: 'milestones', color: 'bg-yellow-500/10 text-yellow-600' },
              { icon: Stethoscope, label: 'Medical', tab: 'medical', color: 'bg-red-500/10 text-red-600' },
              { icon: Share2, label: 'Family', tab: 'family', color: 'bg-purple-500/10 text-purple-600' },
              { icon: HardDrive, label: 'Backup', tab: 'backup', color: 'bg-green-500/10 text-green-600' },
              { icon: Settings, label: 'Settings', tab: 'settings', color: 'bg-gray-500/10 text-gray-600' },
            ].map((item, idx) => (
              <motion.button
                key={idx}
                onClick={() => setActiveTab(item.tab as TabType)}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-secondary-bg dark:bg-tertiary-bg rounded-2xl p-4 text-center hover:shadow-md transition-all border border-transparent hover:border-primary/20"
              >
                <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center mx-auto mb-3`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-label-primary tracking-tight">
                  {item.label}
                </p>
              </motion.button>
            ))}
          </div>
        </motion.section>
    </motion.div>
  );
}

function ProfileSection() {
  const { user, currentBaby, setCurrentBaby, refreshBabies } = useAppContext();
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' as any },
    },
  };

  const handlePhotoSelect = async (file: File) => {
    if (!currentBaby) return;

    if (!file.type.startsWith('image/')) {
      window.alert('Please select an image file.');
      return;
    }

    if (file.size > 6 * 1024 * 1024) {
      window.alert('Image is too large. Please use a file under 6MB.');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const photoUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const updatedBaby = {
        ...currentBaby,
        photoUrl,
      };

      await updateBaby(updatedBaby);
      setCurrentBaby(updatedBaby);
      await refreshBabies();
    } catch (error) {
      console.error('Failed to upload baby photo:', error);
      window.alert('Could not update baby photo. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } } }}
      className="min-h-screen bg-white dark:bg-black pb-20"
    >
      {/* Logo Banner */}
      <LogoBanner />

      {/* Profile Header - Apple Style */}
      <motion.div
        variants={itemVariants}
        className="relative pt-12 pb-8 bg-secondary-bg dark:bg-zinc-900/50"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex items-center gap-6">
            {/* Baby Avatar with Photo Upload */}
            <motion.div className="relative group">
              <BabyAvatarDisplay 
                photoUrl={currentBaby?.photoUrl} 
                gender={currentBaby?.gender} 
                name={currentBaby?.name}
                size="lg"
                withRing={false}
              />
              {/* Upload Button Overlay */}
              <motion.label
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                className="absolute inset-0 flex items-end justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl cursor-pointer"
              >
                <div className="flex items-center gap-2 px-3 py-2 bg-primary text-white text-xs font-semibold rounded-full mb-2">
                  <Plus className="w-4 h-4" />
                  Change Photo
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      handlePhotoSelect(file);
                    }
                    event.currentTarget.value = '';
                  }}
                  className="hidden"
                  aria-label="Upload baby photo"
                />
              </motion.label>
            </motion.div>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-label-primary tracking-tight">
                {user?.user_metadata?.name || 'Parent'}
              </h1>
              <p className="text-label-secondary font-medium">{currentBaby?.name || 'Your'} Parent</p>
              <p className="text-xs text-label-secondary mt-2">Tap photo to update</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Profile Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Baby Photo Upload Section */}
        <motion.section variants={itemVariants} className="space-y-4">
          <h2 className="text-xl font-bold text-label-primary tracking-tight">Baby Photo</h2>
          <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800">
            <div className="flex-1">
              <p className="text-sm text-label-secondary mb-2">Add a real photo of your baby</p>
              <p className="text-xs text-label-secondary opacity-75 mb-4">
                {currentBaby?.photoUrl ? 'Update your baby\'s photo' : 'No photo uploaded yet. Add one to see it throughout the app!'}
              </p>
              <PhotoUploadButton 
                label={
                  isUploadingPhoto
                    ? 'Uploading...'
                    : currentBaby?.photoUrl
                      ? 'Change Photo'
                      : 'Upload Photo'
                }
                onPhotoSelect={handlePhotoSelect}
              />
            </div>
            {currentBaby?.photoUrl && (
              <div className="w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-primary/20">
                <img src={currentBaby.photoUrl} alt={currentBaby.name} className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </motion.section>

        {/* Info Cards */}
        <motion.section variants={itemVariants}>
          <h2 className="text-xl font-bold text-label-primary mb-5 tracking-tight">Account</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: User, label: 'Account Type', value: 'Premium Member' },
              { icon: Baby, label: 'Tracking', value: currentBaby?.name || 'No Baby' },
              { icon: Calendar, label: 'Joined', value: 'January 2024' },
              { icon: Heart, label: 'Status', value: 'Active' },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                whileTap={{ scale: 0.98 }}
                className="group flex items-center gap-4 p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-all cursor-pointer"
              >
                <div className="bg-primary/10 rounded-xl p-3">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-label-secondary uppercase tracking-wider">
                    {item.label}
                  </p>
                  <p className="text-base font-bold text-label-primary truncate">
                    {item.value}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Action Buttons */}
        <motion.section variants={itemVariants} className="space-y-3">
          <motion.button
            whileTap={{ scale: 0.98 }}
            className="w-full px-6 py-4 bg-primary text-white font-bold rounded-2xl dark:shadow-primary/20 shadow-lg shadow-primary/20 transition-all text-base"
          >
            Edit Profile
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.98 }}
            className="w-full px-6 py-4 border border-gray-100 dark:border-zinc-800 text-label-primary font-bold rounded-2xl hover:bg-secondary-bg transition-all text-base"
          >
            Preferences
          </motion.button>
        </motion.section>
      </div>
    </motion.div>
  );
}
