import { IdentityProvider, identityProviders, withTenantTransaction } from '@sso/database';
import { and, desc, eq } from 'drizzle-orm';
import { CreateIdpDTO, UpdateIdpDTO } from './identity-provider.types.js';

export class IdentityProviderRepository {
  async findByTenant(tenantId: string): Promise<IdentityProvider[]> {
    return withTenantTransaction(tenantId, async (tx) => {
      return tx
        .select()
        .from(identityProviders)
        .where(eq(identityProviders.organizationId, tenantId))
        .orderBy(desc(identityProviders.createdAt));
    });
  }

  async findById(tenantId: string, id: string): Promise<IdentityProvider | null> {
    return withTenantTransaction(tenantId, async (tx) => {
      const [idp] = await tx
        .select()
        .from(identityProviders)
        .where(and(eq(identityProviders.organizationId, tenantId), eq(identityProviders.id, id)));
      return idp || null;
    });
  }

  async findBySlug(tenantId: string, slug: string): Promise<IdentityProvider | null> {
    return withTenantTransaction(tenantId, async (tx) => {
      const [idp] = await tx
        .select()
        .from(identityProviders)
        .where(
          and(eq(identityProviders.organizationId, tenantId), eq(identityProviders.slug, slug))
        );
      return idp || null;
    });
  }

  async create(tenantId: string, data: CreateIdpDTO): Promise<IdentityProvider> {
    return withTenantTransaction(tenantId, async (tx) => {
      const [created] = await tx
        .insert(identityProviders)
        .values({
          organizationId: tenantId,
          type: data.type,
          name: data.name,
          slug: data.slug,
          enabled: data.enabled ?? true,
          domains: data.domains || [],
          config: data.config || {},
          metadata: data.metadata || {},
        })
        .returning();
      return created!;
    });
  }

  async update(tenantId: string, id: string, data: UpdateIdpDTO): Promise<IdentityProvider | null> {
    return withTenantTransaction(tenantId, async (tx) => {
      const [updated] = await tx
        .update(identityProviders)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(and(eq(identityProviders.organizationId, tenantId), eq(identityProviders.id, id)))
        .returning();
      return updated || null;
    });
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    return withTenantTransaction(tenantId, async (tx) => {
      const [deleted] = await tx
        .delete(identityProviders)
        .where(and(eq(identityProviders.organizationId, tenantId), eq(identityProviders.id, id)))
        .returning();
      return Boolean(deleted);
    });
  }
}
