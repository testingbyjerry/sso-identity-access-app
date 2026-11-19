import { test, expect } from '@playwright/test';

test.describe('End-to-End Enterprise SaaS Journey (11 Key Steps)', () => {
  test('executes complete 11-step user journey from public website to logout', async ({ page }) => {
    // -------------------------------------------------------------------------
    // Setup Mock API Responses for deterministic E2E execution
    // -------------------------------------------------------------------------
    let currentActiveOrgId = 'org-1';

    const mockUser = {
      id: 'u-1',
      email: 'alex@acmeglobal.com',
      firstName: 'Alex',
      lastName: 'Architect',
      isSuperAdmin: false,
      status: 'active',
      activeOrganizationId: 'org-1',
      organizations: [
        {
          organizationId: 'org-1',
          organizationName: 'Acme Global Corp',
          organizationSlug: 'acme-global',
          roles: ['Organization Admin'],
          permissions: ['*'],
        },
        {
          organizationId: 'org-2',
          organizationName: 'Beta Technologies',
          organizationSlug: 'beta-tech',
          roles: ['Member'],
          permissions: ['org:read', 'member:read'],
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const membersList = [
      {
        id: 'm-1',
        organizationId: 'org-1',
        userId: 'u-1',
        status: 'active',
        joinedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        user: { id: 'u-1', email: 'alex@acmeglobal.com', firstName: 'Alex', lastName: 'Architect' },
        roles: [{ id: 'r-1', name: 'Organization Admin' }],
      },
    ];

    const idpList = [
      {
        id: 'idp-1',
        organizationId: 'org-1',
        type: 'microsoft',
        name: 'Microsoft Entra ID Primary',
        slug: 'entra-id',
        enabled: true,
        domains: ['acmeglobal.com'],
        config: { clientId: 'client-12345', issuer: 'https://login.microsoftonline.com/common/v2.0' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    let sessionsList = [
      {
        id: 's-current',
        userId: 'u-1',
        activeOrganizationId: 'org-1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 's-other',
        userId: 'u-1',
        activeOrganizationId: 'org-1',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1',
        ipAddress: '198.51.100.42',
        expiresAt: new Date(Date.now() + 43200000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const auditLogsList = [
      {
        id: 'log-1',
        organizationId: 'org-1',
        action: 'auth.login.success',
        entityType: 'session',
        entityId: 's-current',
        actorUserId: 'u-1',
        ipAddress: '127.0.0.1',
        userAgent: 'Chrome',
        metadata: { method: 'password' },
        createdAt: new Date().toISOString(),
      },
    ];

    // Intercept backend API routes
    let isAuthenticated = false;

    await page.route('**/api/v1/**', async (route) => {
      const url = new URL(route.request().url());
      const method = route.request().method();

      // Auth me
      if (url.pathname === '/api/v1/auth/me') {
        if (!isAuthenticated) {
          return route.fulfill({ status: 401, json: { success: false, error: { message: 'Unauthorized' } } });
        }
        return route.fulfill({
          status: 200,
          json: { success: true, data: { ...mockUser, activeOrganizationId: currentActiveOrgId } },
        });
      }

      // Login
      if (url.pathname === '/api/v1/auth/login' && method === 'POST') {
        isAuthenticated = true;
        return route.fulfill({
          status: 200,
          json: {
            success: true,
            data: { user: mockUser, session: sessionsList[0], activeOrganizationId: 'org-1' },
          },
        });
      }

      // Switch Organization
      if (url.pathname === '/api/v1/auth/switch-organization' && method === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        currentActiveOrgId = body.organizationId;
        return route.fulfill({
          status: 200,
          json: { success: true, data: { session: sessionsList[0] } },
        });
      }

      // Logout
      if (url.pathname === '/api/v1/auth/logout' && method === 'POST') {
        isAuthenticated = false;
        return route.fulfill({ status: 200, json: { success: true, data: { loggedOut: true } } });
      }

      // Organization info
      if (url.pathname.startsWith('/api/v1/organizations/') && method === 'GET') {
        return route.fulfill({
          status: 200,
          json: {
            success: true,
            data: {
              id: currentActiveOrgId,
              name: currentActiveOrgId === 'org-1' ? 'Acme Global Corp' : 'Beta Technologies',
              slug: currentActiveOrgId === 'org-1' ? 'acme-global' : 'beta-tech',
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
        });
      }

      // Members
      if (url.pathname === '/api/v1/members' && method === 'GET') {
        return route.fulfill({
          status: 200,
          json: {
            success: true,
            data: membersList,
            pagination: { total: membersList.length, page: 1, limit: 10, totalPages: 1 },
          },
        });
      }

      if (url.pathname === '/api/v1/members/invite' && method === 'POST') {
        const payload = JSON.parse(route.request().postData() || '{}');
        const newMember = {
          id: `m-${Date.now()}`,
          organizationId: currentActiveOrgId,
          userId: `u-invited`,
          status: 'invited',
          joinedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: { id: `u-invited`, email: payload.email, firstName: 'Invited', lastName: 'Member' },
          roles: [{ id: payload.roleId || 'r-2', name: 'Member' }],
        };
        membersList.push(newMember);
        return route.fulfill({ status: 201, json: { success: true, data: { invitation: newMember } } });
      }

      // Roles
      if (url.pathname === '/api/v1/roles' && method === 'GET') {
        return route.fulfill({
          status: 200,
          json: {
            success: true,
            data: [
              { id: 'r-1', name: 'Organization Admin', description: 'Full administrative rights' },
              { id: 'r-2', name: 'Member', description: 'Standard tenant access' },
            ],
          },
        });
      }

      // IdPs
      if (url.pathname === '/api/v1/identity-providers' && method === 'GET') {
        return route.fulfill({ status: 200, json: { success: true, data: idpList } });
      }

      if (url.pathname === '/api/v1/identity-providers' && method === 'POST') {
        const payload = JSON.parse(route.request().postData() || '{}');
        const newIdp = {
          id: `idp-${Date.now()}`,
          organizationId: currentActiveOrgId,
          type: payload.type,
          name: payload.name,
          slug: payload.slug,
          enabled: true,
          domains: payload.domains || [],
          config: payload.config || {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        idpList.push(newIdp);
        return route.fulfill({ status: 201, json: { success: true, data: newIdp } });
      }

      // Sessions
      if (url.pathname === '/api/v1/sessions' && method === 'GET') {
        return route.fulfill({ status: 200, json: { success: true, data: sessionsList } });
      }

      if (url.pathname.startsWith('/api/v1/sessions/') && method === 'DELETE') {
        const idToDelete = url.pathname.split('/').pop();
        sessionsList = sessionsList.filter((s) => s.id !== idToDelete);
        return route.fulfill({ status: 200, json: { success: true, data: { revoked: true } } });
      }

      // Audit logs
      if (url.pathname === '/api/v1/audit-logs' && method === 'GET') {
        return route.fulfill({
          status: 200,
          json: {
            success: true,
            data: auditLogsList,
            pagination: { total: auditLogsList.length, page: 1, limit: 15, totalPages: 1 },
          },
        });
      }

      return route.continue();
    });

    // -------------------------------------------------------------------------
    // STEP 1: Open Public Website
    // -------------------------------------------------------------------------
    await page.goto('/');
    await expect(page.getByText('Multi-Tenant Identity Management')).toBeVisible();

    // -------------------------------------------------------------------------
    // STEP 2: Navigate to Login
    // -------------------------------------------------------------------------
    await page.getByRole('link', { name: 'Sign In' }).first().click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();

    // -------------------------------------------------------------------------
    // STEP 3: Authenticate using test account
    // -------------------------------------------------------------------------
    await page.getByLabel('Work Email').fill('alex@acmeglobal.com');
    await page.getByPlaceholder('••••••••••••').fill('SuperSecret123!');
    await page.getByRole('button', { name: 'Sign In with Password' }).click();

    // -------------------------------------------------------------------------
    // STEP 4: Open Organization Dashboard
    // -------------------------------------------------------------------------
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: 'Acme Global Corp' })).toBeVisible();
    await expect(page.getByText('Enterprise SSO')).toBeVisible();

    // -------------------------------------------------------------------------
    // STEP 5: Switch Organizations
    // -------------------------------------------------------------------------
    const orgSwitcher = page.getByRole('button', { name: /Acme Global Corp/i });
    await orgSwitcher.click();
    const betaOrgOption = page.getByRole('button', { name: /Beta Technologies/i });
    await expect(betaOrgOption).toBeVisible();
    await betaOrgOption.click();
    // Re-verification of switch
    await expect(page.getByRole('heading', { name: 'Beta Technologies' })).toBeVisible();

    // Switch back to Acme Global Corp for full admin privileges in subsequent steps
    const betaSwitcher = page.getByRole('button', { name: /Beta Technologies/i });
    await betaSwitcher.click();
    const acmeOrgOption = page.getByRole('button', { name: /Acme Global Corp/i });
    await acmeOrgOption.click();
    await expect(page.getByRole('heading', { name: 'Acme Global Corp' })).toBeVisible();

    // -------------------------------------------------------------------------
    // STEP 6: View Members
    // -------------------------------------------------------------------------
    await page.getByRole('link', { name: 'Members' }).click();
    await expect(page).toHaveURL(/\/dashboard\/members/);
    await expect(page.getByRole('heading', { name: 'Organization Members' })).toBeVisible();
    await expect(page.getByText('alex@acmeglobal.com')).toBeVisible();

    // -------------------------------------------------------------------------
    // STEP 7: Invite a Member
    // -------------------------------------------------------------------------
    await page.getByRole('button', { name: 'Invite Member' }).click();
    await expect(page.getByRole('heading', { name: 'Invite Team Member' })).toBeVisible();
    await page.getByPlaceholder('colleague@acme.com').fill('dev@acmeglobal.com');
    await page.getByRole('button', { name: 'Send Invitation' }).click();
    await expect(page.getByText('Invitation sent successfully.')).toBeVisible();

    // -------------------------------------------------------------------------
    // STEP 8: Configure an SSO Provider
    // -------------------------------------------------------------------------
    await page.getByRole('link', { name: 'SSO Configuration' }).click();
    await expect(page).toHaveURL(/\/dashboard\/sso/);
    await expect(page.getByRole('heading', { name: 'SSO & Identity Providers' })).toBeVisible();
    await expect(page.getByText('Microsoft Entra ID Primary')).toBeVisible();

    // Open Add Okta Provider modal
    await page.getByRole('button', { name: 'Add Okta / OIDC' }).click();
    await expect(page.getByRole('heading', { name: /Add Okta OIDC Provider/i })).toBeVisible();
    await page.getByLabel('Provider Name').fill('Okta Production Staging');
    await page.getByLabel('Slug Identifier').fill('okta-prod');
    await page.getByPlaceholder('https://dev-12345.okta.com').fill('https://acme.okta.com');
    await page.getByPlaceholder('Enter OAuth / OIDC Client ID').fill('okta-client-123');
    await page.getByPlaceholder('Enter OIDC Client Secret').fill('okta-secret-xyz');
    await page.getByRole('button', { name: 'Create Provider' }).click();
    await expect(page.getByText('Identity Provider configured successfully.')).toBeVisible();

    // -------------------------------------------------------------------------
    // STEP 9: View Security Events
    // -------------------------------------------------------------------------
    await page.getByRole('link', { name: 'Security & Audit' }).click();
    await expect(page).toHaveURL(/\/dashboard\/security/);
    await expect(page.getByRole('heading', { name: 'Security & Audit Trails' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'auth.login.success' })).toBeVisible();
    await expect(page.getByText('Active Sessions')).toBeVisible();

    // -------------------------------------------------------------------------
    // STEP 10: Revoke a Session
    // -------------------------------------------------------------------------
    const revokeBtn = page.getByRole('button', { name: 'Revoke', exact: true });
    await expect(revokeBtn).toBeVisible();
    await revokeBtn.click();
    await expect(page.getByText('Session revoked successfully.')).toBeVisible();

    // -------------------------------------------------------------------------
    // STEP 11: Log Out
    // -------------------------------------------------------------------------
    // Open user menu
    const userMenuBtn = page.getByLabel('User menu');
    await userMenuBtn.click();
    await page.getByRole('button', { name: 'Sign Out' }).click();

    // Verify redirected back to /login
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
  });
});
