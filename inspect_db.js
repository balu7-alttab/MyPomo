const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Inspecting FocusSession Data ---');
  const sessions = await prisma.focusSession.findMany({
    select: {
      id: true,
      status: true,
      startedAt: true,
      endedAt: true,
    }
  });

  const nullEnded = sessions.filter(s => !s.endedAt);
  const nullStarted = sessions.filter(s => !s.startedAt);
  const statusCounts = sessions.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});

  console.log('Total Sessions:', sessions.length);
  console.log('Status Counts:', statusCounts);
  console.log('Sessions with NULL endedAt:', nullEnded.length);
  console.log('Sessions with NULL startedAt:', nullStarted.length);

  if (nullEnded.length > 0) {
    console.log('\nTop 5 Null Ended Sessions:');
    console.log(nullEnded.slice(0, 5));
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
