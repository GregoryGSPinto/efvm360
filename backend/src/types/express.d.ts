// Augment Express Request with EFVM360-specific properties set by auth middleware
import type { Model } from 'sequelize';

interface AzureADUserInfo {
  matricula: string;
  nome: string;
  funcao: string;
  azureOid: string;
  authMethod: string;
}

declare global {
  namespace Express {
    interface Request {
      azureUser?: Model;
      azureAdUser?: AzureADUserInfo;
    }
  }
}
