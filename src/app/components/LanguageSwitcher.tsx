import React, { useState, useEffect } from 'react';
import { Globe, Check, X, Loader2 } from 'lucide-react';
import { i18nInstance, type SupportedLanguage } from '../../lib/i18n';
import { motion, AnimatePresence } from 'motion/react';

interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  badge: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', badge: 'US' },
  { code: 'es', name: 'Spanish', nativeName: 'Espanol', badge: 'ES' },
  { code: 'fr', name: 'French', nativeName: 'Francais', badge: 'FR' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', badge: 'DE' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', badge: 'IT' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Portugues', badge: 'PT' },
  { code: 'ja', name: 'Japanese', nativeName: 'Nihongo', badge: 'JP' },
  { code: 'zh', name: 'Chinese', nativeName: 'Zhongwen', badge: 'CN' },
  { code: 'ar', name: 'Arabic', nativeName: 'Arabic', badge: 'AR' },
];

interface LanguageSwitcherProps {
  compact?: boolean;
  onLanguageChange?: (language: SupportedLanguage) => void;
  showModal?: boolean;
  onClose?: () => void;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  compact = false,
  onLanguageChange,
  showModal = false,
  onClose,
}) => {
  const [isOpen, setIsOpen] = useState(showModal);
  const [currentLanguage, setCurrentLanguage] = useState(i18nInstance.getLanguage());
  const [loadingLanguage, setLoadingLanguage] = useState<string | null>(null);

  useEffect(() => {
    const handleLanguageChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      setCurrentLanguage(customEvent.detail.language);
    };

    window.addEventListener('languageChanged', handleLanguageChange);
    return () => window.removeEventListener('languageChanged', handleLanguageChange);
  }, []);

  const handleLanguageSelect = async (langCode: SupportedLanguage) => {
    if (langCode === currentLanguage) {
      setIsOpen(false);
      return;
    }

    setLoadingLanguage(langCode);
    
    try {
      i18nInstance.setLanguage(langCode);
      setCurrentLanguage(langCode);
      
      // Dispatch custom event for other components
      window.dispatchEvent(
        new CustomEvent('languageChanged', {
          detail: { language: langCode },
        })
      );

      onLanguageChange?.(langCode);
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setLoadingLanguage(null);
      setTimeout(() => setIsOpen(false), 500);
    }
  };

  if (compact) {
    const currentLang = LANGUAGES.find((l) => l.code === currentLanguage);
    return (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Globe size={18} />
        <span className="text-sm font-500">{currentLang?.code.toUpperCase()}</span>
      </motion.button>
    );
  }

  return (
    <>
      {/* Compact Inline Version */}
      <div className="space-y-2">
        <h3 className="font-600 text-gray-900 dark:text-white text-sm uppercase tracking-wide flex items-center gap-2">
          <Globe size={18} />
          Language
        </h3>

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
          <div className="grid grid-cols-3 gap-2">
            {LANGUAGES.map((lang) => (
              <motion.button
                key={lang.code}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleLanguageSelect(lang.code)}
                disabled={loadingLanguage === lang.code}
                className={`relative px-3 py-3 rounded-lg font-500 text-sm transition-all ${
                  currentLanguage === lang.code
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                }`}
              >
                <div className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/10 text-[10px] font-bold uppercase dark:bg-white/20">
                  {lang.badge}
                </div>
                <div className="text-xs">{lang.code.toUpperCase()}</div>
                {currentLanguage === lang.code && (
                  <motion.div
                    layoutId="languageIndicator"
                    className="absolute top-2 right-2"
                  >
                    <Check size={16} />
                  </motion.div>
                )}
                {loadingLanguage === lang.code && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute top-2 right-2 text-white"
                    >
                      <Loader2 size={14} />
                    </motion.div>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Version */}
      <AnimatePresence>
        {isOpen && showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="absolute inset-x-4 top-1/2 -translate-y-1/2 bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-700 text-lg text-gray-900 dark:text-white flex items-center gap-2">
                  <Globe size={20} />
                  Select Language
                </h2>
                {onClose && (
                  <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                    <X size={20} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {LANGUAGES.map((lang) => (
                  <motion.button
                    key={lang.code}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleLanguageSelect(lang.code)}
                    disabled={loadingLanguage === lang.code}
                    className={`relative px-4 py-4 rounded-lg font-600 text-sm transition-all ${
                      currentLanguage === lang.code
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-xs font-bold uppercase dark:bg-white/20">
                      {lang.badge}
                    </div>
                    <div className="text-xs font-500">{lang.code.toUpperCase()}</div>
                    <div className="text-xs opacity-70 truncate">{lang.nativeName}</div>
                    {currentLanguage === lang.code && (
                      <motion.div layoutId="modalLanguageIndicator" className="absolute top-2 right-2">
                        <Check size={18} className="text-white" />
                      </motion.div>
                    )}
                    {loadingLanguage === lang.code && (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute top-2 right-2 text-white"
                      >
                        <Loader2 size={16} />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
                Your language preference will be saved automatically
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/**
 * Hook to get current language and subscribe to changes
 */
export const useLanguage = () => {
  const [language, setLanguage] = useState(i18nInstance.getLanguage());

  useEffect(() => {
    const handleLanguageChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      setLanguage(customEvent.detail.language);
    };

    window.addEventListener('languageChanged', handleLanguageChange);
    return () => window.removeEventListener('languageChanged', handleLanguageChange);
  }, []);

  return language;
};

/**
 * Hook to get translated strings with auto-refresh on language change
 */
export const useI18n = () => {
  const language = useLanguage();

  return {
    t: (key: string, defaultValue?: string) => i18nInstance.t(key, defaultValue),
    formatDate: (date: Date) => i18nInstance.formatDate(date),
    formatTime: (date: Date) => i18nInstance.formatTime(date),
    formatNumber: (num: number, decimals?: number) => i18nInstance.formatNumber(num, decimals),
    convertWeight: (kg: number) => i18nInstance.convertWeight(kg),
    convertLength: (cm: number) => i18nInstance.convertLength(cm),
    convertVolume: (ml: number) => i18nInstance.convertVolume(ml),
    getUnitSystem: () => i18nInstance.getUnitSystem(),
    language,
  };
};
