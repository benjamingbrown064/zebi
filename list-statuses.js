#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237';

async function listStatuses() {
  try {
    const statuses = await prisma.status.findMany({
      where: {
        workspaceId: WORKSPACE_ID
      },
      orderBy: {
        sortOrder: 'asc'
      }
    });

    console.log('📊 Available statuses:\n');
    statuses.forEach(status => {
      console.log(`  ID: ${status.id}`);
      console.log(`  Name: "${status.name}"`);
      console.log(`  Type: ${status.type}`);
      console.log(`  System: ${status.isSystem}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

listStatuses();
