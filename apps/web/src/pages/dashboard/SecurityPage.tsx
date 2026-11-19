import * as React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Smartphone,
  Laptop,
  Trash2,
  Eye,
} from 'lucide-react';
import { useAuth } from '../../features/auth/useAuth.js';
import { sessionsApi } from '../../features/sessions/sessions.api.js';
import { auditLogsApi } from '../../features/audit-logs/audit-logs.api.js';
import { AuditLogDTO } from '@sso/shared';
import { Card, CardContent } from '../../components/ui/card.js';
import { Button } from '../../components/ui/button.js';
import { Select } from '../../components/ui/select.js';
import { Badge } from '../../components/ui/badge.js';
import { Alert } from '../../components/ui/alert.js';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog.js';
import { ConfirmDialog } from '../../components/ui/confirm-dialog.js';
import { PageLoader } from '../../components/ui/loading.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table.js';

export function SecurityPage() {
  const { activeOrganization } = useAuth();

  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  // Session state
  const [revokeAllConfirmOpen, setRevokeAllConfirmOpen] = React.useState(false);
  const [revokingSessionId, setRevokingSessionId] = React.useState<string | null>(null);

  // Audit state
  const [auditActionFilter, setAuditActionFilter] = React.useState('');
  const [auditPage, setAuditPage] = React.useState(1);
  const [inspectLog, setInspectLog] = React.useState<AuditLogDTO | null>(null);

  // Queries
  const {
    data: sessionsResponse,
    isLoading: isSessionsLoading,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => sessionsApi.listSessions(),
  });

  const {
    data: auditResponse,
    isLoading: isAuditLoading,
    refetch: refetchAudit,
  } = useQuery({
    queryKey: ['audit-logs', activeOrganization?.organizationId, auditActionFilter, auditPage],
    queryFn: () =>
      auditLogsApi.listAuditLogs({
        action: auditActionFilter || undefined,
        page: auditPage,
        limit: 15,
      }),
    enabled: Boolean(activeOrganization),
  });

  const sessions = sessionsResponse?.data || [];
  const auditLogs = auditResponse?.data || [];
  const auditTotal = auditResponse?.pagination?.total || 0;
  const auditPages = Math.ceil(auditTotal / 15) || 1;

  // Mutations
  const revokeSessionMutation = useMutation({
    mutationFn: (id: string) => sessionsApi.revokeSession(id),
    onSuccess: async () => {
      setToastMessage('Session revoked successfully.');
      setRevokingSessionId(null);
      await refetchSessions();
      await refetchAudit();
    },
    onError: (err: any) => {
      setToastMessage(err.message || 'Failed to revoke session.');
    },
  });

  const revokeAllMutation = useMutation({
    mutationFn: () => sessionsApi.revokeAllOtherSessions(),
    onSuccess: async (res) => {
      setToastMessage(`Revoked ${res.data.revokedCount} other active session(s).`);
      setRevokeAllConfirmOpen(false);
      await refetchSessions();
      await refetchAudit();
    },
    onError: (err: any) => {
      setToastMessage(err.message || 'Failed to revoke other sessions.');
      setRevokeAllConfirmOpen(false);
    },
  });

  const getDeviceIcon = (ua?: string | null) => {
    if (!ua) return <Laptop className="h-4 w-4 text-primary" />;
    const lower = ua.toLowerCase();
    if (lower.includes('mobi') || lower.includes('android') || lower.includes('iphone')) {
      return <Smartphone className="h-4 w-4 text-primary" />;
    }
    return <Laptop className="h-4 w-4 text-primary" />;
  };

  return (
    <div className="space-y-8">
      {/* Page Heading */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Security & Audit Trails</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor authenticated user sessions and inspect immutable, append-only tenant security logs.
        </p>
      </div>

      {toastMessage && (
        <Alert variant="info" title="Security Event" onClose={() => setToastMessage(null)}>
          {toastMessage}
        </Alert>
      )}

      {/* SECTION 1: Active Sessions */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Active Sessions</h2>
            <p className="text-xs text-muted-foreground">
              Devices and clients currently holding authenticated session cookies for your account.
            </p>
          </div>
          {sessions.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRevokeAllConfirmOpen(true)}
              className="text-xs text-destructive hover:bg-destructive/10"
            >
              Revoke All Other Sessions
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            {isSessionsLoading ? (
              <div className="py-8">
                <PageLoader text="Loading active sessions..." />
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No active sessions found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device / Browser</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((sess, idx) => {
                    const isFirst = idx === 0; // The active session is generally the first returned or current
                    return (
                      <TableRow key={sess.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                              {getDeviceIcon(sess.userAgent)}
                            </div>
                            <div>
                              <div className="font-medium text-xs text-foreground flex items-center space-x-2">
                                <span className="truncate max-w-xs">{sess.userAgent || 'Unknown Browser'}</span>
                                {isFirst && (
                                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-600/30">
                                    Current Session
                                  </Badge>
                                )}
                              </div>
                              <span className="font-mono text-[10px] text-muted-foreground">
                                Session ID: {sess.id.slice(0, 8)}...
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {sess.ipAddress || '127.0.0.1'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(sess.createdAt).toLocaleString(undefined, {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(sess.expiresAt).toLocaleString(undefined, {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          {!isFirst && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setRevokingSessionId(sess.id);
                                revokeSessionMutation.mutate(sess.id);
                              }}
                              disabled={revokingSessionId === sess.id}
                              className="text-xs text-destructive hover:bg-destructive/10 h-7 px-2"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              <span>Revoke</span>
                            </Button>
                          )}
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

      {/* SECTION 2: Organization Audit Logs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Immutable Audit Logs</h2>
            <p className="text-xs text-muted-foreground">
              Comprehensive tamper-evident record of all tenant authentication and administrative events.
            </p>
          </div>
          <div className="w-full sm:w-64">
            <Select
              value={auditActionFilter}
              onChange={(e) => {
                setAuditActionFilter(e.target.value);
                setAuditPage(1);
              }}
              options={[
                { label: 'All Security Events', value: '' },
                { label: 'auth.login.success', value: 'auth.login.success' },
                { label: 'auth.login.failure', value: 'auth.login.failure' },
                { label: 'auth.sso.callback.success', value: 'auth.sso.callback.success' },
                { label: 'organization.member.invited', value: 'organization.member.invited' },
                { label: 'organization.member.removed', value: 'organization.member.removed' },
                { label: 'identity_provider.created', value: 'identity_provider.created' },
                { label: 'identity_provider.updated', value: 'identity_provider.updated' },
              ]}
            />
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isAuditLoading ? (
              <div className="py-12">
                <PageLoader text="Loading audit logs..." />
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No audit events recorded for this organization matching the filter.
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead className="text-right">Payload</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {log.action}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground capitalize">
                          {log.entityType}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const isFail = log.action.includes('fail') || (log.metadata as any)?.status === 'failure';
                            return (
                              <Badge
                                variant={isFail ? 'destructive' : 'success'}
                                className="capitalize text-[10px]"
                              >
                                {isFail ? 'failed' : 'success'}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {log.ipAddress || '127.0.0.1'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString(undefined, {
                            dateStyle: 'short',
                            timeStyle: 'medium',
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setInspectLog(log)}
                            className="h-7 px-2 text-xs space-x-1"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Inspect</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Audit Pagination */}
                {auditPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                    <div className="text-xs text-muted-foreground">
                      Showing {(auditPage - 1) * 15 + 1} to{' '}
                      {Math.min(auditPage * 15, auditTotal)} of {auditTotal} events
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                        disabled={auditPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-xs text-muted-foreground px-2">
                        Page {auditPage} of {auditPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAuditPage((p) => Math.min(auditPages, p + 1))}
                        disabled={auditPage === auditPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Inspect Audit Log Modal */}
      <Dialog open={Boolean(inspectLog)} onClose={() => setInspectLog(null)}>
        <DialogHeader>
          <DialogTitle>Audit Event Details</DialogTitle>
          <DialogDescription>
            Cryptographic audit event recorded at {inspectLog && new Date(inspectLog.createdAt).toISOString()}
          </DialogDescription>
        </DialogHeader>

        {inspectLog && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs p-3 bg-muted/40 rounded-lg">
              <div>
                <span className="text-muted-foreground block">Action:</span>
                <span className="font-mono font-medium text-foreground">{inspectLog.action}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Entity:</span>
                <span className="font-medium text-foreground">{inspectLog.entityType} ({inspectLog.entityId || 'N/A'})</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Actor User ID:</span>
                <span className="font-mono text-foreground">{inspectLog.actorUserId || 'System'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">IP & User Agent:</span>
                <span className="font-mono text-[11px] text-foreground truncate block">
                  {inspectLog.ipAddress || '127.0.0.1'} - {inspectLog.userAgent || 'Unknown'}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-foreground mb-1 block">Metadata Payload:</span>
              <pre className="p-3 rounded-lg bg-card border border-border font-mono text-[11px] text-muted-foreground overflow-x-auto max-h-60">
                {JSON.stringify(inspectLog.metadata || {}, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => setInspectLog(null)}>Close</Button>
        </DialogFooter>
      </Dialog>

      {/* Revoke All Sessions Confirmation */}
      <ConfirmDialog
        open={revokeAllConfirmOpen}
        onClose={() => setRevokeAllConfirmOpen(false)}
        onConfirm={() => revokeAllMutation.mutate()}
        title="Revoke All Other Sessions"
        description="Are you sure you want to sign out all other devices and browser sessions? Your current session will remain active."
        confirmLabel="Revoke Other Sessions"
        variant="destructive"
        isLoading={revokeAllMutation.isPending}
      />
    </div>
  );
}
