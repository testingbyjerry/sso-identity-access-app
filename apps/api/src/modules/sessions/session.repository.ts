import { getDatabase, sessions, type NewSession, type Session } from '@sso/database';
import { and, eq, gt, lt } from 'drizzle-orm';

export class SessionRepository {
  private get db() {
    return getDatabase();
  }

  async create(data: NewSession): Promise<Session> {
    const [created] = await this.db.insert(sessions).values(data).returning();
    if (!created) {
      throw new Error('Failed to create session');
    }
    return created;
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())));

    return session || null;
  }

  async findById(id: string): Promise<Session | null> {
    const [session] = await this.db.select().from(sessions).where(eq(sessions.id, id));
    return session || null;
  }

  async findByUserId(userId: string): Promise<Session[]> {
    return this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, new Date())))
      .orderBy(sessions.createdAt);
  }

  async update(id: string, data: Partial<NewSession>): Promise<Session | null> {
    const [updated] = await this.db
      .update(sessions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(sessions.id, id))
      .returning();

    return updated || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.delete(sessions).where(eq(sessions.id, id)).returning({ id: sessions.id });
    return result.length > 0;
  }

  async deleteAllForUser(userId: string, exceptSessionId?: string): Promise<number> {
    if (exceptSessionId) {
      // In drizzle, delete where userId = X and id != exceptSessionId
      const allUserSessions = await this.db
        .select({ id: sessions.id })
        .from(sessions)
        .where(eq(sessions.userId, userId));

      const toDelete = allUserSessions.filter((s) => s.id !== exceptSessionId).map((s) => s.id);
      if (toDelete.length === 0) return 0;

      let count = 0;
      for (const id of toDelete) {
        const deleted = await this.delete(id);
        if (deleted) count++;
      }
      return count;
    }

    const result = await this.db.delete(sessions).where(eq(sessions.userId, userId)).returning({ id: sessions.id });
    return result.length;
  }

  async deleteExpired(): Promise<number> {
    const result = await this.db
      .delete(sessions)
      .where(lt(sessions.expiresAt, new Date()))
      .returning({ id: sessions.id });

    return result.length;
  }
}

export const sessionRepository = new SessionRepository();
