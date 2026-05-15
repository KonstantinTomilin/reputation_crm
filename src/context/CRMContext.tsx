import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import {
  mockLinks as initialLinks,
  mockProjects as initialProjects,
  mockClients as initialClients,
  mockPayments as initialPayments,
  mockAudits as initialAudits,
  mockUsers as initialUsers,
} from '@/mocks/crm';
import type { CRMLink, CRMProject, CRMClient, CRMPayment, CRMAudit, CRMUser } from '@/mocks/crm';

interface DataIntegrityIssue {
  type: 'orphan_link' | 'orphan_payment' | 'orphan_audit' | 'payment_without_link' | 'duplicate' | 'executor_without_tasks';
  severity: 'warning' | 'error';
  message: string;
  data?: unknown;
}

export interface AuthUser {
  id: number;
  email: string;
  password: string;
  role: string;
  name: string;
}

const STORAGE_KEYS = {
  links: 'crm_links',
  projects: 'crm_projects',
  clients: 'crm_clients',
  payments: 'crm_payments',
  audits: 'crm_audits',
  users: 'crm_users',
  authUsers: 'crm_auth_users',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* ignore */ }
  return fallback;
}

interface CRMContextValue {
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
}

const CRMContext = createContext<CRMContextValue | null>(null);

export function CRMProvider({ children }: { children: React.ReactNode }) {
  const initialAuthUsers: AuthUser[] = initialUsers.map((u) => ({
    id: u.id,
    email: u.email,
    password: 'password',
    role: u.role,
    name: u.fullName,
  }));

  const [links, setLinks] = useState<CRMLink[]>(() => loadFromStorage(STORAGE_KEYS.links, initialLinks));
  const [projects, setProjects] = useState<CRMProject[]>(() => loadFromStorage(STORAGE_KEYS.projects, initialProjects));
  const [clients, setClients] = useState<CRMClient[]>(() => loadFromStorage(STORAGE_KEYS.clients, initialClients));
  const [payments, setPayments] = useState<CRMPayment[]>(() => loadFromStorage(STORAGE_KEYS.payments, initialPayments));
  const [audits, setAudits] = useState<CRMAudit[]>(() => loadFromStorage(STORAGE_KEYS.audits, initialAudits));

  // Users init — always ensure default executors exist
  const [users, setUsers] = useState<CRMUser[]>(() => {
    const stored = loadFromStorage(STORAGE_KEYS.users, initialUsers);
    const merged = [...stored];
    let nextId = Math.max(...merged.map((u) => u.id), 0) + 1;
    const defaults: Omit<CRMUser, 'id'>[] = [
      { role: 'executor', login: 'rf_executor', email: 'rf@deindex.ru', fullName: 'РФ Исполнитель 1', language: 'ru', status: 'активен', alias: null },
      { role: 'executor', login: 'foreign_executor', email: 'foreign@deindex.ru', fullName: 'Зарубеж Исполнитель 2', language: 'ru', status: 'активен', alias: null },
    ];
    defaults.forEach((def) => {
      const exists = merged.some((u) => u.role === 'executor' && u.fullName === def.fullName);
      if (!exists) {
        merged.push({ ...def, id: nextId++ });
      }
    });
    return merged;
  });

  // Auth users init — mirror executors
  const [authUsers, setAuthUsers] = useState<AuthUser[]>(() => {
    const storedUsers = loadFromStorage<CRMUser[]>(STORAGE_KEYS.users, initialUsers);
    const mergedUsers = [...storedUsers];
    let nextId = Math.max(...mergedUsers.map((u) => u.id), 0) + 1;
    const defaults: Omit<CRMUser, 'id'>[] = [
      { role: 'executor', login: 'rf_executor', email: 'rf@deindex.ru', fullName: 'РФ Исполнитель 1', language: 'ru', status: 'активен', alias: null },
      { role: 'executor', login: 'foreign_executor', email: 'foreign@deindex.ru', fullName: 'Зарубеж Исполнитель 2', language: 'ru', status: 'активен', alias: null },
    ];
    defaults.forEach((def) => {
      const exists = mergedUsers.some((u) => u.role === 'executor' && u.fullName === def.fullName);
      if (!exists) mergedUsers.push({ ...def, id: nextId++ });
    });

    const authFromUsers = mergedUsers.map((u) => ({
      id: u.id,
      email: u.email,
      password: 'password',
      role: u.role,
      name: u.fullName,
    }));

    const storedAuth = loadFromStorage(STORAGE_KEYS.authUsers, initialAuthUsers);
    // Merge storedAuth + authFromUsers, dedup by id
    const authMap = new Map<number, AuthUser>();
    storedAuth.forEach((a) => authMap.set(a.id, a));
    authFromUsers.forEach((a) => {
      if (!authMap.has(a.id)) authMap.set(a.id, a);
    });
    return Array.from(authMap.values());
  });

  const updateLink = useCallback((updated: CRMLink) => {
    setLinks((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }, []);

  const addLink = useCallback((linkData: Omit<CRMLink, 'id'>) => {
    const newId = Math.max(...links.map((l) => l.id), 0) + 1;
    const newLink: CRMLink = { ...linkData, id: newId };
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
    setLinks((prev) =>
      prev.map((l) => {
        if (l.id !== linkId) return l;
        const now = new Date().toISOString().split('T')[0];
        const updated: CRMLink = {
          ...l,
          status: newStatus,
          startDate: newStatus === 'в работе' && !l.startDate ? now : l.startDate,
          endDate: ['удалено', 'принято', 'деиндексировано google', 'деиндексировано yandex'].includes(newStatus) && !l.endDate ? now : l.endDate,
        };
        return updated;
      })
    );
    // Update project stats
    setProjects((prev) =>
      prev.map((p) => {
        const projectLinks = links.filter((l) => l.projectId === p.id);
        const doneCount = projectLinks.filter((l) => ['удалено', 'принято', 'деиндексировано google', 'деиндексировано yandex'].includes(l.status)).length;
        const inWork = projectLinks.filter((l) => l.status === 'в работе').length;
        const successRate = p.totalLinks > 0 ? Math.round((doneCount / p.totalLinks) * 100) : 0;
        return { ...p, inProgress: inWork, removed: doneCount, successRate };
      })
    );
  }, [links]);

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
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    setLinks((prev) => prev.filter((l) => l.projectId !== projectId));
    setAudits((prev) => prev.filter((a) => {
      const linkStillExists = links.some((l) => l.id === a.linkId && l.projectId !== projectId);
      return linkStillExists;
    }));
    setPayments((prev) => prev.filter((p) => p.projectId !== projectId));
  }, [links]);

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
    setLinks((prev) =>
      prev.map((l) =>
        l.id === linkId ? { ...l, clientPaid: true, clientPaidDate: now, clientPaidAmount: amount } : l
      )
    );
    const link = links.find((l) => l.id === linkId);
    if (link) {
      addPayment({
        clientId: link.clientId,
        projectId: link.projectId,
        linkId,
        amount,
        currency: 'RUB',
        date: now,
        type: 'оплата клиента',
        status: 'оплачен',
        description: `Оплата за ${link.type} — ${link.url}`,
      });
    }
  }, [links, addPayment]);

  const markLinkExecutorPaid = useCallback((linkId: number, amount: number) => {
    const now = new Date().toISOString().split('T')[0];
    setLinks((prev) =>
      prev.map((l) =>
        l.id === linkId ? { ...l, executorPaid: true, executorPaidDate: now, executorPaidAmount: amount } : l
      )
    );
    const link = links.find((l) => l.id === linkId);
    if (link) {
      addPayment({
        clientId: null,
        projectId: link.projectId,
        linkId,
        amount,
        currency: 'RUB',
        date: now,
        type: 'выплата исполнителю',
        status: 'оплачен',
        description: `Выплата за ${link.type} — ${link.url}`,
      });
    }
  }, [links, addPayment]);

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
      .filter((u) => u.role === 'executor')
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

    return issues;
  }, [links, projects, payments, audits, users]);

  const resetTestEnvironment = useCallback(() => {
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
    localStorage.removeItem(STORAGE_KEYS.links);
    localStorage.removeItem(STORAGE_KEYS.projects);
    localStorage.removeItem(STORAGE_KEYS.audits);
    localStorage.removeItem(STORAGE_KEYS.payments);
    localStorage.removeItem(STORAGE_KEYS.clients);
  }, []);

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

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.links, JSON.stringify(links));
    localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(projects));
    localStorage.setItem(STORAGE_KEYS.clients, JSON.stringify(clients));
    localStorage.setItem(STORAGE_KEYS.payments, JSON.stringify(payments));
    localStorage.setItem(STORAGE_KEYS.audits, JSON.stringify(audits));
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
    localStorage.setItem(STORAGE_KEYS.authUsers, JSON.stringify(authUsers));
  }, [links, projects, clients, payments, audits, users, authUsers]);

  const value = useMemo(
    () => ({
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
    }),
    [
      links, projects, clients, payments, audits, users, authUsers,
      updateLink, addLink, changeLinkStatus, addCommentToLink,
      updateProject, addProject, deleteProject, addPayment, addClient, markLinkClientPaid, markLinkExecutorPaid, addAudit, updateAudit, addAuthUser,
      checkIntegrity, resetTestEnvironment,
      getProjectLinks, getClientLinks, getExecutorLinks, getProjectRevenue, getProjectPayouts, getLinkAudit,
    ]
  );

  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>;
}

export function useCRM() {
  const ctx = useContext(CRMContext);
  if (!ctx) throw new Error('useCRM must be used within CRMProvider');
  return ctx;
}