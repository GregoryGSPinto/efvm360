// ============================================================================
// EFVM360 v3.2 — API Layer Index
// Clean barrel export for API client and contracts
// ============================================================================

export { api, ApiError, setTokens, clearTokens, getAccessToken } from './client';
export type {
  LoginRequestDTO, LoginResponseDTO, RefreshRequestDTO,
  UserDTO, PassagemCreateDTO, PassagemResponseDTO,
  LinhaPatioDTO, SegurancaDTO, EquipamentoDTO,
  AuditEntryDTO, AuditIntegrityDTO,
  MeusDadosDTO, ExportarDadosDTO,
  HealthDTO, ApiErrorDTO,
} from './contracts';
