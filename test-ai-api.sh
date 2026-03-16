#!/bin/bash
API_BASE="http://localhost:3000"

echo "Testing AI Chat with real OpenAI integration..."
curl -X POST "$API_BASE/api/assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What should I work on today?"
  }' | jq

echo -e "\n\nTesting conversation continuation..."
CONV_ID=$(curl -s -X POST "$API_BASE/api/assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hi, I need help prioritizing"}' | jq -r '.conversationId')

echo "Conversation ID: $CONV_ID"

curl -X POST "$API_BASE/api/assistant/chat" \
  -H "Content-Type: application/json" \
  -d "{
    \"conversationId\": \"$CONV_ID\",
    \"message\": \"What are my top 3 priorities?\"
  }" | jq
