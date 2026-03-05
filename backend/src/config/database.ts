// ============================================================================
// VFZ Backend — Configuração do Banco de Dados (MySQL / Azure SQL for MySQL)
// ============================================================================

import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const useSSL = process.env.DB_SSL === 'true' || isProduction;

export const sequelize = new Sequelize(
  process.env.DB_NAME || 'vfz_railway',
  process.env.DB_USER || 'vfz_app',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    dialect: 'mysql',
    logging: isProduction ? false : console.log,
    timezone: '-03:00', // Horário de Brasília (BRT)
    pool: {
      max: 20,
      min: 2,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: useSSL
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: true,
          },
        }
      : {},
    define: {
      timestamps: true,
      underscored: true, // snake_case no DB
      freezeTableName: true,
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    },
  }
);

export const testConnection = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.info('[VFZ-DB] Conexão MySQL estabelecida com sucesso');
  } catch (error) {
    console.error('[VFZ-DB] Falha na conexão MySQL:', error);
    throw error;
  }
};

export default sequelize;
