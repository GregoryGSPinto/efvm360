// ============================================================================
// EFVM360 v3.2 — usePassagemSync
// Integration: connects useFormulario.salvarPassagem → SyncEngine
// ============================================================================
//
// Flow:
//   1. User clicks "Salvar" → useFormulario.salvarPassagem() → saves to localStorage
//   2. This hook intercepts → enqueues to SyncEngine (IndexedDB)
//   3. SyncEngine sends to backend when online (transparent to user)
//
// The user sees: "Passagem salva ✅" immediately (offline-first)
// Behind the scenes: SyncEngine queues and sends when possible
//
// ============================================================================

import { useCallback, useRef } from 'react';
import { syncEngine } from '../services/syncEngine';
import type { DadosFormulario } from '../types';
import { secureLog } from '../services/security';

interface UsePassagemSyncReturn {
  salvarEEnfileirar: () => Promise<{ saved: boolean; queued: boolean; syncId: string | null }>;
}

export function usePassagemSync(
  dadosFormulario: DadosFormulario,
  salvarPassagemLocal: () => boolean,
): UsePassagemSyncReturn {
  const lastSyncId = useRef<string | null>(null);

  const salvarEEnfileirar = useCallback(async () => {
    // Step 1: Save locally (existing flow — localStorage)
    const saved = salvarPassagemLocal();

    if (!saved) {
      return { saved: false, queued: false, syncId: null };
    }

    // Step 2: Enqueue for backend sync
    try {
      const syncId = await syncEngine.enqueue(
        'passagem',
        {
          cabecalho: dadosFormulario.cabecalho,
          patioCima: dadosFormulario.patioCima,
          patioBaixo: dadosFormulario.patioBaixo,
          layoutPatio: dadosFormulario.layoutPatio,
          equipamentos: dadosFormulario.equipamentos,
          segurancaManobras: dadosFormulario.segurancaManobras,
          pontosAtencao: dadosFormulario.pontosAtencao,
          intervencoes: dadosFormulario.intervencoes,
          assinaturas: dadosFormulario.assinaturas,
        },
        {
          turno: dadosFormulario.cabecalho.turno,
          data: dadosFormulario.cabecalho.dataPassagem,
        },
      );

      lastSyncId.current = syncId;
      return { saved: true, queued: true, syncId };

    } catch (err) {
      // Sync queue failed, but local save succeeded
      // This is acceptable: data is safe locally, sync will be retried
      secureLog.warn('[EFVM360 Sync] Enqueue failed, data saved locally:', err);
      return { saved: true, queued: false, syncId: null };
    }
  }, [dadosFormulario, salvarPassagemLocal]);

  return { salvarEEnfileirar };
}

export default usePassagemSync;
