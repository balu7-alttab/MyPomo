const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.habitLog.deleteMany();
  await prisma.habit.deleteMany();
  await prisma.note.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.session.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  console.log('DB CLEARED');
}

main().catch(console.error).finally(() => prisma.$disconnect());
