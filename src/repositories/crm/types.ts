import type {
  CRMAudit,
  CRMClient,
  CRMLink,
  CRMNotification,
  CRMPayment,
  CRMProject,
  CRMSettings,
  CRMUser,
} from '@/mocks/crm';

export interface AuthUser {
  id: number;
  email: string;
  login?: string;
  password: string;
  role: string;
  name: string;
}

export interface CRMSnapshot {
  links: CRMLink[];
  projects: CRMProject[];
  clients: CRMClient[];
  payments: CRMPayment[];
  audits: CRMAudit[];
  users: CRMUser[];
  authUsers: AuthUser[];
  notifications: CRMNotification[];
  settings: CRMSettings;
}

export interface SessionUser {
  id: number;
  email: string;
  login?: string;
  role: string;
  name: string;
}

export interface CRMStorageKeys {
  links: string;
  projects: string;
  clients: string;
  payments: string;
  audits: string;
  users: string;
  authUsers: string;
  notifications: string;
  settings: string;
  sessionUser: string;
}

