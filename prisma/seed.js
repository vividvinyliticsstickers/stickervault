import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash("admin123", 10);

  await prisma.user.create({
    data: {
      email: "admin@stickervault.com",
      name: "Admin",
      password: hashed,
      role: "ADMIN"
    }
  });

  console.log("Admin created");
}

main()
  .finally(() => prisma.$disconnect());