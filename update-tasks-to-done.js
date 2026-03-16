const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const taskIds = [
  '5b4eb209-f365-400c-b886-271a22c676cd', // Board is not showing new tasks
  'ba6a9885-392b-4d03-8a78-53abd72728ea', // AI tidy up doesn't work
  'a58c3ff5-14ee-4d79-92e1-8c696d248422', // Add colored background
  '35dc0226-e365-41fc-9b42-1d3bcd80412d', // Show status names
  '9b85a4a2-7c92-48b3-a8c3-e84c214009e4', // Move search to header
];

const doneStatusId = '2e18108d-3f28-4741-8b03-ad822816d4ee';

(async () => {
  try {
    for (const taskId of taskIds) {
      const updated = await prisma.task.update({
        where: { id: taskId },
        data: { statusId: doneStatusId }
      });
      console.log(`✓ Moved "${updated.title}" to Done`);
    }
    console.log('\nAll 5 tasks moved to Done status!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
})();
