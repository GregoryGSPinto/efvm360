// ============================================================================
// EFVM360 Backend — Swagger / OpenAPI 3.0.3 Configuration
// ============================================================================

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const swaggerDefinition: swaggerJsdoc.OAS3Definition = {
  openapi: '3.0.3',
  info: {
    title: 'EFVM360 API',
    version: '1.0.0',
    description:
      'API REST para o sistema EFVM360 — Gestao de Troca de Turno Ferroviaria (EFVM). ' +
      'Autenticacao via JWT Bearer Token. Suporte a operacoes offline-first com sincronizacao em batch.',
    contact: {
      name: 'Equipe EFVM360',
    },
    license: {
      name: 'Proprietary',
    },
  },
  servers: [
    {
      url: 'http://localhost:3001/api/v1',
      description: 'Desenvolvimento local',
    },
  ],
  tags: [
    { name: 'Auth', description: 'Autenticacao e gerenciamento de sessao' },
    { name: 'Passagens', description: 'Passagens de servico (troca de turno)' },
    { name: 'Audit', description: 'Trilha de auditoria e integridade' },
    { name: 'Usuarios', description: 'Gestao de usuarios (CRUD)' },
    { name: 'LGPD', description: 'Direitos do titular (Lei Geral de Protecao de Dados)' },
    { name: 'Patios', description: 'Cadastro e gestao de patios ferroviarios' },
    { name: 'Sync', description: 'Sincronizacao offline-first em batch' },
    { name: 'Health', description: 'Health check e diagnosticos' },
    { name: 'DSS', description: 'Dialogo de Seguranca e Saude' },
    { name: 'BI', description: 'Dashboard e KPIs operacionais' },
    { name: 'Gestao', description: 'Aprovacoes de cadastros e resets de senha' },
    { name: 'AdamBoot', description: 'Proficiency tracking (gamificacao)' },
    { name: 'Config', description: 'Preferencias do usuario' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT obtido via POST /auth/login',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string', description: 'Mensagem de erro' },
          code: { type: 'string', description: 'Codigo de erro interno' },
        },
        required: ['error'],
        example: {
          error: 'Nao autenticado',
          code: 'AUTH_ERROR',
        },
      },
      LoginRequest: {
        type: 'object',
        properties: {
          matricula: {
            type: 'string',
            description: 'Matricula EFVM (ex: VFZ1001, P63001)',
            pattern: '^(VFZ|VBR|VCS|VTO|P6|ADM|SUP)\\d{4}$',
          },
          senha: {
            type: 'string',
            description: 'Senha do usuario (min 6 caracteres)',
            minLength: 6,
          },
        },
        required: ['matricula', 'senha'],
        example: {
          matricula: 'VFZ1001',
          senha: 'minhaSenha123',
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          accessToken: { type: 'string', description: 'JWT access token' },
          refreshToken: { type: 'string', description: 'Refresh token para renovacao' },
          expiresIn: { type: 'number', description: 'Tempo de expiracao em segundos' },
          user: { $ref: '#/components/schemas/UserResponse' },
        },
        required: ['accessToken', 'refreshToken', 'user'],
      },
      UserResponse: {
        type: 'object',
        properties: {
          uuid: { type: 'string', format: 'uuid' },
          nome: { type: 'string' },
          matricula: { type: 'string' },
          funcao: {
            type: 'string',
            enum: [
              'operador', 'maquinista', 'oficial', 'oficial_operacao',
              'inspetor', 'gestor', 'supervisor', 'coordenador',
              'administrador', 'admin', 'suporte',
            ],
          },
          turno: { type: 'string', enum: ['A', 'B', 'C', 'D'], nullable: true },
          ativo: { type: 'boolean' },
        },
        example: {
          uuid: '550e8400-e29b-41d4-a716-446655440000',
          nome: 'Joao Silva',
          matricula: 'VFZ1001',
          funcao: 'operador',
          turno: 'A',
          ativo: true,
        },
      },
      PassagemInput: {
        type: 'object',
        properties: {
          uuid: { type: 'string', format: 'uuid', description: 'UUID para atualizar passagem existente (opcional)' },
          cabecalho: {
            type: 'object',
            properties: {
              data: { type: 'string', format: 'date', description: 'Data da passagem' },
              turno: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
              horario: { type: 'string', description: 'Horario do turno (ex: 07:00-19:00)' },
              dss: { type: 'string', nullable: true },
            },
            required: ['data', 'turno'],
          },
          patioCima: { type: 'array', items: { type: 'object' } },
          patioBaixo: { type: 'array', items: { type: 'object' } },
          equipamentos: { type: 'object', nullable: true },
          segurancaManobras: { type: 'object', nullable: true },
          pontosAtencao: { type: 'object', nullable: true },
          intervencoes: { type: 'object', nullable: true },
          sala5s: { type: 'object', nullable: true },
          assinaturas: {
            type: 'object',
            properties: {
              sai: {
                type: 'object',
                properties: {
                  matricula: { type: 'string' },
                  confirmado: { type: 'boolean' },
                  hashIntegridade: { type: 'string' },
                },
              },
              entra: {
                type: 'object',
                properties: {
                  matricula: { type: 'string' },
                  confirmado: { type: 'boolean' },
                  hashIntegridade: { type: 'string' },
                },
              },
            },
          },
        },
        required: ['cabecalho'],
      },
      PassagemResponse: {
        type: 'object',
        properties: {
          uuid: { type: 'string', format: 'uuid' },
          status: {
            type: 'string',
            enum: ['rascunho', 'assinado_parcial', 'assinado_completo', 'sincronizada'],
          },
          hashIntegridade: { type: 'string', description: 'Hash SHA-256 de integridade' },
          message: { type: 'string' },
        },
        example: {
          uuid: '550e8400-e29b-41d4-a716-446655440000',
          status: 'rascunho',
          hashIntegridade: 'a1b2c3d4e5f6...',
          message: 'Passagem salva com sucesso',
        },
      },
      AuditEntry: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          matricula: { type: 'string' },
          acao: {
            type: 'string',
            description: 'Tipo de acao auditada',
            enum: [
              'LOGIN', 'LOGIN_FALHA', 'LOGOUT', 'SENHA_ALTERADA',
              'PASSAGEM_CRIADA', 'PASSAGEM_ASSINADA',
              'USUARIO_CRIADO', 'USUARIO_EDITADO',
              'INTEGRIDADE_VERIFICADA', 'SYNC', 'SYNC_PASSAGEM',
            ],
          },
          recurso: { type: 'string' },
          detalhes: { type: 'string', nullable: true },
          ipAddress: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
};

const options: swaggerJsdoc.OAS3Options = {
  definition: swaggerDefinition,
  apis: [
    './src/controllers/*.ts',
    './src/routes/*.ts',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

/**
 * Mounts Swagger UI at /api/docs and the raw JSON spec at /api/docs/json.
 */
export function setupSwagger(app: Express): void {
  // Serve the raw OpenAPI JSON spec
  app.get('/api/docs/json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Serve Swagger UI
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'EFVM360 API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      tagsSorter: 'alpha',
    },
  }));

  console.info('[EFVM360] Swagger UI:   http://localhost:3001/api/docs');
  console.info('[EFVM360] Swagger JSON:  http://localhost:3001/api/docs/json');
}

export { swaggerSpec };
