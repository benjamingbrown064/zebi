const fs = require('fs')
const path = require('path')

// Dashboard
let dashboardContent = fs.readFileSync('app/dashboard/page.tsx', 'utf8')
dashboardContent = dashboardContent.replace(
  /\/\/ Fallback data when database is unavailable[\s\S]*?const MOCK_GOALS[\s\S]*?\]\s*\n\n/,
  ''
)
dashboardContent = dashboardContent.replace(
  /if \(fetchedTasks\.length > 0 \|\| fetchedStatuses\.length > 0\) \{\s*setTasks\(fetchedTasks\)[\s\S]*?} else \{\s*console\.log\('No data from database, using mock data'\)\s*setTasks\(MOCK_TASKS as any\)\s*\}/,
  `setTasks(fetchedTasks)
        setStatuses(fetchedStatuses)
        setFilters(fetchedFilters)`
)
fs.writeFileSync('app/dashboard/page.tsx', dashboardContent)
console.log('✅ Dashboard cleaned')

// Tasks page
let tasksContent = fs.readFileSync('app/tasks/page.tsx', 'utf8')
tasksContent = tasksContent.replace(
  /const MOCK_TASKS = \[[\s\S]*?\]\s*\n\n/,
  ''
)
tasksContent = tasksContent.replace(
  /if \(fetchedStatuses\.length > 0\) \{[\s\S]*?} else \{[\s\S]*?setTasks\(MOCK_TASKS as any\)[\s\S]*?\}/,
  `setStatuses(fetchedStatuses)
        setTasks(fetchedTasks)
        setFilters(fetchedFilters)`
)
fs.writeFileSync('app/tasks/page.tsx', tasksContent)
console.log('✅ Tasks page cleaned')

// Board page
let boardContent = fs.readFileSync('app/board/page.tsx', 'utf8')
boardContent = boardContent.replace(
  /const MOCK_TASKS: Task\[\] = \[[\s\S]*?\]\s*\nconst FALLBACK_STATUSES = \[[\s\S]*?\]\s*\n\n/,
  ''
)
boardContent = boardContent.replace(
  /if \(fetchedStatuses\.length > 0\) \{[\s\S]*?} else \{[\s\S]*?setTasks\(MOCK_TASKS\)[\s\S]*?\}/,
  `setStatuses(fetchedStatuses)
        setTasks(fetchedTasks)
        setFilters(fetchedFilters)`
)
fs.writeFileSync('app/board/page.tsx', boardContent)
console.log('✅ Board page cleaned')
