/**
 * Migration Script: Create Personal Workspaces for Existing Users
 *
 * This script creates personal workspaces for users who don't have one yet.
 * Run this after deploying Story 8.5 to ensure all existing users get their
 * personal workspace.
 *
 * Usage: npx tsx prisma/seed-personal-workspaces.ts
 *
 * @see Story 8.5: Espace Personnel Prive (AC #8)
 */

import { PrismaClient } from "@prisma/client";
import {
  PERSONAL_WORKSPACE_NAME,
  PERSONAL_WORKSPACE_ICON,
} from "@/features/workspaces/services/personal-workspace.service";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting personal workspace migration...\n");

  // Find all users without a personal workspace
  const usersWithoutPersonalWorkspace = await prisma.user.findMany({
    where: {
      workspacesOwned: {
        none: {
          isPersonal: true,
        },
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  console.log(`📊 Found ${usersWithoutPersonalWorkspace.length} user(s) without personal workspace\n`);

  if (usersWithoutPersonalWorkspace.length === 0) {
    console.log("✅ All users already have personal workspaces. Nothing to do.");
    return;
  }

  // Create personal workspaces in batch
  let created = 0;
  let failed = 0;

  for (const user of usersWithoutPersonalWorkspace) {
    try {
      const workspace = await prisma.workspace.create({
        data: {
          name: PERSONAL_WORKSPACE_NAME,
          icon: PERSONAL_WORKSPACE_ICON,
          isPersonal: true,
          ownerId: user.id,
        },
      });

      console.log(`✅ Created personal workspace for ${user.email} (ID: ${workspace.id})`);
      created++;
    } catch (error) {
      console.error(`❌ Failed to create personal workspace for ${user.email}:`, error);
      failed++;
    }
  }

  console.log("\n📈 Migration Summary:");
  console.log(`   - Created: ${created}`);
  console.log(`   - Failed: ${failed}`);
  console.log(`   - Total users processed: ${usersWithoutPersonalWorkspace.length}`);

  if (failed > 0) {
    console.log("\n⚠️ Some migrations failed. Please check the errors above.");
    process.exit(1);
  }

  console.log("\n🎉 Migration completed successfully!");
}

main()
  .catch((error) => {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
