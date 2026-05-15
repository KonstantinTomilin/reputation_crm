import { useState, useMemo } from 'react';
import CRMLayout from '@/components/feature/CRMLayout';
import KPICard from '@/components/base/KPICard';
import ClientProjectsTable from './components/ClientProjectsTable';
import DynamicsChart from './components/DynamicsChart';
import { useCRM } from '@/context/CRMContext';

export default function ClientDashboardPage() {
  const crm = useCRM();
  const myProjects = crm.projects;

  // Compute stats from real data instead of mock
  const totalLinks = crm.links.length;
  const inProgress = crm.links.filter((l) => l.status === 'в работе').length;
  const removed = crm.links.filter((l) => l.status === 'удалено' || l.status.startsWith('деиндексировано')).length;
  const activeProjects = crm.projects.filter((p) => p.status === 'в работе').length;
  const avgDays = totalLinks > 0
    ? Math.round(crm.links.filter((l) => l.endDate && l.startDate)
      .reduce((sum, l) => sum + (new Date(l.endDate!).getTime() - new Date(l.startDate!).getTime()) / 86400000, 0) / totalLinks)
    : 0;

  return (
    <CRMLayout role="client">
      <div className="p-6 flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Обзор</h1>
          <p className="text-sm text-gray-500 mt-0.5">Сводная статистика по всем вашим проектам</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard
            label="Ссылок всего"
            value={totalLinks}
            icon="ri-links-line"
            accent="text-blue-900"
          />
          <KPICard
            label="В работе"
            value={inProgress}
            icon="ri-loader-4-line"
            accent="text-blue-600"
          />
          <KPICard
            label="Удалено / деиндекс."
            value={removed}
            icon="ri-checkbox-circle-line"
            accent="text-green-600"
            sub={totalLinks > 0 ? `${Math.round((removed / totalLinks) * 100)}% успех` : '—'}
          />
          <KPICard
            label="Средний срок"
            value={avgDays > 0 ? `${avgDays} дн.` : '—'}
            icon="ri-time-line"
            accent="text-orange-600"
          />
          <KPICard
            label="Активных проектов"
            value={activeProjects}
            icon="ri-folder-open-line"
            accent="text-blue-900"
          />
        </div>

        <div className="flex flex-col gap-6">
          <ClientProjectsTable projects={myProjects} />
          <DynamicsChart data={[]} />
        </div>
      </div>
    </CRMLayout>
  );
}