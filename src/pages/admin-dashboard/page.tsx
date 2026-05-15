import CRMLayout from '@/components/feature/CRMLayout';
import KPICard from '@/components/base/KPICard';
import TopClientsTable from './components/TopClientsTable';
import AdminChart from './components/AdminChart';
import { useCRM } from '@/context/CRMContext';

export default function AdminDashboardPage() {
  const crm = useCRM();
  const mockAdminStats = crm.projects.length > 0 ? {
    totalClients: crm.clients.length,
    activeClients: crm.clients.filter((c) => c.status === 'активен').length,
    projectsInWork: crm.projects.filter((p) => p.status === 'в работе').length,
    linksInWork: crm.links.filter((l) => l.status === 'в работе').length,
    successRate: crm.projects.length > 0 ? Math.round(crm.projects.reduce((s, p) => s + p.successRate, 0) / crm.projects.length) : 0,
    avgRemovalDays: 0,
  } : {
    totalClients: 0, activeClients: 0, projectsInWork: 0, linksInWork: 0, successRate: 0, avgRemovalDays: 0,
  };
  const mockTopClients = crm.clients.map((c) => ({
    id: c.id,
    name: c.companyName,
    projects: crm.projects.filter((p) => p.clientId === c.id).length,
    links: crm.links.filter((l) => l.clientId === c.id).length,
    successRate: 0,
    hasOverdue: false,
  }));
  const mockChartData = crm.links.length > 0 ? [] : [];
  return (
    <CRMLayout role="admin">
      <div className="p-6 flex flex-col gap-6">
        {/* Page header */}
        <div>
          <h1 className="text-xl font-bold text-gray-800">Дашборд администратора</h1>
          <p className="text-sm text-gray-500 mt-0.5">Общая статистика системы</p>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KPICard
            label="Клиентов всего"
            value={mockAdminStats.totalClients}
            icon="ri-user-line"
            accent="text-blue-900"
            sub={`${mockAdminStats.activeClients} активных`}
          />
          <KPICard
            label="Активных"
            value={mockAdminStats.activeClients}
            icon="ri-user-follow-line"
            accent="text-green-600"
          />
          <KPICard
            label="Проектов в работе"
            value={mockAdminStats.projectsInWork}
            icon="ri-folder-open-line"
            accent="text-blue-600"
          />
          <KPICard
            label="Ссылок в работе"
            value={mockAdminStats.linksInWork}
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
            label="Средний срок"
            value={`${mockAdminStats.avgRemovalDays} дн.`}
            icon="ri-time-line"
            accent="text-blue-900"
          />
        </div>

        {/* Alert — overdue */}
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3.5 flex items-center gap-3">
          <i className="ri-alarm-warning-line text-red-500 text-xl flex-shrink-0" />
          <div>
            <span className="text-sm font-semibold text-red-700">Просроченные дедлайны: </span>
            <span className="text-sm text-red-600">2 клиента (СтройГрупп, ИП Сидоров) имеют просроченные задачи.</span>
          </div>
        </div>

        {/* Bottom grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <TopClientsTable clients={mockTopClients} />
          </div>
          <div>
            <AdminChart data={mockChartData} />
          </div>
        </div>
      </div>
    </CRMLayout>
  );
}
