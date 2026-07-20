/**
 * i18n (Internationalization) Module
 * Handles multi-language support, locale-aware formatting, and directionality.
 */

export type SupportedLanguage = string;
export type Unit = 'metric' | 'imperial';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  badge: string;
}

interface Translations {
  [key: string]: {
    [key: string]: string | Record<string, string>;
  };
}

const DEFAULT_LANGUAGE = 'en';
const RTL_LANGUAGE_PREFIXES = new Set(['ar', 'dv', 'fa', 'he', 'ku', 'ps', 'sd', 'ug', 'ur', 'yi']);
const COMMON_LANGUAGE_CODES = [
  'ar',
  'am',
  'bg',
  'bn',
  'cs',
  'da',
  'de',
  'el',
  'en',
  'en-GB',
  'en-US',
  'es',
  'es-419',
  'et',
  'fa',
  'fi',
  'fil',
  'fr',
  'gu',
  'he',
  'hi',
  'hr',
  'hu',
  'id',
  'it',
  'ja',
  'kn',
  'ko',
  'lt',
  'lv',
  'ml',
  'mr',
  'ms',
  'nl',
  'no',
  'pa',
  'pl',
  'pt',
  'pt-BR',
  'pt-PT',
  'ro',
  'ru',
  'sk',
  'sl',
  'sr',
  'sv',
  'sw',
  'ta',
  'te',
  'th',
  'tr',
  'uk',
  'ur',
  'vi',
  'zh',
  'zh-CN',
  'zh-HK',
  'zh-TW',
] as const;

const translations: Record<string, Translations> = {
  en: {
    common: {
      appName: 'Cradlyn',
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
      secureNotice:
        'Your financial credentials are tokenized and processed via high-fidelity secure gateways. Cradlyn never retains raw payment data.',
      fillRequired: 'Please fill in all required fields',
    },
    public: {
      tagline: 'Gentle baby care tracking for feeding, sleep, and milestones.',
      badge: 'Calm Daily Care',
      heroBody:
        'Stay close to every feeding, nap, and milestone with a softer, more nurturing start screen.',
      nursingMoments: 'Nursing Moments',
      nurtureFirst: 'Nurture Comes First',
      nurtureFirstBody:
        'A more personal welcome built around the nursing mother artwork instead of a generic device preview.',
      beginJourney: 'Begin the Journey',
      alreadyTracking: 'Already tracking?',
      beforeYouStart: 'Before you start:',
      signIn: 'Sign In',
      privacyTermsPolicies: 'Privacy, Terms & Policies',
      privacyPolicy: 'Privacy Policy',
      termsOfService: 'Terms of Service',
      highlightSleep: 'Sleep',
      highlightFeed: 'Feed',
      highlightSecure: 'Secure',
      highlightSynced: 'Synced',
      highlightReady: 'Ready',
      highlightPrivate: 'Private',
    },
    auth: {
      welcomeBack: 'Welcome Back',
      joinApp: 'Join Cradlyn',
      identityVerification: 'Identity Verification',
      provisionAccess: 'Provision Access',
      continueAfterSignIn: 'Continue to {destination} after sign in',
      registryEmail: 'Registry Email',
      emailPlaceholder: 'parent@domain.com',
      accessKey: 'Access Key',
      passwordPlaceholder: 'Enter your password',
      authorizing: 'Authorizing...',
      signInAction: 'Sign In',
      createAccountAction: 'Create Account',
      accountCreated: 'Account created. Check your email to confirm, then sign in.',
      authFailed: 'Authentication failed. Please try again.',
      socialAuthFailed: 'Social authentication failed. Please try again.',
      continueWith: 'Continue with {provider}',
    },
    onboarding: {
      titleLineOne: 'The Sanctuary for',
      titleLineTwo: 'Gentle Parenting',
      subtitle:
        'Set up your profile once, then track feeding, sleep, health, and milestones with clarity.',
      stepCounter: 'Step {current} of {total}',
      skipToLogin: 'Skip to Login',
      previous: 'Previous',
      back: 'Back',
      next: 'Next',
      continue: 'Continue',
      continueToLogin: 'Continue to Login',
      countryTitle: 'Where are you based?',
      countrySubtitle:
        'This helps us tailor feeding guidelines and support schedules to your local time.',
      countrySearch: 'Search your country...',
      countryDontSee: "Don't see your country?",
      countryContactSupport: 'Contact Support',
      countryNoMatchTitle: 'No matches yet',
      countryNoMatchBody: 'Try a country name or code.',
      editorialTagline: 'Crafting serenity for parents worldwide',
      editorialCopyright: '© {year} {appName} EDITORIAL. ALL RIGHTS RESERVED.',
      guidanceUnits: 'Recommended Units',
      guidanceVaccines: 'Vaccine Schedule',
      guidanceCoverage: 'Coverage',
      guidanceCountrySource: 'Country schedule',
      guidanceRegionSource: 'Regional guidance',
      guidanceGlobalSource: 'Global fallback',
      welcomeFeatureSleepTitle: 'Sleep',
      welcomeFeatureSleepBody: 'Wake windows and naps',
      welcomeFeatureFeedingTitle: 'Feeding',
      welcomeFeatureFeedingBody: 'Bottle, breast, and notes',
      welcomeFeatureGrowthTitle: 'Growth',
      welcomeFeatureGrowthBody: 'Milestones and progress',
      unitsTitle: 'Measurement Units',
      unitsSubtitle: 'Pick your preferred unit system for growth tracking and daily logs.',
      unitsMetric: 'Metric',
      unitsImperial: 'Imperial',
      unitsCountryDefault: 'Recommended for {country}',
      unitsUseDefault: 'Use country default',
      notificationsTitle: 'Intelligent Alerts',
      notificationsSubtitle: 'Enable reminders so you never miss key care moments.',
      notificationsCardTitle: 'Smart Reminders',
      notificationsCardSubtitle: 'Personalized and gentle',
      remindersFeeding: 'Feeding reminders',
      remindersSleep: 'Sleep windows',
      remindersHealth: 'Health checks',
      remindersGrowth: 'Growth milestones',
      completeTitle: 'Setup Complete',
      completeBaby:
        'Your baby profile is ready. Continue to login and start tracking the journey.',
      completeDoctor:
        'Your doctor profile is ready. Continue to login and manage patients and reports.',
      completeCaregiver:
        'Your caregiver profile is ready. Continue to login and support daily care updates.',
      summaryCountry: 'Country',
      summaryUnits: 'Units',
      summaryAlerts: 'Alerts',
      summaryDoctor: 'Doctor',
      summaryCaregiver: 'Caregiver',
      summaryBaby: 'Baby',
      summarySpecialty: 'Specialty',
      summaryRelationship: 'Relationship',
      alertsEnabled: 'Enabled',
      alertsDisabled: 'Disabled',
      roleBaby: 'Baby',
      roleDoctor: 'Doctor',
      roleCaregiver: 'Caregiver',
      babyTitle: 'Add Your Baby',
      babyDescription:
        "Let's start by creating a profile for your little one so you can begin tracking the journey with clarity.",
      babyHelper: 'Photo is optional. We can keep the generated avatar if you prefer.',
      babyNote:
        'Required fields help us personalize growth tracking, routines, and reminders.',
      doctorTitle: 'Add Your Doctor Profile',
      doctorDescription:
        'Create your clinician profile first, then connect babies or patients after sign-in.',
      doctorHelper: 'We generate a clean avatar preview from the name you enter below.',
      doctorNote:
        'Doctor accounts can review assigned babies, health updates, and care summaries.',
      caregiverTitle: 'Add Your Caregiver Profile',
      caregiverDescription:
        'Set up the caregiver account so daily logs and handoff updates stay organized for the family.',
      caregiverHelper:
        'Choose the relationship that best matches how this caregiver supports the child.',
      caregiverNote:
        'Caregivers can help with shared updates while the parent remains the primary owner.',
      tapToAddPhoto: 'Tap to add photo',
      profilePreview: 'Profile preview',
      babyName: "Baby's Name *",
      babyNamePlaceholder: 'Enter name',
      babyDob: 'Date of Birth *',
      genderOptional: 'Gender (Optional)',
      genderGirl: 'Girl',
      genderBoy: 'Boy',
      genderSurprise: 'Surprise',
      doctorName: "Doctor's Name *",
      doctorNamePlaceholder: 'Enter full name',
      doctorSpecialty: 'Specialty',
      doctorSpecialtyPlaceholder: 'Pediatrics, Neonatal care, Family medicine...',
      caregiverName: "Caregiver's Name *",
      caregiverNamePlaceholder: 'Enter full name',
      caregiverRelationship: 'Relationship *',
      createProfile: 'Create Profile',
      growthTrackingNote: '*Required fields for growth tracking',
    },
  },
  es: {
    common: {
      appName: 'Cradlyn',
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
      payNow: 'Pagar ahora',
      processing: 'Procesando...',
      refresh: 'Actualizar',
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
      latestVitals: 'Signos vitales',
      quickLog: 'Registro rápido',
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
      export: 'Exportar datos',
      premium: 'Pasar a Premium',
      logout: 'Cerrar sesión',
      family: 'Familia',
      preferences: 'Preferencias',
      editBaby: 'Editar bebé',
      pushEnabled: 'Push activado',
      pushDisabled: 'Push desactivado',
      quietHours: 'Horas de silencio',
      subscribe: 'Suscribirse a alertas',
    },
    payment: {
      title: 'Pago seguro',
      payNow: 'Confirmar acceso',
      processing: 'Autenticando...',
      secure: 'Encriptación de grado cuántico',
      secureNotice:
        'Sus credenciales financieras están tokenizadas y procesadas a través de pasarelas seguras. Cradlyn nunca retiene datos de pago sin procesar.',
      fillRequired: 'Por favor, complete todos los campos obligatorios',
    },
    public: {
      tagline: 'Seguimiento suave del bebe para comida, sueno y hitos.',
      badge: 'Cuidado diario en calma',
      heroBody:
        'Mantente cerca de cada comida, siesta e hito con una bienvenida mas suave y acogedora.',
      nursingMoments: 'Momentos de lactancia',
      nurtureFirst: 'El cuidado va primero',
      nurtureFirstBody:
        'Una bienvenida mas personal con la ilustracion de madre y bebe en lugar de una vista generica.',
      beginJourney: 'Comenzar el camino',
      alreadyTracking: 'Ya llevas registros?',
      beforeYouStart: 'Antes de empezar:',
      signIn: 'Iniciar sesion',
      privacyTermsPolicies: 'Privacidad, terminos y politicas',
      highlightSleep: 'Sueno',
      highlightFeed: 'Comida',
      highlightSecure: 'Seguro',
      highlightSynced: 'Sincronizado',
      highlightReady: 'Listo',
      highlightPrivate: 'Privado',
    },
    auth: {
      welcomeBack: 'Bienvenido de nuevo',
      joinApp: 'Unete a Cradlyn',
      identityVerification: 'Verificacion de identidad',
      provisionAccess: 'Activar acceso',
      continueAfterSignIn: 'Continua a {destination} despues de iniciar sesion',
      registryEmail: 'Correo del registro',
      emailPlaceholder: 'familia@dominio.com',
      accessKey: 'Clave de acceso',
      passwordPlaceholder: 'Ingresa tu contrasena',
      authorizing: 'Autorizando...',
      signInAction: 'Iniciar sesion',
      createAccountAction: 'Crear cuenta',
      accountCreated: 'Cuenta creada. Revisa tu correo para confirmar y luego inicia sesion.',
      authFailed: 'La autenticacion fallo. Intentalo de nuevo.',
      socialAuthFailed: 'La autenticacion social fallo. Intentalo de nuevo.',
      continueWith: 'Continuar con {provider}',
    },
    onboarding: {
      titleLineOne: 'El santuario para',
      titleLineTwo: 'una crianza suave',
      subtitle:
        'Configura tu perfil una vez y luego registra comida, sueno, salud e hitos con claridad.',
      stepCounter: 'Paso {current} de {total}',
      skipToLogin: 'Ir al acceso',
      previous: 'Anterior',
      next: 'Siguiente',
      continueToLogin: 'Continuar al acceso',
      countryTitle: 'Selecciona tu pais',
      countrySubtitle:
        'Lo usamos para orientacion local de salud, calendarios de vacunas y valores regionales.',
      countrySearch: 'Busca tu pais',
      countryNoMatchTitle: 'Sin resultados',
      countryNoMatchBody: 'Prueba con un pais, codigo o region.',
      guidanceUnits: 'Unidades recomendadas',
      guidanceVaccines: 'Calendario de vacunas',
      guidanceCoverage: 'Cobertura',
      guidanceCountrySource: 'Calendario del pais',
      guidanceRegionSource: 'Guia regional',
      guidanceGlobalSource: 'Respaldo global',
      welcomeFeatureSleepTitle: 'Sueno',
      welcomeFeatureSleepBody: 'Ventanas de vigilia y siestas',
      welcomeFeatureFeedingTitle: 'Comida',
      welcomeFeatureFeedingBody: 'Biberon, pecho y notas',
      welcomeFeatureGrowthTitle: 'Crecimiento',
      welcomeFeatureGrowthBody: 'Hitos y progreso',
      unitsTitle: 'Unidades de medida',
      unitsSubtitle: 'Elige tu sistema preferido para crecimiento y registros diarios.',
      unitsMetric: 'Metrico',
      unitsImperial: 'Imperial',
      unitsCountryDefault: 'Recomendado para {country}',
      unitsUseDefault: 'Usar valor del pais',
      notificationsTitle: 'Alertas inteligentes',
      notificationsSubtitle: 'Activa recordatorios para no perder momentos clave de cuidado.',
      notificationsCardTitle: 'Recordatorios inteligentes',
      notificationsCardSubtitle: 'Personalizados y suaves',
      remindersFeeding: 'Recordatorios de comida',
      remindersSleep: 'Ventanas de sueno',
      remindersHealth: 'Controles de salud',
      remindersGrowth: 'Hitos de crecimiento',
      completeTitle: 'Configuracion completa',
      completeBaby: 'El perfil del bebe esta listo. Continua al acceso y empieza a registrar su camino.',
      completeDoctor: 'Tu perfil medico esta listo. Continua al acceso para gestionar pacientes e informes.',
      completeCaregiver:
        'Tu perfil de cuidador esta listo. Continua al acceso para apoyar las actualizaciones diarias.',
      summaryCountry: 'Pais',
      summaryUnits: 'Unidades',
      summaryAlerts: 'Alertas',
      summaryDoctor: 'Doctor',
      summaryCaregiver: 'Cuidador',
      summaryBaby: 'Bebe',
      summarySpecialty: 'Especialidad',
      summaryRelationship: 'Relacion',
      alertsEnabled: 'Activas',
      alertsDisabled: 'Desactivadas',
      roleBaby: 'Bebe',
      roleDoctor: 'Doctor',
      roleCaregiver: 'Cuidador',
      babyTitle: 'Agrega a tu bebe',
      babyDescription:
        'Empecemos creando un perfil para tu pequeno y asi seguir su camino con claridad.',
      babyHelper: 'La foto es opcional. Podemos mantener el avatar generado si prefieres.',
      babyNote:
        'Los campos obligatorios nos ayudan a personalizar crecimiento, rutinas y recordatorios.',
      doctorTitle: 'Agrega tu perfil medico',
      doctorDescription:
        'Crea primero tu perfil clinico y luego conecta bebes o pacientes despues del acceso.',
      doctorHelper: 'Generamos una vista limpia del avatar con el nombre que ingreses.',
      doctorNote:
        'Las cuentas medicas pueden revisar bebes asignados, salud y resumenes de cuidado.',
      caregiverTitle: 'Agrega tu perfil de cuidador',
      caregiverDescription:
        'Configura la cuenta del cuidador para mantener organizados los registros y relevos diarios.',
      caregiverHelper: 'Elige la relacion que mejor describe como apoya este cuidador.',
      caregiverNote:
        'Los cuidadores pueden ayudar con las actualizaciones compartidas mientras el padre sigue siendo el propietario.',
      tapToAddPhoto: 'Toca para agregar foto',
      profilePreview: 'Vista del perfil',
      babyName: 'Nombre del bebe *',
      babyNamePlaceholder: 'Ingresa el nombre',
      babyDob: 'Fecha de nacimiento *',
      genderOptional: 'Genero (opcional)',
      genderGirl: 'Nina',
      genderBoy: 'Nino',
      genderSurprise: 'Sorpresa',
      doctorName: 'Nombre del doctor *',
      doctorNamePlaceholder: 'Ingresa el nombre completo',
      doctorSpecialty: 'Especialidad',
      doctorSpecialtyPlaceholder: 'Pediatria, cuidado neonatal, medicina familiar...',
      caregiverName: 'Nombre del cuidador *',
      caregiverNamePlaceholder: 'Ingresa el nombre completo',
      caregiverRelationship: 'Relacion *',
      createProfile: 'Crear perfil',
      continue: 'Continuar',
      growthTrackingNote: '*Campos obligatorios para el seguimiento del crecimiento',
    },
  },
  fr: {
    common: {
      appName: 'Cradlyn',
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
    },
    public: {
      tagline: 'Suivi doux du bebe pour les repas, le sommeil et les etapes.',
      badge: 'Soin quotidien serein',
      heroBody:
        'Restez proche de chaque repas, sieste et etape avec un accueil plus doux et rassurant.',
      nursingMoments: 'Moments de nursing',
      nurtureFirst: 'Le soin avant tout',
      nurtureFirstBody:
        'Un accueil plus personnel base sur l illustration mere et bebe plutot qu un apercu generique.',
      beginJourney: 'Commencer',
      alreadyTracking: 'Vous suivez deja ?',
      beforeYouStart: 'Avant de commencer :',
      signIn: 'Se connecter',
      privacyTermsPolicies: 'Confidentialite, conditions et politiques',
      highlightSleep: 'Sommeil',
      highlightFeed: 'Repas',
      highlightSecure: 'Securise',
      highlightSynced: 'Synchronise',
      highlightReady: 'Pret',
      highlightPrivate: 'Prive',
    },
    auth: {
      welcomeBack: 'Bon retour',
      joinApp: 'Rejoindre Cradlyn',
      identityVerification: 'Verification de l identite',
      provisionAccess: 'Activer l acces',
      continueAfterSignIn: 'Continuer vers {destination} apres connexion',
      registryEmail: 'Email du compte',
      emailPlaceholder: 'famille@domaine.com',
      accessKey: 'Cle d acces',
      passwordPlaceholder: 'Entrez votre mot de passe',
      authorizing: 'Autorisation...',
      signInAction: 'Se connecter',
      createAccountAction: 'Creer un compte',
      accountCreated: 'Compte cree. Verifiez votre email puis connectez-vous.',
      authFailed: 'Echec de l authentification. Veuillez reessayer.',
      socialAuthFailed: 'Echec de la connexion sociale. Veuillez reessayer.',
      continueWith: 'Continuer avec {provider}',
    },
    onboarding: {
      titleLineOne: 'Le sanctuaire pour',
      titleLineTwo: 'une parentalite douce',
      subtitle:
        'Configurez votre profil une fois puis suivez repas, sommeil, sante et etapes avec clarte.',
      stepCounter: 'Etape {current} sur {total}',
      skipToLogin: 'Aller a la connexion',
      previous: 'Precedent',
      next: 'Suivant',
      continueToLogin: 'Continuer vers la connexion',
      countryTitle: 'Selectionnez votre pays',
      countrySubtitle:
        'Nous l utilisons pour les conseils de sante locaux, les vaccins et les reglages regionaux.',
      countrySearch: 'Rechercher votre pays',
      countryNoMatchTitle: 'Aucun resultat',
      countryNoMatchBody: 'Essayez un pays, un code ou une region.',
      guidanceUnits: 'Unites recommandees',
      guidanceVaccines: 'Calendrier vaccinal',
      guidanceCoverage: 'Couverture',
      guidanceCountrySource: 'Calendrier national',
      guidanceRegionSource: 'Guidage regional',
      guidanceGlobalSource: 'Secours global',
      welcomeFeatureSleepTitle: 'Sommeil',
      welcomeFeatureSleepBody: 'Fenetres d eveil et siestes',
      welcomeFeatureFeedingTitle: 'Repas',
      welcomeFeatureFeedingBody: 'Biberon, sein et notes',
      welcomeFeatureGrowthTitle: 'Croissance',
      welcomeFeatureGrowthBody: 'Etapes et progres',
      unitsTitle: 'Unites de mesure',
      unitsSubtitle: 'Choisissez votre systeme prefere pour la croissance et les journaux quotidiens.',
      unitsMetric: 'Metrique',
      unitsImperial: 'Imperial',
      unitsCountryDefault: 'Recommande pour {country}',
      unitsUseDefault: 'Utiliser le reglage du pays',
      notificationsTitle: 'Alertes intelligentes',
      notificationsSubtitle: 'Activez les rappels pour ne manquer aucun moment important.',
      notificationsCardTitle: 'Rappels intelligents',
      notificationsCardSubtitle: 'Personnalises et doux',
      remindersFeeding: 'Rappels de repas',
      remindersSleep: 'Fenetres de sommeil',
      remindersHealth: 'Controles de sante',
      remindersGrowth: 'Etapes de croissance',
      completeTitle: 'Configuration terminee',
      completeBaby:
        'Le profil du bebe est pret. Continuez vers la connexion pour commencer le suivi.',
      completeDoctor:
        'Votre profil medecin est pret. Continuez vers la connexion pour gerer patients et rapports.',
      completeCaregiver:
        'Votre profil aidant est pret. Continuez vers la connexion pour soutenir les mises a jour.',
      summaryCountry: 'Pays',
      summaryUnits: 'Unites',
      summaryAlerts: 'Alertes',
      summaryDoctor: 'Medecin',
      summaryCaregiver: 'Aidant',
      summaryBaby: 'Bebe',
      summarySpecialty: 'Specialite',
      summaryRelationship: 'Lien',
      alertsEnabled: 'Actives',
      alertsDisabled: 'Desactivees',
      roleBaby: 'Bebe',
      roleDoctor: 'Medecin',
      roleCaregiver: 'Aidant',
      babyTitle: 'Ajouter votre bebe',
      babyDescription:
        'Commencons par creer un profil pour votre tout-petit afin de suivre son parcours avec clarte.',
      babyHelper: 'La photo est facultative. Nous pouvons conserver l avatar genere.',
      babyNote:
        'Les champs requis nous aident a personnaliser croissance, routines et rappels.',
      doctorTitle: 'Ajouter votre profil medecin',
      doctorDescription:
        'Creez d abord votre profil clinique puis connectez bebes ou patients apres connexion.',
      doctorHelper: 'Nous generons un apercu d avatar a partir du nom saisi.',
      doctorNote:
        'Les comptes medecins peuvent consulter les bebes assignes, la sante et les resumes de soin.',
      caregiverTitle: 'Ajouter votre profil aidant',
      caregiverDescription:
        'Configurez le compte aidant afin que les journaux quotidiens et relais restent organises.',
      caregiverHelper: 'Choisissez le lien qui correspond le mieux a cet aidant.',
      caregiverNote:
        'Les aidants peuvent aider aux mises a jour partagees tandis que le parent reste proprietaire.',
      tapToAddPhoto: 'Touchez pour ajouter une photo',
      profilePreview: 'Apercu du profil',
      babyName: 'Nom du bebe *',
      babyNamePlaceholder: 'Entrer le nom',
      babyDob: 'Date de naissance *',
      genderOptional: 'Genre (optionnel)',
      genderGirl: 'Fille',
      genderBoy: 'Garcon',
      genderSurprise: 'Surprise',
      doctorName: 'Nom du medecin *',
      doctorNamePlaceholder: 'Entrer le nom complet',
      doctorSpecialty: 'Specialite',
      doctorSpecialtyPlaceholder: 'Pediatrie, soins neonataux, medecine familiale...',
      caregiverName: 'Nom de l aidant *',
      caregiverNamePlaceholder: 'Entrer le nom complet',
      caregiverRelationship: 'Lien *',
      createProfile: 'Creer le profil',
      continue: 'Continuer',
      growthTrackingNote: '*Champs requis pour le suivi de croissance',
    },
  },
  de: {
    common: {
      appName: 'Cradlyn',
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
    },
    public: {
      tagline: 'Sanfte Babybegleitung fur Futterung, Schlaf und Meilensteine.',
      badge: 'Ruhige Tagespflege',
      heroBody:
        'Bleiben Sie bei jeder Mahlzeit, jedem Nickerchen und jedem Meilenstein nah dran mit einem weicheren Start.',
      nursingMoments: 'Stillmomente',
      nurtureFirst: 'Fursorge zuerst',
      nurtureFirstBody:
        'Ein personlicherer Einstieg mit Mutter-und-Baby-Grafik statt einer generischen Vorschau.',
      beginJourney: 'Reise beginnen',
      alreadyTracking: 'Schon dabei?',
      beforeYouStart: 'Bevor Sie starten:',
      signIn: 'Anmelden',
      privacyTermsPolicies: 'Datenschutz, Bedingungen und Richtlinien',
      highlightSleep: 'Schlaf',
      highlightFeed: 'Futtern',
      highlightSecure: 'Sicher',
      highlightSynced: 'Synchron',
      highlightReady: 'Bereit',
      highlightPrivate: 'Privat',
    },
    auth: {
      welcomeBack: 'Willkommen zuruck',
      joinApp: 'Zu Cradlyn',
      identityVerification: 'Identitatsprufung',
      provisionAccess: 'Zugang einrichten',
      continueAfterSignIn: 'Nach Anmeldung weiter zu {destination}',
      registryEmail: 'Registrierte E-Mail',
      emailPlaceholder: 'familie@domain.de',
      accessKey: 'Zugangsschlussel',
      passwordPlaceholder: 'Passwort eingeben',
      authorizing: 'Autorisierung...',
      signInAction: 'Anmelden',
      createAccountAction: 'Konto erstellen',
      accountCreated: 'Konto erstellt. Bitte E-Mail bestatigen und dann anmelden.',
      authFailed: 'Authentifizierung fehlgeschlagen. Bitte erneut versuchen.',
      socialAuthFailed: 'Soziale Anmeldung fehlgeschlagen. Bitte erneut versuchen.',
      continueWith: 'Weiter mit {provider}',
    },
    onboarding: {
      titleLineOne: 'Der geschutzte Raum fur',
      titleLineTwo: 'sanfte Elternschaft',
      subtitle:
        'Richten Sie Ihr Profil einmal ein und verfolgen Sie dann Futterung, Schlaf, Gesundheit und Entwicklung.',
      stepCounter: 'Schritt {current} von {total}',
      skipToLogin: 'Zur Anmeldung',
      previous: 'Zuruck',
      next: 'Weiter',
      continueToLogin: 'Weiter zur Anmeldung',
      countryTitle: 'Land auswahlen',
      countrySubtitle:
        'Wir nutzen dies fur lokale Gesundheitsleitlinien, Impfplane und regionale Vorgaben.',
      countrySearch: 'Land suchen',
      countryNoMatchTitle: 'Noch keine Treffer',
      countryNoMatchBody: 'Versuchen Sie Land, Code oder Region.',
      guidanceUnits: 'Empfohlene Einheiten',
      guidanceVaccines: 'Impfplan',
      guidanceCoverage: 'Abdeckung',
      guidanceCountrySource: 'Landesplan',
      guidanceRegionSource: 'Regionale Richtlinie',
      guidanceGlobalSource: 'Globale Reserve',
      welcomeFeatureSleepTitle: 'Schlaf',
      welcomeFeatureSleepBody: 'Wachfenster und Nickerchen',
      welcomeFeatureFeedingTitle: 'Futtern',
      welcomeFeatureFeedingBody: 'Flasche, Stillen und Notizen',
      welcomeFeatureGrowthTitle: 'Wachstum',
      welcomeFeatureGrowthBody: 'Meilensteine und Fortschritt',
      unitsTitle: 'MaBeinheiten',
      unitsSubtitle: 'Wahlen Sie Ihr bevorzugtes System fur Wachstum und Tagesprotokolle.',
      unitsMetric: 'Metrisch',
      unitsImperial: 'Imperial',
      unitsCountryDefault: 'Empfohlen fur {country}',
      unitsUseDefault: 'Landesvorgabe nutzen',
      notificationsTitle: 'Intelligente Hinweise',
      notificationsSubtitle: 'Aktivieren Sie Erinnerungen, damit kein wichtiger Moment verloren geht.',
      notificationsCardTitle: 'Smarte Erinnerungen',
      notificationsCardSubtitle: 'Personalisiert und sanft',
      remindersFeeding: 'Futterungs-Erinnerungen',
      remindersSleep: 'Schlaffenster',
      remindersHealth: 'Gesundheitschecks',
      remindersGrowth: 'Wachstums-Meilensteine',
      completeTitle: 'Einrichtung abgeschlossen',
      completeBaby:
        'Das Babyprofil ist bereit. Melden Sie sich an und beginnen Sie mit dem Tracking.',
      completeDoctor:
        'Ihr Arztprofil ist bereit. Melden Sie sich an und verwalten Sie Patienten und Berichte.',
      completeCaregiver:
        'Ihr Betreuungsperson-Profil ist bereit. Melden Sie sich an und unterstutzen Sie Tagesupdates.',
      summaryCountry: 'Land',
      summaryUnits: 'Einheiten',
      summaryAlerts: 'Hinweise',
      summaryDoctor: 'Arzt',
      summaryCaregiver: 'Betreuung',
      summaryBaby: 'Baby',
      summarySpecialty: 'Fachgebiet',
      summaryRelationship: 'Beziehung',
      alertsEnabled: 'Aktiv',
      alertsDisabled: 'Aus',
      roleBaby: 'Baby',
      roleDoctor: 'Arzt',
      roleCaregiver: 'Betreuung',
      babyTitle: 'Ihr Baby hinzufugen',
      babyDescription:
        'Erstellen wir zuerst ein Profil fur Ihr Kind, damit Sie den Weg klar verfolgen konnen.',
      babyHelper: 'Ein Foto ist optional. Das generierte Avatar kann bleiben.',
      babyNote:
        'Pflichtfelder helfen uns, Wachstum, Routinen und Erinnerungen zu personalisieren.',
      doctorTitle: 'Ihr Arztprofil hinzufugen',
      doctorDescription:
        'Erstellen Sie zuerst Ihr Klinikprofil und verbinden Sie danach Babys oder Patienten.',
      doctorHelper: 'Wir erzeugen eine saubere Avatar-Vorschau aus dem eingegebenen Namen.',
      doctorNote:
        'Arztkonten konnen zugewiesene Babys, Gesundheitsupdates und Pflegeubersichten sehen.',
      caregiverTitle: 'Ihr Betreuungsperson-Profil hinzufugen',
      caregiverDescription:
        'Richten Sie das Betreuungskonto ein, damit Tagesprotokolle und Ubergaben organisiert bleiben.',
      caregiverHelper: 'Wahlen Sie die Beziehung, die diese Rolle am besten beschreibt.',
      caregiverNote:
        'Betreuungspersonen konnen bei geteilten Updates helfen, wahrend Eltern Eigentumer bleiben.',
      tapToAddPhoto: 'Foto hinzufugen',
      profilePreview: 'Profilvorschau',
      babyName: 'Name des Babys *',
      babyNamePlaceholder: 'Name eingeben',
      babyDob: 'Geburtsdatum *',
      genderOptional: 'Geschlecht (optional)',
      genderGirl: 'Madchen',
      genderBoy: 'Junge',
      genderSurprise: 'Uberraschung',
      doctorName: 'Name des Arztes *',
      doctorNamePlaceholder: 'Vollstandigen Namen eingeben',
      doctorSpecialty: 'Fachgebiet',
      doctorSpecialtyPlaceholder: 'Padiatrie, Neonatalpflege, Familienmedizin...',
      caregiverName: 'Name der Betreuungsperson *',
      caregiverNamePlaceholder: 'Vollstandigen Namen eingeben',
      caregiverRelationship: 'Beziehung *',
      createProfile: 'Profil erstellen',
      continue: 'Weiter',
      growthTrackingNote: '*Pflichtfelder fur Wachstumstracking',
    },
  },
  it: { common: { appName: 'Cradlyn' } },
  pt: { common: { appName: 'Cradlyn' } },
  ja: { common: { appName: 'Cradlyn' } },
  zh: { common: { appName: 'Cradlyn' } },
  ar: { common: { appName: 'Cradlyn' } },
};

const normalizeLanguageCodeInternal = (language: string | null | undefined): string => {
  if (!language) {
    return DEFAULT_LANGUAGE;
  }

  const candidate = language.trim().replace(/_/g, '-');
  if (!candidate) {
    return DEFAULT_LANGUAGE;
  }

  try {
    return new Intl.Locale(candidate).toString();
  } catch {
    return candidate;
  }
};

const getBaseLanguage = (language: string): string =>
  normalizeLanguageCodeInternal(language).split('-')[0].toLowerCase();

const getLanguageLookupChain = (language: string): string[] => {
  const normalized = normalizeLanguageCodeInternal(language);
  const baseLanguage = getBaseLanguage(normalized);
  return [...new Set([normalized, normalized.toLowerCase(), baseLanguage, DEFAULT_LANGUAGE])];
};

const isValidLocaleCodeInternal = (language: string): boolean => {
  try {
    new Intl.Locale(language);
    return true;
  } catch {
    return false;
  }
};

const getSafeFormattingLocale = (language: string): string =>
  isValidLocaleCodeInternal(language) ? normalizeLanguageCodeInternal(language) : DEFAULT_LANGUAGE;

const getDisplayNameForLanguage = (language: string, displayLocale: string): string => {
  const normalized = normalizeLanguageCodeInternal(language);
  const baseLanguage = getBaseLanguage(normalized);

  try {
    const displayNames = new Intl.DisplayNames([displayLocale], { type: 'language' });
    return displayNames.of(baseLanguage) || normalized;
  } catch {
    return normalized;
  }
};

const getLanguageBadge = (language: string): string => {
  const normalized = normalizeLanguageCodeInternal(language);
  const locale = new Intl.Locale(normalized);
  const region = locale.region;
  if (region) {
    return region.toUpperCase();
  }

  const baseLanguage = getBaseLanguage(normalized);
  return baseLanguage.slice(0, 2).toUpperCase();
};

const getBrowserLanguageInternal = (): string => {
  if (typeof navigator === 'undefined') {
    return DEFAULT_LANGUAGE;
  }

  const candidates = [...(navigator.languages || []), navigator.language];
  for (const candidate of candidates) {
    const normalized = normalizeLanguageCodeInternal(candidate);
    if (isValidLocaleCodeInternal(normalized)) {
      return normalized;
    }
  }

  return DEFAULT_LANGUAGE;
};

const applyDocumentLanguageAttributes = (language: string) => {
  if (typeof document === 'undefined') {
    return;
  }

  const normalized = getSafeFormattingLocale(language);
  document.documentElement.lang = normalized;
  document.documentElement.dir = RTL_LANGUAGE_PREFIXES.has(getBaseLanguage(normalized)) ? 'rtl' : 'ltr';
};

export const normalizeLanguageCode = (language: string | null | undefined): string =>
  normalizeLanguageCodeInternal(language);

export const isValidLocaleCode = (language: string): boolean => isValidLocaleCodeInternal(language);

export const isRtlLanguage = (language: string): boolean =>
  RTL_LANGUAGE_PREFIXES.has(getBaseLanguage(language));

export const getBrowserLanguage = (): string => getBrowserLanguageInternal();

export const getLanguageDisplayName = (
  language: string,
  displayLocale = DEFAULT_LANGUAGE,
): string => getDisplayNameForLanguage(language, getSafeFormattingLocale(displayLocale));

export const getLanguageNativeName = (language: string): string =>
  getDisplayNameForLanguage(language, getSafeFormattingLocale(language));

export const getLanguageOptions = (query = '', includeLanguage?: string): LanguageOption[] => {
  const queryValue = query.trim().toLowerCase();
  const current = includeLanguage || getBrowserLanguageInternal();
  const candidates = new Set<string>([
    ...COMMON_LANGUAGE_CODES,
    current,
    ...(typeof navigator !== 'undefined' ? navigator.languages || [] : []),
  ]);

  return [...candidates]
    .map((code) => normalizeLanguageCodeInternal(code))
    .filter((code, index, array) => array.indexOf(code) === index)
    .map((code) => ({
      code,
      name: getLanguageDisplayName(code, DEFAULT_LANGUAGE),
      nativeName: getLanguageNativeName(code),
      badge: getLanguageBadge(code),
    }))
    .filter((option) => {
      if (!queryValue) {
        return true;
      }

      return [option.code, option.name, option.nativeName].some((value) =>
        value.toLowerCase().includes(queryValue),
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name));
};

class i18n {
  private currentLanguage: SupportedLanguage = DEFAULT_LANGUAGE;
  private currentUnit: Unit = 'metric';

  constructor() {
    this.loadSettings();
    applyDocumentLanguageAttributes(this.currentLanguage);
  }

  private emit(eventName: string, detail: Record<string, unknown>): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  setLanguage(lang: SupportedLanguage): void {
    const normalized = normalizeLanguageCodeInternal(lang);
    this.currentLanguage = normalized;

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('babylog_language', normalized);
    }

    applyDocumentLanguageAttributes(normalized);
    this.emit('languageChanged', { language: normalized });
  }

  getLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  setUnit(unit: Unit): void {
    this.currentUnit = unit;

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('babylog_units', unit);
    }

    this.emit('unitsChanged', { unit });
  }

  getUnit(): Unit {
    return this.currentUnit;
  }

  t(key: string, defaultValue?: string): string {
    const [namespace, ...path] = key.split('.');

    for (const candidateLanguage of getLanguageLookupChain(this.currentLanguage)) {
      let value: unknown = translations[candidateLanguage]?.[namespace];

      for (const segment of path) {
        value = (value as Record<string, unknown> | undefined)?.[segment];
      }

      if (typeof value === 'string') {
        return value;
      }
    }

    return defaultValue || key;
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat(getSafeFormattingLocale(this.currentLanguage), {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  }

  formatTime(date: Date): string {
    return new Intl.DateTimeFormat(getSafeFormattingLocale(this.currentLanguage), {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  formatNumber(value: number, decimals = 0): string {
    return new Intl.NumberFormat(getSafeFormattingLocale(this.currentLanguage), {
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
    if (typeof localStorage === 'undefined') {
      this.currentLanguage = DEFAULT_LANGUAGE;
      return;
    }

    const savedLang = localStorage.getItem('babylog_language');
    const savedUnit = localStorage.getItem('babylog_units') as Unit | null;

    this.currentLanguage = savedLang
      ? normalizeLanguageCodeInternal(savedLang)
      : getBrowserLanguageInternal();

    if (savedUnit) {
      this.currentUnit = savedUnit;
    }
  }
}

export const i18nInstance = new i18n();
export const i18nT = (key: string, defaultValue?: string) => i18nInstance.t(key, defaultValue);
