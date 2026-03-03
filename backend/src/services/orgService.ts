// ============================================================================
// EFVM360 Backend — Organizational Service
// ============================================================================

import { OrganizationalTree } from '../models/OrganizationalTree';
import { UsuarioPatio } from '../models/UsuarioPatio';
import { Usuario } from '../models/index';
import { Op } from 'sequelize';

// ── Get direct subordinates ─────────────────────────────────────────────
export async function getSubordinates(matricula: string) {
  const relations = await OrganizationalTree.findAll({
    where: {
      superior_matricula: matricula,
      end_date: { [Op.or]: [null, { [Op.gte]: new Date() }] },
    },
  });

  const subordinateMatriculas = relations.map(r => r.subordinate_matricula);
  const users = await Usuario.findAll({
    where: { matricula: { [Op.in]: subordinateMatriculas } },
    attributes: ['uuid', 'nome', 'matricula', 'funcao', 'primary_yard', 'ativo'],
  });

  return relations.map(rel => {
    const user = users.find(u => u.matricula === rel.subordinate_matricula);
    return {
      id: rel.id,
      matricula: rel.subordinate_matricula,
      relationshipType: rel.relationship_type,
      startDate: rel.start_date,
      user: user ? user.toSafeJSON() : null,
    };
  });
}

// ── Get chain of superiors ──────────────────────────────────────────────
export async function getSuperiors(matricula: string) {
  const chain: Array<{ matricula: string; funcao: string; nome: string; level: number }> = [];
  let current = matricula;
  let level = 0;
  const maxDepth = 10;

  while (level < maxDepth) {
    const rel = await OrganizationalTree.findOne({
      where: {
        subordinate_matricula: current,
        end_date: { [Op.or]: [null, { [Op.gte]: new Date() }] },
        relationship_type: 'direto',
      },
    });
    if (!rel) break;

    const user = await Usuario.findOne({
      where: { matricula: rel.superior_matricula },
      attributes: ['nome', 'matricula', 'funcao', 'primary_yard'],
    });

    level++;
    chain.push({
      matricula: rel.superior_matricula,
      funcao: user?.funcao || '',
      nome: user?.nome || '',
      level,
    });
    current = rel.superior_matricula;
  }

  return chain;
}

// ── Assign subordinate to superior ──────────────────────────────────────
export async function assignSubordinate(
  subordinateMatricula: string,
  superiorMatricula: string,
  relationshipType: 'direto' | 'funcional' | 'interino' = 'direto',
) {
  // End any existing direct relationship
  await OrganizationalTree.update(
    { end_date: new Date().toISOString().split('T')[0] },
    {
      where: {
        subordinate_matricula: subordinateMatricula,
        relationship_type: relationshipType,
        end_date: null,
      },
    },
  );

  return OrganizationalTree.create({
    subordinate_matricula: subordinateMatricula,
    superior_matricula: superiorMatricula,
    relationship_type: relationshipType,
    start_date: new Date().toISOString().split('T')[0],
  });
}

// ── Remove relationship ─────────────────────────────────────────────────
export async function removeRelationship(id: number) {
  const rel = await OrganizationalTree.findByPk(id);
  if (!rel) return null;
  rel.end_date = new Date().toISOString().split('T')[0];
  await rel.save();
  return rel;
}

// ── Get user yards ──────────────────────────────────────────────────────
export async function getUserYards(matricula: string) {
  return UsuarioPatio.findAll({
    where: { matricula },
    order: [['is_primary', 'DESC']],
  });
}

// ── Assign yard to user ─────────────────────────────────────────────────
export async function assignYard(matricula: string, yardCode: string, isPrimary: boolean = false) {
  // If setting as primary, unset other primaries
  if (isPrimary) {
    await UsuarioPatio.update({ is_primary: false }, { where: { matricula } });
  }

  const [record, created] = await UsuarioPatio.findOrCreate({
    where: { matricula, yard_code: yardCode },
    defaults: { matricula, yard_code: yardCode, is_primary: isPrimary },
  });

  if (!created && isPrimary) {
    record.is_primary = true;
    await record.save();
  }

  return { record, created };
}

// ── Remove yard from user ───────────────────────────────────────────────
export async function removeYard(matricula: string, yardCode: string) {
  const deleted = await UsuarioPatio.destroy({ where: { matricula, yard_code: yardCode } });
  return deleted > 0;
}

// ── Get coordinators/supervisors for a yard ─────────────────────────
export async function getCoordinatorsForYard(yardCode: string) {
  // Find users assigned to this yard who are coordinators or supervisors
  const yardUsers = await UsuarioPatio.findAll({ where: { yard_code: yardCode } });
  const matriculas = yardUsers.map(y => y.matricula);

  if (matriculas.length === 0) return [];

  const users = await Usuario.findAll({
    where: {
      matricula: { [Op.in]: matriculas },
      funcao: { [Op.in]: ['coordenador', 'supervisor', 'gestor'] },
      ativo: true,
    },
    attributes: ['nome', 'matricula', 'funcao', 'primary_yard'],
  });

  return users.map(u => ({
    matricula: u.matricula,
    nome: u.nome,
    funcao: u.funcao,
    primaryYard: u.primary_yard,
  }));
}

// ── Resolve organizational scope (for middleware) ───────────────────────
export async function resolveScope(matricula: string, funcao: string): Promise<string[]> {
  const ALL_YARDS = ['VFZ', 'VBR', 'VCS', 'P6', 'VTO'];

  // Admin, diretor, suporte: all yards
  if (['admin', 'administrador', 'diretor', 'suporte'].includes(funcao)) {
    return ALL_YARDS;
  }

  // Gerente: all yards from subordinate coordinators
  if (funcao === 'gerente') {
    const subs = await OrganizationalTree.findAll({
      where: {
        superior_matricula: matricula,
        end_date: { [Op.or]: [null, { [Op.gte]: new Date() }] },
      },
    });
    const subMatriculas = subs.map(s => s.subordinate_matricula);
    if (subMatriculas.length === 0) return ALL_YARDS;

    const yards = await UsuarioPatio.findAll({
      where: { matricula: { [Op.in]: subMatriculas } },
    });
    const yardCodes = [...new Set(yards.map(y => y.yard_code))];
    return yardCodes.length > 0 ? yardCodes : ALL_YARDS;
  }

  // Coordenador: designated yards via usuario_patios
  if (funcao === 'coordenador') {
    const yards = await UsuarioPatio.findAll({ where: { matricula } });
    return yards.map(y => y.yard_code);
  }

  // Supervisor, gestor: own primary yard
  const yards = await UsuarioPatio.findAll({
    where: { matricula, is_primary: true },
  });
  if (yards.length > 0) return yards.map(y => y.yard_code);

  // Fallback: primary_yard from usuario
  const user = await Usuario.findOne({ where: { matricula }, attributes: ['primary_yard'] });
  return user ? [user.primary_yard] : [];
}
