import React, { useEffect, useMemo, useState } from 'react';
import { Globe, Check, X, Loader2, Search } from 'lucide-react';
import {
  getFeaturedLanguageOptions,
  getLanguageOptions,
  i18nInstance,
  type LanguageOption,
  type SupportedLanguage,
} from '../../lib/i18n';
import { motion, AnimatePresence } from 'motion/react';

interface LanguageSwitcherProps {
  compact?: boolean;
  onLanguageChange?: (language: SupportedLanguage) => void;
  showModal?: boolean;
  onClose?: () => void;
  showAllLanguages?: boolean;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  compact = false,
  onLanguageChange,
  showModal = false,
  onClose,
  showAllLanguages = false,
}) => {
  const [isOpen, setIsOpen] = useState(showModal);
  const [currentLanguage, setCurrentLanguage] = useState(i18nInstance.getLanguage());
  const [loadingLanguage, setLoadingLanguage] = useState<string | null>(null);
  const [showExtendedList, setShowExtendedList] = useState(showAllLanguages);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleLanguageChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      setCurrentLanguage(customEvent.detail.language);
    };

    window.addEventListener('languageChanged', handleLanguageChange);
    return () => window.removeEventListener('languageChanged', handleLanguageChange);
  }, []);

  const languages = useMemo(() => {
    if (showExtendedList || searchQuery.trim()) {
      return getLanguageOptions(searchQuery, currentLanguage);
    }

    return getFeaturedLanguageOptions(currentLanguage);
  }, [currentLanguage, searchQuery, showExtendedList]);

  const handleLanguageSelect = async (langCode: SupportedLanguage) => {
    if (langCode === currentLanguage) {
      setIsOpen(false);
      onClose?.();
      return;
    }

    setLoadingLanguage(langCode);

    try {
      i18nInstance.setLanguage(langCode);
      setCurrentLanguage(langCode);
      onLanguageChange?.(langCode);
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setLoadingLanguage(null);
      setTimeout(() => {
        setIsOpen(false);
        onClose?.();
      }, 300);
    }
  };

  const renderLanguageButton = (lang: LanguageOption, compactGrid = false) => (
    <motion.button
      key={lang.code}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => handleLanguageSelect(lang.code)}
      disabled={loadingLanguage === lang.code}
      className={`relative rounded-lg font-500 text-sm transition-all ${
        compactGrid ? 'px-3 py-3' : 'px-4 py-4'
      } ${
        currentLanguage === lang.code
          ? 'bg-blue-500 text-white shadow-lg'
          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
      }`}
    >
      <div className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/10 text-[10px] font-bold uppercase dark:bg-white/20">
        {lang.badge}
      </div>
      <div className="text-xs">{lang.code.toUpperCase()}</div>
      {!compactGrid && (
        <div className="text-xs opacity-70 truncate">{lang.nativeName}</div>
      )}
      {currentLanguage === lang.code && (
        <motion.div layoutId={`languageIndicator-${lang.code}`} className="absolute top-2 right-2">
          <Check size={compactGrid ? 16 : 18} />
        </motion.div>
      )}
      {loadingLanguage === lang.code && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute top-2 right-2 text-white"
        >
          <Loader2 size={compactGrid ? 14 : 16} />
        </motion.div>
      )}
    </motion.button>
  );

  if (compact) {
    const currentLang = languages.find((l) => l.code === currentLanguage);
    return (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Globe size={18} />
        <span className="text-sm font-500">{currentLang?.code.toUpperCase() || currentLanguage.toUpperCase()}</span>
      </motion.button>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <h3 className="font-600 text-gray-900 dark:text-white text-sm uppercase tracking-wide flex items-center gap-2">
          <Globe size={18} />
          {i18nInstance.t('settings.language', 'Language')}
        </h3>

        {!showExtendedList && (
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                if (event.target.value.trim()) {
                  setShowExtendedList(true);
                }
              }}
              placeholder={i18nInstance.t('common.searchLanguages', 'Search languages...')}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2.5 pl-10 pr-4 text-sm"
            />
          </div>
        )}

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 max-h-80 overflow-y-auto">
          <div className="grid grid-cols-3 gap-2">
            {languages.map((lang) => renderLanguageButton(lang, true))}
          </div>
        </div>

        {!showExtendedList && !searchQuery.trim() && (
          <button
            type="button"
            onClick={() => setShowExtendedList(true)}
            className="w-full text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            {i18nInstance.t('common.moreLanguages', 'More languages')}
          </button>
        )}

        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          {i18nInstance.t('common.languageSaved', 'Your language preference will be saved automatically')}
        </p>
      </div>

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
              className="absolute inset-x-4 top-1/2 max-h-[85vh] -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 dark:bg-gray-900 max-w-md mx-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-700 text-lg text-gray-900 dark:text-white flex items-center gap-2">
                  <Globe size={20} />
                  {i18nInstance.t('common.selectLanguage', 'Select Language')}
                </h2>
                {onClose && (
                  <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                    <X size={20} />
                  </button>
                )}
              </div>

              <div className="relative mb-4">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={i18nInstance.t('common.searchLanguages', 'Search languages...')}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-2.5 pl-10 pr-4 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(searchQuery.trim() ? getLanguageOptions(searchQuery, currentLanguage) : languages).map((lang) =>
                  renderLanguageButton(lang),
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

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
