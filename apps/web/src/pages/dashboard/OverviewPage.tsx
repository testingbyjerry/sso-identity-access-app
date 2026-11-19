import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  KeyRound,
  ShieldAlert,
  ArrowRight,
  UserPlus,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../features/auth/useAuth.js';
import { membersApi } from '../../features/members/members.api.js';
import { identityProvidersApi } from '../../features/identity-providers/identity-providers.api.js';
import { sessionsApi } from '../../features/sessions/sessions.api.js';
import { auditLogsApi } from '../../features/audit-logs/audit-logs.api.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.js';
import { Button } from '../../components/ui/button.js';
import { Badge } from '../../components/ui/badge.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table.js';
import { PageLoader } from '../../components/ui/loading.js';
import { Alert } from '../../components/ui/alert.js';

export function OverviewPage() {
  const { activeOrganization, isSuperAdmin, hasPermission } = useAuth();

  const membersQuery = useQuery({
    queryKey: ['members', 'count', activeOrganization?.organizationId],
    queryFn: () => membersApi.listMembers({ limit: 1 }),
    enabled: Boolean(activeOrganization),
  });

  const idpsQuery = useQuery({
    queryKey: ['idps', activeOrganization?.organizationId],
    queryFn: () => identityProvidersApi.listIdps(),
    enabled: Boolean(activeOrganization),
  });

  const sessionsQuery = useQuery({
    queryKey: ['sessions'],
    queryFn: () => sessionsApi.listSessions(),
  });

  const auditQuery = useQuery({
    queryKey: ['audit-logs', 'recent', activeOrganization?.organizationId],
    queryFn: () => auditLogsApi.listAuditLogs({ limit: 5 }),
    enabled: Boolean(activeOrganization),
  });

  if (!activeOrganization) {
    return (
      <div className="p-6">
        <Alert variant="warning" title="No Organization Selected">
          You are not currently associated with an active organization. Please contact your system administrator.
        </Alert>
      </div>
    );
  }

  const memberCount = membersQuery.data?.pagination?.total ?? 0;
  const idpList = idpsQuery.data?.data ?? [];
  const activeIdpCount = idpList.filter((idp) => idp.enabled).length;
  const sessionCount = sessionsQuery.data?.data?.length ?? 1;
  const recentLogs = auditQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      {/* Organization Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl border border-border bg-card shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {activeOrganization.organizationName}
            </h1>
            <Badge variant="outline" className="text-xs font-mono">
              {activeOrganization.organizationSlug}
            </Badge>
            {isSuperAdmin && <Badge variant="destructive">Platform Admin</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            Multi-tenant identity domain managed with enterprise row-level tenant isolation.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {hasPermission('member:invite') && (
            <Link to="/dashboard/members">
              <Button size="sm" variant="outline" className="space-x-1.5">
                <UserPlus className="h-4 w-4" />
                <span>Invite Member</span>
              </Button>
            </Link>
          )}
          {hasPermission('idp:create') && (
            <Link to="/dashboard/sso">
              <Button size="sm" className="space-x-1.5">
                <KeyRound className="h-4 w-4" />
                <span>Configure SSO</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Team Members</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {membersQuery.isLoading ? '...' : memberCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Active users in organization</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">SSO Providers</CardTitle>
            <KeyRound className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {idpsQuery.isLoading ? '...' : `${activeIdpCount} / ${idpList.length}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Active enterprise IdPs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Sessions</CardTitle>
            <Shield className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {sessionsQuery.isLoading ? '...' : sessionCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Current user active sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Security Audits</CardTitle>
            <ShieldAlert className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {auditQuery.isLoading ? '...' : auditQuery.data?.pagination?.total ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Logged tenant security events</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access & Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <span>Enterprise SSO</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Federate authentication with Microsoft Entra ID or Okta via OIDC & PKCE.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/dashboard/sso">
              <Button variant="outline" size="sm" className="w-full justify-between">
                <span>Manage Identity Providers</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <Users className="h-4 w-4 text-primary" />
              <span>Role-Based Access</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Granular tenant roles, permissions, and member lifecycle administration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/dashboard/members">
              <Button variant="outline" size="sm" className="w-full justify-between">
                <span>Manage Team & Roles</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <ShieldAlert className="h-4 w-4 text-primary" />
              <span>Security & Audit</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Monitor tamper-evident audit logs and revoke active session tokens.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/dashboard/security">
              <Button variant="outline" size="sm" className="w-full justify-between">
                <span>Inspect Audit Trails</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Audit Events */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Recent Audit Events</CardTitle>
            <CardDescription className="text-xs">
              Real-time immutable security activity for {activeOrganization.organizationName}
            </CardDescription>
          </div>
          <Link to="/dashboard/security">
            <Button variant="ghost" size="sm" className="text-xs space-x-1">
              <span>View all logs</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {auditQuery.isLoading ? (
            <div className="py-8">
              <PageLoader text="Loading recent audit activity..." />
            </div>
          ) : recentLogs.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No recent security events recorded for this organization.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">Action</TableHead>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actor IP</TableHead>
                  <TableHead className="text-right">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLogs.map((log) => {
                  const isFail = log.action.includes('fail') || (log.metadata as any)?.status === 'failure';
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs font-semibold">
                        {log.action}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground capitalize">
                        {log.entityType}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={isFail ? 'destructive' : 'success'}
                          className="text-[10px] capitalize"
                        >
                          {isFail ? 'failed' : 'success'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {log.ipAddress || '127.0.0.1'}
                      </TableCell>
                      <TableCell className="text-xs text-right text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString(undefined, {
                          dateStyle: 'short',
                          timeStyle: 'medium',
                        })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
