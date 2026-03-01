// ============================================================================
// EFVM360 — Registration & Password Reset Services
// localStorage-based with approval workflow
// ============================================================================

import type { YardCode } from '../domain/aggregates/YardRegistry';

const STORAGE_KEYS = {
  REGISTRATION_REQUESTS: 'efvm360-registration-requests',
  PASSWORD_REQUESTS: 'efvm360-password-requests',
  USUARIOS: 'efvm360-usuarios',
};

// ── Registration Request ───────────────────────────────────────────────

export interface RegistrationRequest {
  id: string;
  matricula: string;
  nome: string;
  funcao: string;
  requestedYard: YardCode;
  patiosResponsaveis?: string[];
  turno?: string;
  horarioTurno?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export function submitRegistration(data: {
  matricula: string; nome: string; funcao: string;
  requestedYard: YardCode; turno?: string; horarioTurno?: string;
}): RegistrationRequest {
  const request: RegistrationRequest = {
    id: `reg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ...data,
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };
  const requests = getRegistrationRequests();
  requests.push(request);
  localStorage.setItem(STORAGE_KEYS.REGISTRATION_REQUESTS, JSON.stringify(requests));
  return request;
}

export function getRegistrationRequests(yardCode?: YardCode): RegistrationRequest[] {
  try {
    const all: RegistrationRequest[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.REGISTRATION_REQUESTS) || '[]');
    if (!yardCode) return all;
    return all.filter(r => r.requestedYard === yardCode);
  } catch { return []; }
}

export function getPendingRegistrations(yardCode?: YardCode): RegistrationRequest[] {
  return getRegistrationRequests(yardCode).filter(r => r.status === 'pending');
}

export function approveRegistration(requestId: string, approverMatricula: string): boolean {
  try {
    const requests = getRegistrationRequests();
    const idx = requests.findIndex(r => r.id === requestId);
    if (idx === -1 || requests[idx].status !== 'pending') return false;

    const req = requests[idx];
    req.status = 'approved';
    req.reviewedBy = approverMatricula;
    req.reviewedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.REGISTRATION_REQUESTS, JSON.stringify(requests));

    // Create actual user in storage
    const usuarios = JSON.parse(localStorage.getItem(STORAGE_KEYS.USUARIOS) || '[]');
    const newUser = {
      nome: req.nome,
      matricula: req.matricula,
      senha: '123456',
      funcao: req.funcao,
      turno: req.turno || 'A',
      horarioTurno: req.horarioTurno || '07-19',
      avatar: '👷',
      primaryYard: req.patiosResponsaveis?.[0] || req.requestedYard,
      allowedYards: req.patiosResponsaveis || [req.requestedYard as string],
      status: 'active',
      hierarchyLevel: 1,
      aceiteTermos: { aceito: false },
      dataCriacao: new Date().toISOString(),
      aprovadoPor: approverMatricula,
    };
    usuarios.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(usuarios));
    return true;
  } catch { return false; }
}

export function rejectRegistration(requestId: string, rejectedBy: string, reason: string): boolean {
  try {
    const requests = getRegistrationRequests();
    const idx = requests.findIndex(r => r.id === requestId);
    if (idx === -1 || requests[idx].status !== 'pending') return false;

    requests[idx].status = 'rejected';
    requests[idx].reviewedBy = rejectedBy;
    requests[idx].reviewedAt = new Date().toISOString();
    requests[idx].rejectionReason = reason;
    localStorage.setItem(STORAGE_KEYS.REGISTRATION_REQUESTS, JSON.stringify(requests));
    return true;
  } catch { return false; }
}

// ── Password Reset Request ─────────────────────────────────────────────

export interface PasswordResetRequest {
  id: string;
  matricula: string;
  yardCode: YardCode;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  newPassword: string; // In production: hashed. Here: plain for localStorage demo
  reviewedBy?: string;
  reviewedAt?: string;
}

export function requestPasswordReset(matricula: string, yardCode: YardCode, newPassword: string): PasswordResetRequest {
  const request: PasswordResetRequest = {
    id: `pwd-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    matricula,
    yardCode,
    status: 'pending',
    requestedAt: new Date().toISOString(),
    newPassword,
  };
  const requests = getPasswordResetRequests();
  requests.push(request);
  localStorage.setItem(STORAGE_KEYS.PASSWORD_REQUESTS, JSON.stringify(requests));
  return request;
}

export function getPasswordResetRequests(yardCode?: YardCode): PasswordResetRequest[] {
  try {
    const all: PasswordResetRequest[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PASSWORD_REQUESTS) || '[]');
    if (!yardCode) return all;
    return all.filter(r => r.yardCode === yardCode);
  } catch { return []; }
}

export function getPendingPasswordResets(yardCode?: YardCode): PasswordResetRequest[] {
  return getPasswordResetRequests(yardCode).filter(r => r.status === 'pending');
}

export function approvePasswordReset(requestId: string, approverMatricula: string): boolean {
  try {
    const requests: PasswordResetRequest[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PASSWORD_REQUESTS) || '[]');
    const idx = requests.findIndex(r => r.id === requestId);
    if (idx === -1 || requests[idx].status !== 'pending') return false;

    const req = requests[idx];
    req.status = 'approved';
    req.reviewedBy = approverMatricula;
    req.reviewedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.PASSWORD_REQUESTS, JSON.stringify(requests));

    // Apply password change — set temp password and force change on next login
    const usuarios = JSON.parse(localStorage.getItem(STORAGE_KEYS.USUARIOS) || '[]');
    const userIdx = usuarios.findIndex((u: { matricula: string }) => u.matricula === req.matricula);
    if (userIdx !== -1) {
      usuarios[userIdx].senha = req.newPassword;
      delete usuarios[userIdx].senhaHash; // Clear hash so plaintext is used
      usuarios[userIdx].mustChangePassword = true;
      localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(usuarios));
    }
    return true;
  } catch { return false; }
}

export function rejectPasswordReset(requestId: string, rejectedBy: string): boolean {
  try {
    const requests: PasswordResetRequest[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PASSWORD_REQUESTS) || '[]');
    const idx = requests.findIndex(r => r.id === requestId);
    if (idx === -1 || requests[idx].status !== 'pending') return false;

    requests[idx].status = 'rejected';
    requests[idx].reviewedBy = rejectedBy;
    requests[idx].reviewedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.PASSWORD_REQUESTS, JSON.stringify(requests));
    return true;
  } catch { return false; }
}
