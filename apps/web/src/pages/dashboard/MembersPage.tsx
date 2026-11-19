import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  UserPlus,
  Search,
  Trash2,
  Edit2,
  Mail,
} from 'lucide-react';
import { useAuth } from '../../features/auth/useAuth.js';
import { membersApi } from '../../features/members/members.api.js';
import { MemberDTO } from '@sso/shared';
import { Card, CardContent } from '../../components/ui/card.js';
import { Button } from '../../components/ui/button.js';
import { Input } from '../../components/ui/input.js';
import { Select } from '../../components/ui/select.js';
import { Badge } from '../../components/ui/badge.js';
import { Alert } from '../../components/ui/alert.js';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog.js';
import { ConfirmDialog } from '../../components/ui/confirm-dialog.js';
import { EmptyState } from '../../components/ui/empty-state.js';
import { PageLoader } from '../../components/ui/loading.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table.js';

export function MembersPage() {
  const { user, activeOrganization, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  // Modals state
  const [inviteModalOpen, setInviteModalOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteRoleId, setInviteRoleId] = React.useState('');
  const [inviteError, setInviteError] = React.useState<string | null>(null);

  const [editMemberModalOpen, setEditMemberModalOpen] = React.useState(false);
  const [editingMember, setEditingMember] = React.useState<MemberDTO | null>(null);
  const [editStatus, setEditStatus] = React.useState<'active' | 'invited' | 'suspended'>('active');
  const [editRoleId, setEditRoleId] = React.useState('');
  const [editError, setEditError] = React.useState<string | null>(null);

  const [removeConfirmOpen, setRemoveConfirmOpen] = React.useState(false);
  const [removingMember, setRemovingMember] = React.useState<MemberDTO | null>(null);

  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const canInvite = hasPermission('member:invite');
  const canUpdate = hasPermission('member:update');
  const canRemove = hasPermission('member:remove');

  // Queries
  const {
    data: membersData,
    isLoading: isMembersLoading,
    refetch: refetchMembers,
  } = useQuery({
    queryKey: ['members', activeOrganization?.organizationId, search, statusFilter, page],
    queryFn: () =>
      membersApi.listMembers({
        search: search || undefined,
        status: statusFilter || undefined,
        page,
        limit: pageSize,
      }),
    enabled: Boolean(activeOrganization),
  });

  const { data: rolesData } = useQuery({
    queryKey: ['roles', activeOrganization?.organizationId],
    queryFn: () => membersApi.listRoles(),
    enabled: Boolean(activeOrganization),
  });

  const roles = rolesData?.data || [];
  const members = membersData?.data || [];
  const totalCount = membersData?.pagination?.total || 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Set default invite role when roles load
  React.useEffect(() => {
    if (roles.length > 0 && !inviteRoleId) {
      const memberRole = roles.find((r) => r.name.toLowerCase().includes('member')) || roles[0];
      if (memberRole) {
        setInviteRoleId(memberRole.id);
      }
    }
  }, [roles, inviteRoleId]);

  // Invite Mutation
  const inviteMutation = useMutation({
    mutationFn: (input: { email: string; roleId: string }) => membersApi.inviteMember(input),
    onSuccess: async () => {
      setToastMessage('Invitation sent successfully.');
      setInviteModalOpen(false);
      setInviteEmail('');
      setInviteError(null);
      await refetchMembers();
      await queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (err: any) => {
      setInviteError(err.message || 'Failed to send invitation.');
    },
  });

  // Update Member Mutation
  const updateMutation = useMutation({
    mutationFn: (input: { id: string; status: 'active' | 'invited' | 'suspended'; roleIds: string[] }) =>
      membersApi.updateMember(input.id, {
        status: input.status,
        roleIds: input.roleIds,
      }),
    onSuccess: async () => {
      setToastMessage('Member updated successfully.');
      setEditMemberModalOpen(false);
      setEditingMember(null);
      setEditError(null);
      await refetchMembers();
      await queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (err: any) => {
      setEditError(err.message || 'Failed to update member.');
    },
  });

  // Remove Member Mutation
  const removeMutation = useMutation({
    mutationFn: (id: string) => membersApi.removeMember(id),
    onSuccess: async () => {
      setToastMessage('Member removed successfully.');
      setRemoveConfirmOpen(false);
      setRemovingMember(null);
      await refetchMembers();
      await queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (err: any) => {
      setToastMessage(err.message || 'Failed to remove member.');
      setRemoveConfirmOpen(false);
    },
  });

  const handleOpenEdit = (m: MemberDTO) => {
    setEditingMember(m);
    setEditStatus((m.status as any) || 'active');
    setEditRoleId(m.roles?.[0]?.id || roles[0]?.id || '');
    setEditError(null);
    setEditMemberModalOpen(true);
  };

  const handleOpenRemove = (m: MemberDTO) => {
    setRemovingMember(m);
    setRemoveConfirmOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Organization Members</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage authorized users, invitations, and role assignments for this organization.
          </p>
        </div>
        {canInvite && (
          <Button onClick={() => setInviteModalOpen(true)} className="space-x-1.5 self-start sm:self-auto">
            <UserPlus className="h-4 w-4" />
            <span>Invite Member</span>
          </Button>
        )}
      </div>

      {toastMessage && (
        <Alert variant="success" title="Notice" onClose={() => setToastMessage(null)}>
          {toastMessage}
        </Alert>
      )}

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search members by name or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                leftIcon={<Search className="h-4 w-4 text-muted-foreground" />}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { label: 'All Statuses', value: '' },
                  { label: 'Active', value: 'active' },
                  { label: 'Invited', value: 'invited' },
                  { label: 'Suspended', value: 'suspended' },
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card>
        <CardContent className="p-0">
          {isMembersLoading ? (
            <div className="py-12">
              <PageLoader text="Loading organization members..." />
            </div>
          ) : members.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={<Users className="h-8 w-8 text-muted-foreground" />}
                title="No members found"
                description={
                  search || statusFilter
                    ? 'No members matched your search criteria.'
                    : 'Get started by inviting your first team member.'
                }
                actionLabel={canInvite && !search && !statusFilter ? 'Invite Member' : undefined}
                onAction={canInvite ? () => setInviteModalOpen(true) : undefined}
              />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => {
                    const fullName = [m.user?.firstName, m.user?.lastName].filter(Boolean).join(' ') || 'Unnamed Member';
                    const email = m.user?.email || 'No email';
                    const isSelf = user?.id === m.userId;

                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                              {email.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-sm text-foreground flex items-center space-x-1.5">
                                <span>{fullName}</span>
                                {isSelf && (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1">
                                    You
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">{email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {m.roles && m.roles.length > 0 ? (
                              m.roles.map((r) => (
                                <Badge key={r.id} variant="secondary" className="text-xs">
                                  {r.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">No roles assigned</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              m.status === 'active'
                                ? 'success'
                                : m.status === 'invited'
                                ? 'info'
                                : 'destructive'
                            }
                            className="capitalize text-xs"
                          >
                            {m.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(m.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {canUpdate && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEdit(m)}
                                className="h-8 px-2 text-xs"
                              >
                                <Edit2 className="h-3.5 w-3.5 mr-1" />
                                <span>Edit</span>
                              </Button>
                            )}
                            {canRemove && !isSelf && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenRemove(m)}
                                className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                                <span>Remove</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                  <div className="text-xs text-muted-foreground">
                    Showing {(page - 1) * pageSize + 1} to{' '}
                    {Math.min(page * pageSize, totalCount)} of {totalCount} members
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-xs text-muted-foreground px-2">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
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

      {/* Invite Member Modal */}
      <Dialog open={inviteModalOpen} onClose={() => setInviteModalOpen(false)}>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an organization invitation email with designated role permissions.
          </DialogDescription>
        </DialogHeader>

        {inviteError && (
          <div className="mb-4">
            <Alert variant="destructive" title="Error">
              {inviteError}
            </Alert>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!inviteEmail || !inviteRoleId) {
              setInviteError('Please provide both email and role.');
              return;
            }
            inviteMutation.mutate({ email: inviteEmail, roleId: inviteRoleId });
          }}
          className="space-y-4"
        >
          <Input
            label="Work Email"
            type="email"
            placeholder="colleague@acme.com"
            leftIcon={<Mail className="h-4 w-4" />}
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
            autoFocus
          />

          <Select
            label="Assigned Role"
            value={inviteRoleId}
            onChange={(e) => setInviteRoleId(e.target.value)}
            options={roles.map((r) => ({
              label: `${r.name} - ${r.description || 'Standard permissions'}`,
              value: r.id,
            }))}
          />

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? 'Sending Invitation...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Edit Member Modal */}
      <Dialog open={editMemberModalOpen} onClose={() => setEditMemberModalOpen(false)}>
        <DialogHeader>
          <DialogTitle>Edit Member</DialogTitle>
          <DialogDescription>
            Update status or role assignments for {editingMember?.user?.email}.
          </DialogDescription>
        </DialogHeader>

        {editError && (
          <div className="mb-4">
            <Alert variant="destructive" title="Error">
              {editError}
            </Alert>
          </div>
        )}

        <div className="space-y-4">
          <Select
            label="Membership Status"
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value as any)}
            options={[
              { label: 'Active', value: 'active' },
              { label: 'Invited', value: 'invited' },
              { label: 'Suspended', value: 'suspended' },
            ]}
          />

          <Select
            label="Role Assignment"
            value={editRoleId}
            onChange={(e) => setEditRoleId(e.target.value)}
            options={roles.map((r) => ({
              label: r.name,
              value: r.id,
            }))}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMemberModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={updateMutation.isPending}
              onClick={() => {
                if (!editingMember) return;
                updateMutation.mutate({
                  id: editingMember.id,
                  status: editStatus,
                  roleIds: editRoleId ? [editRoleId] : [],
                });
              }}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* Remove Member Confirmation */}
      <ConfirmDialog
        open={removeConfirmOpen}
        onClose={() => setRemoveConfirmOpen(false)}
        onConfirm={() => {
          if (removingMember) removeMutation.mutate(removingMember.id);
        }}
        title="Remove Member from Organization"
        description={`Are you sure you want to remove ${removingMember?.user?.email || 'this member'}? They will immediately lose access to all resources within ${activeOrganization?.organizationName}.`}
        confirmLabel="Remove Member"
        variant="destructive"
        isLoading={removeMutation.isPending}
      />
    </div>
  );
}
