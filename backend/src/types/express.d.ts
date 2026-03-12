// Augment Express Request with EFVM360-specific properties set by auth middleware
import type { Model } from 'sequelize';
import type { JWTPayload } from '../middleware/auth';

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
      user?: JWTPayload;
      azureUser?: Model;
      azureAdUser?: AzureADUserInfo;
      orgScope?: {
        yards: string[];
        level: string;
      };
      siteId?: string;
      userSites?: string[];
      tenantId?: string;
    }
  }
}
