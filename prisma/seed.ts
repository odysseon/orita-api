import { PrismaClient, PlatformRole, MediaType, MediaRole } from "../generated/prisma/client.js";
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
  children: { name: string; slug: string; description?: string; order: number }[];
}[] = [
  {
    name: "Food & Beverage",
    slug: "food-and-beverage",
    description: "Restaurants, caterers, food producers, and drink vendors",
    order: 0,
    children: [
      { name: "Restaurants", slug: "restaurants", order: 0 },
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
      { name: "Freight & Haulage", slug: "freight-and-haulage", order: 0 },
      { name: "Last-Mile Delivery", slug: "last-mile-delivery", order: 1 },
      { name: "Warehousing", slug: "warehousing", order: 2 },
      { name: "Courier Services", slug: "courier-services", order: 3 },
    ],
  },
  {
    name: "Retail & Trade",
    slug: "retail-and-trade",
    description: "Shops, traders, and consumer goods vendors",
    order: 3,
    children: [
      { name: "Fashion & Apparel", slug: "fashion-and-apparel", order: 0 },
      { name: "Electronics", slug: "electronics", order: 1 },
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
      { name: "Schools & Tutoring", slug: "schools-and-tutoring", order: 0 },
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
      { name: "Residential Property", slug: "residential-property", order: 0 },
      { name: "Commercial Property", slug: "commercial-property", order: 1 },
      { name: "Land & Property", slug: "land-and-property", order: 2 },
    ],
  },
  {
    name: "Events & Hospitality",
    slug: "events-and-hospitality",
    description: "Event planning, hotels, and entertainment venues",
    order: 8,
    children: [
      { name: "Event Planning", slug: "event-planning", order: 0 },
      { name: "Hotels & Lodging", slug: "hotels-and-lodging", order: 1 },
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
      { name: "Hair Stylists & Salons", slug: "hair-stylists-and-salons", order: 0 },
      { name: "Barbershops", slug: "barbershops", order: 1 },
      { name: "Makeup Artists & Studios", slug: "makeup-artists-and-studios", order: 2 },
      { name: "Spas & Wellness", slug: "spas-and-wellness", order: 3 },
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
      { name: "Auto Repair & Mechanics", slug: "auto-repair-and-mechanics", order: 3 },
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
  if (!password || !email) {
    throw new Error("ADMIN_PASSWORD environment variable is not set");
  }
  const hashedPassword = await hasher.hash(password);

  console.log("🌱 Seeding Admin Account and User profile...");

  const account = await prisma.account.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: {
        create: {
          hash: hashedPassword,
        },
      },
      user: {
        create: {
          username: "steven_aanu",
          role: PlatformRole.ADMIN,
          avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Steven",
        },
      },
    },
    include: {
      user: true,
      passwordHash: true,
    },
  });

  console.log(`✅ Admin created with ID: ${account.id}`);
  console.log(`✅ User profile linked: ${account.user?.username}`);

  // -------------------------------------------------------------------------
  // Category taxonomy — idempotent (upsert by slug)
  // -------------------------------------------------------------------------
  console.log("\n🌱 Seeding category taxonomy...");

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
      await prisma.category.upsert({
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
    }
  }

  console.log("\n✅ Category taxonomy seeded successfully.");

  if (process.env.NODE_ENV === "production") {
    console.log("🌲 Production environment detected. Skipping tags and dummy data.");
    return;
  }

  // -------------------------------------------------------------------------
  // Tags — idempotent (upsert by slug)
  // -------------------------------------------------------------------------
  console.log("\n🌱 Seeding tags...");
  
  const standardTags = [
    { name: "24/7", slug: "24-7" },
    { name: "Eco-Friendly", slug: "eco-friendly" },
    { name: "Delivery", slug: "delivery" },
    { name: "Wholesale", slug: "wholesale" },
    { name: "Certified", slug: "certified" },
    { name: "Women-Owned", slug: "women-owned" },
    { name: "Student Discount", slug: "student-discount" },
    { name: "Wheelchair Accessible", slug: "wheelchair-accessible" },
  ];

  for (const tag of standardTags) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: { name: tag.name },
      create: { name: tag.name, slug: tag.slug },
    });
    console.log(`  ✅ Tag: ${tag.name}`);
  }

  console.log("\n✅ Tags seeded successfully.");

  // -------------------------------------------------------------------------
  // Location, Users, Businesses, Listings, Conversations, Review, BusinessTour
  // -------------------------------------------------------------------------
  console.log("\n🌱 Seeding dummy users, businesses, and conversations...");

  // 1. Create 15 users (plus the admin already created)
  const users = [];
  for (let i = 1; i <= 15; i++) {
    const userEmail = `user${i}@example.com`;
    const acc = await prisma.account.upsert({
      where: { email: userEmail },
      update: {},
      create: {
        email: userEmail,
        passwordHash: { create: { hash: hashedPassword } },
        user: {
          create: {
            username: `test_user_${i}`,
            role: PlatformRole.USER,
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=User${i}`,
          },
        },
      },
      include: { user: true },
    });
    users.push(acc.user!);
  }

  // 2. Location (Using PostGIS raw query)
  const locationId = "test-location-1";
  await prisma.$executeRaw`
    INSERT INTO "Location" ("id", "name", "formattedAddress", "coordinates")
    VALUES (${locationId}, 'Lagos Tech Hub', 'Yaba, Lagos, Nigeria', ST_SetSRID(ST_MakePoint(3.3792, 6.5244), 4326))
    ON CONFLICT ("id") DO NOTHING;
  `;

  // 3. Businesses
  const categories = await prisma.category.findMany({ where: { parentId: { not: null } }, take: 15 });

  const businessesData = [
    { name: "Sample Tech Store", slug: "sample-tech-store", owner: users[0], category: categories[0] },
    { name: "Sample Fashion Boutique", slug: "sample-fashion-boutique", owner: users[1], category: categories[1] },
  ];

  for (let i = 2; i < 15; i++) {
    businessesData.push({
      name: `Sample Business ${i + 1}`,
      slug: `sample-business-${i + 1}`,
      owner: users[i],
      category: categories[i % categories.length],
    });
  }

  const createdBusinesses = [];

  for (let i = 0; i < 15; i++) {
    const bData = businessesData[i]!;
    
    const business = await prisma.businessProfile.upsert({
      where: { slug: bData.slug },
      update: {},
      create: {
        ownerId: bData.owner!.id,
        name: bData.name,
        slug: bData.slug,
        isPublic: true,
        description: `A great ${bData.name}`,
        businessType: "PHYSICAL",
        phoneNumber: `+2348012345${i.toString().padStart(3, '0')}`,
        email: `contact@${bData.slug}.com`,
        locationId,
        hours: {
          create: [
            { day: "MON", openTime: "09:00", closeTime: "17:00" },
            { day: "TUE", openTime: "09:00", closeTime: "17:00" },
          ],
        },
        categories: { 
          create: bData.category ? [{ categoryId: bData.category.id, isPrimary: true }] : [] 
        },
        media: {
          create: [
            {
              url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(bData.name)}`,
              fileId: `${bData.slug}-logo`,
              mediaType: MediaType.IMAGE,
              role: MediaRole.LOGO,
            },
            {
              url: `https://picsum.photos/seed/${bData.slug}-banner/800/400`,
              fileId: `${bData.slug}-banner`,
              mediaType: MediaType.IMAGE,
              role: MediaRole.BANNER,
            }
          ]
        }
      },
    });

    await prisma.discoveryItem.upsert({
      where: { itemType_referenceId: { itemType: "BUSINESS", referenceId: business.id } },
      update: {},
      create: {
        itemType: "BUSINESS",
        businessProfileId: business.id,
        referenceId: business.id,
        clicksCount: Math.floor(Math.random() * 100),
      }
    });
    createdBusinesses.push(business);

    // 4. 10 Listings per business
    for (let j = 1; j <= 10; j++) {
      const listingSlug = `${bData.slug}-item-${j}`;
      const listing = await prisma.listing.upsert({
        where: { businessProfileId_slug: { businessProfileId: business.id, slug: listingSlug } },
        update: {},
        create: {
          businessProfileId: business.id,
          title: `${bData.name} Item ${j}`,
          slug: listingSlug,
          description: `Description for ${bData.name} Item ${j}`,
          status: "PUBLISHED",
          minPrice: Math.floor(Math.random() * 1000) + 10,
          currencyCode: "USD",
          categoryId: bData.category?.id || null,
          media: {
            create: [
              {
                url: `https://picsum.photos/seed/${listingSlug}-cover/600/400`,
                fileId: `${listingSlug}-cover`,
                mediaType: MediaType.IMAGE,
                role: MediaRole.COVER,
              },
              {
                url: `https://picsum.photos/seed/${listingSlug}-gallery1/600/400`,
                fileId: `${listingSlug}-gallery1`,
                mediaType: MediaType.IMAGE,
                role: MediaRole.GALLERY,
                order: 0,
              }
            ]
          }
        },
      });

      await prisma.discoveryItem.upsert({
        where: { itemType_referenceId: { itemType: "LISTING", referenceId: listing.id } },
        update: {},
        create: {
          itemType: "LISTING",
          businessProfileId: business.id,
          referenceId: listing.id,
          clicksCount: Math.floor(Math.random() * 50),
        }
      });
    }
  }

  // 5. Conversations
  const allListings = await prisma.listing.findMany();

  // Convo 1: User 3 asks Business 0 about their first listing
  const conv1User = users[2];
  const conv1Business = createdBusinesses[0];
  const conv1Listing = allListings.find(l => l.businessProfileId === conv1Business.id);

  // Convo 2: User 4 asks Business 1 about their first listing
  const conv2User = users[3];
  const conv2Business = createdBusinesses[1];
  const conv2Listing = allListings.find(l => l.businessProfileId === conv2Business.id);

  const convos = [
    { user: conv1User, business: conv1Business, listing: conv1Listing },
    { user: conv2User, business: conv2Business, listing: conv2Listing }
  ];

  for (const convo of convos) {
    if (!convo.listing) continue;

    const existingConversation = await prisma.conversation.findFirst({
      where: {
        businessProfileId: convo.business.id,
        listingId: convo.listing.id,
        participants: { some: { userId: convo.user.id } }
      }
    });

    if (!existingConversation) {
      await prisma.conversation.create({
        data: {
          businessProfileId: convo.business.id,
          listingId: convo.listing.id,
          subject: `Inquiry about ${convo.listing.title}`,
          participants: {
            create: [
              { userId: convo.user.id },
              // Business owner is implicitly part of the thread, but we add them explicitly to participants
              { userId: convo.business.ownerId } 
            ]
          },
          messages: {
            create: [
              { senderId: convo.user.id, content: `Hi, is ${convo.listing.title} still available?` },
              { senderId: convo.business.ownerId, content: `Yes, we have it in stock!` },
              { senderId: convo.user.id, content: `Great, I will come by tomorrow.` },
            ]
          }
        }
      });
    }
  }

  // 6. Review
  const firstListing = allListings.find(l => l.businessProfileId === createdBusinesses[0].id);
  if (firstListing) {
    await prisma.review.upsert({
      where: { listingId_reviewerId: { listingId: firstListing.id, reviewerId: account.user!.id } },
      update: {},
      create: {
        listingId: firstListing.id,
        reviewerId: account.user!.id, // Admin reviews the first listing
        rating: 5,
        comment: "Excellent machine!",
      },
    });
  }

  // 7. Business Tours
  for (let i = 0; i < 12; i++) {
    const business = createdBusinesses[i];
    if (!business) continue;

    const tour = await prisma.businessTour.upsert({
      where: { id: `test-tour-${i + 1}` },
      update: {},
      create: {
        id: `test-tour-${i + 1}`,
        businessProfileId: business.id,
        createdById: account.user!.id,
        title: `Store Walkthrough ${i + 1}`,
        summary: "A quick look at our displays",
        visitDate: new Date(),
        status: "PUBLISHED",
        highlights: {
          create: [{ value: "Great display" }, { value: "Friendly staff" }],
        },
        media: {
          create: [
            {
              url: "https://example.com/business-tour-video.mp4",
              fileId: `file-tour-${i + 1}-1`,
              mediaType: MediaType.VIDEO,
              role: MediaRole.GALLERY,
              order: 0,
            },
            {
              url: "https://example.com/business-tour-photo.jpg",
              fileId: `file-tour-${i + 1}-2`,
              mediaType: MediaType.IMAGE,
              role: MediaRole.GALLERY,
              order: 1,
            },
          ],
        },
      },
    });

    await prisma.discoveryItem.upsert({
      where: { itemType_referenceId: { itemType: "TOUR", referenceId: tour.id } },
      update: {},
      create: {
        itemType: "TOUR",
        businessProfileId: business.id,
        referenceId: tour.id,
        clicksCount: Math.floor(Math.random() * 200),
      }
    });
  }

  console.log("✅ Dummy data seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
