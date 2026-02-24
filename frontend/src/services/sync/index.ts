// ============================================================================
// EFVM360 v3.2 — Sync Module Barrel Export
// ============================================================================

export { syncStore } from '../syncStore';
export type { SyncQueueItem, SyncConflict, SyncItemStatus, SyncItemType } from '../syncStore';

export { syncEngine } from '../syncEngine';
export type { SyncResult, SyncEngineState, SyncApiAdapter } from '../syncEngine';
