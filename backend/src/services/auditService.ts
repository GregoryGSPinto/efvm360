// ============================================================================
// EFVM360 Backend — Serviço de Auditoria (Append-Only + Chain Integrity)
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { AuditTrail } from '../models';
import { hashAuditEntry } from '../utils/crypto';
import sequelize from '../config/database';

interface AuditEntry {
  matricula: string;
  acao: string;
  recurso: string;
  detalhes?: string;
  usuarioId?: number;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Registra evento no audit trail (append-only)
 * Cada entrada recebe o hash da entrada anterior (chain integrity)
 */
export const registrar = async (entry: AuditEntry): Promise<void> => {
  try {
    // Busca hash do último registro
    const [rows] = await sequelize.query(
      'SELECT hash_registro FROM audit_trail ORDER BY id DESC LIMIT 1'
    ) as [Array<{ hash_registro: string }>, unknown];

    const hashAnterior = rows.length > 0 ? rows[0].hash_registro : null;

    const timestamp = new Date().toISOString();
    const hashRegistro = hashAuditEntry(
      {
        matricula: entry.matricula,
        acao: entry.acao,
        recurso: entry.recurso,
        detalhes: entry.detalhes,
        timestamp,
      },
      hashAnterior
    );

    await AuditTrail.create({
      uuid: uuidv4(),
      usuario_id: entry.usuarioId || null,
      matricula: entry.matricula,
      acao: entry.acao,
      recurso: entry.recurso,
      detalhes: entry.detalhes || null,
      ip_address: entry.ipAddress || null,
      user_agent: entry.userAgent || null,
      hash_anterior: hashAnterior,
      hash_registro: hashRegistro,
    });
  } catch (error) {
    console.error('[EFVM360-AUDIT] Erro ao registrar:', error);
    // Auditoria nunca deve bloquear a operação
  }
};

/**
 * Verifica integridade da cadeia de auditoria
 * Retorna true se toda a cadeia é válida
 */
export const verificarIntegridade = async (): Promise<{
  valida: boolean;
  totalRegistros: number;
  registrosVerificados: number;
  primeiroInvalido?: number;
}> => {
  const registros = await AuditTrail.findAll({
    order: [['id', 'ASC']],
    attributes: ['id', 'matricula', 'acao', 'recurso', 'detalhes', 'hash_anterior', 'hash_registro', 'created_at'],
  });

  let hashAnterior: string | null = null;
  let registrosVerificados = 0;

  for (const reg of registros) {
    const createdAt = reg.getDataValue('created_at');
    const timestamp = createdAt instanceof Date ? createdAt.toISOString() : String(createdAt || '');
    const hashEsperado = hashAuditEntry(
      {
        matricula: reg.matricula,
        acao: reg.acao,
        recurso: reg.recurso,
        detalhes: reg.detalhes || undefined,
        timestamp,
      },
      hashAnterior
    );

    // Verifica chain link
    if (reg.hash_anterior !== hashAnterior) {
      return {
        valida: false,
        totalRegistros: registros.length,
        registrosVerificados,
        primeiroInvalido: reg.id,
      };
    }

    // Verifica hash do registro
    if (reg.hash_registro !== hashEsperado) {
      return {
        valida: false,
        totalRegistros: registros.length,
        registrosVerificados,
        primeiroInvalido: reg.id,
      };
    }

    hashAnterior = reg.hash_registro;
    registrosVerificados++;
  }

  return {
    valida: true,
    totalRegistros: registros.length,
    registrosVerificados,
  };
};

/**
 * Busca registros de auditoria com filtros
 */
export const buscar = async (filtros: {
  matricula?: string;
  acao?: string;
  recurso?: string;
  dataInicio?: string;
  dataFim?: string;
  limit?: number;
  offset?: number;
}): Promise<{ registros: AuditTrail[]; total: number }> => {
  const where: Record<string, unknown> = {};

  if (filtros.matricula) where.matricula = filtros.matricula;
  if (filtros.acao) where.acao = filtros.acao;
  if (filtros.recurso) where.recurso = filtros.recurso;

  if (filtros.dataInicio || filtros.dataFim) {
    const range: Record<string, Date> = {};
    if (filtros.dataInicio) range[Op.gte as unknown as string] = new Date(filtros.dataInicio);
    if (filtros.dataFim) range[Op.lte as unknown as string] = new Date(filtros.dataFim);
    where.created_at = range;
  }

  const { count, rows } = await AuditTrail.findAndCountAll({
    where,
    order: [['id', 'DESC']],
    limit: filtros.limit || 50,
    offset: filtros.offset || 0,
  });

  return { registros: rows, total: count };
};

/**
 * Sincroniza audit trail do frontend (importação de registros locais)
 */
export const sincronizar = async (
  registros: Array<{
    matricula: string;
    acao: string;
    recurso: string;
    detalhes?: string;
    timestamp: string;
  }>
): Promise<{ importados: number; duplicados: number }> => {
  let importados = 0;
  let duplicados = 0;

  for (const reg of registros) {
    try {
      await registrar({
        matricula: reg.matricula,
        acao: reg.acao,
        recurso: reg.recurso,
        detalhes: `[SYNC-FE] ${reg.detalhes || ''} | ts_original: ${reg.timestamp}`,
      });
      importados++;
    } catch {
      duplicados++;
    }
  }

  return { importados, duplicados };
};
