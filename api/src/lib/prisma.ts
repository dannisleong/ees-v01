/**
 * Shared Prisma Client with PostgreSQL Driver Adapter
 *
 * Prisma 7.9+ requires an explicit driver adapter.
 * This module creates a single PrismaClient instance using @prisma/adapter-pg.
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { CONFIG } from '../config';

const pool = new Pool({ connectionString: CONFIG.DATABASE_URL, ssl: false });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
