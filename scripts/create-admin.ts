import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

async function createAdmin() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const hashedPassword = await bcrypt.hash("admin123", 10);

    const admin = await prisma.user.upsert({
      where: { email: "admin@plumenote.local" },
      update: { role: "ADMIN" },
      create: {
        email: "admin@plumenote.local",
        name: "Admin",
        password: hashedPassword,
        role: "ADMIN",
      },
    });

    console.log("✅ Admin cree:");
    console.log("   Email: admin@plumenote.local");
    console.log("   Password: admin123");
    console.log("   Role:", admin.role);
  } catch (error) {
    console.error("Erreur:", error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

createAdmin();
