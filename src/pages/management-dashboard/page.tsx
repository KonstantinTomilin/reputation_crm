import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
// @ts-expect-error no types for html2pdf.js
import html2pdf from 'html2pdf.js';
import CRMLayout from '@/components/feature/CRMLayout';
import KPICard from '@/components/base/KPICard';
import StatusBadge from '@/components/base/StatusBadge';
import UserModal from './components/UserModal';
import ConfirmModal from './components/ConfirmModal';
import KanbanView from './components/KanbanView';
import ExecutorDetailModal from './components/ExecutorDetailModal';

import ProjectCreateModal from './components/ProjectCreateModal';
import AuditsTab from './components/AuditsTab';
import ExecutorPaymentModal from './components/ExecutorPaymentModal';
import ProjectDetailModal from './components/ProjectDetailModal';
import FinanceReportTab from './components/FinanceReportTab';

import { useCRM } from '@/context/CRMContext';
import {
  mockAdminStats,
  mockTopClients,
  mockChartData,
  mockPayments,
  mockUsers,
} from '@/mocks/crm';
import type { CRMUser, CRMClient, CRMLink, LinkStatus, CRMProject, ProjectStatus, ClientPaymentStatus, ExecutorPaymentStatus } from '@/mocks/crm';
import { defaultProjectDeadline } from '@/lib/dateUtils';
import { formatGroupedAmounts, formatMoney, getCurrencySymbol, groupAmountsByCurrency } from '@/lib/currency';
import { COMPLETED_WORK_STATUSES, setClientPaymentStatus, setExecutorPaymentStatus } from '@/lib/linkFinance';
import { IS_PRODUCTION_UI } from '@/context/CRMContext';

const validTabs = [
  'overview', 'users', 'projects', 'links', 'audits', 'auditors',
  'executors', 'finance', 'reports', 'settings', 'kanban', 'overdue',
] as const;

const periodLabels = { month: 'Месяц', quarter: 'Квартал', year: 'Год' };

const roleDisplayNames: Record<string, string> = {
  main_admin: 'Гл. администратор',
  admin: 'Администратор',
  manager: 'Руководитель',
  leader: 'Руководитель',
  client: 'Клиент',
  executor: 'Исполнитель',
  auditor: 'Аудитор',
};

const roleColors: Record<string, string> = {
  main_admin: 'bg-red-100 text-red-700',
  admin: 'bg-orange-100 text-orange-700',
  manager: 'bg-blue-100 text-blue-700',
  leader: 'bg-blue-100 text-blue-700',
  client: 'bg-green-100 text-green-700',
  executor: 'bg-slate-100 text-blue-800',
  auditor: 'bg-pink-100 text-pink-700',
};

export default function ManagementDashboardPage() {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const crm = useCRM();

  const activeTab = validTabs.includes(tab as (typeof validTabs)[number]) ? tab! : 'overview';

  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [userModal, setUserModal] = useState<{ open: boolean; user?: CRMUser }>({ open: false });
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText: string;
    danger?: boolean;
  } | null>(null);

  // Data from CRMContext
  const usersList = crm.users;
  const clientsList = crm.clients;
  const linksList = crm.links;
  const projectsList = crm.projects;
  const paymentsList = crm.payments;

  const [searchUsers, setSearchUsers] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | 'RUB' | 'USD' | 'EUR' | 'AED'>('all');
  const [executorReportId, setExecutorReportId] = useState<number | null>(null);
  const [executorPaymentId, setExecutorPaymentId] = useState<number | null>(null);
  const [projectDetailId, setProjectDetailId] = useState<number | null>(null);

  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});

  const [projectModal, setProjectModal] = useState<{ open: boolean }>({ open: false });
  const [linksFilters, setLinksFilters] = useState({
    search: '',
    status: 'all' as LinkStatus | 'all',
    project: searchParams.get('project') || 'all',
    type: 'all',
    geo: 'all',
    clientPaid: 'all' as 'all' | 'yes' | 'no',
    executorPaid: 'all' as 'all' | 'yes' | 'no',
    deliveredToClient: 'all' as 'all' | 'yes' | 'no',
  });

  // Sync searchParams -> linksFilters when navigating from Projects tab
  useEffect(() => {
    const projectParam = searchParams.get('project');
    if (projectParam) {
      setLinksFilters((prev) => ({ ...prev, project: projectParam }));
    }
  }, [searchParams]);

  // Audit report modal state
  const [auditReportModal, setAuditReportModal] = useState<{
    open: boolean;
    status: 'idle' | 'generating' | 'done';
    downloadUrl?: string;
  }>({ open: false, status: 'idle' });

  // Finance filters
  const [financeFilters, setFinanceFilters] = useState({
    project: 'all',
    status: 'all' as 'all' | 'оплачен' | 'запланирован' | 'просрочен',
    executor: 'all',
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
    search: '',
    type: 'all',
  });
  const [financeSubTab, setFinanceSubTab] = useState<'operations' | 'report'>('operations');

  // Reports filters + generate
  const [reportFilters, setReportFilters] = useState({
    dateFrom: '',
    dateTo: '',
    project: 'all',
    status: 'all' as 'all' | 'оплачен' | 'запланирован' | 'просрочен',
  });
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportDownloadUrl, setReportDownloadUrl] = useState<string | null>(null);

  // Integrity check modal
  const [integrityModal, setIntegrityModal] = useState<{ open: boolean; issues: ReturnType<typeof crm.checkIntegrity> }>({ open: false, issues: [] });

  const switchTab = (t: string) => navigate(`/management/${t}`);

  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchSearch =
        searchUsers === '' ||
        u.fullName.toLowerCase().includes(searchUsers.toLowerCase()) ||
        u.login.toLowerCase().includes(searchUsers.toLowerCase()) ||
        u.email.toLowerCase().includes(searchUsers.toLowerCase());
      return matchRole && matchSearch;
    });
  }, [usersList, roleFilter, searchUsers]);

  // Finance
  const rubRevenue = paymentsList
    .filter((p) => p.type === 'оплата клиента' && p.status === 'оплачен' && p.currency === 'RUB')
    .reduce((sum, p) => sum + p.amount, 0);
  const usdRevenue = paymentsList
    .filter((p) => p.type === 'оплата клиента' && p.status === 'оплачен' && p.currency === 'USD')
    .reduce((sum, p) => sum + p.amount, 0);
  const rubPayouts = paymentsList
    .filter((p) => p.type === 'выплата исполнителю' && p.status === 'оплачен' && p.currency === 'RUB')
    .reduce((sum, p) => sum + p.amount, 0);
  const usdPayouts = paymentsList
    .filter((p) => p.type === 'выплата исполнителю' && p.status === 'оплачен' && p.currency === 'USD')
    .reduce((sum, p) => sum + p.amount, 0);
  const totalDebt = clientsList.reduce((sum, c) => sum + c.totalDebt, 0);
  const revenueByCurrency = groupAmountsByCurrency(
    paymentsList
      .filter((p) => p.type === 'оплата клиента' && p.status === 'оплачен')
      .map((p) => ({ amount: p.amount, currency: p.currency }))
  );
  const payoutsByCurrency = groupAmountsByCurrency(
    paymentsList
      .filter((p) => p.type === 'выплата исполнителю' && p.status === 'оплачен')
      .map((p) => ({ amount: p.amount, currency: p.currency }))
  );
  const profitByCurrency = Object.keys({ ...revenueByCurrency, ...payoutsByCurrency }).reduce<Record<string, number>>((acc, cur) => {
    acc[cur] = (revenueByCurrency[cur] ?? 0) - (payoutsByCurrency[cur] ?? 0);
    return acc;
  }, {});
  const debtByCurrency = groupAmountsByCurrency(
    clientsList.map((c) => ({ amount: c.totalDebt, currency: c.currency }))
  );

  // Overdue
  const overdueLinks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return linksList.filter(
      (l) =>
        l.deadline &&
        l.deadline < today &&
        !COMPLETED_WORK_STATUSES.includes(l.status)
    );
  }, [linksList]);

  const periodFilteredLinks = useMemo(() => {
    const now = new Date();
    return linksList.filter((l) => {
      if (!l.addedDate) return false;
      const d = new Date(l.addedDate);
      if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (period === 'quarter') {
        const q = Math.floor(now.getMonth() / 3);
        const pq = Math.floor(d.getMonth() / 3);
        return pq === q && d.getFullYear() === now.getFullYear();
      }
      return d.getFullYear() === now.getFullYear();
    });
  }, [linksList, period]);

  const periodFilteredProjects = useMemo(() => {
    const now = new Date();
    return projectsList.filter((p) => {
      if (!p.startDate) return false;
      const d = new Date(p.startDate);
      if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (period === 'quarter') {
        const q = Math.floor(now.getMonth() / 3);
        const pq = Math.floor(d.getMonth() / 3);
        return pq === q && d.getFullYear() === now.getFullYear();
      }
      return d.getFullYear() === now.getFullYear();
    });
  }, [projectsList, period]);

  const periodFilteredPayments = useMemo(() => {
    const now = new Date();
    return paymentsList.filter((p) => {
      const d = new Date(p.date);
      if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (period === 'quarter') {
        const q = Math.floor(now.getMonth() / 3);
        const pq = Math.floor(d.getMonth() / 3);
        return pq === q && d.getFullYear() === now.getFullYear();
      }
      return d.getFullYear() === now.getFullYear();
    });
  }, [paymentsList, period]);

  // Finance filtered payments
  const filteredPayments = useMemo(() => {
    return paymentsList.filter((p) => {
      const matchProject = financeFilters.project === 'all' || String(p.projectId) === financeFilters.project;
      const matchStatus = financeFilters.status === 'all' || p.status === financeFilters.status;
      const matchExecutor = financeFilters.executor === 'all' || (() => {
        const link = linksList.find((l) => l.id === p.linkId);
        return link && String(link.executorId) === financeFilters.executor;
      })();
      const matchDateFrom = !financeFilters.dateFrom || p.date >= financeFilters.dateFrom;
      const matchDateTo = !financeFilters.dateTo || p.date <= financeFilters.dateTo;
      const matchAmountMin = !financeFilters.amountMin || p.amount >= Number(financeFilters.amountMin);
      const matchAmountMax = !financeFilters.amountMax || p.amount <= Number(financeFilters.amountMax);
      const matchSearch = !financeFilters.search || p.description.toLowerCase().includes((financeFilters.search as string).toLowerCase());
      const matchType = !financeFilters.type || financeFilters.type === 'all' || p.type === financeFilters.type;
      return matchProject && matchStatus && matchExecutor && matchDateFrom && matchDateTo && matchAmountMin && matchAmountMax && matchSearch && matchType;
    });
  }, [linksList, paymentsList, financeFilters]);

  const handleSaveUser = useCallback(
    (form: Omit<CRMUser, 'id'>) => {
      if (userModal.user) {
        crm.setUsers((prev) => prev.map((u) => (u.id === userModal.user!.id ? { ...u, ...form } : u)));
      } else {
        const newId = Math.max(...usersList.map((u) => u.id), 0) + 1;
        crm.setUsers((prev) => [...prev, { ...form, id: newId } as CRMUser]);
        // Auto-create auth user for login
        const password = (form as any).password || 'password';
        crm.addAuthUser({
          email: form.email,
          login: form.login,
          password,
          role: form.role,
          name: form.fullName,
        });
      }
    },
    [userModal.user, usersList, crm]
  );

  const handleDeleteUser = (id: number) => {
    setConfirmModal({
      open: true,
      title: 'Удалить пользователя',
      message: 'Пользователь будет деактивирован (soft-delete) и вход будет отключён.',
      onConfirm: () => {
        crm.softDeleteUser(id);
        setConfirmModal(null);
      },
      confirmText: 'Деактивировать',
      danger: true,
    });
  };

  const handleToggleBlock = (user: CRMUser) => {
    const newStatus = user.status === 'активен' ? 'заблокирован' : 'активен';
    crm.setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u)));
  };

  const handleAddComment = (linkId: number, text: string) => {
    crm.addCommentToLink(linkId, text, 'Администратор', 'admin');
  };

  const handleStatusChange = (linkId: number, newStatus: string) => {
    crm.changeLinkStatus(linkId, newStatus);
  };

  const handleUpdateLink = (updated: CRMLink) => {
    crm.updateLink(updated);
  };

  const handleClientPaymentChange = (link: CRMLink, status: ClientPaymentStatus) => {
    crm.updateLink(setClientPaymentStatus(link, status));
  };

  const handleExecutorPaymentChange = (link: CRMLink, status: ExecutorPaymentStatus) => {
    crm.updateLink(setExecutorPaymentStatus(link, status));
  };

  const handleSaveProject = (data: {
    clientId: number;
    executorId: number | null;
    name: string;
    deadline: string | null;
    currency: 'RUB' | 'USD' | 'EUR' | 'AED';
    source: string;
    links: { url: string; type: 'удаление' | 'деиндексация' | 'удаление+деиндексация'; clientCost: number; targetGoogle: boolean; targetYandex: boolean; targetBing: boolean }[];
  }) => {
    const newProjectId = Math.max(...projectsList.map((p) => p.id), 0) + 1;
    const today = new Date().toISOString().split('T')[0];
    const projectDeadline = data.deadline || defaultProjectDeadline(today);
    const assignedExecutor = data.executorId
      ? usersList.find((u) => u.id === data.executorId)
      : null;

    crm.setProjects((prev) => [
      ...prev,
      {
        id: newProjectId,
        clientId: data.clientId,
        executorId: data.executorId,
        name: data.name,
        domain: '',
        description: '',
        totalLinks: data.links.length,
        inProgress: 0,
        removed: 0,
        successRate: 0,
        status: 'новый',
        startDate: today,
        deadline: projectDeadline,
        manager: assignedExecutor?.fullName || '—',
        currency: data.currency,
        source: data.source,
      },
    ]);

    let nextLinkId = Math.max(...linksList.map((l) => l.id), 0) + 1;
    const newLinks: CRMLink[] = data.links.map((l) => ({
      id: nextLinkId++,
      url: l.url,
      clientId: data.clientId,
      projectId: newProjectId,
      type: l.type,
      targetSE: { google: l.targetGoogle, yandex: l.targetYandex, bing: l.targetBing, yahoo: false },
      status: 'ожидает аудита',
      addedDate: today,
      startDate: null,
      endDate: null,
      deadline: projectDeadline,
      quarantineDays: 0,
      quarantineEndDate: null,
      executorId: data.executorId,
      auditorId: null,
      clientCost: l.clientCost,
      executorCost: Math.round(l.clientCost * 0.5),
      clientPaid: false,
      clientPaidDate: null,
      clientPaidAmount: null,
      clientPaymentStatus: 'unpaid',
      executorPaid: false,
      executorPaidDate: null,
      executorPaidAmount: null,
      executorPaymentStatus: 'not_accrued',
      comments: [],
      proofsFolder: null,
      proofFiles: [],
    }));

    crm.setLinks((prev) => [...prev, ...newLinks]);

    if (data.executorId) {
      crm.pushNotification({
        userId: data.executorId,
        role: 'executor',
        title: 'Новый проект',
        message: `Вам назначен проект «${data.name}» (${newLinks.length} ссылок)`,
        link: '/executor',
        type: 'info',
      });
    }

    setProjectModal({ open: false });
  };

  const handleSaveProjectEdit = (updated: CRMProject) => {
    crm.updateProject(updated);
  };

  const exportProjectPdf = async (projectId: number) => {
    const project = projectsList.find((p) => p.id === projectId);
    if (!project) return;
    const projectLinks = linksList.filter((l) => l.projectId === projectId);
    const client = clientsList.find((c) => c.id === project.clientId);
    const countBy = (statuses: string[]) => projectLinks.filter((l) => statuses.includes(l.status)).length;
    const container = document.createElement('div');
    container.innerHTML = `
      <div style="font-family:Arial;padding:20px">
        <h1 style="color:#1e3a8a">Отчёт по проекту: ${project.name}</h1>
        <p>Клиент: ${client?.companyName ?? '—'} · Валюта: ${project.currency} · Дедлайн: ${project.deadline ?? '—'}</p>
        <p>Удалено: ${countBy(['удалено'])} · Деиндексировано: ${countBy(['деиндексировано google','деиндексировано yandex','деиндексировано bing','деиндексировано yahoo'])} · Частично: ${countBy(['частично деиндексировано'])} · Карантин: ${countBy(['в карантине'])} · В работе: ${countBy(['в работе','повторно в работе'])}</p>
        <p>Оплачено: ${projectLinks.filter((l) => l.clientPaymentStatus === 'paid' || l.clientPaid).length} · Не оплачено: ${projectLinks.filter((l) => (l.clientPaymentStatus ?? 'unpaid') === 'unpaid').length}</p>
        <table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:12px">
          <thead><tr style="background:#1e3a8a;color:#fff"><th style="padding:6px">URL</th><th>Тип</th><th>Статус</th><th>Стоимость</th><th>Оплата</th></tr></thead>
          <tbody>
            ${projectLinks.map((l) => `<tr>
              <td style="border:1px solid #ddd;padding:6px">${l.url}</td>
              <td style="border:1px solid #ddd;padding:6px">${l.type}</td>
              <td style="border:1px solid #ddd;padding:6px">${l.status}</td>
              <td style="border:1px solid #ddd;padding:6px">${formatMoney(l.clientCost, project.currency)}</td>
              <td style="border:1px solid #ddd;padding:6px">${l.clientPaymentStatus ?? (l.clientPaid ? 'paid' : 'unpaid')}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    await html2pdf().set({ margin: 10, filename: `project-${project.id}-${Date.now()}.pdf`, html2canvas: { scale: 2 } }).from(container).save();
  };

  const generateFullReport = async () => {
    setReportGenerating(true);
    const container = document.createElement('div');
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.padding = '20px';
    container.style.color = '#333';

    const dateRange = reportFilters.dateFrom && reportFilters.dateTo
      ? `${reportFilters.dateFrom} — ${reportFilters.dateTo}`
      : 'Все время';

    // Filter links based on report filters
    const reportLinks = linksList.filter((l) => {
      const matchProject = reportFilters.project === 'all' || String(l.projectId) === reportFilters.project;
      const matchDateFrom = !reportFilters.dateFrom || (l.addedDate && l.addedDate >= reportFilters.dateFrom);
      const matchDateTo = !reportFilters.dateTo || (l.addedDate && l.addedDate <= reportFilters.dateTo);
      return matchProject && matchDateFrom && matchDateTo;
    });

    // Filter projects to only those that have links in the report
    const reportProjectIds = [...new Set(reportLinks.map((l) => l.projectId))];
    const reportProjects = projectsList.filter((p) => reportProjectIds.includes(p.id));

    let html = `
      <div style="text-align:center; margin-bottom: 20px;">
        <h1 style="font-size: 22px; margin: 0; color: #111;">Отчёт по проектам и ссылкам</h1>
        <p style="font-size: 12px; color: #666; margin-top: 6px;">Период: ${dateRange}</p>
        <p style="font-size: 12px; color: #666;">Сформирован: ${new Date().toLocaleString('ru-RU')}</p>
      </div>
      <table style="width:100%; border-collapse: collapse; font-size: 10px;">
        <thead>
          <tr style="background: #1e3a8a; color: white;">
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">№</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Проект</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Клиент</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Статус</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Ссылок</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">В работе</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Удалено</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Успех %</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Выручка</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Выплаты</th>
          </tr>
        </thead>
        <tbody>
    `;

    reportProjects.forEach((project) => {
      const projectLinks = reportLinks.filter((l) => l.projectId === project.id);
      const revenue = projectLinks.reduce((sum, l) => sum + (l.clientPaid ? l.clientCost : 0), 0);
      const payouts = projectLinks.reduce((sum, l) => sum + (l.executorPaid ? l.executorCost : 0), 0);
      const client = clientsList.find((c) => c.id === project.clientId);
      html += `
        <tr>
          <td style="padding: 6px 8px; border: 1px solid #ddd;">${project.id}</td>
          <td style="padding: 6px 8px; border: 1px solid #ddd;">${project.name}</td>
          <td style="padding: 6px 8px; border: 1px solid #ddd;">${client?.companyName || '—'}</td>
          <td style="padding: 6px 8px; border: 1px solid #ddd;">${project.status}</td>
          <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">${projectLinks.length}</td>
          <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">${projectLinks.filter((l) => l.status === 'в работе').length}</td>
          <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">${projectLinks.filter((l) => ['удалено', 'принято', 'деиндексировано google', 'деиндексировано yandex'].includes(l.status)).length}</td>
          <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">${projectLinks.length > 0 ? Math.round((projectLinks.filter((l) => ['удалено', 'принято', 'деиндексировано google'].includes(l.status)).length / projectLinks.length) * 100) : 0}%</td>
          <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center; white-space: nowrap;">${formatMoney(revenue, project.currency)}</td>
          <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center; white-space: nowrap;">${formatMoney(payouts, project.currency)}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    // Links section
    html += `
      <h2 style="font-size: 16px; margin: 20px 0 10px; color: #111;">Ссылки</h2>
      <table style="width:100%; border-collapse: collapse; font-size: 10px;">
        <thead>
          <tr style="background: #1e3a8a; color: white;">
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">№</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">URL</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Проект</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Тип</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Статус</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Стоимость</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Оплата клиента</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Выплата исполнителю</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Исполнитель</th>
          </tr>
        </thead>
        <tbody>
    `;

    reportLinks.forEach((link) => {
      const project = projectsList.find((p) => p.id === link.projectId);
      const executor = usersList.find((u) => u.id === link.executorId);
      html += `
        <tr>
          <td style="padding: 6px 8px; border: 1px solid #ddd;">${link.id}</td>
          <td style="padding: 6px 8px; border: 1px solid #ddd; word-break: break-all; max-width: 240px;">${link.url}</td>
          <td style="padding: 6px 8px; border: 1px solid #ddd;">${project?.name || '—'}</td>
          <td style="padding: 6px 8px; border: 1px solid #ddd;">${link.type}</td>
          <td style="padding: 6px 8px; border: 1px solid #ddd;">${link.status}</td>
          <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center; white-space: nowrap;">${formatMoney(link.clientCost, project?.currency)}</td>
          <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">${link.clientPaid ? 'Да' : 'Нет'}</td>
          <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">${link.executorPaid ? 'Да' : 'Нет'}</td>
          <td style="padding: 6px 8px; border: 1px solid #ddd;">${executor?.fullName || '—'}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
      <div style="margin-top: 20px; font-size: 10px; color: #888; text-align: center;">
        Всего проектов: ${reportProjects.length} · Всего ссылок: ${reportLinks.length}
      </div>
    `;
    container.innerHTML = html;

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `deindex.ru_report_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    };

    try {
      const worker = html2pdf().set(opt).from(container);
      const blobUrl = await worker.output('bloburl');
      setReportDownloadUrl(blobUrl);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('PDF generation failed', e);
    }
    setReportGenerating(false);
  };

  const renderOverview = () => (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50">
              <i className="ri-user-line text-blue-900 text-lg" />
            </div>
            <div className="text-xs font-semibold text-gray-500 leading-tight">Всего пользователей</div>
          </div>
          <div className="text-xl font-bold text-gray-800">{usersList.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">{usersList.filter((u) => u.status === 'активен').length} активных</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-50">
              <i className="ri-briefcase-line text-green-600 text-lg" />
            </div>
            <div className="text-xs font-semibold text-gray-500 leading-tight">Всего клиентов</div>
          </div>
          <div className="text-xl font-bold text-gray-800">{clientsList.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">{clientsList.filter((c) => c.status === 'активен').length} активных</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50">
              <i className="ri-folder-line text-blue-600 text-lg" />
            </div>
            <div className="text-xs font-semibold text-gray-500 leading-tight">{period === 'month' ? 'Проектов за месяц' : period === 'quarter' ? 'Проектов за квартал' : 'Проектов за год'}</div>
          </div>
          <div className="text-xl font-bold text-gray-800">{periodFilteredProjects.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">{periodFilteredProjects.filter((p) => p.status === 'в работе').length} в работе</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50">
              <i className="ri-money-cny-circle-line text-emerald-600 text-lg" />
            </div>
            <div className="text-xs font-semibold text-gray-500 leading-tight">Выручка ({periodLabels[period]})</div>
          </div>
          <div className="text-xl font-bold text-gray-800">
            {formatMoney(periodFilteredPayments.filter((p) => p.type === 'оплата клиента' && p.status === 'оплачен' && p.currency === 'RUB').reduce((sum, p) => sum + p.amount, 0), 'RUB')}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {`${periodFilteredPayments.filter((p) => p.type === 'оплата клиента' && p.status === 'оплачен' && p.currency === 'USD').reduce((sum, p) => sum + p.amount, 0).toLocaleString('ru')} $`}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50">
              <i className="ri-alert-line text-red-600 text-lg" />
            </div>
            <div className="text-xs font-semibold text-gray-500 leading-tight">Задолженность</div>
          </div>
          <div className="text-xl font-bold text-gray-800">{formatMoney(totalDebt, 'RUB')}</div>
          <div className="text-xs text-gray-500 mt-0.5">по клиентам</div>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label={`Ссылок в работе (${periodLabels[period]})`}
          value={periodFilteredLinks.filter((l) => l.status === 'в работе').length}
          icon="ri-loader-4-line"
          accent="text-orange-600"
        />
        <KPICard
          label="Успех удаления"
          value={`${mockAdminStats.successRate}%`}
          icon="ri-checkbox-circle-line"
          accent="text-green-600"
        />
        <KPICard
          label={`В карантине (${periodLabels[period]})`}
          value={periodFilteredLinks.filter((l) => l.status === 'в карантине').length}
          icon="ri-hospital-line"
          accent="text-orange-600"
        />
        <KPICard
          label={`Вернувшиеся (${periodLabels[period]})`}
          value={periodFilteredLinks.filter((l) => l.status === 'вернулось').length}
          icon="ri-arrow-go-back-line"
          accent="text-red-600"
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Динамика работы ({periodLabels[period]})</h3>
          <div className="flex flex-col gap-3">
            {mockChartData.map((item) => (
              <div key={item.date} className="flex items-center gap-3">
                <div className="w-8 text-xs text-gray-500 text-center">{item.date}</div>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${(item.removed / 50) * 100}%` }} />
                  </div>
                  <span className="w-8 text-xs font-semibold text-emerald-700">{item.removed}</span>
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${(item.deindexed / 50) * 100}%` }} />
                  </div>
                  <span className="w-8 text-xs font-semibold text-amber-700">{item.deindexed}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Удалено</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />Деиндексировано</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Топ клиентов</h3>
          <div className="flex flex-col gap-3">
            {mockTopClients.map((client) => (
              <div key={client.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 flex-shrink-0">
                  <i className="ri-building-line text-blue-900 text-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-800 truncate">{client.name}</div>
                  <div className="text-xs text-gray-500">{client.links} ссылок · {client.projects} проектов</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-800">{client.successRate}%</div>
                  <div className="text-[10px] text-gray-500">успех</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  const renderUsers = () => (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-base font-bold text-gray-800">Пользователи системы</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              value={searchUsers}
              onChange={(e) => setSearchUsers(e.target.value)}
              placeholder="Поиск по имени, логину, email"
              className="pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-slate-400 w-56"
            />
          </div>
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-700 focus:outline-none focus:border-slate-400 cursor-pointer"
            >
              <option value="all">Все роли</option>
              <option value="client">Клиент</option>
              <option value="executor">Исполнитель</option>
              <option value="auditor">Аудитор</option>
              <option value="admin">Администратор</option>
              <option value="manager">Руководитель</option>
              <option value="main_admin">Гл. администратор</option>
            </select>
            <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <button
            onClick={() => setUserModal({ open: true })}
            className="px-3 py-2 bg-blue-900 text-white text-xs font-semibold rounded-lg hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5"
          >
            <i className="ri-user-add-line" />
            Создать
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ФИО</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Логин</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Роль</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Псевдоним</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Статус</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3 text-sm text-gray-500 font-mono">#{user.id}</td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-800">{user.fullName}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{user.login}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${roleColors[user.role] || 'bg-gray-100 text-gray-600'}`}>
                    {roleDisplayNames[user.role] || user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{user.alias || '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={user.status} type="payment" /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setUserModal({ open: true, user })} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-50 text-gray-400 hover:text-blue-900 cursor-pointer" title="Редактировать">
                      <i className="ri-pencil-line text-sm" />
                    </button>
                    <button onClick={() => handleToggleBlock(user)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 cursor-pointer" title={user.status === 'активен' ? 'Заблокировать' : 'Разблокировать'}>
                      <i className={`${user.status === 'активен' ? 'ri-lock-line' : 'ri-lock-unlock-line'} text-sm`} />
                    </button>
                    <button onClick={() => handleDeleteUser(user.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 cursor-pointer" title="Удалить">
                      <i className="ri-delete-bin-line text-sm" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // projectsList, handleSaveClient, handleSaveProject already defined above

  const [editingSourceId, setEditingSourceId] = useState<number | null>(null);
  const [editingSourceValue, setEditingSourceValue] = useState('');

  const handleSourceEdit = (project: CRMProject) => {
    setEditingSourceId(project.id);
    setEditingSourceValue(project.source || '');
  };

  const handleSourceSave = (project: CRMProject) => {
    crm.updateProject({ ...project, source: editingSourceValue.trim() });
    setEditingSourceId(null);
    setEditingSourceValue('');
  };

  const renderProjects = () => (
    <div className="flex flex-col gap-4">
      {/* Project filters bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col lg:flex-row gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[240px]">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center">
            <i className="ri-search-line text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Поиск по проекту, домену..."
            value={projectFilters.search}
            onChange={(e) => setProjectFilters((prev) => ({ ...prev, search: e.target.value }))}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
          />
        </div>
        <select
          value={projectFilters.status}
          onChange={(e) => setProjectFilters((prev) => ({ ...prev, status: e.target.value as ProjectStatus | 'all' }))}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
        >
          <option value="all">Все статусы</option>
          <option value="новый">Новый</option>
          <option value="в работе">В работе</option>
          <option value="на паузе">На паузе</option>
          <option value="завершён">Завершён</option>
          <option value="просрочен">Просрочен</option>
        </select>
        <button
          onClick={() => setProjectFilters({ search: '', status: 'all' })}
          className="px-3 py-2 text-sm text-blue-900 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
        >
          Сбросить
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800">Проекты</h2>
          <button
            onClick={() => setProjectModal({ open: true })}
            className="px-3 py-2 bg-blue-900 text-white text-xs font-semibold rounded-lg hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5"
          >
            <i className="ri-add-line" />
            Создать проект
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Проект</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Статус</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Источник</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ответственный</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ссылок</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">В работе</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Удалено</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Успех %</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Валюта</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Дедлайн</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <tr key={project.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-semibold text-gray-800 cursor-pointer hover:text-blue-900 transition-colors" onClick={() => setProjectDetailId(project.id)}>
                    <div className="font-semibold text-gray-800 truncate max-w-[180px]">{project.name}</div>
                    <div className="text-[11px] text-gray-400 font-normal">{project.domain}</div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={project.status} type="project" /></td>
                  <td className="px-4 py-3">
                    {editingSourceId === project.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          type="text"
                          value={editingSourceValue}
                          onChange={(e) => setEditingSourceValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSourceSave(project);
                            if (e.key === 'Escape') setEditingSourceId(null);
                          }}
                          placeholder="Откуда пришёл?"
                          className="w-28 px-2 py-1 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-slate-500"
                        />
                        <button onClick={() => handleSourceSave(project)} className="w-6 h-6 flex items-center justify-center rounded-lg bg-blue-900 text-white hover:bg-blue-800 cursor-pointer flex-shrink-0">
                          <i className="ri-check-line text-xs" />
                        </button>
                        <button onClick={() => setEditingSourceId(null)} className="w-6 h-6 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer flex-shrink-0">
                          <i className="ri-close-line text-xs" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleSourceEdit(project)}
                        className="flex items-center gap-1 group cursor-pointer"
                        title="Нажмите, чтобы изменить источник"
                      >
                        {project.source ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-blue-800 group-hover:bg-slate-100 transition-colors">
                            <i className="ri-map-pin-2-line text-[10px]" />
                            {project.source}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300 italic group-hover:text-slate-400 transition-colors">+ добавить</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {project.executorId
                      ? usersList.find((u) => u.id === project.executorId)?.fullName || '—'
                      : <span className="text-gray-300 italic">Не назначен</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-center">{project.totalLinks}</td>
                  <td className="px-4 py-3 text-sm text-blue-600 font-semibold text-center">{project.inProgress}</td>
                  <td className="px-4 py-3 text-sm text-green-600 font-semibold text-center">{project.removed}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-100 rounded-full h-1.5">
                        <div className="bg-slate-500 h-1.5 rounded-full" style={{ width: `${project.successRate}%` }} />
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{project.successRate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-center">{project.currency}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{project.deadline || '—'}</td>
                  <td className="px-4 py-3 flex items-center gap-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/management/links?project=${project.id}`); }}
                      className="px-2.5 py-1.5 bg-slate-50 text-blue-800 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-links-line mr-1" />
                      Ссылки
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteProject(project); }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 cursor-pointer"
                      title="Удалить проект"
                    >
                      <i className="ri-delete-bin-line text-sm" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-sm text-gray-400">
                    Нет проектов по выбранным фильтрам
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const filteredLinksList = useMemo(() => {
    return linksList.filter((l) => {
      const matchSearch = !linksFilters.search || l.url.toLowerCase().includes(linksFilters.search.toLowerCase());
      const matchStatus = linksFilters.status === 'all' || l.status === linksFilters.status;
      const matchProject = linksFilters.project === 'all' || String(l.projectId) === linksFilters.project;
      const matchType = linksFilters.type === 'all' || l.type === linksFilters.type;
      const matchGeo = linksFilters.geo === 'all' || (l.geo && l.geo.includes(linksFilters.geo));
      const matchClientPaid = linksFilters.clientPaid === 'all' || (linksFilters.clientPaid === 'yes' ? l.clientPaid : !l.clientPaid);
      const matchExecutorPaid = linksFilters.executorPaid === 'all' || (linksFilters.executorPaid === 'yes' ? l.executorPaid : !l.executorPaid);
      const matchDelivered = linksFilters.deliveredToClient === 'all' || (linksFilters.deliveredToClient === 'yes' ? ['сдано', 'сдано клиенту', 'принято', 'не принято', 'отправлено клиенту'].includes(l.status) : !['сдано', 'сдано клиенту', 'принято', 'не принято', 'отправлено клиенту'].includes(l.status));
      return matchSearch && matchStatus && matchProject && matchType && matchGeo && matchClientPaid && matchExecutorPaid && matchDelivered;
    });
  }, [linksList, linksFilters]);

  // Project filters
  const [projectFilters, setProjectFilters] = useState({
    search: '',
    status: 'all' as ProjectStatus | 'all',
  });
  const filteredProjects = useMemo(() => {
    return projectsList.filter((p) => {
      const matchSearch = !projectFilters.search ||
        p.name.toLowerCase().includes(projectFilters.search.toLowerCase()) ||
        p.domain.toLowerCase().includes(projectFilters.search.toLowerCase());
      const matchStatus = projectFilters.status === 'all' || p.status === projectFilters.status;
      return matchSearch && matchStatus;
    });
  }, [projectsList, projectFilters]);

  const handleDeleteProject = (project: CRMProject) => {
    setConfirmModal({
      open: true,
      title: 'Удалить проект',
      message: `Проект «${project.name}» будет удалён вместе со всеми ссылками, аудитами и платежами. Это действие нельзя отменить.`,
      onConfirm: () => {
        crm.deleteProject(project.id);
        setConfirmModal(null);
      },
      confirmText: 'Удалить',
      danger: true,
    });
  };

  // Executor filters
  const [executorFilters, setExecutorFilters] = useState({
    search: '',
    status: 'all' as 'all' | 'активен' | 'заблокирован',
  });

  // Overdue filters
  const [overdueFilters, setOverdueFilters] = useState({
    search: '',
    type: 'all' as 'all' | 'удаление' | 'деиндексация' | 'удаление+деиндексация',
    status: 'all' as LinkStatus | 'all',
    project: 'all',
    client: 'all',
  });
  const filteredOverdueLinks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const base = linksList.filter(
      (l) =>
        l.deadline &&
        l.deadline < today &&
        !COMPLETED_WORK_STATUSES.includes(l.status)
    );
    return base.filter((l) => {
      const matchSearch = !overdueFilters.search || l.url.toLowerCase().includes(overdueFilters.search.toLowerCase());
      const matchType = overdueFilters.type === 'all' || l.type === overdueFilters.type;
      const matchStatus = overdueFilters.status === 'all' || l.status === overdueFilters.status;
      const matchProject = overdueFilters.project === 'all' || String(l.projectId) === overdueFilters.project;
      const matchClient = overdueFilters.client === 'all' || String(l.clientId) === overdueFilters.client;
      return matchSearch && matchType && matchStatus && matchProject && matchClient;
    });
  }, [linksList, overdueFilters]);

  const renderLinks = () => (
    <div className="flex flex-col gap-4">
      {/* Filters bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col lg:flex-row gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[240px]">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center">
            <i className="ri-search-line text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Поиск по URL, проекту, типу, гео, статусу..."
            value={linksFilters.search}
            onChange={(e) => setLinksFilters((prev) => ({ ...prev, search: e.target.value }))}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
          />
        </div>
        <select
          value={linksFilters.project}
          onChange={(e) => setLinksFilters((prev) => ({ ...prev, project: e.target.value }))}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
        >
          <option value="all">Все проекты</option>
          {projectsList.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={linksFilters.type}
          onChange={(e) => setLinksFilters((prev) => ({ ...prev, type: e.target.value }))}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
        >
          <option value="all">Все типы</option>
          <option value="удаление">Удаление</option>
          <option value="деиндексация">Деиндексация</option>
          <option value="удаление+деиндексация">Удаление + Деиндексация</option>
        </select>
        <select
          value={linksFilters.geo}
          onChange={(e) => setLinksFilters((prev) => ({ ...prev, geo: e.target.value }))}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
        >
          <option value="all">Все гео</option>
          <option value="Россия">Россия</option>
          <option value="Казахстан">Казахстан</option>
          <option value="Беларусь">Беларусь</option>
          <option value="Украина">Украина</option>
          <option value="Таджикистан">Таджикистан</option>
          <option value="Азербайджан">Азербайджан</option>
          <option value="Грузия">Грузия</option>
          <option value="Турция">Турция</option>
          <option value="Армения">Армения</option>
          <option value="Молдова">Молдова</option>
          <option value="Киргизия">Киргизия</option>
        </select>
        <select
          value={linksFilters.status}
          onChange={(e) => setLinksFilters((prev) => ({ ...prev, status: e.target.value as LinkStatus | 'all' }))}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
        >
          <option value="all">Все статусы</option>
          <option value="удалено">Удалено</option>
          <option value="деиндексировано google">Деиндексировано Google</option>
          <option value="деиндексировано yandex">Деиндексировано Яндекс</option>
          <option value="деиндексировано bing">Деиндексировано Bing</option>
          <option value="частично деиндексировано">Частично деиндексировано</option>
          <option value="на паузе">На паузе</option>
          <option value="не взято в работу">Не в работе</option>
          <option value="вернулось">Вернулось</option>
          <option value="в карантине">В карантине</option>
        </select>
        <select
          value={linksFilters.clientPaid}
          onChange={(e) => setLinksFilters((prev) => ({ ...prev, clientPaid: e.target.value as 'all' | 'yes' | 'no' }))}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
        >
          <option value="all">Оплата клиента</option>
          <option value="yes">Оплачено</option>
          <option value="no">Не оплачено</option>
        </select>
        <select
          value={linksFilters.executorPaid}
          onChange={(e) => setLinksFilters((prev) => ({ ...prev, executorPaid: e.target.value as 'all' | 'yes' | 'no' }))}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
        >
          <option value="all">Оплата исполнителю</option>
          <option value="yes">Выплачено</option>
          <option value="no">Не выплачено</option>
        </select>
        <button
          onClick={() => setLinksFilters({ search: '', status: 'all', project: 'all', type: 'all', geo: 'all', clientPaid: 'all', executorPaid: 'all', deliveredToClient: 'all' })}
          className="px-3 py-2 text-sm text-blue-900 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
        >
          Сбросить
        </button>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Всего', count: filteredLinksList.length, color: 'bg-gray-100 text-gray-600' },
          { label: 'Удалено', count: filteredLinksList.filter((l) => l.status === 'удалено').length, color: 'bg-green-100 text-green-700' },
          { label: 'Деиндексировано', count: filteredLinksList.filter((l) => ['деиндексировано google', 'деиндексировано yandex', 'деиндексировано bing'].includes(l.status)).length, color: 'bg-teal-100 text-teal-700' },
          { label: 'Частично деинд.', count: filteredLinksList.filter((l) => l.status === 'частично деиндексировано').length, color: 'bg-cyan-100 text-cyan-700' },
          { label: 'На паузе', count: filteredLinksList.filter((l) => l.status === 'на паузе').length, color: 'bg-yellow-100 text-yellow-700' },
          { label: 'Не в работе', count: filteredLinksList.filter((l) => l.status === 'не взято в работу').length, color: 'bg-gray-100 text-gray-500' },
          { label: 'Вернулось', count: filteredLinksList.filter((l) => l.status === 'вернулось').length, color: 'bg-red-100 text-red-700' },
          { label: 'В карантине', count: filteredLinksList.filter((l) => l.status === 'в карантине').length, color: 'bg-orange-100 text-orange-700' },
        ].map((s) => (
          <span key={s.label} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${s.color}`}>
            {s.label}: <strong>{s.count}</strong>
          </span>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800">Все ссылки</h2>
          <span className="text-xs text-gray-400">{filteredLinksList.length} ссылок</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">№</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">URL</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Проект</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Тип</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Гео</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Статус</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Стоимость</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Оплата клиента</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Оплата исполнителю</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Сдано клиенту</th>
              </tr>
            </thead>
            <tbody>
              {filteredLinksList.map((link) => (
                <tr key={link.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">#{link.id}</td>
                  <td className="px-4 py-3">
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-900 hover:text-blue-800 truncate max-w-[200px] block">{link.url}</a>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{projectsList.find((p) => p.id === link.projectId)?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${link.type === 'удаление' ? 'bg-red-100 text-red-700' : link.type === 'деиндексация' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{link.type === 'удаление+деиндексация' ? 'удаление\\деиндексация' : link.type}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{link.geo || '—'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={link.status}
                      onChange={(e) => handleStatusChange(link.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white cursor-pointer focus:outline-none focus:border-slate-400"
                    >
                      <option value="в работе">В работе</option>
                      <option value="готово">Готово</option>
                      <option value="сдано">Сдано</option>
                      <option value="сдано клиенту">Сдано клиенту</option>
                      <option value="удалено">Удалено</option>
                      <option value="деиндексировано google">Деинд. Google</option>
                      <option value="деиндексировано yandex">Деинд. Яндекс</option>
                      <option value="деиндексировано bing">Деинд. Bing</option>
                      <option value="частично деиндексировано">Частично деинд.</option>
                      <option value="на паузе">На паузе</option>
                      <option value="не взято в работу">Не в работе</option>
                      <option value="вернулось">Вернулось</option>
                      <option value="в карантине">В карантине</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {formatMoney(link.clientCost, projectsList.find((p) => p.id === link.projectId)?.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={link.clientPaymentStatus ?? (link.clientPaid ? 'paid' : 'unpaid')}
                      onChange={(e) => handleClientPaymentChange(link, e.target.value as ClientPaymentStatus)}
                      className="text-xs border rounded-lg px-2 py-1 cursor-pointer focus:outline-none font-semibold bg-white"
                    >
                      <option value="unpaid">Не оплачено</option>
                      <option value="partially_paid">Частично</option>
                      <option value="paid">Оплачено</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={link.executorPaymentStatus ?? (link.executorPaid ? 'paid_to_executor' : 'not_accrued')}
                      onChange={(e) => handleExecutorPaymentChange(link, e.target.value as ExecutorPaymentStatus)}
                      className="text-xs border rounded-lg px-2 py-1 cursor-pointer focus:outline-none font-semibold bg-white"
                    >
                      <option value="not_accrued">Не начислено</option>
                      <option value="accrued">Начислено</option>
                      <option value="paid_to_executor">Выплачено</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {['сдано', 'сдано клиенту', 'принято', 'не принято', 'отправлено клиенту'].includes(link.status) ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-700"><i className="ri-checkbox-circle-line" />Да</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-gray-400"><i className="ri-close-circle-line" />Нет</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredLinksList.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-gray-400">
                    Нет ссылок по выбранным фильтрам
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // (renderAudits removed — using AuditsTab component)

  const renderExecutors = () => {
    const executors = usersList.filter((u) => u.role === 'executor');
    const filteredExecutors = executors.filter((exec) => {
      const matchSearch = !executorFilters.search ||
        exec.fullName.toLowerCase().includes(executorFilters.search.toLowerCase()) ||
        exec.login.toLowerCase().includes(executorFilters.search.toLowerCase()) ||
        (exec.alias && exec.alias.toLowerCase().includes(executorFilters.search.toLowerCase()));
      const matchStatus = executorFilters.status === 'all' || exec.status === executorFilters.status;
      return matchSearch && matchStatus;
    });
    return (
      <div className="flex flex-col gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col lg:flex-row gap-3 flex-wrap items-center">
          <div className="relative flex-1 min-w-[240px]">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center">
              <i className="ri-search-line text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Поиск по имени, логину, псевдониму..."
              value={executorFilters.search}
              onChange={(e) => setExecutorFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
            />
          </div>
          <select
            value={executorFilters.status}
            onChange={(e) => setExecutorFilters((prev) => ({ ...prev, status: e.target.value as 'all' | 'активен' | 'заблокирован' }))}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
          >
            <option value="all">Все статусы</option>
            <option value="активен">Активен</option>
            <option value="заблокирован">Заблокирован</option>
          </select>
          <button
            onClick={() => setExecutorFilters({ search: '', status: 'all' })}
            className="px-3 py-2 text-sm text-blue-900 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            Сбросить
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 mb-2">
              <i className="ri-team-line text-blue-900 text-lg" />
            </div>
            <div className="text-xl font-bold text-gray-800">{executors.length}</div>
            <div className="text-xs text-gray-500 mt-0.5">Исполнителей</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-50 mb-2">
              <i className="ri-user-follow-line text-green-600 text-lg" />
            </div>
            <div className="text-xl font-bold text-gray-800">{executors.filter((u) => u.status === 'активен').length}</div>
            <div className="text-xs text-gray-500 mt-0.5">Активных</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 mb-2">
              <i className="ri-loader-4-line text-blue-600 text-lg" />
            </div>
            <div className="text-xl font-bold text-gray-800">{linksList.filter((l) => l.status === 'в работе' && l.executorId !== null).length}</div>
            <div className="text-xs text-gray-500 mt-0.5">В работе ссылок</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-orange-50 mb-2">
              <i className="ri-hand-coin-line text-orange-600 text-lg" />
            </div>
            <div className="text-xl font-bold text-gray-800">{formatMoney(rubPayouts, 'RUB')}</div>
            <div className="text-xs text-gray-500 mt-0.5">Выплат (RUB)</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-gray-800">Исполнители</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Исполнитель</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Псевдоним</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Статус</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ссылок выполнено</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">В работе</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Заработок</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Выплачено</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Остаток</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredExecutors.map((exec) => {
                  const doneLinks = linksList.filter((l) => l.executorId === exec.id && ['удалено', 'деиндексировано google', 'деиндексировано yandex', 'принято'].includes(l.status));
                  const inWorkLinks = linksList.filter((l) => l.executorId === exec.id && l.status === 'в работе');
                  const totalEarned = doneLinks.reduce((sum, l) => sum + l.executorCost, 0);
                  const paid = doneLinks.filter((l) => l.executorPaid).reduce((sum, l) => sum + l.executorCost, 0);
                  return (
                    <tr key={exec.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800">{exec.fullName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{exec.alias || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={exec.status} type="payment" /></td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-center">{doneLinks.length}</td>
                      <td className="px-4 py-3 text-sm text-blue-600 font-semibold text-center">{inWorkLinks.length}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-700">
                        {formatGroupedAmounts(groupAmountsByCurrency(doneLinks.map((l) => ({ amount: l.executorCost, currency: projectsList.find((p) => p.id === l.projectId)?.currency }))))}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600">
                        {formatGroupedAmounts(groupAmountsByCurrency(doneLinks.filter((l) => l.executorPaid).map((l) => ({ amount: l.executorCost, currency: projectsList.find((p) => p.id === l.projectId)?.currency }))))}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-orange-600">
                        {formatGroupedAmounts(groupAmountsByCurrency(doneLinks.filter((l) => !l.executorPaid).map((l) => ({ amount: l.executorCost, currency: projectsList.find((p) => p.id === l.projectId)?.currency }))))}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setExecutorReportId(exec.id)}
                          className="px-2.5 py-1.5 bg-slate-50 text-blue-800 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Отчёт
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredExecutors.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400">
                      Нет исполнителей по выбранным фильтрам
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Auditor search state (moved to component top-level to comply with hooks rules)
  const [auditorSearch, setAuditorSearch] = useState('');

  const renderAuditors = () => {
    const auditors = usersList.filter((u) => u.role === 'auditor');
    const filteredAuditors = auditors.filter((aud) =>
      !auditorSearch ||
      aud.fullName.toLowerCase().includes(auditorSearch.toLowerCase()) ||
      aud.login.toLowerCase().includes(auditorSearch.toLowerCase())
    );
    return (
      <div className="flex flex-col gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col lg:flex-row gap-3 flex-wrap items-center">
          <div className="relative flex-1 min-w-[240px]">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center">
              <i className="ri-search-line text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Поиск по имени, логину..."
              value={auditorSearch}
              onChange={(e) => setAuditorSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
            />
          </div>
          <button
            onClick={() => setAuditorSearch('')}
            className="px-3 py-2 text-sm text-blue-900 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            Сбросить
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-pink-50 mb-2">
              <i className="ri-search-line text-pink-600 text-lg" />
            </div>
            <div className="text-xl font-bold text-gray-800">{auditors.length}</div>
            <div className="text-xs text-gray-500 mt-0.5">Аудиторов</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 mb-2">
              <i className="ri-file-search-line text-blue-900 text-lg" />
            </div>
            <div className="text-xl font-bold text-gray-800">{crm.audits.length}</div>
            <div className="text-xs text-gray-500 mt-0.5">Всего аудитов</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-50 mb-2">
              <i className="ri-loader-4-line text-amber-600 text-lg" />
            </div>
            <div className="text-xl font-bold text-gray-800">{linksList.filter((l) => l.status === 'в аудите').length}</div>
            <div className="text-xs text-gray-500 mt-0.5">В работе</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-50 mb-2">
              <i className="ri-checkbox-circle-line text-green-600 text-lg" />
            </div>
            <div className="text-xl font-bold text-gray-800">{linksList.filter((l) => l.status === 'аудит выполнен').length}</div>
            <div className="text-xs text-gray-500 mt-0.5">Выполнено</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-gray-800">Аудиторы</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Аудитор</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Статус</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Аудитов выполнено</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">В работе</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Средний срок</th>
                </tr>
              </thead>
              <tbody>
                {filteredAuditors.map((aud) => {
                  const auditsDone = crm.audits.filter((a) => a.auditorId === aud.id);
                  const inProgress = linksList.filter((l) => l.status === 'в аудите' && l.auditorId === aud.id).length;
                  const avgDays = auditsDone.length > 0 ? Math.round(auditsDone.reduce((s, a) => s + a.removalDaysEstimate + a.deindexDaysEstimate, 0) / auditsDone.length) : 0;
                  return (
                    <tr key={aud.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800">{aud.fullName}</td>
                      <td className="px-4 py-3"><StatusBadge status={aud.status} type="payment" /></td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-center">{auditsDone.length}</td>
                      <td className="px-4 py-3 text-sm text-amber-600 font-semibold text-center">{inProgress}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-center">{avgDays} дн</td>
                    </tr>
                  );
                })}
                {filteredAuditors.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">
                      Нет аудиторов по выбранным фильтрам
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderFinance = () => (
    <div className="flex flex-col gap-5">
      {/* Sub-tab switcher */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1">
          {(['operations', 'report'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFinanceSubTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                financeSubTab === t ? 'bg-blue-900 text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'operations' ? 'Операции' : 'Отчёт'}
            </button>
          ))}
        </div>
      </div>

      {financeSubTab === 'operations' ? (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col lg:flex-row gap-3 flex-wrap items-start">
            <div className="relative flex-1 min-w-[200px]">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center">
                <i className="ri-search-line text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Поиск по описанию..."
                value={financeFilters.search || ''}
                onChange={(e) => setFinanceFilters((prev) => ({ ...prev, search: e.target.value }))}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
              />
            </div>
            <select
              value={financeFilters.type || 'all'}
              onChange={(e) => setFinanceFilters((prev) => ({ ...prev, type: e.target.value as any }))}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
            >
              <option value="all">Все типы</option>
              <option value="оплата клиента">Оплата клиента</option>
              <option value="выплата исполнителю">Выплата исполнителю</option>
            </select>
            <select
              value={financeFilters.project}
              onChange={(e) => setFinanceFilters((prev) => ({ ...prev, project: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
            >
              <option value="all">Все проекты</option>
              {projectsList.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select
              value={financeFilters.executor}
              onChange={(e) => setFinanceFilters((prev) => ({ ...prev, executor: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
            >
              <option value="all">Все исполнители</option>
              {usersList.filter((u) => u.role === 'executor').map((u) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </select>
            <input
              type="date"
              value={financeFilters.dateFrom}
              onChange={(e) => setFinanceFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
            />
            <input
              type="date"
              value={financeFilters.dateTo}
              onChange={(e) => setFinanceFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Мин сумма"
                value={financeFilters.amountMin}
                onChange={(e) => setFinanceFilters((prev) => ({ ...prev, amountMin: e.target.value }))}
                className="w-28 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
              />
              <span className="text-gray-400">—</span>
              <input
                type="number"
                placeholder="Макс сумма"
                value={financeFilters.amountMax}
                onChange={(e) => setFinanceFilters((prev) => ({ ...prev, amountMax: e.target.value }))}
                className="w-28 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
              />
            </div>
            <button
              onClick={() => setFinanceFilters({ project: 'all', status: 'all', executor: 'all', dateFrom: '', dateTo: '', amountMin: '', amountMax: '', search: '', type: 'all' })}
              className="px-3 py-2 text-sm text-blue-900 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
            >
              Сбросить
            </button>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <span className="text-sm font-medium text-gray-600">Валюта:</span>
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
              {(['all', 'RUB', 'USD', 'EUR', 'AED'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrencyFilter(c)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                    currencyFilter === c ? 'bg-blue-900 text-white' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {c === 'all' ? 'Все' : `${getCurrencySymbol(c)} ${c}`}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-400 ml-auto">{filteredPayments.length} записей</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Выручка (все валюты)" value={formatGroupedAmounts(revenueByCurrency)} icon="ri-coins-line" accent="text-green-600" />
            <KPICard label="Выплаты (все валюты)" value={formatGroupedAmounts(payoutsByCurrency)} icon="ri-hand-coin-line" accent="text-blue-900" />
            <KPICard label="Прибыль (все валюты)" value={formatGroupedAmounts(profitByCurrency)} icon="ri-bar-chart-line" accent="text-cyan-600" />
            <KPICard label="Задолженность" value={formatGroupedAmounts(debtByCurrency)} icon="ri-alert-line" accent="text-red-600" />
            <KPICard label="Просрочено платежей" value={paymentsList.filter((p) => p.status === 'просрочен').length} icon="ri-alarm-warning-line" accent="text-red-600" />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-800">История платежей</h2>
              <span className="text-xs text-gray-400">{currencyFilter === 'all' ? 'Все валюты' : `Только ${currencyFilter}`}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">№</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Дата</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Тип</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Сумма</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Валюта</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Статус</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Описание</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments
                    .filter((p) => currencyFilter === 'all' || p.currency === currencyFilter)
                    .map((payment) => (
                      <tr key={payment.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-500 font-mono">#{payment.id}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{payment.date}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${payment.type === 'оплата клиента' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{payment.type}</span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-800">{formatMoney(payment.amount, payment.currency)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{payment.currency}</td>
                        <td className="px-4 py-3"><StatusBadge status={payment.status} type="payment" /></td>
                        <td className="px-4 py-3 text-sm text-gray-600">{payment.description}</td>
                      </tr>
                    ))}
                  {filteredPayments.filter((p) => currencyFilter === 'all' || p.currency === currencyFilter).length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                        Нет платежей по выбранным фильтрам
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <FinanceReportTab links={linksList} payments={paymentsList} />
      )}
    </div>
  );

  const renderReports = () => {
    const periodRevenue = periodFilteredPayments
      .filter((p) => p.type === 'оплата клиента' && p.status === 'оплачен')
      .reduce((sum, p) => sum + p.amount, 0);
    const periodPayouts = periodFilteredPayments
      .filter((p) => p.type === 'выплата исполнителю' && p.status === 'оплачен')
      .reduce((sum, p) => sum + p.amount, 0);

    return (
      <div className="flex flex-col gap-5">
        {/* Period switcher */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 w-fit">
          {(['month', 'quarter', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                period === p ? 'bg-blue-900 text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>

        {/* Report filters + generate */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col lg:flex-row gap-3 flex-wrap items-start">
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">С</label>
            <input
              type="date"
              value={reportFilters.dateFrom}
              onChange={(e) => setReportFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">По</label>
            <input
              type="date"
              value={reportFilters.dateTo}
              onChange={(e) => setReportFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Проект</label>
            <select
              value={reportFilters.project}
              onChange={(e) => setReportFilters((prev) => ({ ...prev, project: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
            >
              <option value="all">Все проекты</option>
              {projectsList.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Статус оплаты</label>
            <select
              value={reportFilters.status}
              onChange={(e) => setReportFilters((prev) => ({ ...prev, status: e.target.value as any }))}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
            >
              <option value="all">Все</option>
              <option value="оплачен">Оплачен</option>
              <option value="запланирован">Запланирован</option>
              <option value="просрочен">Просрочен</option>
            </select>
          </div>
          <div className="flex flex-col gap-1 justify-end lg:pt-5">
            <button
              onClick={() => {
                setReportFilters({ dateFrom: '', dateTo: '', project: 'all', status: 'all' });
                setReportDownloadUrl(null);
              }}
              className="px-3 py-2 text-sm text-blue-900 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
            >
              Сбросить
            </button>
          </div>
          <div className="flex flex-col gap-1 justify-end lg:pt-5">
            <button
              onClick={generateFullReport}
              disabled={reportGenerating}
              className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              {reportGenerating ? (
                <>
                  <i className="ri-loader-4-line animate-spin" />
                  Формируем...
                </>
              ) : (
                <>
                  <i className="ri-file-chart-line" />
                  Сформировать отчёт
                </>
              )}
            </button>
          </div>
        </div>

        {/* Generated report download */}
        {reportDownloadUrl && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <i className="ri-check-line text-emerald-600 text-lg" />
              <span className="text-sm font-semibold text-emerald-800">Отчёт сформирован</span>
            </div>
            <a
              href={reportDownloadUrl}
              download={`deindex.ru_report_${new Date().toISOString().split('T')[0]}.pdf`}
              className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-2"
            >
              <i className="ri-download-line" />
              Скачать PDF
            </a>
          </div>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-green-50 rounded-xl p-4 border border-gray-100">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white mb-2">
              <i className="ri-coins-line text-green-600 text-lg" />
            </div>
            <div className="text-2xl font-bold text-gray-800">{formatMoney(periodRevenue, 'RUB')}</div>
            <div className="text-xs text-gray-500 mt-0.5">{`Выручка за ${periodLabels[period].toLowerCase()}`}</div>
          </div>

          <div className="bg-orange-50 rounded-xl p-4 border border-gray-100">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white mb-2">
              <i className="ri-hand-coin-line text-orange-600 text-lg" />
            </div>
            <div className="text-2xl font-bold text-gray-800">{formatMoney(periodPayouts, 'RUB')}</div>
            <div className="text-xs text-gray-500 mt-0.5">{`Выплаты за ${periodLabels[period].toLowerCase()}`}</div>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 border border-gray-100">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white mb-2">
              <i className="ri-bar-chart-line text-blue-600 text-lg" />
            </div>
            <div className="text-2xl font-bold text-gray-800">{formatMoney(periodRevenue - periodPayouts, 'RUB')}</div>
            <div className="text-xs text-gray-500 mt-0.5">{`Прибыль за ${periodLabels[period].toLowerCase()}`}</div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-gray-100">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white mb-2">
              <i className="ri-links-line text-blue-900 text-lg" />
            </div>
            <div className="text-2xl font-bold text-gray-800">{linksList.length}</div>
            <div className="text-xs text-gray-500 mt-0.5">Всего ссылок</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-bold text-gray-800">Разбивка по проектам за {periodLabels[period].toLowerCase()}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-200">
                  {['Проект', 'Клиент', 'Ссылок', 'В работе', 'Удалено', 'Успех %', 'Выручка', 'Выплаты', 'Прибыль'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periodFilteredProjects.map((project) => {
                  const projectLinks = periodFilteredLinks.filter((l) => l.projectId === project.id);
                  const revenue = projectLinks.reduce((sum, l) => sum + (l.clientPaid ? l.clientCost : 0), 0);
                  const payouts = projectLinks.reduce((sum, l) => sum + (l.executorPaid ? l.executorCost : 0), 0);
                  const removed = projectLinks.filter((l) => ['удалено', 'принято', 'деиндексировано google', 'деиндексировано yandex'].includes(l.status)).length;
                  const successRate = projectLinks.length > 0 ? Math.round((removed / projectLinks.length) * 100) : 0;
                  return (
                    <tr key={project.id} className="border-b border-slate-50 hover:bg-slate-50/30">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800 whitespace-nowrap">{project.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{clientsList.find((c) => c.id === project.clientId)?.companyName || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-center">{projectLinks.length}</td>
                      <td className="px-4 py-3 text-sm text-blue-600 font-semibold text-center">{projectLinks.filter((l) => l.status === 'в работе').length}</td>
                      <td className="px-4 py-3 text-sm text-green-600 font-semibold text-center">{removed}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 bg-gray-100 rounded-full h-1.5">
                            <div className="bg-slate-500 h-1.5 rounded-full" style={{ width: `${successRate}%` }} />
                          </div>
                          <span className="text-xs font-bold text-gray-700">{successRate}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-700 whitespace-nowrap">{formatMoney(revenue, project.currency)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-700 whitespace-nowrap">{formatMoney(payouts, project.currency)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-700 whitespace-nowrap">{formatMoney(revenue - payouts, project.currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-bold text-gray-800">Отчёт по исполнителям за {periodLabels[period].toLowerCase()}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200">
                  {['Исполнитель', 'Выполнено', 'Сумма к выплате', 'Выплачено', 'Остаток', 'Действия'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usersList
                  .filter((u) => u.role === 'executor')
                  .map((executor) => {
                    const execLinks = periodFilteredLinks.filter((l) => l.executorId === executor.id && ['удалено', 'деиндексировано google', 'деиндексировано yandex', 'принято'].includes(l.status));
                    const totalCost = execLinks.reduce((sum, l) => sum + l.executorCost, 0);
                    const paid = execLinks.filter((l) => l.executorPaid).reduce((sum, l) => sum + l.executorCost, 0);
                    return (
                      <tr key={executor.id} className="border-b border-slate-50 hover:bg-slate-50/30">
                        <td className="px-4 py-3 text-sm font-semibold text-gray-800">{executor.fullName}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 text-center">{execLinks.length}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-700 whitespace-nowrap">
                          {formatGroupedAmounts(groupAmountsByCurrency(execLinks.map((l) => ({ amount: l.executorCost, currency: projectsList.find((p) => p.id === l.projectId)?.currency }))))}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-600 whitespace-nowrap">
                          {formatGroupedAmounts(groupAmountsByCurrency(execLinks.filter((l) => l.executorPaid).map((l) => ({ amount: l.executorCost, currency: projectsList.find((p) => p.id === l.projectId)?.currency }))))}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-orange-600 whitespace-nowrap">
                          {formatGroupedAmounts(groupAmountsByCurrency(execLinks.filter((l) => !l.executorPaid).map((l) => ({ amount: l.executorCost, currency: projectsList.find((p) => p.id === l.projectId)?.currency }))))}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExecutorReportId(executor.id)}
                            className="px-2.5 py-1.5 bg-slate-50 text-blue-800 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Детали
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderOverdue = () => (
    <div className="flex flex-col gap-5">
      {/* Overdue filters bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col lg:flex-row gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[240px]">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center">
            <i className="ri-search-line text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Поиск по URL..."
            value={overdueFilters.search}
            onChange={(e) => setOverdueFilters((prev) => ({ ...prev, search: e.target.value }))}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400"
          />
        </div>
        <select
          value={overdueFilters.type}
          onChange={(e) => setOverdueFilters((prev) => ({ ...prev, type: e.target.value as 'all' | 'удаление' | 'деиндексация' | 'удаление+деиндексация' }))}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
        >
          <option value="all">Все типы</option>
          <option value="удаление">Удаление</option>
          <option value="деиндексация">Деиндексация</option>
          <option value="удаление+деиндексация">Удаление + Деиндексация</option>
        </select>
        <select
          value={overdueFilters.status}
          onChange={(e) => setOverdueFilters((prev) => ({ ...prev, status: e.target.value as LinkStatus | 'all' }))}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
        >
          <option value="all">Все статусы</option>
          <option value="в работе">В работе</option>
          <option value="в карантине">В карантине</option>
          <option value="готово">Готово</option>
          <option value="сдано">Сдано</option>
          <option value="на паузе">На паузе</option>
        </select>
        <select
          value={overdueFilters.project}
          onChange={(e) => setOverdueFilters((prev) => ({ ...prev, project: e.target.value }))}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
        >
          <option value="all">Все проекты</option>
          {projectsList.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={overdueFilters.client}
          onChange={(e) => setOverdueFilters((prev) => ({ ...prev, client: e.target.value }))}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 bg-white cursor-pointer"
        >
          <option value="all">Все клиенты</option>
          {clientsList.map((c) => (
            <option key={c.id} value={c.id}>{c.companyName}</option>
          ))}
        </select>
        <button
          onClick={() => setOverdueFilters({ search: '', type: 'all', status: 'all', project: 'all', client: 'all' })}
          className="px-3 py-2 text-sm text-blue-900 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
        >
          Сбросить
        </button>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3.5 flex items-center gap-3">
        <i className="ri-alarm-warning-line text-red-500 text-xl flex-shrink-0" />
        <div>
          <span className="text-sm font-semibold text-red-700">Просроченные дедлайны: </span>
          <span className="text-sm text-red-600">{filteredOverdueLinks.length} ссылок требуют внимания</span>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-gray-800">Просроченные ссылки</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">URL</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Проект</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Клиент</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Тип</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Статус</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Дедлайн</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredOverdueLinks.map((link) => (
                <tr key={link.id} className="border-b border-slate-50 hover:bg-red-50/30 transition-colors">
                  <td className="px-4 py-3">
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-900 hover:text-blue-800 truncate max-w-[200px] block">{link.url}</a>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{projectsList.find((p) => p.id === link.projectId)?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{clientsList.find((c) => c.id === link.clientId)?.companyName || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${link.type === 'удаление' ? 'bg-red-100 text-red-700' : link.type === 'деиндексация' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{link.type === 'удаление+деиндексация' ? 'удаление\\деиндексация' : link.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={link.status}
                      onChange={(e) => handleStatusChange(link.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white cursor-pointer focus:outline-none focus:border-slate-400"
                    >
                      <option value="в работе">В работе</option>
                      <option value="в карантине">В карантине</option>
                      <option value="готово">Готово</option>
                      <option value="сдано">Сдано</option>
                      <option value="удалено">Удалено</option>
                      <option value="на паузе">На паузе</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm text-red-500 font-semibold whitespace-nowrap">{link.deadline} <i className="ri-alarm-warning-line" /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          value={commentInputs[link.id] || ''}
                          onChange={(e) => setCommentInputs((prev) => ({ ...prev, [link.id]: e.target.value }))}
                          placeholder="Комментарий..."
                          className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-slate-400 w-40"
                          maxLength={200}
                        />
                        <button
                          onClick={() => {
                            const text = commentInputs[link.id];
                            if (text?.trim()) {
                              handleAddComment(link.id, text.trim());
                              setCommentInputs((prev) => ({ ...prev, [link.id]: '' }));
                            }
                          }}
                          className="w-6 h-6 flex items-center justify-center rounded-lg bg-blue-900 text-white hover:bg-blue-800 cursor-pointer"
                        >
                          <i className="ri-add-line text-xs" />
                        </button>
                      </div>
                      {link.comments.length > 0 && (
                        <div className="flex flex-col gap-1">
                          {link.comments.slice(-2).map((c) => (
                            <div key={c.id} className="text-[10px] text-gray-500 bg-gray-50 rounded px-2 py-1">
                              <span className="font-semibold">{c.author}:</span> {c.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredOverdueLinks.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                    Нет просроченных ссылок по выбранным фильтрам
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="flex flex-col gap-5">
      {/* System Tools */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-4">Системные инструменты</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => setIntegrityModal({ open: true, issues: crm.checkIntegrity() })}
            className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer text-left"
          >
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-100 flex-shrink-0">
              <i className="ri-shield-check-line text-blue-900 text-lg" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-800">Проверка целостности данных</div>
              <div className="text-xs text-gray-500">Проверяет связи ссылок, оплат и ролей</div>
            </div>
          </button>
          {!IS_PRODUCTION_UI && (
          <button
            onClick={crm.resetTestEnvironment}
            className="flex items-center gap-3 p-4 bg-red-50 rounded-xl hover:bg-red-100 transition-colors cursor-pointer text-left"
          >
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-red-100 flex-shrink-0">
              <i className="ri-delete-bin-line text-red-600 text-lg" />
            </div>
            <div>
              <div className="text-sm font-semibold text-red-700">Сброс тестовой среды</div>
              <div className="text-xs text-red-500">Удаляет все проекты, ссылки, аудиты и платежи</div>
            </div>
          </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Настройки обезличивания</h3>
            <p className="text-xs text-gray-500 mt-0.5">Скрывать реальные имена исполнителей во внутренних отчётах</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={crm.settings.anonymizeExecutors}
              onChange={(e) => crm.setSettings((s) => ({ ...s, anonymizeExecutors: e.target.checked }))}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-900" />
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {usersList.filter((u) => u.role === 'executor').map((user) => (
            <div key={user.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 flex-shrink-0">
                <i className="ri-user-line text-blue-900 text-sm" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-800">{user.fullName}</div>
                <div className="text-xs text-gray-500">Псевдоним: {user.alias || '—'}</div>
              </div>
              <button onClick={() => setUserModal({ open: true, user })} className="text-xs text-blue-900 hover:text-blue-800 font-medium cursor-pointer whitespace-nowrap">Изменить</button>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-4">Системные настройки</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm font-semibold text-gray-800">Уведомления включены</div>
              <div className="text-xs text-gray-500">Внутренние уведомления в CRM</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={crm.settings.notificationsEnabled}
                onChange={(e) => crm.setSettings((s) => ({ ...s, notificationsEnabled: e.target.checked }))}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-900" />
            </label>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm font-semibold text-gray-800">Звуковые уведомления</div>
              <div className="text-xs text-gray-500">Короткий сигнал при новом событии</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={crm.settings.soundNotificationsEnabled}
                onChange={(e) => crm.setSettings((s) => ({ ...s, soundNotificationsEnabled: e.target.checked }))}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-900" />
            </label>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm font-semibold text-gray-800">Авто-аудит новых ссылок</div>
              <div className="text-xs text-gray-500">Автоматически отправлять на аудит</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={crm.settings.autoAuditNewLinks}
                onChange={(e) => crm.setSettings((s) => ({ ...s, autoAuditNewLinks: e.target.checked }))}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-900" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  // Helper to generate audit report as downloadable PDF
  const generateAuditReport = () => {
    setAuditReportModal({ open: true, status: 'generating' });
    setTimeout(async () => {
      const reportDate = new Date().toISOString().split('T')[0];
      const container = document.createElement('div');
      container.style.fontFamily = 'Arial, sans-serif';
      container.style.padding = '20px';
      container.style.color = '#333';

      let html = `
        <div style="text-align:center; margin-bottom: 20px;">
          <h1 style="font-size: 22px; margin: 0; color: #111;">Отчёт по аудитам</h1>
          <p style="font-size: 12px; color: #666; margin-top: 6px;">Сформирован: ${new Date().toLocaleString('ru-RU')}</p>
        </div>
        <table style="width:100%; border-collapse: collapse; font-size: 10px;">
          <thead>
            <tr style="background: #1e3a8a; color: white;">
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">№</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">URL</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Клиент</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Проект</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Удал.</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Деинд.</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Срок</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Стоимость</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Риск</th>
            </tr>
          </thead>
          <tbody>
      `;

      crm.audits.forEach((audit) => {
        const link = linksList.find((l) => l.id === audit.linkId);
        const client = link ? clientsList.find((c) => c.id === link.clientId) : null;
        const project = link ? projectsList.find((p) => p.id === link.projectId) : null;
        const totalCost = Object.values(audit.costPerSE).reduce((a, b) => a + b, 0);
        html += `
          <tr>
            <td style="padding: 6px 8px; border: 1px solid #ddd;">${audit.id}</td>
            <td style="padding: 6px 8px; border: 1px solid #ddd; word-break: break-all; max-width: 240px;">${link?.url || '—'}</td>
            <td style="padding: 6px 8px; border: 1px solid #ddd;">${client?.companyName || '—'}</td>
            <td style="padding: 6px 8px; border: 1px solid #ddd;">${project?.name || '—'}</td>
            <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">${audit.removalProbability}%</td>
            <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">${audit.deindexProbability}%</td>
            <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center;">${audit.removalDaysEstimate || audit.deindexDaysEstimate} дн</td>
            <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center; white-space: nowrap;">${formatMoney(totalCost, project?.currency)}</td>
            <td style="padding: 6px 8px; border: 1px solid #ddd;">${audit.riskLevel}</td>
          </tr>
        `;
      });

      html += `
          </tbody>
        </table>
        <div style="margin-top: 20px; font-size: 10px; color: #888; text-align: center;">
          Всего аудитов: ${crm.audits.length}
        </div>
      `;
      container.innerHTML = html;

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `audit-report-${reportDate}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
      };

      try {
        const worker = html2pdf().set(opt).from(container);
        const blobUrl = await worker.output('bloburl');
        setAuditReportModal({ open: true, status: 'done', downloadUrl: blobUrl });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('PDF generation failed', e);
        setAuditReportModal({ open: true, status: 'idle' });
      }
    }, 800);
  };

  return (
    <CRMLayout role="management">
      <div className="p-6 flex flex-col gap-6 min-h-full">
        {/* Header — period switcher only */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{activeTab === 'overview' ? 'Обзор' : activeTab === 'users' ? 'Пользователи' :  activeTab === 'projects' ? 'Проекты' : activeTab === 'links' ? 'Все ссылки' : activeTab === 'audits' ? 'Аудит' : activeTab === 'executors' ? 'Исполнители' : activeTab === 'auditors' ? 'Аудиторы' : activeTab === 'finance' ? 'Финансы' : activeTab === 'reports' ? 'Отчёты' : activeTab === 'overdue' ? 'Просрочено' : activeTab === 'settings' ? 'Настройки' : activeTab === 'kanban' ? 'Kanban ссылок' : 'Панель управления'}</h1>
          </div>
          {activeTab === 'overview' && (
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1">
              {(['month', 'quarter', 'year'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                    period === p ? 'bg-blue-900 text-white' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>
          )}
        </div>

        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'projects' && renderProjects()}
        {activeTab === 'links' && renderLinks()}
        {activeTab === 'audits' && (
          <AuditsTab
            linksList={linksList}
            onUpdateLink={handleUpdateLink}
            onAddComment={handleAddComment}
            onGenerateReport={generateAuditReport}
          />
        )}
        {activeTab === 'executors' && renderExecutors()}
        {activeTab === 'auditors' && renderAuditors()}
        {activeTab === 'finance' && renderFinance()}
        {activeTab === 'reports' && renderReports()}
        {activeTab === 'overdue' && renderOverdue()}
        {activeTab === 'settings' && renderSettings()}

        {/* Integrity Check Modal */}
        {integrityModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setIntegrityModal({ open: false, issues: [] })} />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-800">
                  <i className="ri-shield-check-line mr-2 text-blue-900" />
                  Проверка целостности данных
                </h3>
                <button onClick={() => setIntegrityModal({ open: false, issues: [] })} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer">
                  <i className="ri-close-line text-gray-500" />
                </button>
              </div>
              <div className="p-6 flex flex-col gap-4">
                {integrityModal.issues.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-14 h-14 flex items-center justify-center rounded-full bg-emerald-100 mx-auto mb-3">
                      <i className="ri-check-line text-emerald-600 text-2xl" />
                    </div>
                    <p className="text-sm font-semibold text-gray-800">Всё в порядке</p>
                    <p className="text-xs text-gray-500 mt-1">Логических нарушений не обнаружено</p>
                  </div>
                ) : (
                  <>
                    <div className="text-sm text-gray-600">
                      Обнаружено <strong className="text-red-600">{integrityModal.issues.length}</strong> проблем
                    </div>
                    <div className="flex flex-col gap-2">
                      {integrityModal.issues.map((issue, idx) => (
                        <div key={idx} className={`p-3 rounded-lg text-sm ${issue.severity === 'error' ? 'bg-red-50 border border-red-100' : 'bg-amber-50 border border-amber-100'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <i className={`${issue.severity === 'error' ? 'ri-error-warning-line text-red-500' : 'ri-alert-line text-amber-500'}`} />
                            <span className={`font-semibold ${issue.severity === 'error' ? 'text-red-700' : 'text-amber-700'}`}>
                              {issue.severity === 'error' ? 'Ошибка' : 'Предупреждение'}
                            </span>
                          </div>
                          <p className="text-gray-700">{issue.message}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'kanban' && (
          <div className="flex-1 min-h-[500px]">
            <KanbanView />
          </div>
        )}
      </div>

      {userModal.open && <UserModal user={userModal.user} onClose={() => setUserModal({ open: false })} onSave={handleSaveUser} />}
      {confirmModal?.open && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
          confirmText={confirmModal.confirmText}
          danger={confirmModal.danger}
        />
      )}
      {executorReportId && <ExecutorDetailModal executorId={executorReportId} onClose={() => setExecutorReportId(null)} />}

      {projectModal.open && (
        <ProjectCreateModal
          clients={clientsList}
          executors={usersList.filter((u) => u.role === 'executor')}
          onClose={() => setProjectModal({ open: false })}
          onSave={handleSaveProject}
        />
      )}

      {/* Project detail modal - shows links inside project */}
      {(() => {
        const project = projectDetailId !== null ? projectsList.find((p) => p.id === projectDetailId) : null;
        if (!project) return null;
        return (
          <ProjectDetailModal
            project={project}
            onClose={() => setProjectDetailId(null)}
            onSave={handleSaveProjectEdit}
            onExportPdf={exportProjectPdf}
          />
        );
      })()}

      {/* Audit report modal */}
      {auditReportModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAuditReportModal({ open: false, status: 'idle' })} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-800">Отчёт по аудитам</h3>
              <button onClick={() => setAuditReportModal({ open: false, status: 'idle' })} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer">
                <i className="ri-close-line text-gray-500" />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4 items-center text-center">
              {auditReportModal.status === 'idle' && (
                <>
                  <div className="w-14 h-14 flex items-center justify-center rounded-full bg-slate-100">
                    <i className="ri-file-chart-line text-blue-900 text-2xl" />
                  </div>
                  <p className="text-sm text-gray-600">Сформировать полный отчёт по всем аудитам системы?</p>
                  <button
                    onClick={generateAuditReport}
                    className="px-5 py-2.5 bg-blue-900 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Сформировать отчёт
                  </button>
                </>
              )}
              {auditReportModal.status === 'generating' && (
                <>
                  <div className="w-14 h-14 flex items-center justify-center">
                    <i className="ri-loader-4-line text-slate-500 text-3xl animate-spin" />
                  </div>
                  <p className="text-sm text-gray-600">Формируем отчёт...</p>
                </>
              )}
              {auditReportModal.status === 'done' && (
                <>
                  <div className="w-14 h-14 flex items-center justify-center rounded-full bg-emerald-100">
                    <i className="ri-check-line text-emerald-600 text-2xl" />
                  </div>
                  <p className="text-sm text-gray-600">Отчёт готов!</p>
                  {auditReportModal.downloadUrl && (
                    <a
                      href={auditReportModal.downloadUrl}
                      download={`audit-report-${new Date().toISOString().split('T')[0]}.pdf`}
                      className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-2"
                    >
                      <i className="ri-download-line" />
                      Скачать PDF
                    </a>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </CRMLayout>
  );
}