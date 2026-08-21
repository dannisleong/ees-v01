const p = require('@prisma/client');
console.log('Keys:', Object.keys(p).slice(0, 30));
console.log('Has Decimal?', 'Decimal' in p);
try {
  const r = require('@prisma/client/runtime/library');
  console.log('Runtime keys:', Object.keys(r).slice(0, 20));
} catch(e) {
  console.log('Runtime import failed:', e.message);
}
