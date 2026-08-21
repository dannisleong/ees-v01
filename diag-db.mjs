import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/ees_v01?schema=public&sslmode=disable', ssl: false });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const userCount = await prisma.users.count();
    console.log('DB connected. users count:', userCount);
    const user = await prisma.users.findUnique({ where: { email: 'founder@ees.sg' }, include: { role: true } });
    console.log('Founder user:', user ? 'exists' : 'NOT FOUND');
    if (user) {
      console.log('Role:', user.role?.name);
      console.log('Has password_hash:', !!user.password_hash);
    }
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await prisma.$disconnect();
    pool.end();
  }
}
main();
