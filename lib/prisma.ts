import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

// Always cache client to avoid connection pool exhaustion in production
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma
}
