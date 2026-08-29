import { PasswordRecoveryConfig, SecurityAuditLog } from '../types';
import { simpleHash } from './utils';

export function normalizeText(str: string): string {
  if (!str) return '';
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function normalizePhone(str: string): string {
  if (!str) return '';
  return str.replace(/[^0-9]/g, '');
}

export function hashAnswer(ans: string): string {
  return simpleHash(normalizeText(ans));
}

export function normalizeRecoveryKey(key: string): string {
  if (!key) return '';
  return key.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function hashRecoveryKey(key: string): string {
  return simpleHash(normalizeRecoveryKey(key));
}

export function generateRecoveryKey(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const rand = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `AFPS-${rand(4)}-${rand(4)}-${rand(4)}`;
}

export function validateNewPassword(pwd: string): { valid: boolean; message?: string } {
  if (!pwd || pwd.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }

  const lower = pwd.toLowerCase();
  const commonWeakPasswords = [
    '12345678',
    'password',
    '123456789',
    'qwertyui',
    '00000000',
    'admin1234',
    '11111111',
    'ledgerpro',
    '1234567890',
  ];

  if (commonWeakPasswords.includes(lower)) {
    return { valid: false, message: 'Password is too simple or common. Please choose a stronger password.' };
  }

  if (/^(.)\1+$/.test(pwd)) {
    return { valid: false, message: 'Password cannot consist of a single repeating character.' };
  }

  return { valid: true };
}

export function verifyRecoveryIdentity(
  config: PasswordRecoveryConfig,
  input: {
    businessName: string;
    ceoName: string;
    contactPhone: string;
    answer1: string;
    answer2: string;
    recoveryPin: string;
  }
): boolean {
  if (!config) return false;

  const bNameMatch = normalizeText(input.businessName) === normalizeText(config.businessName);
  const ceoMatch = normalizeText(input.ceoName) === normalizeText(config.ceoName);

  // Compare phones by digits
  const phoneInputDigits = normalizePhone(input.contactPhone);
  const phoneConfigDigits = normalizePhone(config.contactPhone);
  const phoneMatch = phoneInputDigits === phoneConfigDigits || (phoneInputDigits.length >= 7 && phoneConfigDigits.endsWith(phoneInputDigits));

  const ans1Match = hashAnswer(input.answer1) === config.securityAnswerHash1;
  const ans2Match = hashAnswer(input.answer2) === config.securityAnswerHash2;
  const pinMatch = simpleHash(input.recoveryPin.trim()) === config.recoveryPinHash;

  return bNameMatch && ceoMatch && phoneMatch && ans1Match && ans2Match && pinMatch;
}

export function verifyEmergencyKey(config: PasswordRecoveryConfig, inputKey: string): boolean {
  if (!config || !config.recoveryKeyHash) return false;
  return hashRecoveryKey(inputKey) === config.recoveryKeyHash;
}

export function createSecurityLog(
  event: SecurityAuditLog['event'],
  details: string
): SecurityAuditLog {
  return {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    event,
    details,
    ipAddress: 'Offline Local Desktop',
  };
}
