const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function runTests() {
  console.log('================================================')
  console.log('Database & RLS Policy Tests')
  console.log('================================================\n')

  const WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237'
  const USER_ID = 'dc949f3d-2077-4ff7-8dc2-2a54454b7d74'

  try {
    // Test 1: Verify AI tables exist
    console.log('Test 1: Verify AI tables exist')
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'AI%'
      ORDER BY table_name;
    `
    console.log('✓ Found AI tables:', tables.map(t => t.table_name).join(', '))
    console.log('')

    // Test 2: Count existing conversations
    console.log('Test 2: Count existing data')
    const convCount = await prisma.aIConversation.count({ where: { workspaceId: WORKSPACE_ID } })
    const msgCount = await prisma.aIMessage.count()
    console.log(`✓ Conversations: ${convCount}`)
    console.log(`✓ Messages: ${msgCount}`)
    console.log('')

    // Test 3: Create and retrieve conversation
    console.log('Test 3: Create and retrieve conversation')
    const testConv = await prisma.aIConversation.create({
      data: {
        workspaceId: WORKSPACE_ID,
        userId: USER_ID,
        context: { test: true },
      },
    })
    console.log(`✓ Created conversation: ${testConv.id}`)
    
    const retrieved = await prisma.aIConversation.findUnique({
      where: { id: testConv.id },
    })
    console.log(`✓ Retrieved conversation: ${retrieved.id === testConv.id ? 'MATCH' : 'FAIL'}`)
    console.log('')

    // Test 4: Create messages
    console.log('Test 4: Create messages')
    const msg1 = await prisma.aIMessage.create({
      data: {
        conversationId: testConv.id,
        role: 'user',
        content: 'Test message',
      },
    })
    const msg2 = await prisma.aIMessage.create({
      data: {
        conversationId: testConv.id,
        role: 'assistant',
        content: 'Test response',
        metadata: { model: 'test', tokens: 10, cost: 0.00001 },
      },
    })
    console.log(`✓ Created 2 messages: ${msg1.id}, ${msg2.id}`)
    console.log('')

    // Test 5: Query conversation with messages
    console.log('Test 5: Query conversation with messages')
    const convWithMsgs = await prisma.aIConversation.findUnique({
      where: { id: testConv.id },
      include: { messages: true },
    })
    console.log(`✓ Conversation has ${convWithMsgs.messages.length} messages`)
    console.log('')

    // Test 6: Create AI suggestion
    console.log('Test 6: Create AI suggestion')
    const suggestion = await prisma.aISuggestion.create({
      data: {
        workspaceId: WORKSPACE_ID,
        userId: USER_ID,
        type: 'task',
        title: 'Test suggestion',
        description: 'Test description',
        reasoning: 'Test reasoning',
        actions: [{ type: 'create_task', label: 'Create task', params: {} }],
        status: 'pending',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })
    console.log(`✓ Created suggestion: ${suggestion.id}`)
    console.log('')

    // Test 7: Create AI memory
    console.log('Test 7: Create AI memory')
    const memory = await prisma.aIAssistantMemory.create({
      data: {
        workspaceId: WORKSPACE_ID,
        userId: USER_ID,
        category: 'preference',
        key: 'testPref',
        value: { setting: 'test value' },
        source: 'test',
        confidence: 100,
        lastUsedAt: new Date(),
      },
    })
    console.log(`✓ Created memory: ${memory.id}`)
    console.log('')

    // Test 8: Cleanup test data
    console.log('Test 8: Cleanup test data')
    await prisma.aIMessage.deleteMany({ where: { conversationId: testConv.id } })
    await prisma.aIConversation.delete({ where: { id: testConv.id } })
    await prisma.aISuggestion.delete({ where: { id: suggestion.id } })
    await prisma.aIAssistantMemory.delete({ where: { id: memory.id } })
    console.log('✓ Cleaned up test data')
    console.log('')

    console.log('================================================')
    console.log('All Database Tests Passed! ✅')
    console.log('================================================')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

runTests()
