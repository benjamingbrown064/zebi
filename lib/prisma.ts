import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

// Connection pool: limit to 5 connections on Vercel serverless
// (Supabase free tier allows ~20 total, multiple serverless instances share the pool)
const connectionUrl = process.env.DATABASE_URL
  ? process.env.DATABASE_URL + (process.env.DATABASE_URL.includes('?') ? '&' : '?') + 'connection_limit=5&pool_timeout=10'
  : process.env.DATABASE_URL

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: connectionUrl,
      },
    },
  })

// Always cache client to avoid connection pool exhaustion in production
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
} else {
  // In production (Vercel), also cache to reuse across warm lambda invocations
  if (!globalForPrisma.prisma) globalForPrisma.prisma = prisma
}
