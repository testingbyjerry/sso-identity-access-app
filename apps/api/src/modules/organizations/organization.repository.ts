import { Organization, organizations, organizationMembers, getDatabase } from '@sso/database';
import { and, count, desc, eq } from 'drizzle-orm';
import { CreateOrgDTO, UpdateOrgDTO } from './organization.types.js';

export class OrganizationRepository {
  private db = getDatabase();

  async findById(id: string): Promise<Organization | null> {
    const [org] = await this.db.select().from(organizations).where(eq(organizations.id, id));
    return org || null;
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const [org] = await this.db.select().from(organizations).where(eq(organizations.slug, slug));
    return org || null;
  }

  async findByUserId(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<{ data: Organization[]; total: number }> {
    const offset = (page - 1) * limit;

    const rows = await this.db
      .select({
        org: organizations,
      })
      .from(organizations)
      .innerJoin(organizationMembers, eq(organizations.id, organizationMembers.organizationId))
      .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.status, 'active')))
      .orderBy(desc(organizations.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(organizationMembers)
      .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.status, 'active')));

    return {
      data: rows.map((r) => r.org),
      total: totalResult ? Number(totalResult.count) : 0,
    };
  }

  async create(data: CreateOrgDTO): Promise<Organization> {
    const [created] = await this.db
      .insert(organizations)
      .values({
        name: data.name,
        slug: data.slug,
        domain: data.domain,
        metadata: data.metadata || {},
      })
      .returning();
    return created!;
  }

  async update(id: string, data: UpdateOrgDTO): Promise<Organization | null> {
    const [updated] = await this.db
      .update(organizations)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, id))
      .returning();
    return updated || null;
  }
}
