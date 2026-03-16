#!/bin/bash

# Task IDs to move to "check" status
TASK_IDS=(
  "d9706c5d-4410-454d-8763-467fbdea4b6e"
  "2c19eb89-90ad-4a17-99a4-4e6134b1f8cc"
  "61cbfdd6-3ffe-47b9-b92d-8355191fd29e"
  "94d468a4-0aaf-4c3d-a2c6-d1b7bc901e32"
  "2644a627-6966-4242-b8e8-ff407d78c98b"
  "5b1ec7fd-98dd-469c-aefa-c120ce681322"
  "b5210b82-882d-4d32-8e7e-e7c2ff6b960c"
  "4e774ab8-ba25-402d-9bf4-63d156d24e81"
)

BASE_URL="https://focus-app-rho-taupe.vercel.app/api/tasks"

for TASK_ID in "${TASK_IDS[@]}"; do
  echo "Updating task: $TASK_ID"
  curl -s -X PATCH "$BASE_URL/$TASK_ID" \
    -H "Content-Type: application/json" \
    -d '{"statusType": "check"}' | jq '.'
  echo "---"
done

echo "✅ All tasks moved to Check status"
