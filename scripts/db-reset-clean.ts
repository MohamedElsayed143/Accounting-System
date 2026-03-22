import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting complete database reset...');

  try {
    // 1. Get all table names from the public schema (excluding Prisma migrations)
    const tables: { tablename: string }[] = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename NOT LIKE '_prisma_migrations';
    `;

    if (tables.length === 0) {
      console.log('⚠️ No tables found to truncate.');
    } else {
      const tableNames = tables.map(t => `"${t.tablename}"`).join(', ');
      console.log(`🧹 Truncating tables: ${tableNames}`);

      // 2. Truncate all tables and restart identity (resets sequences)
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE;`);
      console.log('✅ All tables truncated and sequences reset.');
    }

    // 3. Run seed scripts
    console.log('🌱 Re-running seed scripts...');
    
    console.log('📦 Running main seed...');
    execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });
    
    console.log('🌳 Running COA seed...');
    execSync('npx tsx prisma/seed_coa.ts', { stdio: 'inherit' });

    console.log('✨ Database reset and seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during database reset:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
