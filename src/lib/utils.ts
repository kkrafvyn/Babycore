import { clsx, type ClassValue } from 'clsx';
import { format, differenceInDays, differenceInMonths, differenceInYears, parse } from 'date-fns';

export const cn = (...inputs: ClassValue[]): string => clsx(inputs);

type CryptoWithOptionalRandomUuid = Crypto & {
  randomUUID?: () => string;
};

const getCryptoObject = (): CryptoWithOptionalRandomUuid | undefined => {
  if (typeof globalThis === 'undefined') {
    return undefined;
  }

  return (globalThis as typeof globalThis & { crypto?: CryptoWithOptionalRandomUuid }).crypto;
};

const formatUuidFromBytes = (bytes: Uint8Array): string => {
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
};

const createUuidFromRandomValues = (): string | null => {
  const cryptoObject = getCryptoObject();
  if (!cryptoObject?.getRandomValues) {
    return null;
  }

  const bytes = new Uint8Array(16);
  cryptoObject.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  return formatUuidFromBytes(bytes);
};

const createFallbackUuid = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });

const createCompatibleUuid = (): string => createUuidFromRandomValues() ?? createFallbackUuid();

export const ensureCryptoRandomUUID = (): void => {
  if (typeof globalThis === 'undefined') {
    return;
  }

  const globalObject = globalThis as typeof globalThis & {
    crypto?: CryptoWithOptionalRandomUuid;
  };

  if (typeof globalObject.crypto?.randomUUID === 'function') {
    return;
  }

  const randomUUID = () => createCompatibleUuid();

  if (globalObject.crypto) {
    try {
      Object.defineProperty(globalObject.crypto, 'randomUUID', {
        value: randomUUID,
        configurable: true,
        writable: true,
      });
      return;
    } catch {
      // Fall through to a best-effort global replacement below.
    }
  }

  try {
    Object.defineProperty(globalObject, 'crypto', {
      value: { randomUUID },
      configurable: true,
      writable: true,
    });
  } catch {
    // Some runtimes lock down global crypto; direct helper usage still works there.
  }
};

/**
 * Calculate baby's age in a human-readable format
 * Weeks for < 3 months, months for 3-24 months, years for > 24 months
 */
export const formatBabyAge = (dateOfBirth: string): string => {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  
  const days = differenceInDays(today, birthDate);
  const months = differenceInMonths(today, birthDate);
  const years = differenceInYears(today, birthDate);

  if (months < 3) {
    const weeks = Math.floor(days / 7);
    return `${weeks}w`;
  } else if (months < 24) {
    return `${months}m`;
  } else {
    return `${years}y`;
  }
};

/**
 * Format date based on locale preference
 * DD/MM/YYYY for most countries, MM/DD/YYYY for US
 */
export const formatDate = (date: string | Date, locale: string = 'en-US'): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (locale === 'en-US') {
    return format(d, 'MM/dd/yyyy');
  }
  return format(d, 'dd/MM/yyyy');
};

/**
 * Format time in 24-hour or 12-hour format based on device locale
 */
export const formatTime = (date: string | Date, use24Hour: boolean = true): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (use24Hour) {
    return format(d, 'HH:mm');
  }
  return format(d, 'hh:mm a');
};

/**
 * Format date and time together
 */
export const formatDateTime = (date: string | Date, locale: string = 'en-US', use24Hour: boolean = true): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const dateStr = formatDate(d, locale);
  const timeStr = formatTime(d, use24Hour);
  
  return `${dateStr} ${timeStr}`;
};

/**
 * Format duration in hours and minutes
 * Returns: "2h 30m" or similar
 */
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  } else if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
};

/**
 * Calculate duration in minutes between two timestamps
 */
export const calculateDuration = (startTime: string, endTime: string): number => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
};

/**
 * Get time since a specific timestamp
 * Returns human-readable format: "2 hours ago", "just now", etc.
 */
export const getTimeSince = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) {
    return 'just now';
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  
  return format(date, 'MMM d');
};

/**
 * Convert weight between metric and imperial
 */
export const convertWeight = (value: number, fromUnit: 'kg' | 'lb', toUnit: 'kg' | 'lb'): number => {
  if (fromUnit === toUnit) return value;
  
  if (fromUnit === 'kg' && toUnit === 'lb') {
    return Math.round(value * 2.20462 * 100) / 100;
  }
  // lb to kg
  return Math.round(value / 2.20462 * 100) / 100;
};

/**
 * Convert height/length between metric and imperial
 */
export const convertHeight = (value: number, fromUnit: 'cm' | 'in', toUnit: 'cm' | 'in'): number => {
  if (fromUnit === toUnit) return value;
  
  if (fromUnit === 'cm' && toUnit === 'in') {
    return Math.round(value / 2.54 * 100) / 100;
  }
  // in to cm
  return Math.round(value * 2.54 * 100) / 100;
};

/**
 * Convert volume between metric and imperial (ml to oz)
 */
export const convertVolume = (value: number, fromUnit: 'ml' | 'oz', toUnit: 'ml' | 'oz'): number => {
  if (fromUnit === toUnit) return value;
  
  if (fromUnit === 'ml' && toUnit === 'oz') {
    return Math.round(value / 29.5735 * 100) / 100;
  }
  // oz to ml
  return Math.round(value * 29.5735 * 100) / 100;
};

/**
 * Check if a date is within quiet hours
 */
export const isWithinQuietHours = (quietHourStart?: string, quietHourEnd?: string): boolean => {
  if (!quietHourStart || !quietHourEnd) return false;
  
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  // Handle case where quiet hours span midnight
  if (quietHourStart < quietHourEnd) {
    return currentTime >= quietHourStart && currentTime < quietHourEnd;
  } else {
    return currentTime >= quietHourStart || currentTime < quietHourEnd;
  }
};

/**
 * Generate unique ID
 */
export const generateId = (): string => {
  const cryptoObject = getCryptoObject();
  if (typeof cryptoObject?.randomUUID === 'function') {
    try {
      return cryptoObject.randomUUID();
    } catch {
      // Fall back below if the runtime exposes crypto but not a working randomUUID implementation.
    }
  }

  return createCompatibleUuid();
};

/**
 * Check for overlapping time periods
 */
export const hasOverlappingPeriod = (
  newStart: string,
  newEnd: string,
  existingPeriods: Array<{ startTime: string; endTime: string }>
): boolean => {
  const newStartDate = new Date(newStart);
  const newEndDate = new Date(newEnd);
  
  return existingPeriods.some(period => {
    const existingStart = new Date(period.startTime);
    const existingEnd = new Date(period.endTime);
    
    return newStartDate < existingEnd && newEndDate > existingStart;
  });
};

/**
 * Get WHO age bracket for vaccination schedule
 */
export const getVaccinationAgeBracket = (dateOfBirth: string): string => {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  
  const days = differenceInDays(today, birthDate);
  const weeks = Math.floor(days / 7);
  const months = differenceInMonths(today, birthDate);
  const years = differenceInYears(today, birthDate);

  if (days === 0) return 'At birth';
  if (weeks < 2) return '0-2 weeks';
  if (weeks < 4) return '2-4 weeks';
  if (months < 2) return '2-8 weeks';
  if (months < 3) return '8-12 weeks';
  if (months === 3) return '3 months';
  if (months === 4) return '4 months';
  if (months === 5) return '5 months';
  if (months === 6) return '6 months';
  if (months <= 8) return '6-8 months';
  if (months === 9) return '9 months';
  if (months <= 11) return '9-11 months';
  if (months === 12) return '12 months';
  if (months <= 15) return '12-15 months';
  if (months <= 18) return '15-18 months';
  if (months === 18) return '18 months';
  if (months <= 24) return '18-24 months';
  if (months === 24) return '24 months';
  if (years === 3) return '3 years';
  if (years === 4) return '4 years';
  if (years === 5) return '5 years';
  if (years >= 6) return '6+ years';
  
  return `${months} months`;
};

/**
 * Check if a vaccine is overdue
 */
export const isVaccineOverdue = (dueDate: string): boolean => {
  return new Date() > new Date(dueDate);
};

/**
 * Check if a vaccine is due soon (within 2 weeks)
 */
export const isVaccineDueSoon = (dueDate: string): boolean => {
  const now = new Date();
  const due = new Date(dueDate);
  const days = differenceInDays(due, now);
  
  return days <= 14 && days >= 0;
};
