import { prisma } from '../src/config/database.js';
import bcrypt from 'bcrypt';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@1234', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@billing.com' },
    update: {},
    create: {
      email: 'admin@billing.com',
      name: 'System Admin',
      passwordHash: adminPassword,
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create staff user
  const staffPassword = await bcrypt.hash('Staff@1234', 12);
  const staff = await prisma.user.upsert({
    where: { email: 'staff@billing.com' },
    update: {},
    create: {
      email: 'staff@billing.com',
      name: 'Staff User',
      passwordHash: staffPassword,
      role: 'STAFF',
      isActive: true,
    },
  });
  console.log('✅ Staff user created:', staff.email);

  // Create tax configurations
  const taxes = [
    { name: 'GST 5%', rate: 5, type: 'GST' as const },
    { name: 'GST 12%', rate: 12, type: 'GST' as const },
    { name: 'GST 18%', rate: 18, type: 'GST' as const },
    { name: 'GST 28%', rate: 28, type: 'GST' as const },
    { name: 'CGST 9%', rate: 9, type: 'CGST' as const },
    { name: 'SGST 9%', rate: 9, type: 'SGST' as const },
    { name: 'IGST 18%', rate: 18, type: 'IGST' as const },
    { name: 'No Tax', rate: 0, type: 'CUSTOM' as const },
  ];

  for (const tax of taxes) {
    await prisma.taxConfig.upsert({
      where: { id: `tax-${tax.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `tax-${tax.name.toLowerCase().replace(/\s+/g, '-')}`,
        ...tax,
      },
    });
  }
  console.log('✅ Tax configurations created');

  // Create sample products
  const products = [
    { name: 'Web Development Service', sku: 'SRV-WEB-001', unitPrice: 50000, taxRate: 18, unit: 'SERVICE' as const, stock: 999, category: 'Services' },
    { name: 'Mobile App Development', sku: 'SRV-MOB-001', unitPrice: 75000, taxRate: 18, unit: 'SERVICE' as const, stock: 999, category: 'Services' },
    { name: 'UI/UX Design Package', sku: 'SRV-DES-001', unitPrice: 25000, taxRate: 18, unit: 'SERVICE' as const, stock: 999, category: 'Services' },
    { name: 'Cloud Hosting (Monthly)', sku: 'SRV-HST-001', unitPrice: 2000, taxRate: 18, unit: 'SERVICE' as const, stock: 999, category: 'Hosting' },
    { name: 'Domain Registration', sku: 'SRV-DOM-001', unitPrice: 800, taxRate: 18, unit: 'PCS' as const, stock: 100, category: 'Domain' },
    { name: 'SSL Certificate', sku: 'SRV-SSL-001', unitPrice: 1500, taxRate: 18, unit: 'PCS' as const, stock: 100, category: 'Security' },
    { name: 'Laptop Stand', sku: 'PRD-LST-001', unitPrice: 1200, taxRate: 12, unit: 'PCS' as const, stock: 50, category: 'Accessories' },
    { name: 'Wireless Mouse', sku: 'PRD-WMS-001', unitPrice: 899, taxRate: 12, unit: 'PCS' as const, stock: 200, category: 'Accessories' },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: product,
    });
  }
  console.log('✅ Sample products created');

  // Create invoice counter
  await prisma.invoiceCounter.upsert({
    where: { id: 'counter-inv-2026' },
    update: {},
    create: {
      id: 'counter-inv-2026',
      prefix: 'INV',
      year: 2026,
      currentNumber: 0,
    },
  });
  console.log('✅ Invoice counter initialized');

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Login Credentials:');
  console.log('   Admin: admin@billing.com / Admin@1234');
  console.log('   Staff: staff@billing.com / Staff@1234');
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
