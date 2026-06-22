import { PrismaClient, Role, AuditAction } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

// ─── Brand / Model / Pricing Data ─────────────────────────────────────────────

const BRAND_DATA: Record<
  string,
  {
    models: string[];
    costMin: number;
    costMax: number;
    marginMin: number;
    marginMax: number;
  }
> = {
  Rolex: {
    models: [
      "Submariner",
      "Daytona",
      "GMT-Master II",
      "Datejust",
      "Day-Date",
      "Explorer",
      "Sea-Dweller",
    ],
    costMin: 2000,
    costMax: 15000,
    marginMin: 0.15,
    marginMax: 0.25,
  },
  Omega: {
    models: [
      "Speedmaster",
      "Seamaster",
      "Constellation",
      "De Ville",
      "Aqua Terra",
      "Railmaster",
    ],
    costMin: 800,
    costMax: 5000,
    marginMin: 0.18,
    marginMax: 0.28,
  },
  "Tag Heuer": {
    models: [
      "Carrera",
      "Monaco",
      "Aquaracer",
      "Link",
      "Formula 1",
      "Connected",
    ],
    costMin: 400,
    costMax: 3000,
    marginMin: 0.2,
    marginMax: 0.3,
  },
  Tissot: {
    models: [
      "T-Classic",
      "PRX",
      "Seastar",
      "T-Touch",
      "Le Locle",
      "Tradition",
    ],
    costMin: 150,
    costMax: 800,
    marginMin: 0.25,
    marginMax: 0.35,
  },
  Casio: {
    models: ["G-Shock", "Edifice", "Oceanus", "Pro Trek", "Wave Ceptor"],
    costMin: 50,
    costMax: 600,
    marginMin: 0.3,
    marginMax: 0.45,
  },
  Seiko: {
    models: [
      "Prospex",
      "Presage",
      "Astron",
      "5 Sports",
      "Alpinist",
      "Turtle",
    ],
    costMin: 100,
    costMax: 1200,
    marginMin: 0.22,
    marginMax: 0.35,
  },
  Citizen: {
    models: [
      "Eco-Drive",
      "Promaster",
      "Campanola",
      "Attesa",
      "Exceed",
    ],
    costMin: 100,
    costMax: 800,
    marginMin: 0.25,
    marginMax: 0.4,
  },
  Longines: {
    models: [
      "Master Collection",
      "HydroConquest",
      "Spirit",
      "Elegant",
      "Legend Diver",
    ],
    costMin: 400,
    costMax: 3000,
    marginMin: 0.2,
    marginMax: 0.3,
  },
};

const SUPPLIERS = [
  "Gulf Watch Trading Co.",
  "Bahrain Luxury Imports",
  "Swiss Time Direct",
  "Al Manama Watch House",
  "Timepiece International",
  "Khaleeji Watch Distributors",
  "Premium Watch Supply MENA",
  "Authorized Brand Distributor",
  "Middle East Watch Group",
  "Diplomatic Watch Trading",
];

const SAMPLE_NOTES = [
  "Comes with original box and papers.",
  "Showroom display model — minor scratches on case.",
  "Unworn, full set.",
  "Pre-owned, excellent condition.",
  "Limited edition — certificate of authenticity included.",
  "Serviced and polished by manufacturer.",
  "Customer return — fully tested and functional.",
  null,
  null,
  null,
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1));
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/** Returns a random Date between two epoch ms values */
function randomDate(startMs: number, endMs: number): Date {
  return new Date(startMs + Math.random() * (endMs - startMs));
}

/** BHD uses 3 decimal places — round to nearest 5 fils (0.005) */
function roundBhd(value: number): number {
  return Math.round(value / 0.005) * 0.005;
}

function buildSku(brand: string, model: string, index: number): string {
  const brandCode = brand.replace(/\s+/g, "").toUpperCase().slice(0, 4);
  const modelCode = model.replace(/\s+/g, "").toUpperCase().slice(0, 4);
  const seq = String(index).padStart(4, "0");
  return `${brandCode}-${modelCode}-${seq}`;
}

// ─── Seed Helpers ─────────────────────────────────────────────────────────────

interface ItemSeed {
  description: string;
  brand: string;
  model: string;
  sku: string;
  quantity: number;
  costPrice: number;
  salePrice: number;
  totalCost: number;
  totalSale: number;
  profit: number;
  margin: number;
  dateAdded: Date;
  supplier: string;
  notes: string | null;
}

function generateItems(count: number): ItemSeed[] {
  const startMs = new Date("2022-01-01").getTime();
  const endMs = new Date("2024-12-31").getTime();

  const brands = Object.keys(BRAND_DATA);
  const items: ItemSeed[] = [];

  for (let i = 0; i < count; i++) {
    const brand = randomFrom(brands);
    const data = BRAND_DATA[brand];
    const model = randomFrom(data.models);
    const quantity = randomInt(1, 5);

    const costPrice = roundBhd(randomBetween(data.costMin, data.costMax));
    const marginRate = roundTo(
      randomBetween(data.marginMin, data.marginMax),
      4
    );
    const salePrice = roundBhd(costPrice * (1 + marginRate));

    const totalCost = roundBhd(costPrice * quantity);
    const totalSale = roundBhd(salePrice * quantity);
    const profit = roundBhd(totalSale - totalCost);
    // Store margin as a ratio (e.g. 0.2000 = 20%)
    const margin = roundTo(marginRate, 4);

    items.push({
      description: `${brand} ${model} wristwatch`,
      brand,
      model,
      sku: buildSku(brand, model, i + 1),
      quantity,
      costPrice,
      salePrice,
      totalCost,
      totalSale,
      profit,
      margin,
      dateAdded: randomDate(startMs, endMs),
      supplier: randomFrom(SUPPLIERS),
      notes: randomFrom(SAMPLE_NOTES),
    });
  }

  return items;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Starting seed...");

  // 1. Clear existing data (order respects FK constraints)
  console.log("Clearing existing data...");
  await prisma.auditLog.deleteMany();
  await prisma.inventoryImportRow.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.inventoryImport.deleteMany();
  await prisma.user.deleteMany();
  console.log("Cleared.");

  // 2. Create users
  console.log("Creating users...");
  const SALT_ROUNDS = 10;

  const adminPassword = await bcrypt.hash("Admin@123456", SALT_ROUNDS);
  const staffPassword = await bcrypt.hash("Staff@123456", SALT_ROUNDS);

  const admin = await prisma.user.create({
    data: {
      email: "admin@timezone.bh",
      password: adminPassword,
      firstName: "Admin",
      lastName: "User",
      role: Role.ADMIN,
      isActive: true,
    },
  });
  console.log(`  Created admin: ${admin.email} (id: ${admin.id})`);

  const staff = await prisma.user.create({
    data: {
      email: "staff@timezone.bh",
      password: staffPassword,
      firstName: "Staff",
      lastName: "User",
      role: Role.STAFF,
      isActive: true,
    },
  });
  console.log(`  Created staff: ${staff.email} (id: ${staff.id})`);

  // 3. Generate 600 inventory items
  console.log("Generating 600 inventory items...");
  const itemSeeds = generateItems(600);

  const BATCH_SIZE = 50;
  let created = 0;

  for (let i = 0; i < itemSeeds.length; i += BATCH_SIZE) {
    const batch = itemSeeds.slice(i, i + BATCH_SIZE);

    // Alternate creator between admin and staff for variety
    await prisma.$transaction(
      batch.map((item) =>
        prisma.inventoryItem.create({
          data: {
            description: item.description,
            brand: item.brand,
            model: item.model,
            sku: item.sku,
            quantity: item.quantity,
            costPrice: item.costPrice,
            salePrice: item.salePrice,
            totalCost: item.totalCost,
            totalSale: item.totalSale,
            profit: item.profit,
            margin: item.margin,
            dateAdded: item.dateAdded,
            supplier: item.supplier,
            notes: item.notes ?? undefined,
            createdById: Math.random() > 0.3 ? admin.id : staff.id,
            isDeleted: false,
          },
        })
      )
    );

    created += batch.length;
    console.log(`  ${created}/600 items created...`);
  }

  // 4. Seed a couple of audit log entries for good measure
  console.log("Creating audit log entries for seeded users...");

  await prisma.auditLog.createMany({
    data: [
      {
        action: AuditAction.LOGIN,
        entityType: "User",
        entityId: admin.id,
        description: "Seed: admin initial login placeholder",
        userId: admin.id,
      },
      {
        action: AuditAction.LOGIN,
        entityType: "User",
        entityId: staff.id,
        description: "Seed: staff initial login placeholder",
        userId: staff.id,
      },
    ],
  });

  console.log("Seed completed successfully.");
  console.log(`  Users:           2`);
  console.log(`  Inventory items: ${created}`);
  console.log(`  Audit logs:      2`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
