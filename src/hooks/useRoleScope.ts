import { useMemo } from 'react';
import { useCRM } from '@/context/CRMContext';
import { getSessionUser, isManagementRole } from '@/lib/auth';
import type { CRMAudit, CRMLink, CRMProject } from '@/mocks/crm';

export function useRoleScope() {
  const crm = useCRM();
  const session = getSessionUser();

  return useMemo(() => {
    const role = session?.role ?? '';
    const userId = session?.id ?? 0;
    const crmUser = crm.users.find((u) => u.id === userId || u.email === session?.email);

    if (isManagementRole(role)) {
      return {
        role,
        userId,
        crmUser,
        projects: crm.projects.filter((p) => !p.isDeleted),
        links: crm.links.filter((l) => !l.isDeleted),
        audits: crm.audits,
        clients: crm.clients.filter((c) => !c.isDeleted),
        isScoped: false as const,
      };
    }

    if (role === 'client') {
      const clientId = crmUser?.linkedClientId ?? crm.clients[0]?.id;
      const projects = crm.projects.filter((p) => p.clientId === clientId && !p.isDeleted);
      const projectIds = new Set(projects.map((p) => p.id));
      const links = crm.links.filter((l) => projectIds.has(l.projectId) && !l.isDeleted);
      return {
        role,
        userId,
        crmUser,
        clientId,
        projects,
        links,
        audits: crm.audits.filter((a) => links.some((l) => l.id === a.linkId)),
        clients: crm.clients.filter((c) => c.id === clientId),
        isScoped: true as const,
      };
    }

    if (role === 'executor') {
      const executorId = crmUser?.id ?? userId;
      const links = crm.links.filter((l) => l.executorId === executorId && !l.isDeleted);
      const projectIds = new Set(links.map((l) => l.projectId));
      const projects = crm.projects.filter((p) => projectIds.has(p.id) && !p.isDeleted);
      return {
        role,
        userId,
        crmUser,
        executorId,
        projects,
        links,
        audits: crm.audits.filter((a) => links.some((l) => l.id === a.linkId)),
        clients: crm.clients,
        isScoped: true as const,
      };
    }

    if (role === 'auditor') {
      const auditorId = crmUser?.id ?? userId;
      const audits = crm.audits.filter((a) => a.auditorId === auditorId);
      const linkIds = new Set(audits.map((a) => a.linkId));
      const links = crm.links.filter((l) => linkIds.has(l.id) || l.auditorId === auditorId);
      const projectIds = new Set(links.map((l) => l.projectId));
      const projects = crm.projects.filter((p) => projectIds.has(p.id));
      return {
        role,
        userId,
        crmUser,
        auditorId,
        projects,
        links,
        audits,
        clients: crm.clients,
        isScoped: true as const,
      };
    }

    return {
      role,
      userId,
      crmUser,
      projects: [] as CRMProject[],
      links: [] as CRMLink[],
      audits: [] as CRMAudit[],
      clients: crm.clients,
      isScoped: true as const,
    };
  }, [crm.projects, crm.links, crm.audits, crm.clients, crm.users, session]);
}
