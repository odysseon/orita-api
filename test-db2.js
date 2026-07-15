import { PrismaClient } from './generated/prisma/client/index.js';

const prisma = new PrismaClient();

async function run() {
  const myParticipantIds = ['cmrlvuucf00036lfxcnawolt0'];
  const conversations = await prisma.conversation.findMany({
      where: { participants: { some: { participantId: { in: myParticipantIds } } } },
      select: {
        id: true,
        type: true,
        title: true,
        updatedAt: true,
        participants: {
          select: {
            participantId: true,
            participant: {
              select: { user: true, business: true }
            }
          }
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

  console.dir(conversations, { depth: null });
  await prisma.$disconnect();
}

run().catch(console.error);
