const p = require('@prisma/client');
console.log('Decimal direct:', typeof p.Decimal);
console.log('Prisma.Decimal:', typeof p.Prisma?.Decimal);
console.log('All keys with Decimal:', Object.keys(p).filter(k => k.toLowerCase().includes('decimal')));
