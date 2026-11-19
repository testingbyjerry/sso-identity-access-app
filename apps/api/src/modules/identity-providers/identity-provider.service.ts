import { IdentityProvider } from '@sso/database';
import { AuditLogRepository } from '../audit-logs/audit-log.repository.js';
import { BadRequestError, ConflictError, IdentityProviderDTO, NotFoundError } from '@sso/shared';
import { encryptSecret } from '../../common/crypto.js';
import { EntraStrategy, entraStrategy } from '../auth/strategies/entra.strategy.js';
import { oidcStrategy } from '../auth/strategies/oidc.strategy.js';
import { IdentityProviderRepository } from './identity-provider.repository.js';
import { CreateIdpDTO, UpdateIdpDTO } from './identity-provider.types.js';

export class IdentityProviderService {
  constructor(
    private idpRepo = new IdentityProviderRepository(),
    private auditRepo = new AuditLogRepository()
  ) {}

  private sanitizeIdp(idp: IdentityProvider): IdentityProviderDTO {
    const rawConfig = (idp.config || {}) as Record<string, unknown>;
    const sanitizedConfig = { ...rawConfig };

    // Redact sensitive secrets in outputs
    if ('clientSecret' in sanitizedConfig) {
      sanitizedConfig.clientSecret = '********';
    }

    return {
      id: idp.id,
      organizationId: idp.organizationId,
      type: idp.type,
      name: idp.name,
      slug: idp.slug,
      enabled: idp.enabled,
      domains: idp.domains,
      config: sanitizedConfig,
      metadata: idp.metadata as Record<string, unknown>,
      createdAt: idp.createdAt.toISOString(),
      updatedAt: idp.updatedAt.toISOString(),
    };
  }

  async listIdentityProviders(tenantId: string): Promise<IdentityProviderDTO[]> {
    const list = await this.idpRepo.findByTenant(tenantId);
    return list.map((idp) => this.sanitizeIdp(idp));
  }

  async getIdentityProvider(tenantId: string, id: string): Promise<IdentityProviderDTO> {
    const idp = await this.idpRepo.findById(tenantId, id);
    if (!idp) {
      throw new NotFoundError(`Identity Provider ${id} not found in this organization`);
    }

    return this.sanitizeIdp(idp);
  }

  async createIdentityProvider(
    tenantId: string,
    actorUserId: string,
    data: CreateIdpDTO
  ): Promise<IdentityProviderDTO> {
    const existing = await this.idpRepo.findBySlug(tenantId, data.slug);
    if (existing) {
      throw new ConflictError(
        `Identity Provider with slug "${data.slug}" already exists in this organization`
      );
    }

    // Encrypt clientSecret with AES-256-GCM before database insertion
    const dataToInsert = { ...data };
    if (dataToInsert.config && typeof dataToInsert.config.clientSecret === 'string') {
      dataToInsert.config = {
        ...dataToInsert.config,
        clientSecret: encryptSecret(dataToInsert.config.clientSecret),
      };
    }

    const created = await this.idpRepo.create(tenantId, dataToInsert);

    await this.auditRepo.create({
      organizationId: tenantId,
      actorUserId,
      action: 'idp.created',
      entityType: 'identity_provider',
      entityId: created.id,
      metadata: { name: created.name, type: created.type, slug: created.slug },
    });

    return this.sanitizeIdp(created);
  }

  async updateIdentityProvider(
    tenantId: string,
    id: string,
    actorUserId: string,
    data: UpdateIdpDTO
  ): Promise<IdentityProviderDTO> {
    const dataToUpdate = { ...data };
    if (dataToUpdate.config && typeof dataToUpdate.config.clientSecret === 'string') {
      dataToUpdate.config = {
        ...dataToUpdate.config,
        clientSecret: encryptSecret(dataToUpdate.config.clientSecret),
      };
    }

    const updated = await this.idpRepo.update(tenantId, id, dataToUpdate);
    if (!updated) {
      throw new NotFoundError(`Identity Provider ${id} not found in this organization`);
    }

    await this.auditRepo.create({
      organizationId: tenantId,
      actorUserId,
      action: 'idp.updated',
      entityType: 'identity_provider',
      entityId: id,
      metadata: { name: updated.name, type: updated.type },
    });

    return this.sanitizeIdp(updated);
  }

  async deleteIdentityProvider(
    tenantId: string,
    id: string,
    actorUserId: string
  ): Promise<{ success: true; message: string }> {
    const deleted = await this.idpRepo.delete(tenantId, id);
    if (!deleted) {
      throw new NotFoundError(`Identity Provider ${id} not found in this organization`);
    }

    await this.auditRepo.create({
      organizationId: tenantId,
      actorUserId,
      action: 'idp.deleted',
      entityType: 'identity_provider',
      entityId: id,
    });

    return { success: true, message: 'Identity Provider deleted successfully' };
  }

  async testIdentityProvider(
    tenantId: string,
    id: string
  ): Promise<{ success: boolean; message: string; issuer?: string; jwksUri?: string }> {
    const idp = await this.idpRepo.findById(tenantId, id);
    if (!idp) {
      throw new NotFoundError(`Identity Provider ${id} not found in this organization`);
    }

    const config = (idp.config || {}) as Record<string, string>;
    const issuer =
      config.issuer ||
      (idp.type === 'microsoft' ? entraStrategy.constructor && EntraStrategy.getIssuerUrl(config.tenantId) : undefined);

    if (!issuer) {
      throw new BadRequestError('Cannot test IdP: Missing issuer URL in configuration');
    }

    const result = await oidcStrategy.testConnection(issuer);

    return {
      success: true,
      message: 'OIDC discovery endpoint and JWKS verified successfully',
      issuer: result.issuer,
      jwksUri: result.jwksUri,
    };
  }
}
