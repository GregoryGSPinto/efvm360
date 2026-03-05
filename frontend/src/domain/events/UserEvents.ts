// ============================================================================
// EFVM PÁTIO 360 — User Domain Events
// ============================================================================

import type { UUID, ISODateTime, Matricula } from '../contracts';
import type { YardCode } from '../aggregates/YardRegistry';

interface BaseEvent {
  readonly eventId: UUID;
  readonly timestamp: ISODateTime;
  readonly source: 'frontend' | 'backend';
}

export interface UserCreated extends BaseEvent {
  readonly type: 'UserCreated';
  readonly payload: { readonly matricula: Matricula; readonly nome: string; readonly funcao: string; readonly primaryYard: YardCode; };
}

export interface UserApproved extends BaseEvent {
  readonly type: 'UserApproved';
  readonly payload: { readonly matricula: Matricula; readonly approvedBy: Matricula; };
}

export interface UserSuspended extends BaseEvent {
  readonly type: 'UserSuspended';
  readonly payload: { readonly matricula: Matricula; readonly suspendedBy: Matricula; readonly reason: string; };
}

export interface UserTransferred extends BaseEvent {
  readonly type: 'UserTransferred';
  readonly payload: { readonly matricula: Matricula; readonly fromTeamId?: UUID; readonly toTeamId: UUID; readonly transferredBy: Matricula; };
}

export interface UserRoleChanged extends BaseEvent {
  readonly type: 'UserRoleChanged';
  readonly payload: { readonly matricula: Matricula; readonly fromRole: string; readonly toRole: string; readonly changedBy: Matricula; };
}

export interface UserPasswordResetRequested extends BaseEvent {
  readonly type: 'UserPasswordResetRequested';
  readonly payload: { readonly matricula: Matricula; readonly yardCode: YardCode; };
}

export interface UserPasswordResetApproved extends BaseEvent {
  readonly type: 'UserPasswordResetApproved';
  readonly payload: { readonly matricula: Matricula; readonly approvedBy: Matricula; };
}

export interface UserRegistrationRequested extends BaseEvent {
  readonly type: 'UserRegistrationRequested';
  readonly payload: { readonly matricula: Matricula; readonly nome: string; readonly funcao: string; readonly requestedYard: YardCode; };
}

export interface UserRegistrationApproved extends BaseEvent {
  readonly type: 'UserRegistrationApproved';
  readonly payload: { readonly matricula: Matricula; readonly approvedBy: Matricula; };
}

export interface UserRegistrationRejected extends BaseEvent {
  readonly type: 'UserRegistrationRejected';
  readonly payload: { readonly matricula: Matricula; readonly rejectedBy: Matricula; readonly reason: string; };
}

export type UserEvent =
  | UserCreated | UserApproved | UserSuspended | UserTransferred
  | UserRoleChanged | UserPasswordResetRequested | UserPasswordResetApproved
  | UserRegistrationRequested | UserRegistrationApproved | UserRegistrationRejected;
