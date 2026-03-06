// ============================================================================
// EFVM360 Backend — Equipment Controller
// CRUD for operational equipment inventory
// ============================================================================

import { Request, Response } from 'express';
import sequelize from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export const list = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, status, yard_code } = req.query;
    let where = 'WHERE 1=1';
    const replacements: string[] = [];

    if (category) {
      where += ' AND category = ?';
      replacements.push(category as string);
    }
    if (status) {
      where += ' AND status = ?';
      replacements.push(status as string);
    }
    if (yard_code) {
      where += ' AND yard_code = ?';
      replacements.push(yard_code as string);
    }

    const [rows] = await sequelize.query(
      `SELECT uuid, name, category, criticality, min_quantity_per_shift, current_quantity, status, yard_code, created_at, updated_at FROM equipment ${where} ORDER BY category, name`,
      { replacements },
    );

    res.json({ equipment: rows });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro ao listar equipamentos' });
  }
};

export const getByUuid = async (req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await sequelize.query(
      'SELECT uuid, name, category, criticality, min_quantity_per_shift, current_quantity, status, yard_code, created_at, updated_at FROM equipment WHERE uuid = ? LIMIT 1',
      { replacements: [req.params.uuid] },
    );
    const equipment = (rows as Record<string, unknown>[])[0];
    if (!equipment) {
      res.status(404).json({ error: 'Equipamento não encontrado' });
      return;
    }
    res.json(equipment);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro ao obter equipamento' });
  }
};

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, category, criticality, min_quantity_per_shift, current_quantity, yard_code } = req.body;
    const uuid = uuidv4();
    const now = new Date();

    await sequelize.query(
      `INSERT INTO equipment (uuid, name, category, criticality, min_quantity_per_shift, current_quantity, status, yard_code, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'operational', ?, ?, ?)`,
      { replacements: [uuid, name, category, criticality || 'medium', min_quantity_per_shift || 1, current_quantity || 0, yard_code || null, now, now] },
    );

    res.status(201).json({ uuid, name, category, status: 'operational' });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro ao criar equipamento' });
  }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const { uuid } = req.params;
    const fields: string[] = [];
    const values: unknown[] = [];

    for (const key of ['name', 'category', 'criticality', 'min_quantity_per_shift', 'current_quantity', 'status', 'yard_code']) {
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
      `UPDATE equipment SET ${fields.join(', ')} WHERE uuid = ?`,
      { replacements: values },
    );

    if ((meta as { affectedRows?: number }).affectedRows === 0) {
      res.status(404).json({ error: 'Equipamento não encontrado' });
      return;
    }

    res.json({ message: 'Equipamento atualizado' });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro ao atualizar equipamento' });
  }
};
