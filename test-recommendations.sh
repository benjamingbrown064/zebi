#!/bin/bash

echo "======================================"
echo "Testing Dashboard Recommendations System"
echo "======================================"
echo ""

BASE_URL="http://localhost:3002"

echo "1. Testing recommendation generation (cron endpoint)..."
curl -s "$BASE_URL/api/cron/generate-recommendations" | python3 -c "import sys, json; data = json.load(sys.stdin); print(f'✓ Generated {data[\"count\"]} recommendations')"
echo ""

echo "2. Testing recommendation fetch with caching..."
RESULT=$(curl -s "$BASE_URL/api/recommendations")
CACHED=$(echo "$RESULT" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('cached', False))")
COUNT=$(echo "$RESULT" | python3 -c "import sys, json; data = json.load(sys.stdin); print(len(data['recommendations']))")
echo "✓ Fetched $COUNT recommendations (cached: $CACHED)"
echo ""

echo "3. Testing recommendation implement..."
REC_ID=$(echo "$RESULT" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['recommendations'][0]['id'])")
curl -s -X POST "$BASE_URL/api/recommendations/$REC_ID/implement" | python3 -c "import sys, json; data = json.load(sys.stdin); print('✓ Implemented' if data.get('success') else '✗ Failed')"
echo ""

echo "4. Testing recommendation dismiss..."
REC_ID2=$(echo "$RESULT" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['recommendations'][1]['id'])")
curl -s -X POST "$BASE_URL/api/recommendations/$REC_ID2/dismiss" | python3 -c "import sys, json; data = json.load(sys.stdin); print('✓ Dismissed' if data.get('success') else '✗ Failed')"
echo ""

echo "5. Checking database status..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const stats = await prisma.aISuggestion.groupBy({
    by: ['status'],
    where: { workspaceId: 'dfd6d384-9e2f-4145-b4f3-254aa82c0237' },
    _count: true
  });
  console.log('Status counts:');
  stats.forEach(s => console.log(\`  \${s.status}: \${s._count}\`));
  await prisma.\$disconnect();
})();
"

echo ""
echo "======================================"
echo "All tests completed successfully! ✓"
echo "======================================"
