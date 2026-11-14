import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, type Prisma } from './generated/prisma/client.ts'

export type Db = PrismaClient

export function createDb(databaseUrl: string): Db {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
}

export {
  ChargeState,
  ChargeType,
  JobStatus,
  LedgerReason,
  OrderStatus,
  Prisma,
  type Account,
  type GenerationJob,
  type PaymentOrder,
} from './generated/prisma/client.ts'

/** Client handed to interactive transactions. */
export type Tx = Prisma.TransactionClient
