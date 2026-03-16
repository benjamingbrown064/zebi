#!/bin/bash

API_BASE="https://zebi.app"
RESULTS_FILE="AI_FEATURE_TEST_RESULTS.txt"

echo "========================================" | tee $RESULTS_FILE
echo "AI Feature Comprehensive Test Suite" | tee -a $RESULTS_FILE
echo "Date: $(date)" | tee -a $RESULTS_FILE
echo "========================================" | tee -a $RESULTS_FILE
echo "" | tee -a $RESULTS_FILE

# Test 1: Chat API - Basic Message
echo "Test 1: Chat API - Basic Message" | tee -a $RESULTS_FILE
CHAT_RESPONSE=$(curl -s -X POST "$API_BASE/api/assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, can you help me?"}')

CONV_ID=$(echo "$CHAT_RESPONSE" | jq -r '.conversationId')
CHAT_CONTENT=$(echo "$CHAT_RESPONSE" | jq -r '.message.content')
CHAT_MODEL=$(echo "$CHAT_RESPONSE" | jq -r '.message.metadata.model')
CHAT_COST=$(echo "$CHAT_RESPONSE" | jq -r '.message.metadata.cost')
CHAT_TOKENS=$(echo "$CHAT_RESPONSE" | jq -r '.message.metadata.tokens')

if [ ! -z "$CONV_ID" ] && [ "$CONV_ID" != "null" ]; then
  echo "✅ PASS - Chat API responding" | tee -a $RESULTS_FILE
  echo "   Conversation ID: $CONV_ID" | tee -a $RESULTS_FILE
  echo "   Model: $CHAT_MODEL" | tee -a $RESULTS_FILE
  echo "   Cost: \$$CHAT_COST" | tee -a $RESULTS_FILE
  echo "   Tokens: $CHAT_TOKENS" | tee -a $RESULTS_FILE
  echo "   Response preview: ${CHAT_CONTENT:0:100}..." | tee -a $RESULTS_FILE
else
  echo "❌ FAIL - Chat API not responding properly" | tee -a $RESULTS_FILE
  echo "   Response: $CHAT_RESPONSE" | tee -a $RESULTS_FILE
fi
echo "" | tee -a $RESULTS_FILE

# Test 2: Chat API - Follow-up Message
echo "Test 2: Chat API - Conversation History" | tee -a $RESULTS_FILE
FOLLOWUP_RESPONSE=$(curl -s -X POST "$API_BASE/api/assistant/chat" \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONV_ID\", \"message\": \"What did I just ask you?\"}")

FOLLOWUP_CONTENT=$(echo "$FOLLOWUP_RESPONSE" | jq -r '.message.content')

if echo "$FOLLOWUP_CONTENT" | grep -qi "help"; then
  echo "✅ PASS - Conversation history maintained" | tee -a $RESULTS_FILE
  echo "   AI remembered previous context" | tee -a $RESULTS_FILE
  echo "   Response: ${FOLLOWUP_CONTENT:0:100}..." | tee -a $RESULTS_FILE
else
  echo "⚠️  WARN - History unclear" | tee -a $RESULTS_FILE
  echo "   Response: ${FOLLOWUP_CONTENT:0:100}..." | tee -a $RESULTS_FILE
fi
echo "" | tee -a $RESULTS_FILE

# Test 3: Chat API - Context Awareness (Tasks)
echo "Test 3: Chat API - Context Awareness (Tasks)" | tee -a $RESULTS_FILE
CONTEXT_RESPONSE=$(curl -s -X POST "$API_BASE/api/assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "How many tasks do I have?"}')

CONTEXT_CONTENT=$(echo "$CONTEXT_RESPONSE" | jq -r '.message.content')

if echo "$CONTEXT_CONTENT" | grep -qE "[0-9]+ (tasks|task)"; then
  echo "✅ PASS - Context awareness working" | tee -a $RESULTS_FILE
  echo "   AI accessed workspace data" | tee -a $RESULTS_FILE
  echo "   Response: $CONTEXT_CONTENT" | tee -a $RESULTS_FILE
else
  echo "⚠️  WARN - Context unclear" | tee -a $RESULTS_FILE
  echo "   Response: $CONTEXT_CONTENT" | tee -a $RESULTS_FILE
fi
echo "" | tee -a $RESULTS_FILE

# Test 4: Chat API - Empty Message Handling
echo "Test 4: Chat API - Error Handling (Empty Message)" | tee -a $RESULTS_FILE
ERROR_RESPONSE=$(curl -s -X POST "$API_BASE/api/assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": ""}')

if echo "$ERROR_RESPONSE" | jq -e '.error' > /dev/null; then
  echo "✅ PASS - Empty message rejected" | tee -a $RESULTS_FILE
  echo "   Error: $(echo "$ERROR_RESPONSE" | jq -r '.error')" | tee -a $RESULTS_FILE
else
  echo "❌ FAIL - Should reject empty messages" | tee -a $RESULTS_FILE
fi
echo "" | tee -a $RESULTS_FILE

# Test 5: Conversations API - List
echo "Test 5: Conversations API - List Conversations" | tee -a $RESULTS_FILE
CONVERSATIONS=$(curl -s "$API_BASE/api/assistant/conversations")
CONV_COUNT=$(echo "$CONVERSATIONS" | jq 'length')

if [ "$CONV_COUNT" -gt 0 ]; then
  echo "✅ PASS - Conversations list working" | tee -a $RESULTS_FILE
  echo "   Found $CONV_COUNT conversations" | tee -a $RESULTS_FILE
else
  echo "⚠️  WARN - No conversations found (expected some)" | tee -a $RESULTS_FILE
fi
echo "" | tee -a $RESULTS_FILE

# Test 6: Conversations API - Get Single Conversation
echo "Test 6: Conversations API - Get Conversation Detail" | tee -a $RESULTS_FILE
CONV_DETAIL=$(curl -s "$API_BASE/api/assistant/conversations/$CONV_ID")
MSG_COUNT=$(echo "$CONV_DETAIL" | jq '.messages | length')

if [ "$MSG_COUNT" -gt 0 ]; then
  echo "✅ PASS - Conversation detail working" | tee -a $RESULTS_FILE
  echo "   Conversation has $MSG_COUNT messages" | tee -a $RESULTS_FILE
else
  echo "❌ FAIL - Should have messages" | tee -a $RESULTS_FILE
fi
echo "" | tee -a $RESULTS_FILE

# Test 7: Recommendations API - Fetch
echo "Test 7: Recommendations API - Fetch Recommendations" | tee -a $RESULTS_FILE
RECS=$(curl -s "$API_BASE/api/recommendations")
REC_COUNT=$(echo "$RECS" | jq '.recommendations | length')
REC_CACHED=$(echo "$RECS" | jq -r '.cached')

if [ "$REC_COUNT" -gt 0 ]; then
  echo "✅ PASS - Recommendations API working" | tee -a $RESULTS_FILE
  echo "   Found $REC_COUNT recommendations" | tee -a $RESULTS_FILE
  echo "   Cached: $REC_CACHED" | tee -a $RESULTS_FILE
  
  # Show first recommendation
  FIRST_REC_TITLE=$(echo "$RECS" | jq -r '.recommendations[0].title')
  FIRST_REC_PRIORITY=$(echo "$RECS" | jq -r '.recommendations[0].priority')
  FIRST_REC_CONFIDENCE=$(echo "$RECS" | jq -r '.recommendations[0].confidence')
  echo "   First rec: \"$FIRST_REC_TITLE\" ($FIRST_REC_PRIORITY, $FIRST_REC_CONFIDENCE% confidence)" | tee -a $RESULTS_FILE
else
  echo "⚠️  WARN - No recommendations (may need generation)" | tee -a $RESULTS_FILE
fi
echo "" | tee -a $RESULTS_FILE

# Test 8: Recommendations API - Implement
if [ "$REC_COUNT" -gt 0 ]; then
  echo "Test 8: Recommendations API - Implement Action" | tee -a $RESULTS_FILE
  FIRST_REC_ID=$(echo "$RECS" | jq -r '.recommendations[0].id')
  
  IMPLEMENT_RESPONSE=$(curl -s -X POST "$API_BASE/api/recommendations/$FIRST_REC_ID/implement")
  
  if echo "$IMPLEMENT_RESPONSE" | jq -e '.success' > /dev/null; then
    echo "✅ PASS - Implement action working" | tee -a $RESULTS_FILE
  else
    echo "❌ FAIL - Implement action failed" | tee -a $RESULTS_FILE
    echo "   Response: $IMPLEMENT_RESPONSE" | tee -a $RESULTS_FILE
  fi
  echo "" | tee -a $RESULTS_FILE
fi

# Test 9: Recommendations API - Dismiss
if [ "$REC_COUNT" -gt 1 ]; then
  echo "Test 9: Recommendations API - Dismiss Action" | tee -a $RESULTS_FILE
  SECOND_REC_ID=$(echo "$RECS" | jq -r '.recommendations[1].id')
  
  DISMISS_RESPONSE=$(curl -s -X POST "$API_BASE/api/recommendations/$SECOND_REC_ID/dismiss")
  
  if echo "$DISMISS_RESPONSE" | jq -e '.success' > /dev/null; then
    echo "✅ PASS - Dismiss action working" | tee -a $RESULTS_FILE
  else
    echo "❌ FAIL - Dismiss action failed" | tee -a $RESULTS_FILE
    echo "   Response: $DISMISS_RESPONSE" | tee -a $RESULTS_FILE
  fi
  echo "" | tee -a $RESULTS_FILE
fi

# Test 10: Cost Analysis
echo "Test 10: Cost Analysis" | tee -a $RESULTS_FILE
DETAILED_RESPONSE=$(curl -s -X POST "$API_BASE/api/assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Give me a detailed analysis of all my tasks, objectives, and goals with full breakdown."}')

DETAILED_TOKENS=$(echo "$DETAILED_RESPONSE" | jq -r '.message.metadata.tokens')
DETAILED_COST=$(echo "$DETAILED_RESPONSE" | jq -r '.message.metadata.cost')

echo "   Long query tokens: $DETAILED_TOKENS" | tee -a $RESULTS_FILE
echo "   Long query cost: \$$DETAILED_COST" | tee -a $RESULTS_FILE

AVG_COST=$(echo "scale=5; ($CHAT_COST + $DETAILED_COST) / 2" | bc)
echo "   Average cost per message: \$$AVG_COST" | tee -a $RESULTS_FILE
echo "" | tee -a $RESULTS_FILE

# Test 11: Database Check
echo "Test 11: Database - Verify Data Persistence" | tee -a $RESULTS_FILE
node << 'NODESCRIPT' >> $RESULTS_FILE 2>&1
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkDatabase() {
  try {
    const conversations = await prisma.aIConversation.count()
    const messages = await prisma.aIMessage.count()
    const suggestions = await prisma.aISuggestion.count()
    
    console.log(`✅ PASS - Database accessible`)
    console.log(`   Conversations: ${conversations}`)
    console.log(`   Messages: ${messages}`)
    console.log(`   Suggestions: ${suggestions}`)
    
    await prisma.$disconnect()
  } catch (error) {
    console.error(`❌ FAIL - Database error: ${error.message}`)
    await prisma.$disconnect()
  }
}

checkDatabase()
NODESCRIPT
echo "" | tee -a $RESULTS_FILE

# Summary
echo "========================================" | tee -a $RESULTS_FILE
echo "Test Suite Complete" | tee -a $RESULTS_FILE
echo "========================================" | tee -a $RESULTS_FILE
echo "" | tee -a $RESULTS_FILE
echo "Results saved to: $RESULTS_FILE" | tee -a $RESULTS_FILE

