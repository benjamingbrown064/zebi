#!/bin/bash

API_BASE="http://localhost:3002"

echo "Week 3: Inline Intelligence Tests"
echo "=================================="
echo ""

# Test 1: Autocomplete
echo "Test 1: Smart Autocomplete"
echo "---------------------------"
curl -X POST "$API_BASE/api/assistant/autocomplete" \
  -H "Content-Type: application/json" \
  -d '{"partialText": "Review security"}' | jq '.'
echo ""

# Test 2: Deadline Suggestion
echo "Test 2: Smart Deadline"
echo "----------------------"
curl -X POST "$API_BASE/api/assistant/suggest-deadline" \
  -H "Content-Type: application/json" \
  -d '{"taskDescription": "Complete project documentation", "priority": 1}' | jq '.'
echo ""

# Test 3: Related Tasks
echo "Test 3: Related Tasks"
echo "--------------------"
curl -X POST "$API_BASE/api/assistant/related-tasks" \
  -H "Content-Type: application/json" \
  -d '{"taskDescription": "Fix security vulnerabilities"}' | jq '.'
echo ""

echo "=================================="
echo "Tests completed!"
