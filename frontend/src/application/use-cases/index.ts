// EFVM Pátio 360 — Application Use Cases
export {
  createServicePass,
  registerTrainStatus,
  recordWeighing,
  registerInspection,
  generateAlert,
  signServicePass,
  registerAnomaly,
} from './ServicePassUseCases';

export type {
  OperationalContext,
  UseCaseResult,
  CreateServicePassInput,
  RegisterTrainStatusInput,
  RecordWeighingInput,
  RegisterInspectionInput,
  GenerateAlertInput,
  SignServicePassInput,
  RegisterAnomalyInput,
} from './ServicePassUseCases';
