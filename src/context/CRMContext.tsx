import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type {
  CRMLink, CRMProject, CRMClient, CRMPayment, CRMAudit, CRMUser,
  CRMNotification, CRMSettings, CurrencyCode,
} from '@/mocks/crm';
import { syncLegacyPaymentFlags } from '@/lib/linkFinance';
import { isValidCurrency } from '@/lib/currency';
import { defaultProjectDeadline } from '@/lib/dateUtils';
import { COMPLETED_WORK_STATUSES } from '@/lib/linkFinance';
import { createCRMRepository } from '@/repositories/crm';
import type { AuthUser, CRMSnapshot } from '@/repositories/crm/types';
import type { AsyncSnapshotRepository } from '@/repositories/crm/CRMRepository';

interface DataIntegrityIssue {
  type:
    | 'orphan_link'
    | 'orphan_payment'
    | 'orphan_audit'
    | 'payment_without_link'
    | 'duplicate'
    | 'executor_without_tasks'
    | 'project_without_client'
    | 'link_without_executor'
    | 'duplicate_executor_url'
    | 'invalid_currency'
    | 'invalid_payment_status'
    | 'currency_mismatch'
    | 'invalid_link_status';
  severity: 'warning' | 'error';
  message: string;
  data?: unknown;
}

function migrateLink(link: CRMLink): CRMLink {
  return syncLegacyPaymentFlags({ ...link, isDeleted: link.isDeleted ?? false });
}

function migrateLinks(links: CRMLink[]): CRMLink[] {
  return links.map(migrateLink);
}

export const IS_PRODUCTION_UI = import.meta.env.PROD;

interface CRMContextValue {
  isDataLoading: boolean;
  dataLoadError: string | null;
  // Data
  links: CRMLink[];
  projects: CRMProject[];
  clients: CRMClient[];
  payments: CRMPayment[];
  audits: CRMAudit[];
  users: CRMUser[];

  // Actions
  setLinks: React.Dispatch<React.SetStateAction<CRMLink[]>>;
  setProjects: React.Dispatch<React.SetStateAction<CRMProject[]>>;
  setClients: React.Dispatch<React.SetStateAction<CRMClient[]>>;
  setPayments: React.Dispatch<React.SetStateAction<CRMPayment[]>>;
  setAudits: React.Dispatch<React.SetStateAction<CRMAudit[]>>;
  setUsers: React.Dispatch<React.SetStateAction<CRMUser[]>>;

  // Link operations
  updateLink: (link: CRMLink) => void;
  addLink: (link: Omit<CRMLink, 'id'>) => CRMLink;
  changeLinkStatus: (linkId: number, newStatus: string) => void;
  addCommentToLink: (linkId: number, text: string, author: string, authorRole: string) => void;

  // Project operations
  updateProject: (project: CRMProject) => void;
  addProject: (project: Omit<CRMProject, 'id'>) => CRMProject;
  deleteProject: (projectId: number) => void;

  // Payment operations
  addPayment: (payment: Omit<CRMPayment, 'id'>) => CRMPayment;
  addClient: (client: Omit<CRMClient, 'id'>) => CRMClient;
  markLinkClientPaid: (linkId: number, amount: number) => void;
  markLinkExecutorPaid: (linkId: number, amount: number) => void;

  // Audit operations
  addAudit: (audit: Omit<CRMAudit, 'id'>) => CRMAudit;
  updateAudit: (audit: CRMAudit) => void;

  // Integrity check
  checkIntegrity: () => DataIntegrityIssue[];

  // Reset
  resetTestEnvironment: () => void;

  // Computed
  getProjectLinks: (projectId: number) => CRMLink[];
  getClientLinks: (clientId: number) => CRMLink[];
  getExecutorLinks: (executorId: number) => CRMLink[];
  getProjectRevenue: (projectId: number) => number;
  getProjectPayouts: (projectId: number) => number;
  getLinkAudit: (linkId: number) => CRMAudit | undefined;

  // Auth
  authUsers: AuthUser[];
  setAuthUsers: React.Dispatch<React.SetStateAction<AuthUser[]>>;
  addAuthUser: (user: Omit<AuthUser, 'id'>) => AuthUser;

  // Notifications & settings
  notifications: CRMNotification[];
  settings: CRMSettings;
  setSettings: React.Dispatch<React.SetStateAction<CRMSettings>>;
  pushNotification: (n: Omit<CRMNotification, 'id' | 'createdAt' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (userId: number) => void;
  getNotificationsForUser: (userId: number, role: string) => CRMNotification[];

  getProjectCurrency: (projectId: number) => CurrencyCode;
  softDeleteUser: (userId: number) => void;
}

const CRMContext = createContext<CRMContextValue | null>(null);

export function CRMProvider({ children }: { children: React.ReactNode }) {
  const repository = useMemo(() => createCRMRepository(), []);
  const initialSnapshot = useMemo<CRMSnapshot>(() => repository.loadSnapshot(), [repository]);
  const isAsyncRepository = useMemo(
    () =>
      typeof (repository as Partial<AsyncSnapshotRepository>).loadSnapshotAsync === 'function' &&
      typeof (repository as Partial<AsyncSnapshotRepository>).saveSnapshotAsync === 'function',
    [repository]
  );
  const isHydratingRef = useRef(isAsyncRepository);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(isAsyncRepository);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);
  // TODO(Stage 2.2): move remaining direct localStorage usages from AuthGuard/login hooks
  // to repository-backed read APIs to fully decouple UI from storage implementation.

  const [links, setLinks] = useState<CRMLink[]>(() => migrateLinks(initialSnapshot.links));
  const [notifications, setNotifications] = useState<CRMNotification[]>(() => initialSnapshot.notifications);
  const [settings, setSettings] = useState<CRMSettings>(() => initialSnapshot.settings);
  const [projects, setProjects] = useState<CRMProject[]>(() => initialSnapshot.projects);
  const [clients, setClients] = useState<CRMClient[]>(() => initialSnapshot.clients);
  const [payments, setPayments] = useState<CRMPayment[]>(() => initialSnapshot.payments);
  const [audits, setAudits] = useState<CRMAudit[]>(() => initialSnapshot.audits);
  const [users, setUsers] = useState<CRMUser[]>(() => initialSnapshot.users);
  const [authUsers, setAuthUsers] = useState<AuthUser[]>(() => initialSnapshot.authUsers);

  useEffect(() => {
    let mounted = true;
    if (!isAsyncRepository) {
      isHydratingRef.current = false;
      setIsDataLoading(false);
      return;
    }

    const asyncRepository = repository as AsyncSnapshotRepository;
    setIsDataLoading(true);
    setDataLoadError(null);
    asyncRepository
      .loadSnapshotAsync()
      .then((snapshot) => {
        if (!mounted) return;
        setLinks(migrateLinks(snapshot.links));
        setProjects(snapshot.projects);
        setClients(snapshot.clients);
        setPayments(snapshot.payments);
        setAudits(snapshot.audits);
        setUsers(snapshot.users);
        setAuthUsers(snapshot.authUsers);
        setNotifications(snapshot.notifications);
        setSettings(snapshot.settings);
      })
      .catch((error) => {
        if (!mounted) return;
        const rawMessage = error instanceof Error ? error.message : 'Failed to load CRM data from repository.';
        const hint = /rls|permission|denied|auth_user_id|401|403/i.test(rawMessage)
          ? ' Проверьте RLS policies и auth mapping crm_users.auth_user_id.'
          : '';
        setDataLoadError(`${rawMessage}${hint}`);
      })
      .finally(() => {
        if (!mounted) return;
        isHydratingRef.current = false;
        setIsDataLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [repository, isAsyncRepository]);

  const getProjectCurrency = useCallback(
    (projectId: number): CurrencyCode => {
      const project = projects.find((p) => p.id === projectId);
      return project?.currency && isValidCurrency(project.currency) ? project.currency : 'RUB';
    },
    [projects]
  );

  const pushNotification = useCallback((n: Omit<CRMNotification, 'id' | 'createdAt' | 'read'>) => {
    if (!settings.notificationsEnabled) return;
    const item: CRMNotification = {
      ...n,
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [item, ...prev].slice(0, 200));
    if (settings.soundNotificationsEnabled && typeof Audio !== 'undefined') {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        osc.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } catch {
        /* ignore */
      }
    }
  }, [settings.notificationsEnabled, settings.soundNotificationsEnabled]);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllNotificationsRead = useCallback((userId: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.userId === userId ? { ...n, read: true } : n))
    );
  }, []);

  const getNotificationsForUser = useCallback(
    (userId: number, role: string) => {
      const mgmt = ['main_admin', 'admin', 'manager', 'leader'];
      return notifications.filter((n) => {
        if (n.userId === userId) return true;
        if (n.role === 'management' && mgmt.includes(role)) return true;
        return n.role === role && n.userId === 0;
      });
    },
    [notifications]
  );

  const softDeleteUser = useCallback((userId: number) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isDeleted: true, status: 'заблокирован' } : u)));
    setAuthUsers((prev) => prev.filter((a) => a.id !== userId));
  }, []);

  const updateLink = useCallback((updated: CRMLink) => {
    setLinks((prev) => prev.map((l) => (l.id === updated.id ? migrateLink(updated) : l)));
  }, []);

  const addLink = useCallback((linkData: Omit<CRMLink, 'id'>) => {
    const newId = Math.max(...links.map((l) => l.id), 0) + 1;
    const newLink: CRMLink = migrateLink({ ...linkData, id: newId });
    setLinks((prev) => [...prev, newLink]);
    // Update project link count
    setProjects((prev) =>
      prev.map((p) =>
        p.id === newLink.projectId
          ? { ...p, totalLinks: p.totalLinks + 1, inProgress: newLink.status === 'в работе' ? p.inProgress + 1 : p.inProgress }
          : p
      )
    );
    return newLink;
  }, [links]);

  const changeLinkStatus = useCallback((linkId: number, newStatus: string) => {
    setLinks((prev) => {
      const next = prev.map((l) => {
        if (l.id !== linkId) return l;
        const now = new Date().toISOString().split('T')[0];
        const updated: CRMLink = {
          ...l,
          status: newStatus as CRMLink['status'],
          startDate: (newStatus === 'в работе' || newStatus === 'повторно в работе') && !l.startDate ? now : l.startDate,
          endDate: COMPLETED_WORK_STATUSES.includes(newStatus) && !l.endDate ? now : l.endDate,
        };
        return migrateLink(updated);
      });
      setProjects((pPrev) =>
        pPrev.map((p) => {
          const projectLinks = next.filter((l) => l.projectId === p.id);
          const doneCount = projectLinks.filter((l) => COMPLETED_WORK_STATUSES.includes(l.status)).length;
          const inWork = projectLinks.filter((l) => l.status === 'в работе' || l.status === 'повторно в работе').length;
          const successRate = p.totalLinks > 0 ? Math.round((doneCount / p.totalLinks) * 100) : 0;
          return { ...p, inProgress: inWork, removed: doneCount, successRate };
        })
      );
      const changed = next.find((l) => l.id === linkId);
      if (changed && ['готово', 'сдано'].includes(newStatus)) {
        const mgmtUsers = users.filter((u) => ['main_admin', 'admin', 'manager', 'leader'].includes(u.role));
        mgmtUsers.forEach((u) => {
          pushNotification({
            userId: u.id,
            role: 'management',
            title: 'Нужна проверка ссылки',
            message: `Ссылка ${changed.url} ожидает проверки администратора`,
            link: '/management/links',
            type: 'warning',
          });
        });
      }
      if (changed && newStatus === 'в аудите') {
        const mgmtUsers = users.filter((u) => ['main_admin', 'admin', 'manager', 'leader'].includes(u.role));
        mgmtUsers.forEach((u) => {
          pushNotification({
            userId: u.id,
            role: 'management',
            title: 'Ссылка отправлена на аудит',
            message: `Ссылка ${changed.url} отправлена на аудит`,
            link: '/management/audits',
            type: 'info',
          });
        });
      }
      if (changed && newStatus === 'аудит выполнен') {
        const mgmtUsers = users.filter((u) => ['main_admin', 'admin', 'manager', 'leader'].includes(u.role));
        mgmtUsers.forEach((u) => {
          pushNotification({
            userId: u.id,
            role: 'management',
            title: 'Аудит завершён',
            message: `Аудит по ссылке ${changed.url} завершён`,
            link: '/management/audits',
            type: 'success',
          });
        });
      }
      if (changed && newStatus === 'согласовано' && changed.executorId) {
        pushNotification({
          userId: changed.executorId,
          role: 'executor',
          title: 'Ссылка подтверждена',
          message: `Администратор подтвердил выполнение: ${changed.url}`,
          link: '/executor/history',
          type: 'success',
        });
      }
      return next;
    });
  }, [users, pushNotification]);

  const addCommentToLink = useCallback((linkId: number, text: string, author: string, authorRole: string) => {
    const now = new Date().toISOString().split('T')[0];
    setLinks((prev) =>
      prev.map((l) =>
        l.id === linkId
          ? {
              ...l,
              comments: [...l.comments, { id: Date.now(), author, authorRole: authorRole as any, text, createdAt: now }],
            }
          : l
      )
    );
  }, []);

  const updateProject = useCallback((updated: CRMProject) => {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }, []);

  const addProject = useCallback((projectData: Omit<CRMProject, 'id'>) => {
    const newId = Math.max(...projects.map((p) => p.id), 0) + 1;
    const newProject: CRMProject = { ...projectData, id: newId };
    setProjects((prev) => [...prev, newProject]);
    return newProject;
  }, [projects]);

  const deleteProject = useCallback((projectId: number) => {
    // Soft-delete project and links to keep history and financial consistency.
    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, isDeleted: true } : p)));
    setLinks((prev) => prev.map((l) => (l.projectId === projectId ? { ...l, isDeleted: true } : l)));
  }, []);

  const addPayment = useCallback((paymentData: Omit<CRMPayment, 'id'>) => {
    const newId = Math.max(...payments.map((p) => p.id), 0) + 1;
    const newPayment: CRMPayment = { ...paymentData, id: newId };
    setPayments((prev) => [...prev, newPayment]);
    return newPayment;
  }, [payments]);

  const addClient = useCallback((clientData: Omit<CRMClient, 'id'>) => {
    const newId = Math.max(...clients.map((c) => c.id), 0) + 1;
    const newClient: CRMClient = { ...clientData, id: newId };
    setClients((prev) => [...prev, newClient]);
    return newClient;
  }, [clients]);

  const markLinkClientPaid = useCallback((linkId: number, amount: number) => {
    const now = new Date().toISOString().split('T')[0];
    const link = links.find((l) => l.id === linkId);
    if (!link) return;
    const currency = getProjectCurrency(link.projectId);
    setLinks((prev) =>
      prev.map((l) =>
        l.id === linkId
          ? migrateLink({
              ...l,
              clientPaymentStatus: 'paid',
              clientPaid: true,
              clientPaidDate: now,
              clientPaidAmount: amount,
            })
          : l
      )
    );
    addPayment({
      clientId: link.clientId,
      projectId: link.projectId,
      linkId,
      amount,
      currency,
      date: now,
      type: 'оплата клиента',
      status: 'оплачен',
      description: `Оплата за ${link.type} — ${link.url}`,
    });
  }, [links, addPayment, getProjectCurrency]);

  const markLinkExecutorPaid = useCallback((linkId: number, amount: number) => {
    const now = new Date().toISOString().split('T')[0];
    const link = links.find((l) => l.id === linkId);
    if (!link) return;
    const currency = getProjectCurrency(link.projectId);
    setLinks((prev) =>
      prev.map((l) =>
        l.id === linkId
          ? migrateLink({
              ...l,
              executorPaymentStatus: 'paid_to_executor',
              executorPaid: true,
              executorPaidDate: now,
              executorPaidAmount: amount,
            })
          : l
      )
    );
    addPayment({
      clientId: null,
      projectId: link.projectId,
      linkId,
      amount,
      currency,
      date: now,
      type: 'выплата исполнителю',
      status: 'оплачен',
      description: `Выплата за ${link.type} — ${link.url}`,
    });
  }, [links, addPayment, getProjectCurrency]);

  const addAudit = useCallback((auditData: Omit<CRMAudit, 'id'>) => {
    const newId = Math.max(...audits.map((a) => a.id), 0) + 1;
    const newAudit: CRMAudit = { ...auditData, id: newId };
    setAudits((prev) => [...prev, newAudit]);
    return newAudit;
  }, [audits]);

  const updateAudit = useCallback((audit: CRMAudit) => {
    setAudits((prev) => prev.map((a) => (a.id === audit.id ? audit : a)));
  }, []);

  const addAuthUser = useCallback((userData: Omit<AuthUser, 'id'>) => {
    const newId = Math.max(...authUsers.map((u) => u.id), 0) + 1;
    const newUser: AuthUser = { ...userData, id: newId };
    setAuthUsers((prev) => [...prev, newUser]);
    return newUser;
  }, [authUsers]);

  const checkIntegrity = useCallback(() => {
    const issues: DataIntegrityIssue[] = [];
    const validPaymentStatuses = new Set(['unpaid', 'partially_paid', 'paid']);
    const validExecutorPaymentStatuses = new Set(['not_accrued', 'accrued', 'paid_to_executor']);
    const validLinkStatuses = new Set([
      'в работе', 'в карантине', 'готово', 'сдано', 'отклонено', 'удалено',
      'новый', 'на просчёт', 'просчёт выполнен', 'ожидает аудита', 'в аудите',
      'аудит выполнен', 'не взято в работу', 'на паузе', 'деиндексировано google',
      'деиндексировано yandex', 'деиндексировано bing', 'деиндексировано yahoo',
      'частично деиндексировано', 'вернулось', 'повторно в работе', 'сдано клиенту',
      'принято', 'не принято', 'согласовано', 'отправлено клиенту',
    ]);

    // Orphan links (no project)
    links.forEach((link) => {
      if (!projects.find((p) => p.id === link.projectId)) {
        issues.push({
          type: 'orphan_link',
          severity: 'error',
          message: `Ссылка #${link.id} (${link.url}) не привязана к проекту`,
          data: link,
        });
      }
    });

    // Payments without valid link
    payments.forEach((payment) => {
      if (payment.linkId && !links.find((l) => l.id === payment.linkId)) {
        issues.push({
          type: 'orphan_payment',
          severity: 'error',
          message: `Платёж #${payment.id} ссылается на несуществующую ссылку #${payment.linkId}`,
          data: payment,
        });
      }
    });

    // Audits without valid link
    audits.forEach((audit) => {
      if (!links.find((l) => l.id === audit.linkId)) {
        issues.push({
          type: 'orphan_audit',
          severity: 'warning',
          message: `Аудит #${audit.id} ссылается на несуществующую ссылку #${audit.linkId}`,
          data: audit,
        });
      }
    });

    // Payments for links that aren't done
    payments
      .filter((p) => p.type === 'выплата исполнителю' && p.linkId)
      .forEach((payment) => {
        const link = links.find((l) => l.id === payment.linkId);
        if (link && !['удалено', 'принято', 'деиндексировано google', 'деиндексировано yandex', 'сдано', 'сдано клиенту'].includes(link.status)) {
          issues.push({
            type: 'payment_without_link',
            severity: 'warning',
            message: `Выплата #${payment.id} для ссылки #${link.id} со статусом «${link.status}» — ссылка не завершена`,
            data: { payment, link },
          });
        }
      });

    // Duplicate URLs
    const urlMap = new Map<string, number[]>();
    links.forEach((l) => {
      const existing = urlMap.get(l.url) || [];
      existing.push(l.id);
      urlMap.set(l.url, existing);
    });
    urlMap.forEach((ids, url) => {
      if (ids.length > 1) {
        issues.push({
          type: 'duplicate',
          severity: 'warning',
          message: `Дублирующийся URL: ${url} (ссылки: ${ids.join(', ')})`,
          data: { url, ids },
        });
      }
    });

    // Executors without tasks
    users
      .filter((u) => u.role === 'executor' && !u.isDeleted)
      .forEach((executor) => {
        const hasTasks = links.some((l) => l.executorId === executor.id);
        if (!hasTasks) {
          issues.push({
            type: 'executor_without_tasks',
            severity: 'warning',
            message: `Исполнитель ${executor.fullName} не имеет назначенных ссылок`,
            data: executor,
          });
        }
      });

    projects.forEach((p) => {
      if (!clients.find((c) => c.id === p.clientId)) {
        issues.push({
          type: 'project_without_client',
          severity: 'error',
          message: `Проект «${p.name}» (#${p.id}) без клиента`,
          data: p,
        });
      }
      if (!isValidCurrency(p.currency)) {
        issues.push({
          type: 'invalid_currency',
          severity: 'error',
          message: `Проект «${p.name}» имеет некорректную валюту: ${p.currency}`,
          data: p,
        });
      }
    });

    links.forEach((link) => {
      const needsExecutor = !['новый', 'ожидает аудита', 'на просчёт', 'в аудите'].includes(link.status);
      if (needsExecutor && !link.executorId) {
        issues.push({
          type: 'link_without_executor',
          severity: 'warning',
          message: `Ссылка #${link.id} (${link.url}) без исполнителя при статусе «${link.status}»`,
          data: link,
        });
      }
      const project = projects.find((p) => p.id === link.projectId);
      if (project && link.clientId !== project.clientId) {
        issues.push({
          type: 'invalid_payment_status',
          severity: 'warning',
          message: `Ссылка #${link.id} привязана к другому clientId, чем проект`,
          data: link,
        });
      }
      if (project && isValidCurrency(project.currency)) {
        const relatedPayments = payments.filter((p) => p.linkId === link.id);
        relatedPayments.forEach((p) => {
          if (p.currency !== project.currency) {
            issues.push({
              type: 'currency_mismatch',
              severity: 'warning',
              message: `Платёж #${p.id} по ссылке #${link.id} имеет валюту ${p.currency}, проект: ${project.currency}`,
              data: { payment: p, project, link },
            });
          }
        });
      }
      if (!validLinkStatuses.has(link.status)) {
        issues.push({
          type: 'invalid_link_status',
          severity: 'error',
          message: `Ссылка #${link.id} имеет неизвестный статус: ${link.status}`,
          data: link,
        });
      }
      if (link.clientPaymentStatus && !validPaymentStatuses.has(link.clientPaymentStatus)) {
        issues.push({
          type: 'invalid_payment_status',
          severity: 'error',
          message: `Ссылка #${link.id} имеет некорректный статус оплаты клиента: ${link.clientPaymentStatus}`,
          data: link,
        });
      }
      if (link.executorPaymentStatus && !validExecutorPaymentStatuses.has(link.executorPaymentStatus)) {
        issues.push({
          type: 'invalid_payment_status',
          severity: 'error',
          message: `Ссылка #${link.id} имеет некорректный статус оплаты исполнителя: ${link.executorPaymentStatus}`,
          data: link,
        });
      }
    });

    const urlByExecutor = new Map<string, Map<number, number[]>>();
    links.forEach((l) => {
      if (!l.executorId) return;
      if (!urlByExecutor.has(l.url)) urlByExecutor.set(l.url, new Map());
      const m = urlByExecutor.get(l.url)!;
      const ids = m.get(l.executorId) || [];
      ids.push(l.id);
      m.set(l.executorId, ids);
    });
    urlByExecutor.forEach((execMap, url) => {
      if (execMap.size > 1) {
        issues.push({
          type: 'duplicate_executor_url',
          severity: 'error',
          message: `URL ${url} назначен разным исполнителям`,
          data: { url, executors: [...execMap.keys()] },
        });
      }
    });

    return issues;
  }, [links, projects, payments, audits, users, clients]);

  const resetTestEnvironment = useCallback(() => {
    if (IS_PRODUCTION_UI) return;
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        '⚠️ ВНИМАНИЕ\n\nЭто действие удалит ВСЕ данные:\n• Проекты\n• Ссылки\n• Аудиты\n• Финансовые записи\n• Клиенты\n\nАккаунты и роли пользователей сохранятся.\n\nПродолжить?'
      );
      if (!confirmed) return;
    }
    setLinks([]);
    setProjects([]);
    setAudits([]);
    setPayments([]);
    setClients([]);
    // Users and authUsers stay
    repository.clearEntityData();
  }, [repository]);

  const getProjectLinks = useCallback(
    (projectId: number) => links.filter((l) => l.projectId === projectId),
    [links]
  );

  const getClientLinks = useCallback(
    (clientId: number) => links.filter((l) => l.clientId === clientId),
    [links]
  );

  const getExecutorLinks = useCallback(
    (executorId: number) => links.filter((l) => l.executorId === executorId),
    [links]
  );

  const getProjectRevenue = useCallback(
    (projectId: number) =>
      links
        .filter((l) => l.projectId === projectId && l.clientPaid)
        .reduce((sum, l) => sum + (l.clientPaidAmount || l.clientCost), 0),
    [links]
  );

  const getProjectPayouts = useCallback(
    (projectId: number) =>
      links
        .filter((l) => l.projectId === projectId && l.executorPaid)
        .reduce((sum, l) => sum + (l.executorPaidAmount || l.executorCost), 0),
    [links]
  );

  const getLinkAudit = useCallback(
    (linkId: number) => audits.find((a) => a.linkId === linkId),
    [audits]
  );

  // Persist via repository (Stage 2.1)
  // TODO(Stage 2.2): migrate write-heavy methods to async repository contract for backend mode.
  useEffect(() => {
    const snapshot: CRMSnapshot = {
      links,
      projects,
      clients,
      payments,
      audits,
      users,
      authUsers,
      notifications,
      settings,
    };

    if (isAsyncRepository) {
      if (isHydratingRef.current) return;
      const asyncRepository = repository as AsyncSnapshotRepository;
      void asyncRepository.saveSnapshotAsync(snapshot).catch((error) => {
        const message = error instanceof Error ? error.message : 'Failed to save CRM data to async repository.';
        // Save failures should not block UI after successful initial load.
        // eslint-disable-next-line no-console
        console.error('[CRM] Async save failed:', message);
      });
      return;
    }

    repository.saveSnapshot(snapshot);
  }, [links, projects, clients, payments, audits, users, authUsers, notifications, settings, repository, isAsyncRepository]);

  const value = useMemo(
    () => ({
      isDataLoading,
      dataLoadError,
      links,
      projects,
      clients,
      payments,
      audits,
      users,
      authUsers,
      setLinks,
      setProjects,
      setClients,
      setPayments,
      setAudits,
      setUsers,
      setAuthUsers,
      updateLink,
      addLink,
      changeLinkStatus,
      addCommentToLink,
      updateProject,
      addProject,
      deleteProject,
      addPayment,
      markLinkClientPaid,
      markLinkExecutorPaid,
      addAudit,
      updateAudit,
      addAuthUser,
      addClient,
      checkIntegrity,
      resetTestEnvironment,
      getProjectLinks,
      getClientLinks,
      getExecutorLinks,
      getProjectRevenue,
      getProjectPayouts,
      getLinkAudit,
      notifications,
      settings,
      setSettings,
      pushNotification,
      markNotificationRead,
      markAllNotificationsRead,
      getNotificationsForUser,
      getProjectCurrency,
      softDeleteUser,
    }),
    [
      isDataLoading, dataLoadError,
      links, projects, clients, payments, audits, users, authUsers,
      notifications, settings,
      updateLink, addLink, changeLinkStatus, addCommentToLink,
      updateProject, addProject, deleteProject, addPayment, addClient, markLinkClientPaid, markLinkExecutorPaid, addAudit, updateAudit, addAuthUser,
      checkIntegrity, resetTestEnvironment,
      getProjectLinks, getClientLinks, getExecutorLinks, getProjectRevenue, getProjectPayouts, getLinkAudit,
      pushNotification, markNotificationRead, markAllNotificationsRead, getNotificationsForUser, getProjectCurrency, softDeleteUser,
    ]
  );
  if (isDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 text-sm">
        Загрузка данных CRM...
      </div>
    );
  }

  if (dataLoadError && isAsyncRepository) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white border border-red-100 rounded-xl p-5 text-sm text-red-700">
          <div className="font-semibold mb-1">Ошибка загрузки данных из Supabase</div>
          <div>{dataLoadError}</div>
        </div>
      </div>
    );
  }

  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>;
}

export function useCRM() {
  const ctx = useContext(CRMContext);
  if (!ctx) throw new Error('useCRM must be used within CRMProvider');
  return ctx;
}