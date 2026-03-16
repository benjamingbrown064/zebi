# Remove mock tasks from dashboard
sed -i '' '20,50d' app/dashboard/page.tsx

# Remove fallback logic from dashboard
sed -i '' 's/if (fetchedTasks.length > 0 || fetchedStatuses.length > 0) {/if (true) {/' app/dashboard/page.tsx
sed -i '' '/Fallback to mock data/,/}$/c\      // Only use real database data
' app/dashboard/page.tsx

echo "Done with dashboard"
