import { PrismaClient, PlatformRole, MediaType, MediaRole, AttributeType } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Argon2PasswordHasher } from "@odysseon/whoami-adapter-argon2";
import "dotenv/config";

// Create and configure the PrismaClient instance
const adapter = new PrismaPg({
  connectionString: process.env["DATABASE_URL"],
});

export const prisma = new PrismaClient({ adapter });
const hasher = new Argon2PasswordHasher();
const password = process.env["ADMIN_PASSWORD"];
const email = process.env["ADMIN_EMAIL"];

// ---------------------------------------------------------------------------
// Category taxonomy
// ---------------------------------------------------------------------------

const taxonomy: {
  name: string;
  slug: string;
  description?: string;
  order: number;
  children: { 
    name: string; 
    slug: string; 
    description?: string; 
    order: number;
    attributes?: { key: string; label: string; type: AttributeType; isRequired: boolean; displayOrder: number; options?: string[] }[];
  }[];
}[] = [
  {
    name: "Food & Beverage",
    slug: "food-and-beverage",
    description: "Restaurants, caterers, food producers, and drink vendors",
    order: 0,
    children: [
      { 
        name: "Restaurants", 
        slug: "restaurants", 
        order: 0,
        attributes: [
          { key: "cuisine", label: "Cuisine", type: AttributeType.SELECT, isRequired: true, displayOrder: 0, options: ["Nigerian", "Chinese", "Italian", "Indian", "Fast Food", "Continental", "Other"] },
          { key: "diningType", label: "Dining Type", type: AttributeType.SELECT, isRequired: true, displayOrder: 1, options: ["Restaurant", "Café", "Bakery", "Bar", "Food Truck"] },
          { key: "appointmentRequired", label: "Appointment Required", type: AttributeType.BOOLEAN, isRequired: false, displayOrder: 2 }
        ]
      },
      { name: "Bakeries & Pastries", slug: "bakeries-and-pastries", order: 1 },
      { name: "Catering Services", slug: "catering-services", order: 2 },
      { name: "Beverages & Drinks", slug: "beverages-and-drinks", order: 3 },
    ],
  },
  {
    name: "Professional Services",
    slug: "professional-services",
    description: "Legal, financial, consulting, and advisory firms",
    order: 1,
    children: [
      { name: "Legal", slug: "legal", order: 0 },
      { name: "Accounting & Finance", slug: "accounting-and-finance", order: 1 },
      { name: "Consulting", slug: "consulting", order: 2 },
      { name: "HR & Recruitment", slug: "hr-and-recruitment", order: 3 },
    ],
  },
  {
    name: "Logistics & Transport",
    slug: "logistics-and-transport",
    description: "Freight, delivery, warehousing, and courier services",
    order: 2,
    children: [
      { 
        name: "Freight & Haulage", 
        slug: "freight-and-haulage", 
        order: 0,
        attributes: [
          { key: "serviceType", label: "Service Type", type: AttributeType.SELECT, isRequired: true, displayOrder: 0, options: ["Delivery", "Courier", "Moving", "Freight"] },
          { key: "vehicleType", label: "Vehicle Type", type: AttributeType.SELECT, isRequired: true, displayOrder: 1, options: ["Van", "Pickup", "Truck", "Heavy Truck"] },
          { key: "maxLoadKg", label: "Maximum Load (kg)", type: AttributeType.NUMBER, isRequired: false, displayOrder: 2 }
        ]
      },
      { 
        name: "Last-Mile Delivery", 
        slug: "last-mile-delivery", 
        order: 1,
        attributes: [
          { key: "serviceType", label: "Service Type", type: AttributeType.SELECT, isRequired: true, displayOrder: 0, options: ["Delivery", "Courier", "Moving"] },
          { key: "vehicleType", label: "Vehicle Type", type: AttributeType.SELECT, isRequired: true, displayOrder: 1, options: ["Motorcycle", "Car", "Van", "Bicycle"] },
          { key: "sameDay", label: "Same-day Delivery", type: AttributeType.BOOLEAN, isRequired: false, displayOrder: 2 }
        ]
      },
      { name: "Warehousing", slug: "warehousing", order: 2 },
      { 
        name: "Courier Services", 
        slug: "courier-services", 
        order: 3,
        attributes: [
          { key: "serviceType", label: "Service Type", type: AttributeType.SELECT, isRequired: true, displayOrder: 0, options: ["Delivery", "Courier"] },
          { key: "vehicleType", label: "Vehicle Type", type: AttributeType.SELECT, isRequired: true, displayOrder: 1, options: ["Motorcycle", "Car", "Van"] },
          { key: "sameDay", label: "Same-day Delivery", type: AttributeType.BOOLEAN, isRequired: false, displayOrder: 2 }
        ]
      },
    ],
  },
  {
    name: "Retail & Trade",
    slug: "retail-and-trade",
    description: "Shops, traders, and consumer goods vendors",
    order: 3,
    children: [
      { 
        name: "Fashion & Apparel", 
        slug: "fashion-and-apparel", 
        order: 0,
        attributes: [
          { key: "brand", label: "Brand", type: AttributeType.STRING, isRequired: false, displayOrder: 0 },
          { key: "size", label: "Size", type: AttributeType.STRING, isRequired: true, displayOrder: 1 },
          { key: "color", label: "Color", type: AttributeType.STRING, isRequired: false, displayOrder: 2 },
          { key: "condition", label: "Condition", type: AttributeType.SELECT, isRequired: true, displayOrder: 3, options: ["New", "Used - Like New", "Used - Good", "Used - Fair"] }
        ]
      },
      { 
        name: "Electronics", 
        slug: "electronics", 
        order: 1,
        attributes: [
          { key: "brand", label: "Brand", type: AttributeType.STRING, isRequired: true, displayOrder: 0 },
          { key: "model", label: "Model", type: AttributeType.STRING, isRequired: true, displayOrder: 1 },
          { key: "condition", label: "Condition", type: AttributeType.SELECT, isRequired: true, displayOrder: 2, options: ["New", "Used - Like New", "Refurbished", "Used - Good", "Used - Fair", "For Parts"] }
        ]
      },
      { name: "Building Materials", slug: "building-materials", order: 2 },
      { name: "Groceries & Supermarkets", slug: "groceries-and-supermarkets", order: 3 },
    ],
  },
  {
    name: "Health & Wellness",
    slug: "health-and-wellness",
    description: "Clinics, pharmacies, fitness, and beauty",
    order: 4,
    children: [
      { name: "Clinics & Hospitals", slug: "clinics-and-hospitals", order: 0 },
      { name: "Pharmacies", slug: "pharmacies", order: 1 },
      { name: "Fitness & Gyms", slug: "fitness-and-gyms", order: 2 },
      { name: "Beauty & Personal Care", slug: "beauty-and-personal-care", order: 3 },
    ],
  },
  {
    name: "Technology",
    slug: "technology",
    description: "Software, IT support, digital marketing, and data services",
    order: 5,
    children: [
      { name: "Software Development", slug: "software-development", order: 0 },
      { name: "IT Support & Repairs", slug: "it-support-and-repairs", order: 1 },
      { name: "Digital Marketing", slug: "digital-marketing", order: 2 },
      { name: "Data & Analytics", slug: "data-and-analytics", order: 3 },
    ],
  },
  {
    name: "Education & Training",
    slug: "education-and-training",
    description: "Schools, tutors, vocational training, and online courses",
    order: 6,
    children: [
      { 
        name: "Schools & Tutoring", 
        slug: "schools-and-tutoring", 
        order: 0,
        attributes: [
          { key: "educationLevel", label: "Education Level", type: AttributeType.SELECT, isRequired: true, displayOrder: 0, options: ["Preschool", "Primary", "Secondary", "University", "Adult Education"] },
          { key: "deliveryMode", label: "Delivery Mode", type: AttributeType.SELECT, isRequired: true, displayOrder: 1, options: ["Physical", "Online", "Hybrid"] },
          { key: "subject", label: "Subject", type: AttributeType.STRING, isRequired: false, displayOrder: 2 },
          { key: "appointmentRequired", label: "Appointment Required", type: AttributeType.BOOLEAN, isRequired: false, displayOrder: 3 }
        ]
      },
      { name: "Vocational Training", slug: "vocational-training", order: 1 },
      { name: "Online Courses", slug: "online-courses", order: 2 },
    ],
  },
  {
    name: "Real Estate",
    slug: "real-estate",
    description: "Residential, commercial, and land property",
    order: 7,
    children: [
      { 
        name: "Residential Property", 
        slug: "residential-property", 
        order: 0,
        attributes: [
          { key: "propertyType", label: "Property Type", type: AttributeType.SELECT, isRequired: true, displayOrder: 0, options: ["Apartment", "House", "Villa", "Bungalow", "Duplex", "Self-Contain"] },
          { key: "bedrooms", label: "Bedrooms", type: AttributeType.NUMBER, isRequired: true, displayOrder: 1 },
          { key: "bathrooms", label: "Bathrooms", type: AttributeType.NUMBER, isRequired: true, displayOrder: 2 },
          { key: "furnished", label: "Furnished", type: AttributeType.BOOLEAN, isRequired: false, displayOrder: 3 },
          { key: "parkingSpaces", label: "Parking Spaces", type: AttributeType.NUMBER, isRequired: false, displayOrder: 4 }
        ]
      },
      { 
        name: "Commercial Property", 
        slug: "commercial-property", 
        order: 1,
        attributes: [
          { key: "propertyType", label: "Property Type", type: AttributeType.SELECT, isRequired: true, displayOrder: 0, options: ["Office Space", "Shop", "Warehouse", "Factory", "Hotel/Guest House"] },
          { key: "sizeSqm", label: "Size (sqm)", type: AttributeType.NUMBER, isRequired: true, displayOrder: 1 },
          { key: "parkingSpaces", label: "Parking Spaces", type: AttributeType.NUMBER, isRequired: false, displayOrder: 2 }
        ]
      },
      { 
        name: "Land & Property", 
        slug: "land-and-property", 
        order: 2,
        attributes: [
          { key: "landType", label: "Land Type", type: AttributeType.SELECT, isRequired: true, displayOrder: 0, options: ["Residential", "Commercial", "Agricultural", "Industrial", "Mixed-Use"] },
          { key: "sizeSqm", label: "Size (sqm)", type: AttributeType.NUMBER, isRequired: true, displayOrder: 1 }
        ]
      },
    ],
  },
  {
    name: "Events & Hospitality",
    slug: "events-and-hospitality",
    description: "Event planning, hotels, and entertainment venues",
    order: 8,
    children: [
      { name: "Event Planning", slug: "event-planning", order: 0 },
      { 
        name: "Hotels & Lodging", 
        slug: "hotels-and-lodging", 
        order: 1,
        attributes: [
          { key: "accommodationType", label: "Accommodation Type", type: AttributeType.SELECT, isRequired: true, displayOrder: 0, options: ["Hotel", "Guest House", "Apartment", "Hostel", "Resort"] },
          { key: "roomsAvailable", label: "Rooms Available", type: AttributeType.NUMBER, isRequired: false, displayOrder: 1 },
          { key: "breakfastIncluded", label: "Breakfast Included", type: AttributeType.BOOLEAN, isRequired: false, displayOrder: 2 }
        ]
      },
      { name: "Entertainment & Venues", slug: "entertainment-and-venues", order: 2 },
    ],
  },
  {
    name: "Agriculture",
    slug: "agriculture",
    description: "Farming, livestock, and agro-processing",
    order: 9,
    children: [
      { name: "Crop Farming", slug: "crop-farming", order: 0 },
      { name: "Livestock & Poultry", slug: "livestock-and-poultry", order: 1 },
      { name: "Agro-processing", slug: "agro-processing", order: 2 },
    ],
  },
  {
    name: "Beauty & Salons",
    slug: "beauty-and-salons",
    description: "Hair salons, barbershops, makeup artists, and spas",
    order: 10,
    children: [
      { 
        name: "Hair Stylists & Salons", 
        slug: "hair-stylists-and-salons", 
        order: 0,
        attributes: [
          { key: "serviceType", label: "Service Type", type: AttributeType.SELECT, isRequired: true, displayOrder: 0, options: ["Hair", "Nails", "Other"] },
          { key: "gender", label: "Gender", type: AttributeType.SELECT, isRequired: true, displayOrder: 1, options: ["Men", "Women", "Unisex"] },
          { key: "appointmentRequired", label: "Appointment Required", type: AttributeType.BOOLEAN, isRequired: false, displayOrder: 2 }
        ]
      },
      { 
        name: "Barbershops", 
        slug: "barbershops", 
        order: 1,
        attributes: [
          { key: "serviceType", label: "Service Type", type: AttributeType.SELECT, isRequired: true, displayOrder: 0, options: ["Barber", "Other"] },
          { key: "gender", label: "Gender", type: AttributeType.SELECT, isRequired: true, displayOrder: 1, options: ["Men", "Women", "Unisex"] },
          { key: "appointmentRequired", label: "Appointment Required", type: AttributeType.BOOLEAN, isRequired: false, displayOrder: 2 }
        ]
      },
      { 
        name: "Makeup Artists & Studios", 
        slug: "makeup-artists-and-studios", 
        order: 2,
        attributes: [
          { key: "serviceType", label: "Service Type", type: AttributeType.SELECT, isRequired: true, displayOrder: 0, options: ["Makeup", "Other"] },
          { key: "gender", label: "Gender", type: AttributeType.SELECT, isRequired: true, displayOrder: 1, options: ["Men", "Women", "Unisex"] },
          { key: "appointmentRequired", label: "Appointment Required", type: AttributeType.BOOLEAN, isRequired: false, displayOrder: 2 }
        ]
      },
      { 
        name: "Spas & Wellness", 
        slug: "spas-and-wellness", 
        order: 3,
        attributes: [
          { key: "serviceType", label: "Service Type", type: AttributeType.SELECT, isRequired: true, displayOrder: 0, options: ["Spa", "Wellness", "Other"] },
          { key: "gender", label: "Gender", type: AttributeType.SELECT, isRequired: true, displayOrder: 1, options: ["Men", "Women", "Unisex"] },
          { key: "appointmentRequired", label: "Appointment Required", type: AttributeType.BOOLEAN, isRequired: false, displayOrder: 2 }
        ]
      },
    ],
  },
  {
    name: "Home & Repair Services",
    slug: "home-and-repair-services",
    description: "Plumbers, electricians, cleaners, mechanics, and handymen",
    order: 11,
    children: [
      { name: "Plumbing & Electrical", slug: "plumbing-and-electrical", order: 0 },
      { name: "Cleaning & Janitorial", slug: "cleaning-and-janitorial", order: 1 },
      { name: "Carpentry & Furniture", slug: "carpentry-and-furniture", order: 2 },
      { 
        name: "Auto Repair & Mechanics", 
        slug: "auto-repair-and-mechanics", 
        order: 3,
        attributes: [
          { key: "vehicleType", label: "Vehicle Type", type: AttributeType.SELECT, isRequired: true, displayOrder: 0, options: ["Cars", "Trucks", "Motorcycles", "Heavy Duty", "All"] },
          { key: "serviceType", label: "Service Type", type: AttributeType.SELECT, isRequired: true, displayOrder: 1, options: ["General Repair", "Electrical", "Body Work", "Tire Service", "AC Repair"] }
        ]
      },
    ],
  },
  {
    name: "Creative & Media",
    slug: "creative-and-media",
    description: "Photographers, videographers, designers, and printers",
    order: 12,
    children: [
      { name: "Photography & Videography", slug: "photography-and-videography", order: 0 },
      { name: "Graphic Design & Arts", slug: "graphic-design-and-arts", order: 1 },
      { name: "Printing Services", slug: "printing-services", order: 2 },
    ],
  },
];

async function main() {
  console.log("🌱 Seeding category taxonomy...");

  for (const root of taxonomy) {
    const rootRecord = await prisma.category.upsert({
      where: { slug: root.slug },
      update: { name: root.name, description: root.description ?? null, order: root.order },
      create: {
        name: root.name,
        slug: root.slug,
        description: root.description ?? null,
        order: root.order,
        parentId: null,
      },
    });

    console.log(`  ✅ Root: ${root.name}`);

    for (const leaf of root.children) {
      const leafRecord = await prisma.category.upsert({
        where: { slug: leaf.slug },
        update: { name: leaf.name, description: leaf.description ?? null, order: leaf.order },
        create: {
          name: leaf.name,
          slug: leaf.slug,
          description: leaf.description ?? null,
          order: leaf.order,
          parentId: rootRecord.id,
        },
      });
      console.log(`    └── ${leaf.name}`);

      if (leaf.attributes && leaf.attributes.length > 0) {
        for (const attr of leaf.attributes) {
          await prisma.categoryAttribute.upsert({
            where: {
              categoryId_key: {
                categoryId: leafRecord.id,
                key: attr.key,
              },
            },
            update: {
              label: attr.label,
              type: attr.type,
              isRequired: attr.isRequired,
              displayOrder: attr.displayOrder,
              options: attr.options ?? null,
            },
            create: {
              categoryId: leafRecord.id,
              key: attr.key,
              label: attr.label,
              type: attr.type,
              isRequired: attr.isRequired,
              displayOrder: attr.displayOrder,
              options: attr.options ?? null,
            },
          });
        }
        console.log(`      ↳ Seeded ${leaf.attributes.length} attributes`);
      }
    }
  }

  console.log("\n✅ Category taxonomy seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
