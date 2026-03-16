const fs = require('fs')

// Read dashboard
let dash = fs.readFileSync('app/dashboard/page.tsx', 'utf8')

// Remove MOCK_SIGNALS section entirely
dash = dash.replace(
  /\{\/\* Panel 2: Attention \*\/\}[\s\S]*?{\/\* Panel 3: Goals \*\/\}/,
  `{/* Panel 2: Attention */}
          <div className="space-y-4">
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-900">Attention</h2>
              <p className="text-xs text-gray-500">No signals</p>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-500">No attention signals at this time</p>
            </div>
          </div>

          {/* Panel 3: Goals */}`
)

// Remove MOCK_GOALS mapping
dash = dash.replace(
  /{MOCK_GOALS\.map\(\(goal\) => \([\s\S]*?\)\)}/,
  `<p className="text-sm text-gray-500">No goals yet. Create one to get started.</p>`
)

fs.writeFileSync('app/dashboard/page.tsx', dash)
console.log('Fixed dashboard')

// Read tasks page
let tasks = fs.readFileSync('app/tasks/page.tsx', 'utf8')
// Should be mostly clean already
fs.writeFileSync('app/tasks/page.tsx', tasks)
console.log('Tasks page ok')

// Read board page  
let board = fs.readFileSync('app/board/page.tsx', 'utf8')
// Should be mostly clean already
fs.writeFileSync('app/board/page.tsx', board)
console.log('Board page ok')
