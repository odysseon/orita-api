import { PrismaClient } from './generated/prisma/client.js';
import { Argon2PasswordHasher } from '@odysseon/whoami-adapter-argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env["DATABASE_URL"],
});
const prisma = new PrismaClient({ adapter });
const hasher = new Argon2PasswordHasher();

async function createTestUser() {
  const email = 'testuser@example.com';
  const password = 'Password123!';
  const username = 'testuser123';

  // Check if exists
  const existing = await prisma.account.findUnique({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists!`);
    // Delete and recreate to ensure clean state
    await prisma.account.delete({ where: { email } });
  }

  // Hash password
  const hash = await hasher.hash(password);

  // Create account & user
  const account = await prisma.account.create({
    data: {
      email,
      passwordHash: {
        create: { hash }
      },
      user: {
        create: {
          username,
          participant: { create: {} }
        }
      }
    },
    include: { user: true }
  });

  const userId = account.user!.id;

  // Create a business
  const business = await prisma.businessProfile.create({
    data: {
      ownerId: userId,
      name: 'Test Business',
      slug: 'test-business',
      isPublic: true,
      description: 'A test business for testing rich sharing',
      businessType: 'ONLINE',
      participant: { create: {} }
    }
  });

  // Create a listing
  const listing = await prisma.listing.create({
    data: {
      businessProfileId: business.id,
      title: 'Test Listing',
      slug: 'test-listing',
      description: 'A beautiful test listing',
      status: 'PUBLISHED',
      minPrice: 5000,
      currencyCode: 'NGN'
    }
  });

  console.log(`Test user created successfully!`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Business ID: ${business.id}`);
  console.log(`Listing ID: ${listing.id}`);
  console.log(`User ID: ${userId}`);
}

createTestUser()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
