import { PrismaClient } from './generated/prisma/client/index.mjs';

const prisma = new PrismaClient();

async function run() {
  const convs = await prisma.conversation.findMany({
    select: {
      id: true,
      type: true,
      title: true,
      participants: {
        include: {
          participant: {
            include: { user: true, business: true }
          }
        }
      }
    }
  });

  console.dir(convs, { depth: null });
  await prisma.$disconnect();
}

run().catch(console.error);
