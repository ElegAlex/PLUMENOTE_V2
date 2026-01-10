/**
 * Prisma Client Singleton
 *
 * This file provides a singleton instance of the Prisma Client.
 * Prisma 7.x requires a driver adapter for database connections.
 *
 * @see https://www.prisma.io/docs/guides/nextjs
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Global type for storing the Prisma client instance
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Create PostgreSQL connection pool
 * This is required for the Prisma 7.x adapter pattern
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Create the Prisma adapter using the connection pool
 */
const adapter = new PrismaPg(pool);

/**
 * Prisma client instance with PostgreSQL adapter
 * Uses singleton pattern to prevent multiple instances in development
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
