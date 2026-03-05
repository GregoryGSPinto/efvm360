// ============================================================================
// VFZ Backend — Risk Grades Controller
// CRUD for operational risk matrix (5x5 probability x impact)
// ============================================================================

import { Request, Response } from 'express';
import sequelize from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export const list = async (req: Request, res: Response): Promise<void> => {
  try {
    const { grade, active } = req.query;
    let where = 'WHERE 1=1';
    const replacements: unknown[] = [];

    if (grade) {
      where += ' AND grade = ?';
      replacements.push(grade);
    }
    if (active !== undefined) {
      where += ' AND active = ?';
      replacements.push(active === 'true' ? 1 : 0);
    }

    const [rows] = await sequelize.query(
      `SELECT uuid, description, probability, impact, grade, mitigation, nr_reference, active, created_at, updated_at FROM risk_grades ${where} ORDER BY probability * impact DESC`,
      { replacements },
    );

    res.json({ riskGrades: rows });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro ao listar graus de risco' });
  }
};

export const getByUuid = async (req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await sequelize.query(
      'SELECT uuid, description, probability, impact, grade, mitigation, nr_reference, active, created_at, updated_at FROM risk_grades WHERE uuid = ? LIMIT 1',
      { replacements: [req.params.uuid] },
    );
    const rg = (rows as Record<string, unknown>[])[0];
    if (!rg) {
      res.status(404).json({ error: 'Grau de risco não encontrado' });
      return;
    }
    res.json(rg);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro ao obter grau de risco' });
  }
};

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const { description, probability, impact, grade, mitigation, nr_reference } = req.body;
    const uuid = uuidv4();
    const now = new Date();

    await sequelize.query(
      `INSERT INTO risk_grades (uuid, description, probability, impact, grade, mitigation, nr_reference, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, true, ?, ?)`,
      { replacements: [uuid, description, probability, impact, grade, mitigation, nr_reference || null, now, now] },
    );

    res.status(201).json({ uuid, description, grade });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro ao criar grau de risco' });
  }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const { uuid } = req.params;
    const fields: string[] = [];
    const values: unknown[] = [];

    for (const key of ['description', 'probability', 'impact', 'grade', 'mitigation', 'nr_reference', 'active']) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(req.body[key]);
      }
    }

    if (fields.length === 0) {
      res.status(400).json({ error: 'Nenhum campo para atualizar' });
      return;
    }

    fields.push('updated_at = ?');
    values.push(new Date());
    values.push(uuid);

    const [, meta] = await sequelize.query(
      `UPDATE risk_grades SET ${fields.join(', ')} WHERE uuid = ?`,
      { replacements: values },
    );

    if ((meta as { affectedRows?: number }).affectedRows === 0) {
      res.status(404).json({ error: 'Grau de risco não encontrado' });
      return;
    }

    res.json({ message: 'Grau de risco atualizado' });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro ao atualizar grau de risco' });
  }
};
