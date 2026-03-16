#!/bin/bash
# Test script for Daily Summary Generator

echo "=== Daily Summary Generator Test ==="
echo ""

# Test 1: GET endpoint (no auth)
echo "1. Testing GET endpoint (no auth required)..."
curl -s "http://localhost:3001/api/cron/daily-summary?format=telegram" | jq -r '.summary'
echo ""

# Test 2: GET endpoint with plain format
echo "2. Testing plain text format..."
curl -s "http://localhost:3001/api/cron/daily-summary?format=plain" | jq -r '.summary'
echo ""

# Test 3: POST endpoint with auth
echo "3. Testing POST endpoint with auth..."
curl -s -X POST "http://localhost:3001/api/cron/daily-summary" \
  -H "Authorization: Bearer dev-secret" | jq '.success'
echo ""

# Test 4: POST endpoint without auth (should fail)
echo "4. Testing POST endpoint without auth (should fail)..."
curl -s -X POST "http://localhost:3001/api/cron/daily-summary" | jq '.'
echo ""

# Test 5: Full data structure
echo "5. Full summary data structure..."
curl -s "http://localhost:3001/api/cron/daily-summary" | jq '.data | keys'
echo ""

echo "=== Tests Complete ==="
