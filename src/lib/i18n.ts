/**
 * i18n (Internationalization) Module
 * Handles multi-language support, date/time formatting, and locale-specific conversions
 */

export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ja' | 'zh' | 'ar';
export type Unit = 'metric' | 'imperial';

interface Translations {
  [key: string]: {
    [key: string]: string | Record<string, string>;
  };
}

const translations: Record<SupportedLanguage, Translations> = {
  en: {
    common: {
      appName: 'BabyLog',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      cancel: 'Cancel',
      confirm: 'Confirm',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      back: 'Back',
      next: 'Next',
      save: 'Save',
      update: 'Update',
      details: 'Details',
      payNow: 'Pay Now',
      processing: 'Processing...',
      refresh: 'Refresh',
    },
    screens: {
      dashboard: 'Dashboard',
      sleep: 'Sleep',
      feeding: 'Feeding',
      diaper: 'Diaper',
      growth: 'Growth',
      vaccination: 'Vaccines',
      settings: 'Settings',
      journal: 'Journal',
      milestones: 'Milestones',
      logs: 'Activity Logs',
      payment: 'Payment',
      premium: 'Premium',
    },
    dashboard: {
      greeting: 'Good morning',
      greetingAfternoon: 'Good afternoon',
      greetingEvening: 'Good evening',
      latestVitals: 'Latest Vitals',
      quickLog: 'Quick Log',
      active: 'Active',
      sleeping: 'Sleeping',
      noSession: 'No session yet',
      noFeed: 'No feed yet',
      noChange: 'No change yet',
    },
    journal: {
      memories: 'Memories',
      guides: 'Guides',
      newMoment: 'New Moment',
      preserve: 'Preserve',
      search: 'Search your memories...',
      emptyState: 'No memories yet',
    },
    milestones: {
      title: 'Milestones',
      newArchive: 'New Archive',
      recordFirst: 'Record First Milestone',
      narrative: 'Detailed Narrative',
    },
    settings: {
      units: 'Units',
      theme: 'Theme',
      language: 'Language',
      notifications: 'Notifications',
      export: 'Export Data',
      premium: 'Go Premium',
      logout: 'Sign Out',
      family: 'Family',
      preferences: 'Preferences',
      editBaby: 'Edit Baby',
      pushEnabled: 'Push Enabled',
      pushDisabled: 'Push Disabled',
      quietHours: 'Quiet Hours',
      subscribe: 'Subscribe to Alerts',
    },
    payment: {
      title: 'Secure Checkout',
      payNow: 'Commit Sanctuary',
      processing: 'Authenticating...',
      secure: 'Quantum-Safe Encryption',
      secureNotice: 'Your financial credentials are tokenized and processed via high-fidelity secure gateways. Serenity never retains raw payment data.',
      fillRequired: 'Please fill in all required fields',
    }
  },
  es: {
    common: {
      appName: 'BabyLog',
      loading: 'Cargando...',
      error: 'Error',
      success: 'Éxito',
      cancel: 'Cancelar',
      confirm: 'Confirmar',
      delete: 'Eliminar',
      edit: 'Editar',
      add: 'Añadir',
      back: 'Atrás',
      next: 'Siguiente',
      save: 'Guardar',
      update: 'Actualizar',
      details: 'Detalles',
      payNow: 'Pagar Ahora',
      processing: 'Procesando...',
    },
    screens: {
      dashboard: 'Inicio',
      sleep: 'Sueño',
      feeding: 'Comida',
      diaper: 'Pañal',
      growth: 'Crecimiento',
      vaccination: 'Vacunas',
      settings: 'Ajustes',
      journal: 'Diario',
      milestones: 'Logros',
      logs: 'Registros',
      payment: 'Pago',
      premium: 'Premium',
    },
    dashboard: {
      greeting: 'Buenos días',
      greetingAfternoon: 'Buenas tardes',
      greetingEvening: 'Buenas noches',
      latestVitals: 'Signos Vitales',
      quickLog: 'Registro Rápido',
      active: 'Activo',
      sleeping: 'Durmiendo',
      noSession: 'Sin sesión aún',
      noFeed: 'Sin comida aún',
      noChange: 'Sin cambio aún',
    },
    settings: {
      units: 'Unidades',
      theme: 'Tema',
      language: 'Idioma',
      notifications: 'Notificaciones',
      export: 'Exportar Datos',
      premium: 'Pasar a Premium',
      logout: 'Cerrar Sesión',
      family: 'Familia',
      preferences: 'Preferencias',
      editBaby: 'Editar Bebé',
      pushEnabled: 'Push Activado',
      pushDisabled: 'Push Desactivado',
      quietHours: 'Horas de Silencio',
      subscribe: 'Suscribirse a Alertas',
    },
    payment: {
      title: 'Pago Seguro',
      payNow: 'Confirmar Acceso',
      processing: 'Autenticando...',
      secure: 'Encriptación de Grado Cuántico',
      secureNotice: 'Sus credenciales financieras están tokenizadas y procesadas a través de pasarelas seguras. Serenity nunca retiene datos de pago sin procesar.',
      fillRequired: 'Por favor, complete todos los campos obligatorios',
    }
  },
  fr: {
    common: {
      appName: 'BabyLog',
      loading: 'Chargement...',
      error: 'Erreur',
      success: 'Succès',
      cancel: 'Annuler',
      confirm: 'Confirmer',
      delete: 'Supprimer',
      edit: 'Modifier',
      add: 'Ajouter',
      back: 'Retour',
      next: 'Suivant',
      save: 'Enregistrer',
      update: 'Mettre à jour',
    },
    screens: {
      dashboard: 'Tableau de bord',
      sleep: 'Sommeil',
      feeding: 'Repas',
      diaper: 'Couche',
      settings: 'Paramètres',
      journal: 'Journal',
    },
    settings: {
      units: 'Unités',
      theme: 'Thème',
      language: 'Langue',
      logout: 'Déconnexion',
    }
  },
  de: {
    common: {
      appName: 'BabyLog',
      loading: 'Laden...',
      error: 'Fehler',
      success: 'Erfolg',
      cancel: 'Abbrechen',
      confirm: 'Bestätigen',
      delete: 'Löschen',
      edit: 'Bearbeiten',
      add: 'Hinzufügen',
      back: 'Zurück',
      next: 'Weiter',
      save: 'Speichern',
      update: 'Aktualisieren',
    },
    screens: {
      dashboard: 'Übersicht',
      sleep: 'Schlaf',
      feeding: 'Füttern',
      diaper: 'Windel',
      settings: 'Einstellungen',
      journal: 'Journal',
    },
    settings: {
      units: 'Einheiten',
      theme: 'Design',
      language: 'Sprache',
      logout: 'Abmelden',
    }
  },
  it: { common: { appName: 'BabyLog' } },
  pt: { common: { appName: 'BabyLog' } },
  ja: { common: { appName: 'BabyLog' } },
  zh: { common: { appName: 'BabyLog' } },
  ar: { common: { appName: 'BabyLog' } },
};

class i18n {
  private currentLanguage: SupportedLanguage = 'en';
  private currentUnit: Unit = 'metric';

  constructor() {
    this.loadSettings();
  }

  private emit(eventName: string, detail: Record<string, unknown>): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  setLanguage(lang: SupportedLanguage): void {
    if (translations[lang]) {
      this.currentLanguage = lang;
      localStorage.setItem('babylog_language', lang);
      this.emit('languageChanged', { language: lang });
    }
  }

  getLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  setUnit(unit: Unit): void {
    this.currentUnit = unit;
    localStorage.setItem('babylog_units', unit);
    this.emit('unitsChanged', { unit });
  }

  getUnit(): Unit {
    return this.currentUnit;
  }

  t(key: string, defaultValue?: string): string {
    const [namespace, ...path] = key.split('.');
    let value: any = translations[this.currentLanguage]?.[namespace];
    
    // Fallback to English if translation missing
    if (!value && this.currentLanguage !== 'en') {
        value = translations['en']?.[namespace];
    }

    for (const segment of path) {
      value = value?.[segment];
    }

    if (typeof value !== 'string' && this.currentLanguage !== 'en') {
        // Nested fallback
        let engValue: any = translations['en']?.[namespace];
        for (const segment of path) { engValue = engValue?.[segment]; }
        if (typeof engValue === 'string') return engValue;
    }

    return typeof value === 'string' ? value : defaultValue || key;
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat(this.currentLanguage, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  }

  formatTime(date: Date): string {
    return new Intl.DateTimeFormat(this.currentLanguage, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  formatNumber(value: number, decimals = 0): string {
    return new Intl.NumberFormat(this.currentLanguage, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  convertWeight(kg: number): { value: number; unit: 'kg' | 'lb' } {
    if (this.currentUnit === 'imperial') {
      return { value: parseFloat((kg * 2.20462).toFixed(1)), unit: 'lb' };
    }

    return { value: parseFloat(kg.toFixed(1)), unit: 'kg' };
  }

  convertLength(cm: number): { value: number; unit: 'cm' | 'in' } {
    if (this.currentUnit === 'imperial') {
      return { value: parseFloat((cm / 2.54).toFixed(1)), unit: 'in' };
    }

    return { value: parseFloat(cm.toFixed(1)), unit: 'cm' };
  }

  convertVolume(ml: number): { value: number; unit: 'ml' | 'oz' } {
    if (this.currentUnit === 'imperial') {
      return { value: parseFloat((ml / 29.5735).toFixed(1)), unit: 'oz' };
    }

    return { value: parseFloat(ml.toFixed(0)), unit: 'ml' };
  }

  getUnitSystem(): Unit {
    return this.currentUnit;
  }

  private loadSettings(): void {
    const savedLang = localStorage.getItem('babylog_language') as SupportedLanguage | null;
    const savedUnit = localStorage.getItem('babylog_units') as Unit | null;

    if (savedLang && translations[savedLang]) {
      this.currentLanguage = savedLang;
    }
    if (savedUnit) {
      this.currentUnit = savedUnit;
    }
  }
}

export const i18nInstance = new i18n();
export const i18nT = (key: string, defaultValue?: string) => i18nInstance.t(key, defaultValue);
