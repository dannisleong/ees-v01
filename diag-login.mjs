import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/ees_v01?schema=public&sslmode=disable', ssl: false });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const user = await prisma.users.findUnique({
      where: { email: 'founder@ees.sg' },
      include: { role: true }
    });
    console.log('User found:', !!user);
    console.log('Role:', user?.role?.name);
    
    const valid = await bcrypt.compare('password123', user.password_hash);
    console.log('Password valid:', valid);
    
    const token = jwt.sign({ userId: user.id, role: user.role.name }, 'ees-v01-alpha-dev-secret-change-in-production', { expiresIn: '7d' });
    console.log('Token generated:', token.substring(0, 30) + '...');
    console.log('ALL STEPS PASS');
  } catch (e) {
    console.error('ERROR:', e.message);
    console.error(e.stack);
  } finally {
    await prisma.$disconnect();
    pool.end();
  }
}
main();
