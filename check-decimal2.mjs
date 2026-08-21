import p from '@prisma/client';
console.log('default keys with decimal:', Object.keys(p).filter(k => k.toLowerCase().includes('decimal')));
console.log('Decimal:', typeof p.Decimal);
