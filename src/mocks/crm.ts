// === CRM Types & Constants — Production Ready ===
// No demo data. Only types, enums, and interfaces.

// === РОЛИ ===
export type UserRole =
  | 'main_admin'
  | 'admin'
  | 'manager'
  | 'leader'
  | 'client'
  | 'executor'
  | 'auditor';

// === СТАТУСЫ ССЫЛОК — MVP ===
export type LinkStatusMVP =
  | 'в работе'
  | 'в карантине'
  | 'готово'
  | 'сдано'
  | 'отклонено'
  | 'удалено';

// === РАСШИРЕННЫЕ СТАТУСЫ — v2/v3 ===
export type LinkStatusExtended =
  | 'новый'
  | 'на просчёт'
  | 'просчёт выполнен'
  | 'ожидает аудита'
  | 'в аудите'
  | 'аудит выполнен'
  | 'не взято в работу'
  | 'на паузе'
  | 'деиндексировано google'
  | 'деиндексировано yandex'
  | 'деиндексировано bing'
  | 'деиндексировано yahoo'
  | 'частично деиндексировано'
  | 'вернулось'
  | 'повторно в работе'
  | 'сдано клиенту'
  | 'принято'
  | 'не принято'
  | 'согласовано'
  | 'отправлено клиенту';

export type LinkStatus = LinkStatusMVP | LinkStatusExtended;

export type WorkType = 'удаление' | 'деиндексация' | 'удаление+деиндексация';
export type TaskStatus = 'new' | 'in_progress' | 'paused' | 'done';
export type ProjectStatus = 'новый' | 'в работе' | 'на паузе' | 'завершён' | 'просрочен';
export type PaymentType = 'оплата клиента' | 'выплата исполнителю';
export type PaymentStatus = 'запланирован' | 'оплачен' | 'просрочен';
export type ClientPaymentStatus = 'unpaid' | 'partially_paid' | 'paid';
export type ExecutorPaymentStatus = 'not_accrued' | 'accrued' | 'paid_to_executor';
export type CurrencyCode = 'RUB' | 'USD' | 'EUR' | 'AED';
export type RiskLevel = 'низкий' | 'средний' | 'высокий';

// === ЦЕЛЕВЫЕ ПОИСКОВЫЕ СИСТЕМЫ ===
export interface SearchEngineFlags {
  google: boolean;
  yandex: boolean;
  bing: boolean;
  yahoo: boolean;
}

// === ПОЛЬЗОВАТЕЛЬ ===
export interface CRMUser {
  id: number;
  role: UserRole;
  login: string;
  email: string;
  fullName: string;
  language: 'ru' | 'en';
  status: 'активен' | 'заблокирован';
  alias: string | null; // для обезличивания
  /** Для роли client — привязка к CRMClient.id */
  linkedClientId?: number | null;
  isDeleted?: boolean;
}

// === КЛИЕНТ ===
export interface CRMClient {
  id: number;
  companyName: string;
  contacts: string;
  status: 'активен' | 'на паузе';
  totalDebt: number;
  currency?: CurrencyCode;
  isDeleted?: boolean;
}

// === ПРОЕКТ ===
export interface CRMProject {
  id: number;
  clientId: number;
  executorId: number | null;
  name: string;
  domain: string;
  description: string;
  totalLinks: number;
  inProgress: number;
  removed: number;
  successRate: number;
  status: ProjectStatus;
  startDate: string;
  deadline: string | null;
  manager: string;
  currency: CurrencyCode;
  source: string;
  isDeleted?: boolean;
}

// === КОММЕНТАРИЙ С ИСТОРИЕЙ ===
export interface LinkComment {
  id: number;
  author: string;
  authorRole: UserRole;
  text: string;
  createdAt: string;
}

// === ССЫЛКА (ключевой объект) ===
export interface CRMLink {
  id: number;
  url: string;
  clientId: number;
  projectId: number;
  type: WorkType;
  targetSE: SearchEngineFlags;
  status: LinkStatus;
  addedDate: string;
  startDate: string | null;
  endDate: string | null;
  deadline: string | null;
  quarantineDays: number;
  quarantineEndDate: string | null;
  executorId: number | null;
  auditorId: number | null;
  clientCost: number;
  executorCost: number;
  /** @deprecated use clientPaymentStatus — kept for migration */
  clientPaid: boolean;
  clientPaidDate: string | null;
  clientPaidAmount: number | null;
  clientPaymentStatus?: ClientPaymentStatus;
  /** @deprecated use executorPaymentStatus */
  executorPaid: boolean;
  executorPaidDate: string | null;
  executorPaidAmount: number | null;
  executorPaymentStatus?: ExecutorPaymentStatus;
  isDeleted?: boolean;
  comments: LinkComment[];
  proofsFolder: string | null;
  proofFiles: string[];
  geo?: string;
}

// === АУДИТ ===
export interface CRMAudit {
  id: number;
  linkId: number;
  removalProbability: number;      // % 20..80
  deindexProbability: number;      // % 20..80
  probability?: number;            // unified probability %
  removalDaysEstimate: number;
  deindexDaysEstimate: number;
  costPerSE: { google: number; yandex: number; bing: number; yahoo: number };
  totalCost?: number;              // unified total cost
  costMode?: 'separate' | 'total'; // pricing mode
  riskLevel: RiskLevel;
  auditDate: string;
  auditorId: number;
  notes: string;
  priority?: 'низкий' | 'средний' | 'высокий' | 'критичный';
  currency?: CurrencyCode;
  workType?: 'удаление' | 'деиндексация' | 'удаление+деиндексация';
  auditType?: 'расчет стоимости' | 'вероятность удаления' | 'поиск негатива' | 'проверка ссылки';
  auditStatus?: 'новый' | 'в работе' | 'завершён';
}

// === ПЛАТЁЖ ===
export interface CRMPayment {
  id: number;
  clientId: number | null;
  projectId: number | null;
  linkId: number | null;
  amount: number;
  currency: CurrencyCode;
  date: string;
  type: PaymentType;
  status: PaymentStatus;
  description: string;
}

// === ЗАДАЧА ИСПОЛНИТЕЛЯ ===
export interface CRMTask {
  id: number;
  projectId: number;
  projectName: string;
  linkId: number;
  url: string;
  type: WorkType;
  difficulty: number;
  deadline: string;
  status: TaskStatus;
  progress: number;
}

export interface CRMNotification {
  id: string;
  userId: number;
  role: UserRole | 'management';
  title: string;
  message: string;
  link: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'danger';
  createdAt: string;
}

export interface CRMSettings {
  notificationsEnabled: boolean;
  soundNotificationsEnabled: boolean;
  anonymizeExecutors: boolean;
  autoAuditNewLinks: boolean;
}

export const defaultCRMSettings: CRMSettings = {
  notificationsEnabled: true,
  soundNotificationsEnabled: false,
  anonymizeExecutors: false,
  autoAuditNewLinks: false,
};

export interface TopClient {
  id: number;
  name: string;
  projects: number;
  links: number;
  successRate: number;
  hasOverdue: boolean;
}

// === LEGACY CRMTask (для обратной совместимости со старыми страницами) ===
export interface CRMTaskLegacy {
  id: number;
  project: string;
  url: string;
  type: WorkType;
  difficulty: number;
  deadline: string;
  status: TaskStatus;
  progress: number;
}

// === EMPTY DATA — production ready, no demo data ===
export const mockUsers: CRMUser[] = [];
export const mockClients: CRMClient[] = [];
export const mockProjects: CRMProject[] = [];
export const mockLinks: CRMLink[] = [];
export const mockAudits: CRMAudit[] = [];
export const mockPayments: CRMPayment[] = [];
export const mockTasksLegacy: CRMTaskLegacy[] = [];
export const mockTopClients: TopClient[] = [];

export const mockClientStats = {
  totalLinks: 0,
  inProgress: 0,
  removed: 0,
  avgDays: 0,
  activeProjects: 0,
};

export const mockAdminStats = {
  totalClients: 0,
  activeClients: 0,
  projectsInWork: 0,
  linksInWork: 0,
  successRate: 0,
  avgRemovalDays: 0,
};

export const mockChartData: { date: string; removed: number; deindexed: number }[] = [];