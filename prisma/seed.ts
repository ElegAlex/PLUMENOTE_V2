/**
 * Prisma Seed Script
 * Seeds system templates for PlumeNote
 *
 * Story 7.4: Template Fiche Serveur (FR35)
 * Story 7.5: Template Procedure (FR36) - will be added later
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

// Import system templates from separate file (for testability)
import { SYSTEM_TEMPLATES } from './system-templates';

// Create PostgreSQL connection pool (required for Prisma 7.x adapter pattern)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create the Prisma adapter using the connection pool
const adapter = new PrismaPg(pool);

// Initialize Prisma client with adapter
const prisma = new PrismaClient({
  adapter,
});

// ============================================
// Seed Function
// ============================================

async function seedSystemTemplates() {
  console.log('🌱 Seeding system templates...\n');

  for (const template of SYSTEM_TEMPLATES) {
    // Check if template already exists
    const existing = await prisma.template.findFirst({
      where: {
        name: template.name,
        isSystem: true,
      },
    });

    if (existing) {
      // Update existing system template
      await prisma.template.update({
        where: { id: existing.id },
        data: {
          description: template.description,
          content: template.content,
          icon: template.icon,
        },
      });
      console.log(`✅ Updated system template: "${template.name}"`);
    } else {
      // Check if a non-system template with same name exists
      const nonSystemExisting = await prisma.template.findFirst({
        where: {
          name: template.name,
          isSystem: false,
        },
      });

      if (nonSystemExisting) {
        // Don't overwrite user-created templates
        console.log(
          `⚠️  Skipped: User template "${template.name}" already exists (not overwriting)`
        );
        continue;
      }

      // Create new system template
      await prisma.template.create({
        data: {
          ...template,
          createdById: null, // System templates have no creator
        },
      });
      console.log(`✅ Created system template: "${template.name}"`);
    }
  }

  console.log('\n🎉 System templates seeded successfully!');
}

// ============================================
// Main Entry Point
// ============================================

async function main() {
  try {
    await seedSystemTemplates();
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
