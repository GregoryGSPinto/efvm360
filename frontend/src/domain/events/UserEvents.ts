// ============================================================================
// EFVM PÁTIO 360 — User Domain Events
// ============================================================================

import type { UUID, ISODateTime, Matricula } from '../contracts';
import type { YardCode } from '../aggregates/YardRegistry';

interface BaseEvent {
  eventId: UUID;
  timestamp: ISODateTime;
  source: 'frontend' | 'backend';
}

export interface UserCreated extends BaseEvent {
  type: 'UserCreated';
  payload: { matricula: Matricula; nome: string; funcao: string; primaryYard: YardCode; };
}

export interface UserApproved extends BaseEvent {
  type: 'UserApproved';
  payload: { matricula: Matricula; approvedBy: Matricula; };
}

export interface UserSuspended extends BaseEvent {
  type: 'UserSuspended';
  payload: { matricula: Matricula; suspendedBy: Matricula; reason: string; };
}

export interface UserTransferred extends BaseEvent {
  type: 'UserTransferred';
  payload: { matricula: Matricula; fromTeamId?: UUID; toTeamId: UUID; transferredBy: Matricula; };
}

export interface UserRoleChanged extends BaseEvent {
  type: 'UserRoleChanged';
  payload: { matricula: Matricula; fromRole: string; toRole: string; changedBy: Matricula; };
}

export interface UserPasswordResetRequested extends BaseEvent {
  type: 'UserPasswordResetRequested';
  payload: { matricula: Matricula; yardCode: YardCode; };
}

export interface UserPasswordResetApproved extends BaseEvent {
  type: 'UserPasswordResetApproved';
  payload: { matricula: Matricula; approvedBy: Matricula; };
}

export interface UserRegistrationRequested extends BaseEvent {
  type: 'UserRegistrationRequested';
  payload: { matricula: Matricula; nome: string; funcao: string; requestedYard: YardCode; };
}

export interface UserRegistrationApproved extends BaseEvent {
  type: 'UserRegistrationApproved';
  payload: { matricula: Matricula; approvedBy: Matricula; };
}

export interface UserRegistrationRejected extends BaseEvent {
  type: 'UserRegistrationRejected';
  payload: { matricula: Matricula; rejectedBy: Matricula; reason: string; };
}

export type UserEvent =
  | UserCreated | UserApproved | UserSuspended | UserTransferred
  | UserRoleChanged | UserPasswordResetRequested | UserPasswordResetApproved
  | UserRegistrationRequested | UserRegistrationApproved | UserRegistrationRejected;
