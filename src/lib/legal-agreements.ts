export const LEGAL_AGREEMENTS_VERSION = '2026-07-27';

const STORAGE_KEY = 'cradlyn_legal_agreements_acceptance';

type LegalAgreementsAcceptance = {
  version: string;
  acceptedAt: string;
};

export const hasAcceptedLegalAgreements = (): boolean => {
  if (typeof window === 'undefined') {
    return true;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return false;
    }

    const parsed = JSON.parse(raw) as LegalAgreementsAcceptance;
    return parsed.version === LEGAL_AGREEMENTS_VERSION;
  } catch {
    return false;
  }
};

export const recordLegalAgreementsAcceptance = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const record: LegalAgreementsAcceptance = {
    version: LEGAL_AGREEMENTS_VERSION,
    acceptedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
};
