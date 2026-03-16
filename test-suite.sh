#!/bin/bash

API_BASE="https://zebi.app"

echo "================================================"
echo "Week 1 (Day 1-4) Comprehensive Test Suite"
echo "================================================"
echo ""

# Test 1: POST /api/assistant/chat (Basic)
echo "Test 1: POST /api/assistant/chat (Basic question)"
echo "Question: 'Hello, who are you?'"
RESPONSE1=$(curl -s -X POST "$API_BASE/api/assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, who are you?"}')

CONV_ID=$(echo "$RESPONSE1" | grep -o '"conversationId":"[^"]*"' | cut -d'"' -f4)
CONTENT1=$(echo "$RESPONSE1" | grep -o '"content":"[^"]*"' | head -1)
MODEL1=$(echo "$RESPONSE1" | grep -o '"model":"[^"]*"' | cut -d'"' -f4)
COST1=$(echo "$RESPONSE1" | grep -o '"cost":[0-9.]*' | cut -d':' -f2)

echo "✓ Conversation ID: $CONV_ID"
echo "✓ Model: $MODEL1"
echo "✓ Cost: \$$COST1"
echo "✓ Response preview: ${CONTENT1:0:80}..."
echo ""

# Test 2: Conversation History (Follow-up)
echo "Test 2: Conversation history (Follow-up question)"
echo "Question: 'What can you help me with?'"
RESPONSE2=$(curl -s -X POST "$API_BASE/api/assistant/chat" \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\": \"$CONV_ID\", \"message\": \"What can you help me with?\"}")

CONTENT2=$(echo "$RESPONSE2" | grep -o '"content":"[^"]*"' | head -1)
echo "✓ Response preview: ${CONTENT2:0:80}..."
echo ""

# Test 3: Context Awareness (Workspace data)
echo "Test 3: Context awareness (Workspace data)"
echo "Question: 'How many tasks do I have?'"
RESPONSE3=$(curl -s -X POST "$API_BASE/api/assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "How many tasks do I have?"}')

CONTENT3=$(echo "$RESPONSE3" | grep -o '"content":"[^"]*"' | head -1)
echo "✓ Response: $CONTENT3"
echo ""

# Test 4: Context Awareness (Goals)
echo "Test 4: Context awareness (Goals)"
echo "Question: 'What are my active goals?'"
RESPONSE4=$(curl -s -X POST "$API_BASE/api/assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "What are my active goals?"}')

CONTENT4=$(echo "$RESPONSE4" | grep -o '"content":"[^"]*"' | head -1)
echo "✓ Response: $CONTENT4"
echo ""

# Test 5: GET /api/assistant/conversations
echo "Test 5: GET /api/assistant/conversations (List)"
CONVERSATIONS=$(curl -s "$API_BASE/api/assistant/conversations")
CONV_COUNT=$(echo "$CONVERSATIONS" | grep -o '"id":' | wc -l | tr -d ' ')
echo "✓ Found $CONV_COUNT conversations"
echo ""

# Test 6: GET /api/assistant/conversations/[id]
echo "Test 6: GET /api/assistant/conversations/[id] (Detail)"
CONV_DETAIL=$(curl -s "$API_BASE/api/assistant/conversations/$CONV_ID")
MSG_COUNT=$(echo "$CONV_DETAIL" | grep -o '"role":' | wc -l | tr -d ' ')
echo "✓ Conversation has $MSG_COUNT messages"
echo ""

# Test 7: Error Handling (Empty message)
echo "Test 7: Error handling (Empty message)"
ERROR_RESPONSE=$(curl -s -X POST "$API_BASE/api/assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": ""}')

if echo "$ERROR_RESPONSE" | grep -q "error"; then
  echo "✓ Correctly rejected empty message"
else
  echo "✗ FAILED: Should reject empty message"
fi
echo ""

# Test 8: Cost Calculation
echo "Test 8: Cost calculation"
echo "Question: 'Give me a detailed breakdown of all my tasks, objectives, and goals with full analysis.'"
RESPONSE8=$(curl -s -X POST "$API_BASE/api/assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Give me a detailed breakdown of all my tasks, objectives, and goals with full analysis."}')

TOKENS8=$(echo "$RESPONSE8" | grep -o '"tokens":[0-9]*' | cut -d':' -f2)
COST8=$(echo "$RESPONSE8" | grep -o '"cost":[0-9.]*' | cut -d':' -f2)
echo "✓ Tokens used: $TOKENS8"
echo "✓ Cost: \$$COST8"
echo ""

# Test 9: Rate limiting / Performance
echo "Test 9: Response time (3 concurrent requests)"
START=$(date +%s)
curl -s -X POST "$API_BASE/api/assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Quick test 1"}' > /dev/null &
curl -s -X POST "$API_BASE/api/assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Quick test 2"}' > /dev/null &
curl -s -X POST "$API_BASE/api/assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Quick test 3"}' > /dev/null &
wait
END=$(date +%s)
DURATION=$((END - START))
echo "✓ 3 concurrent requests completed in ${DURATION}s"
echo ""

echo "================================================"
echo "Test Suite Complete"
echo "================================================"
