import { prisma } from './api/src/lib/prisma';

async function test() {
  try {
    const customer = await prisma.customers.create({
      data: { name: 'T', customer_code: 'T' + Date.now() }
    });
    const project = await prisma.projects.create({
      data: { project_code: 'P' + Date.now(), name_en: 'T', customer_id: customer.id, status: 'active' }
    });
    const order = await prisma.customer_orders.create({
      data: {
        project_id: project.id,
        order_number: 'O' + Date.now(),
        order_date: new Date(),
        order_amount: 100,
        deposit_required: 10,
        payment_status: 'pending_deposit'
      }
    });
    console.log('Order created:', order.id);
    
    // Test with Prisma create
    const deposit = await prisma.customer_deposits.create({
      data: {
        order_id: order.id,
        deposit_amount: 15000,
        received_date: new Date()
      }
    });
    console.log('Deposit created via Prisma:', deposit.id);
    
    const updatedOrder = await prisma.customer_orders.findUnique({
      where: { id: order.id },
      select: { payment_status: true }
    });
    console.log('Payment status after trigger:', updatedOrder?.payment_status);
    
    // Cleanup
    await prisma.customer_deposits.delete({ where: { id: deposit.id } });
    await prisma.customer_orders.delete({ where: { id: order.id } });
    await prisma.projects.delete({ where: { id: project.id } });
    await prisma.customers.delete({ where: { id: customer.id } });
    
    console.log('SUCCESS');
  } catch (e: any) {
    console.error('ERROR:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
