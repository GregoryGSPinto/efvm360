// ============================================================================
// EFVM360 — Hook de Blindagem Operacional
// FASE 1: Runtime Integrity | DevTools Detection | Anti-Tampering
// Integra IntegrityMonitor + AuditTrail + verificação de runtime
// ============================================================================

import { useEffect, useRef, useCallback, useState } from 'react';
import type { Usuario } from '../types';
import {
  IntegrityMonitor,
  AuditTrail,
  verificarIntegridadeRuntime,
  detectarDevTools,
  secureLog,
} from '../services/security';
import type { AuditAction } from '../services/security';

// ============================================================================
// CONFIGURAÇÕES
// ============================================================================

/** Intervalo de verificação de integridade (ms) */
const INTEGRITY_CHECK_INTERVAL = 15000; // 15 segundos

/** Intervalo de verificação de DevTools (ms) */
const DEVTOOLS_CHECK_INTERVAL = 30000; // 30 segundos

/** Instância global do audit trail (singleton) */
const auditTrail = new AuditTrail('efvm360-audit-trail', 2000);

// ============================================================================
// INTERFACE
// ============================================================================

interface UseBlindagemReturn {
  /** Estado de integridade do runtime */
  runtimeIntegro: boolean;
  /** Alertas de integridade detectados */
  alertasIntegridade: string[];
  /** DevTools detectada como aberta */
  devToolsAberta: boolean;
  /** Registrar evento de auditoria */
  registrarAuditoria: (acao: AuditAction, recurso: string, detalhes?: string) => Promise<void>;
  /** Verificar integridade da chain de auditoria */
  verificarAuditChain: () => Promise<boolean>;
  /** Exportar trail de auditoria */
  exportarAuditTrail: () => string;
  /** Total de eventos no trail */
  totalEventosAudit: number;
}

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

export function useBlindagem(usuario: Usuario | null, onTamperingForceLogout?: () => void): UseBlindagemReturn {
  const [runtimeIntegro, setRuntimeIntegro] = useState(true);
  const [alertasIntegridade, setAlertasIntegridade] = useState<string[]>([]);
  const [devToolsAberta, setDevToolsAberta] = useState(false);
  const [totalEventosAudit, setTotalEventosAudit] = useState(0);

  const integrityMonitorRef = useRef<IntegrityMonitor | null>(null);
  const devToolsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const matriculaRef = useRef(usuario?.matricula || 'sistema');

  // Atualiza ref quando usuário muda
  useEffect(() => {
    matriculaRef.current = usuario?.matricula || 'sistema';
  }, [usuario?.matricula]);

  // ========== 1. VERIFICAÇÃO DE INTEGRIDADE DE RUNTIME ==========
  useEffect(() => {
    const resultado = verificarIntegridadeRuntime();
    setRuntimeIntegro(resultado.integro);
    setAlertasIntegridade(resultado.alertas);

    if (!resultado.integro) {
      secureLog.warn('⚠️ Integridade de runtime comprometida:', resultado.alertas);
      // Registra no audit trail
      auditTrail.registrar(
        matriculaRef.current,
        'INTEGRIDADE_FALHOU',
        'runtime',
        resultado.alertas.join('; ')
      );
    } else {
      secureLog.info('✅ Integridade de runtime verificada');
    }
  }, [onTamperingForceLogout]);

  // ========== 2. INTEGRITY MONITOR (storage fingerprint) ==========
  useEffect(() => {
    const monitor = new IntegrityMonitor();
    integrityMonitorRef.current = monitor;

    monitor.iniciar(() => {
      secureLog.warn('⚠️ Storage fingerprint alterado externamente');
      auditTrail.registrar(
        matriculaRef.current,
        'TAMPERING_DETECTADO',
        'localStorage',
        'Fingerprint de storage alterado fora do fluxo normal'
      );
      // R3: Forçar logout ao detectar tampering
      if (onTamperingForceLogout) {
        secureLog.warn('🔒 Tampering detectado — forçando logout');
        onTamperingForceLogout();
      }
    }, INTEGRITY_CHECK_INTERVAL);

    return () => {
      monitor.parar();
    };
  }, [onTamperingForceLogout]);

  // ========== 3. DEVTOOLS DETECTION ==========
  useEffect(() => {
    // Verificação periódica (não-bloqueante)
    devToolsIntervalRef.current = setInterval(() => {
      const resultado = detectarDevTools();
      if (resultado.aberta && !devToolsAberta) {
        setDevToolsAberta(true);
        secureLog.warn('🔍 DevTools detectada:', resultado.metodo);
        auditTrail.registrar(
          matriculaRef.current,
          'DEVTOOLS_DETECTADO',
          'navegador',
          `Método: ${resultado.metodo}`
        );
      } else if (!resultado.aberta && devToolsAberta) {
        setDevToolsAberta(false);
      }
    }, DEVTOOLS_CHECK_INTERVAL);

    return () => {
      if (devToolsIntervalRef.current) {
        clearInterval(devToolsIntervalRef.current);
      }
    };
  }, [devToolsAberta]);

  // ========== 4. CONTAGEM DE EVENTOS ==========
  useEffect(() => {
    setTotalEventosAudit(auditTrail.getEntries().length);
  }, []);

  // ========== FUNÇÕES EXPOSTAS ==========

  /** Registra evento de auditoria com chain integrity */
  const registrarAuditoria = useCallback(async (
    acao: AuditAction,
    recurso: string,
    detalhes?: string,
  ) => {
    await auditTrail.registrar(matriculaRef.current, acao, recurso, detalhes);
    // Atualiza fingerprint do monitor após escrita legítima
    if (integrityMonitorRef.current) {
      await integrityMonitorRef.current.atualizarFingerprint();
    }
    setTotalEventosAudit(auditTrail.getEntries().length);
  }, []);

  /** Verifica integridade da chain de auditoria */
  const verificarAuditChain = useCallback(async (): Promise<boolean> => {
    const resultado = await auditTrail.verificarIntegridade();
    if (!resultado.integro) {
      secureLog.warn('⚠️ Chain de auditoria quebrada na posição:', resultado.quebradoEm);
    }
    return resultado.integro;
  }, []);

  /** Exporta trail de auditoria (JSON) */
  const exportarAuditTrail = useCallback((): string => {
    return auditTrail.exportar();
  }, []);

  return {
    runtimeIntegro,
    alertasIntegridade,
    devToolsAberta,
    registrarAuditoria,
    verificarAuditChain,
    exportarAuditTrail,
    totalEventosAudit,
  };
}
