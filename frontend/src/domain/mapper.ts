// ============================================================================
// EFVM360 — Domain Mapper
// Anti-Corruption Layer: internal types ↔ domain contract
// ============================================================================
//
// WHY:
//   Componentes internos usam DadosFormulario, CabecalhoPassagem, etc.
//   A API pública e integrações externas usam ServicePass, ShiftState, etc.
//
//   Este mapper converte entre os dois mundos.
//   Se refatorarmos os tipos internos, o contrato externo não quebra.
//   Se o contrato evolui (v2), mapeamos aqui sem tocar nos componentes.
//
// ============================================================================

import type {
  ServicePass, ShiftState, YardCondition, OperationalEvent,
  OperatorSignature, TrackCondition, TrackSwitch,
  Equipment, SafetyCheckItem,
  RiskAlert, SafetySummary,
  ShiftComparison,
} from './contracts';

import {
  TrackStatus, SwitchPosition, ShiftLetter, ShiftWindow,
  ShuntingType, RestrictionType, Severity, SyncStatus,
  ValidationStatus,
} from './contracts';

import type {
  DadosFormulario, LinhaPatio, Equipamento,
  AlertaIA, ComparacaoTurnos, ResumoSeguranca,
  AnaliseOperacional,
} from '../types';


// ── To Domain Contract ──────────────────────────────────────────────────

/** DadosFormulario → ServicePass */
export function toServicePass(
  dados: DadosFormulario,
  id: string,
  syncStatus: SyncStatus = SyncStatus.DRAFT,
): ServicePass {
  return {
    id,
    shift: toShiftState(dados),
    yard: toYardCondition(dados),
    events: toOperationalEvent(dados),
    risks: {
      alerts: [],
      criticalAlerts: [],
      warningAlerts: [],
      operationalAnalysis: null,
      safetySummary: {
        hasCriticalShunting: false,
        hasRestrictions: false,
        trackClear: false,
        communicationConfirmed: false,
        riskScore: 0,
      },
      shiftComparisons: [],
      riskScore: 0,
      validations: [],
      recommendations: [],
    },
    outgoingSignature: toSignature(dados.assinaturas.sai),
    incomingSignature: toSignature(dados.assinaturas.entra),
    attentionPoints: Array.isArray(dados.pontosAtencao)
      ? dados.pontosAtencao.join('\n')
      : String(dados.pontosAtencao || ''),
    syncStatus,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    housekeeping5S: dados.sala5s || undefined,
    maturityLevel5S: dados.maturidade5S as (1|2|3|4|5|null) ?? null,
  };
}

/** Enrich ServicePass with computed risk data */
export function enrichWithRisks(
  pass: ServicePass,
  alertas: AlertaIA[],
  comparacoes: ComparacaoTurnos[],
  resumo: ResumoSeguranca,
  analise: AnaliseOperacional | null,
): ServicePass {
  return {
    ...pass,
    risks: {
      alerts: alertas.map(toRiskAlert),
      criticalAlerts: alertas.filter((a) => a.tipo === 'critico').map(toRiskAlert),
      warningAlerts: alertas.filter((a) => a.tipo === 'aviso').map(toRiskAlert),
      operationalAnalysis: analise ? {
        alerts: analise.alertas.map(toRiskAlert),
        validations: analise.validacoes.map((v) => ({
          field: v.campo,
          status: v.valido ? ValidationStatus.VALID : ValidationStatus.ERROR,
          message: v.mensagem,
        })),
        comparisons: analise.comparacoes.map(toShiftComparison),
        riskScore: analise.pontuacaoRisco,
        recommendations: analise.recomendacoes,
      } : null,
      safetySummary: toSafetySummary(resumo),
      shiftComparisons: comparacoes.map(toShiftComparison),
      riskScore: resumo.pontuacaoRisco,
      validations: [],
      recommendations: [],
    },
  };
}

// ── Sub-mappers ─────────────────────────────────────────────────────────

function toShiftState(dados: DadosFormulario): ShiftState {
  const cab = dados.cabecalho;
  return {
    date: cab.data || new Date().toISOString().slice(0, 10),
    dssReference: cab.dss || '',
    shiftLetter: (cab.turno as ShiftLetter) || ShiftLetter.A,
    shiftWindow: cab.horario === '19-07' ? ShiftWindow.NIGHT : ShiftWindow.DAY,
    stations: dados.postos
      ? Object.entries(dados.postos).map(([key, posto]) => ({
          id: key,
          name: key.replace(/([A-Z])/g, ' $1').trim(),
          personnel: Array.isArray((posto as { pessoal?: unknown[] }).pessoal)
            ? ((posto as { pessoal: { nome: string; funcao: string }[] }).pessoal).map((p) => ({
                name: p.nome,
                role: p.funcao,
              }))
            : [],
        }))
      : [],
  };
}

function toYardCondition(dados: DadosFormulario): YardCondition {
  return {
    upperYardTracks: dados.patioCima.map(toTrackCondition),
    lowerYardTracks: dados.patioBaixo.map(toTrackCondition),
    layout: {
      switches: dados.layoutPatio.amvs.map(toTrackSwitch),
    },
    equipment: dados.equipamentos.map(toEquipment),
    upperYardInspection: {
      type: dados.conferenciaCima?.tipo ?? null,
      observation: dados.conferenciaCima?.observacao || '',
      inspected: dados.confirmacoesConferencia?.patioCima || false,
    },
    lowerYardInspection: {
      type: dados.conferenciaBaixo?.tipo ?? null,
      observation: dados.conferenciaBaixo?.observacao || '',
      inspected: dados.confirmacoesConferencia?.patioBaixo || false,
    },
  };
}

function toOperationalEvent(dados: DadosFormulario): OperationalEvent {
  const seg = dados.segurancaManobras;
  const toSafetyItem = (item: unknown): SafetyCheckItem => {
    if (typeof item === 'object' && item !== null && 'resposta' in item) {
      const typed = item as { resposta: boolean | null; observacao: string };
      return { response: typed.resposta, observation: typed.observacao || '' };
    }
    return { response: item as boolean | null, observation: '' };
  };

  return {
    intervention: {
      occurred: dados.intervencoes.temIntervencao,
      description: dados.intervencoes.descricao,
      location: dados.intervencoes.local,
    },
    criticalShunting: toSafetyItem(seg.houveManobras),
    shuntingType: (seg.tipoManobra as ShuntingType) || ShuntingType.NONE,
    shuntingLocation: seg.localManobra || '',
    brakesVerified: toSafetyItem(seg.freiosVerificados),
    brakeInspection: {
      type: seg.freios?.automatico ? 'automatico' : seg.freios?.independente ? 'independente' : seg.freios?.manuaisCalcos ? 'manuaisCalcos' : '',
      quantity: 0,
      result: seg.freios?.naoAplicavel ? 'N/A' : 'verificado',
    },
    criticalPoint: toSafetyItem(seg.pontoCritico),
    criticalPointDescription: seg.pontoCriticoDescricao || '',
    trackClear: toSafetyItem(seg.linhaLivre),
    trackClearDescription: seg.linhaLimpaDescricao || '',
    communicationCompleted: toSafetyItem(seg.comunicacaoRealizada),
    communication: {
      ccoNotified: seg.comunicacao?.ccoCpt || false,
      dispatchNotified: seg.comunicacao?.oof || false,
      description: seg.comunicacao?.operadorSilo ? 'Operador silo notificado' : '',
    },
    activeRestriction: toSafetyItem(seg.restricaoAtiva),
    restrictionLocation: seg.restricaoLocal || '',
    restrictionType: (seg.restricaoTipo as RestrictionType) || RestrictionType.NONE,
  };
}

function toTrackCondition(linha: LinhaPatio): TrackCondition {
  return {
    trackId: linha.linha,
    trainPrefix: linha.prefixo,
    wagonCount: linha.vagoes,
    description: linha.descricao,
    status: linha.status as TrackStatus,
  };
}

function toTrackSwitch(amv: { posicao: string; observacao: string }): TrackSwitch {
  return {
    switchId: '',
    position: amv.posicao === 'reversa' ? SwitchPosition.REVERSE : SwitchPosition.NORMAL,
    observation: amv.observacao || '',
  };
}

function toEquipment(eq: Equipamento): Equipment {
  return {
    name: eq.nome,
    quantity: eq.quantidade,
    operational: eq.emCondicoes,
    observation: eq.observacao,
  };
}

function toSignature(assinatura: { nome: string; matricula: string; confirmado: boolean; dataHora?: string; hashIntegridade?: string }): OperatorSignature {
  return {
    name: assinatura.nome,
    matricula: assinatura.matricula,
    confirmed: assinatura.confirmado,
    signedAt: assinatura.dataHora,
    integrityHash: assinatura.hashIntegridade,
  };
}

function toRiskAlert(alerta: AlertaIA): RiskAlert {
  const severityMap: Record<string, Severity> = {
    critico: Severity.CRITICAL,
    aviso: Severity.WARNING,
    info: Severity.INFO,
  };
  return {
    severity: severityMap[alerta.tipo] || Severity.INFO,
    section: alerta.secao,
    message: alerta.mensagem,
    field: alerta.campo,
    recommendedAction: alerta.acao,
  };
}

function toShiftComparison(comp: ComparacaoTurnos): ShiftComparison {
  return {
    field: comp.campo,
    previousValue: comp.valorAnterior,
    currentValue: comp.valorAtual,
    criticalChange: comp.mudancaCritica,
    description: comp.descricao,
  };
}

function toSafetySummary(resumo: ResumoSeguranca): SafetySummary {
  return {
    hasCriticalShunting: resumo.temManobrasCriticas,
    hasRestrictions: resumo.temRestricoes,
    trackClear: resumo.linhaLiberada,
    communicationConfirmed: resumo.comunicacaoConfirmada,
    riskScore: resumo.pontuacaoRisco,
  };
}

// ── From Domain Contract (server → client) ──────────────────────────────

/** ServicePass → DadosFormulario (for rendering in existing components) */
export function fromServicePass(pass: ServicePass): DadosFormulario {
  return {
    cabecalho: {
      data: pass.shift.date,
      dss: pass.shift.dssReference,
      turno: pass.shift.shiftLetter,
      horario: pass.shift.shiftWindow,
    },
    postos: {} as DadosFormulario['postos'],
    patioCima: pass.yard.upperYardTracks.map(fromTrackCondition),
    patioBaixo: pass.yard.lowerYardTracks.map(fromTrackCondition),
    conferenciaCima: {
      tipo: pass.yard.upperYardInspection.type,
      observacao: pass.yard.upperYardInspection.observation,
    } as DadosFormulario['conferenciaCima'],
    conferenciaBaixo: {
      tipo: pass.yard.lowerYardInspection.type,
      observacao: pass.yard.lowerYardInspection.observation,
    } as DadosFormulario['conferenciaBaixo'],
    layoutPatio: {
      amvs: pass.yard.layout.switches.map((sw) => ({
        posicao: sw.position as string,
        observacao: sw.observation,
      })),
    } as DadosFormulario['layoutPatio'],
    pontosAtencao: pass.attentionPoints ? pass.attentionPoints.split('\n') : [],
    intervencoes: {
      temIntervencao: pass.events.intervention.occurred,
      descricao: pass.events.intervention.description,
      local: pass.events.intervention.location,
    },
    equipamentos: pass.yard.equipment.map(fromEquipment),
    sala5s: pass.housekeeping5S || '',
    maturidade5S: pass.maturityLevel5S ?? null,
    confirmacoesConferencia: {
      patioCima: pass.yard.upperYardInspection.inspected,
      patioBaixo: pass.yard.lowerYardInspection.inspected,
    },
    segurancaManobras: fromOperationalEvent(pass.events),
    assinaturas: {
      sai: fromSignature(pass.outgoingSignature),
      entra: fromSignature(pass.incomingSignature),
    },
  };
}

function fromTrackCondition(tc: TrackCondition): LinhaPatio {
  return { linha: tc.trackId, prefixo: tc.trainPrefix, vagoes: tc.wagonCount, descricao: tc.description, status: tc.status as LinhaPatio['status'] };
}

function fromEquipment(eq: Equipment): Equipamento {
  return { nome: eq.name, quantidade: eq.quantity, emCondicoes: eq.operational, observacao: eq.observation };
}

function fromSignature(sig: OperatorSignature) {
  return { nome: sig.name, matricula: sig.matricula, confirmado: sig.confirmed, dataHora: sig.signedAt, hashIntegridade: sig.integrityHash };
}

function fromOperationalEvent(ev: OperationalEvent): DadosFormulario['segurancaManobras'] {
  const fromSafety = (item: SafetyCheckItem) => ({ resposta: item.response, observacao: item.observation });
  return {
    houveManobras: fromSafety(ev.criticalShunting),
    tipoManobra: ev.shuntingType as string,
    localManobra: ev.shuntingLocation,
    freiosVerificados: fromSafety(ev.brakesVerified),
    freios: {
      automatico: ev.brakeInspection.type === 'automatico',
      independente: ev.brakeInspection.type === 'independente',
      manuaisCalcos: ev.brakeInspection.type === 'manuaisCalcos',
      naoAplicavel: ev.brakeInspection.result === 'N/A',
    },
    pontoCritico: fromSafety(ev.criticalPoint),
    pontoCriticoDescricao: ev.criticalPointDescription,
    linhaLivre: fromSafety(ev.trackClear),
    linhaLimpaDescricao: ev.trackClearDescription,
    comunicacaoRealizada: fromSafety(ev.communicationCompleted),
    comunicacao: {
      ccoCpt: ev.communication.ccoNotified,
      oof: ev.communication.dispatchNotified,
      operadorSilo: ev.communication.description !== '',
    },
    restricaoAtiva: fromSafety(ev.activeRestriction),
    restricaoLocal: ev.restrictionLocation,
    restricaoTipo: ev.restrictionType as string,
  } as DadosFormulario['segurancaManobras'];
}
