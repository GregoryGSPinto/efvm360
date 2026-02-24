// EFVM Pátio 360 — Infrastructure Persistence Layer
export {
  IndexedDBEventStore,
  IndexedDBSnapshotStore,
  IndexedDBSyncQueue,
  YardConfigCache,
  getEventStore,
  getSnapshotStore,
  getSyncQueue,
  getYardConfigCache,
  initializeOfflineStores,
} from './IndexedDBEventStore';

export { getSyncEngine } from './SyncEngine';

export {
  ConflictResolutionEngine,
  getConflictEngine,
} from './ConflictResolution';
export type { ConflictStrategy, ConflictRecord, ConflictResolution } from './ConflictResolution';
