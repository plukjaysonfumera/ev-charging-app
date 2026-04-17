/**
 * seed-car-images.ts — populates the car_images table with curated
 * press-photo URLs for popular Philippine market EVs.
 *
 * Usage: railway run pnpm exec tsx src/seeds/seed-car-images.ts
 *
 * Safe to re-run — uses upsert so existing entries are updated, not duplicated.
 */
import 'dotenv/config';
import { prisma } from '../lib/prisma';

const CARS: { make: string; model: string; imageUrl: string }[] = [
  // ── BYD ────────────────────────────────────────────────────────────────────
  { make: 'BYD', model: 'Shark',      imageUrl: 'https://www.byd.com/content/dam/byd-site/en/passenger-car/shark/pc/exterior/BYD-Shark-exterior-1.jpg' },
  { make: 'BYD', model: 'Atto 3',     imageUrl: 'https://www.byd.com/content/dam/byd-site/en/passenger-car/atto-3/pc/exterior/BYD-ATTO3-exterior-1.jpg' },
  { make: 'BYD', model: 'Seal',       imageUrl: 'https://www.byd.com/content/dam/byd-site/en/passenger-car/seal/pc/exterior/BYD-Seal-exterior-1.jpg' },
  { make: 'BYD', model: 'Dolphin',    imageUrl: 'https://www.byd.com/content/dam/byd-site/en/passenger-car/dolphin/pc/exterior/BYD-Dolphin-exterior-1.jpg' },
  { make: 'BYD', model: 'Han',        imageUrl: 'https://www.byd.com/content/dam/byd-site/en/passenger-car/han/pc/exterior/BYD-Han-exterior-1.jpg' },
  { make: 'BYD', model: 'Sealion 6',  imageUrl: 'https://www.byd.com/content/dam/byd-site/en/passenger-car/sealion-6/pc/exterior/BYD-Sealion6-exterior-1.jpg' },

  // ── Tesla ──────────────────────────────────────────────────────────────────
  { make: 'Tesla', model: 'Model 3',  imageUrl: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Model-3.png' },
  { make: 'Tesla', model: 'Model Y',  imageUrl: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Model-Y.png' },
  { make: 'Tesla', model: 'Model S',  imageUrl: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Model-S.png' },
  { make: 'Tesla', model: 'Model X',  imageUrl: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Vehicles-Model-X.png' },

  // ── Hyundai ────────────────────────────────────────────────────────────────
  { make: 'Hyundai', model: 'IONIQ 5',  imageUrl: 'https://www.hyundai.com/content/dam/hyundai/ww/en/images/find-a-car/pip/electric/ioniq5/2023/highlights/ioniq5-2023-highlights-kv-pc.jpg' },
  { make: 'Hyundai', model: 'IONIQ 6',  imageUrl: 'https://www.hyundai.com/content/dam/hyundai/ww/en/images/find-a-car/pip/electric/ioniq6/2023/highlights/pc-kv.jpg' },
  { make: 'Hyundai', model: 'Kona Electric', imageUrl: 'https://www.hyundai.com/content/dam/hyundai/ww/en/images/find-a-car/pip/electric/kona-electric/2023/highlights/pc-kv.jpg' },

  // ── Kia ────────────────────────────────────────────────────────────────────
  { make: 'Kia', model: 'EV6',  imageUrl: 'https://www.kia.com/content/dam/kia2/ph/en/models/ev6/journeys/2022/specifications/kia-ev6-journey-full-spec.jpg' },
  { make: 'Kia', model: 'EV9',  imageUrl: 'https://www.kia.com/content/dam/kia2/ph/en/models/ev9/journeys/2024/highlights/kia-ev9-journey-highlights-kv.jpg' },
  { make: 'Kia', model: 'Niro', imageUrl: 'https://www.kia.com/content/dam/kia2/ph/en/models/all-new-niro/journeys/2022/highlights/kia-all-new-niro-ev-journey-highlights-kv.jpg' },

  // ── MG ─────────────────────────────────────────────────────────────────────
  { make: 'MG', model: 'ZS EV',       imageUrl: 'https://www.mgmotor.com.ph/content/dam/mg/ph/models/zs-ev/highlights/mg-zs-ev-highlights-image-1.jpg' },
  { make: 'MG', model: 'MG4',         imageUrl: 'https://www.mgmotor.com.ph/content/dam/mg/ph/models/mg4/highlights/mg4-electric-highlights-image-1.jpg' },
  { make: 'MG', model: 'Cyberster',   imageUrl: 'https://www.mgmotor.com.ph/content/dam/mg/ph/models/cyberster/highlights/mg-cyberster-highlights-image-1.jpg' },

  // ── Nissan ─────────────────────────────────────────────────────────────────
  { make: 'Nissan', model: 'Leaf',  imageUrl: 'https://www-asia.nissan-cdn.net/content/dam/Nissan/ph/vehicles/leaf/2023/Nissan-Leaf-Key-Visual.jpg' },

  // ── BMW ────────────────────────────────────────────────────────────────────
  { make: 'BMW', model: 'i4',   imageUrl: 'https://www.bmw.com.ph/content/dam/bmw/common/all-models/i-series/i4/2022/at-a-glance/bmw-i4-sp-design.jpg' },
  { make: 'BMW', model: 'iX',   imageUrl: 'https://www.bmw.com.ph/content/dam/bmw/common/all-models/x-series/iX/2021/at-a-glance/bmw-ix-sp-design.jpg' },
  { make: 'BMW', model: 'iX1',  imageUrl: 'https://www.bmw.com.ph/content/dam/bmw/common/all-models/x-series/iX1/2022/at-a-glance/bmw-ix1-sp-design.jpg' },
  { make: 'BMW', model: 'iX3',  imageUrl: 'https://www.bmw.com.ph/content/dam/bmw/common/all-models/x-series/iX3/2021/at-a-glance/bmw-ix3-sp-design.jpg' },

  // ── Mercedes-Benz ──────────────────────────────────────────────────────────
  { make: 'Mercedes-Benz', model: 'EQS',  imageUrl: 'https://www.mercedes-benz.com.ph/content/dam/hq/passengercars/cars/eqs/eqs-sedan/overview/mercedes-benz-eqs-overview-kv.jpg' },
  { make: 'Mercedes-Benz', model: 'EQB',  imageUrl: 'https://www.mercedes-benz.com.ph/content/dam/hq/passengercars/cars/eqb/eqb-2021/overview/mercedes-benz-eqb-overview-kv.jpg' },
  { make: 'Mercedes-Benz', model: 'EQE',  imageUrl: 'https://www.mercedes-benz.com.ph/content/dam/hq/passengercars/cars/eqe/eqe-sedan/overview/mercedes-benz-eqe-overview-kv.jpg' },

  // ── Volvo ──────────────────────────────────────────────────────────────────
  { make: 'Volvo', model: 'EX30',  imageUrl: 'https://www.volvocars.com/images/v/-/media/market-assets/ph/applications/pdpspecificationpage/ex30/2024/exterior/volvo-ex30-exterior-side.jpg' },
  { make: 'Volvo', model: 'EX40',  imageUrl: 'https://www.volvocars.com/images/v/-/media/market-assets/ph/applications/pdpspecificationpage/xc40-electric/2023/exterior/volvo-xc40-electric-exterior-side.jpg' },
  { make: 'Volvo', model: 'EX90',  imageUrl: 'https://www.volvocars.com/images/v/-/media/market-assets/global/applications/pdpspecificationpage/ex90/2024/exterior/volvo-ex90-exterior-side.jpg' },

  // ── Audi ───────────────────────────────────────────────────────────────────
  { make: 'Audi', model: 'e-tron',    imageUrl: 'https://www.audi.com.ph/content/dam/nemo/models/q8-e-tron/q8-e-tron/2023/images/explore/audi-q8-etron-explore.jpg' },
  { make: 'Audi', model: 'Q8 e-tron', imageUrl: 'https://www.audi.com.ph/content/dam/nemo/models/q8-e-tron/q8-e-tron/2023/images/explore/audi-q8-etron-explore.jpg' },
];

async function main() {
  console.log(`🚗 Seeding ${CARS.length} car images...\n`);
  let upserted = 0;

  for (const car of CARS) {
    await prisma.carImage.upsert({
      where:  { make_model: { make: car.make, model: car.model } },
      update: { imageUrl: car.imageUrl, source: 'manual' },
      create: { make: car.make, model: car.model, imageUrl: car.imageUrl, source: 'manual' },
    });
    console.log(`  ✅ ${car.make} ${car.model}`);
    upserted++;
  }

  console.log(`\n🎉 Done! ${upserted} entries upserted.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
