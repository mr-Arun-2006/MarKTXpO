import { db } from './index.ts';
import { users, watchlist, portfolio, tradeAlerts } from './schema.ts';
import { eq, desc } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string, displayName?: string) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName || null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          ...(displayName ? { displayName } : {}),
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Failed to get or create user:', error);
    throw new Error('Database user sync failed. Please try again later.', { cause: error });
  }
}

export async function getUserWatchlist(uid: string) {
  try {
    return await db
      .select()
      .from(watchlist)
      .where(eq(watchlist.userId, uid))
      .orderBy(desc(watchlist.addedAt));
  } catch (error) {
    console.error('Failed to fetch watchlist:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function addWatchlistItem(item: {
  userId: string;
  ticker: string;
  stockName: string;
  exchange?: string;
  targetPrice?: number;
  notes?: string;
}) {
  try {
    const res = await db.insert(watchlist).values(item).returning();
    return res[0];
  } catch (error) {
    console.error('Failed to add watchlist item:', error);
    throw new Error('Database insert failed. Please try again later.', { cause: error });
  }
}

export async function getUserPortfolio(uid: string) {
  try {
    return await db
      .select()
      .from(portfolio)
      .where(eq(portfolio.userId, uid))
      .orderBy(desc(portfolio.createdAt));
  } catch (error) {
    console.error('Failed to fetch portfolio:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
