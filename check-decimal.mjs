import * as p from '@prisma/client';
console.log('Keys:', Object.keys(p).filter(k => k.toLowerCase().includes('decimal')));
console.log('Decimal:', typeof p.Decimal);
console.log('default:', typeof p.default);
