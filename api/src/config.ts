export const CONFIG = {
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/ees_v01?schema=public&sslmode=disable',
  JWT_SECRET: process.env.JWT_SECRET || 'ees-v01-alpha-dev-secret-change-in-production',
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
};
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/ees_v01?schema=public&sslmode=disable',
  JWT_SECRET: 'ees-v01-alpha-dev-secret-change-in-production',
  PORT: 3001,
};
