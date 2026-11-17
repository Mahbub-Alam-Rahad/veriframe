/* eslint-disable no-console */
const path = require("node:path");
const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");
const argon2 = require("argon2");

// Prisma CLI loads .env automatically. When invoked directly with `node prisma/seed.js`
// from a local shell, also try the repository root .env.
if (!process.env.DATABASE_URL) {
  require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });
}

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "ChangeMe-123456!";
  const name = process.env.ADMIN_NAME || "Platform Admin";

  if (password.length < 10) {
    throw new Error("ADMIN_PASSWORD must be at least 10 characters long");
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: "SUPER_ADMIN", emailVerifiedAt: new Date() },
    create: {
      email,
      name,
      passwordHash,
      role: "SUPER_ADMIN",
      plan: "ENTERPRISE",
      emailVerifiedAt: new Date(),
    },
  });

  const backend = (process.env.MODEL_BACKEND || "mock").toLowerCase() === "hf" ? "HF" : "MOCK";
  const modelId =
    process.env.MODEL_ID || "gend:HoopitAI/video-deepfake-detection-GenD_CLIP_L_14_FF";
  const existingModel = await prisma.modelVersion.findFirst({ where: { isActive: true } });

  if (!existingModel) {
    await prisma.modelVersion.create({
      data: {
        name: backend === "HF" ? "Hugging Face frame classifier" : "Development mock detector",
        version: "1.0.0",
        backend,
        modelId,
        calibrationTemperature: Number(process.env.MODEL_CALIBRATION_TEMPERATURE || 1),
        notes:
          backend === "MOCK"
            ? "Deterministic development backend. Replace with MODEL_BACKEND=hf before trusting scores."
            : "Pretrained Hugging Face image classifier.",
        isActive: true,
      },
    });
  }

  console.log(`Seeded super admin: ${admin.email}`);
  console.log(`Active model backend: ${backend} (${modelId})`);
  console.log(`Seed complete at ${new Date().toISOString()} ${crypto.randomUUID().slice(0, 8)}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
