const fs = require('fs')

// Dashboard
let dash = fs.readFileSync('app/dashboard/page.tsx', 'utf8')
dash = dash.replace(
  /if \(true\) \{\s*setTasks\(fetchedTasks\)[\s\S]*?\} else \{[\s\S]*?setTasks\(MOCK_TASKS as any\)[\s\S]*?\}/,
  `setTasks(fetchedTasks)
        setStatuses(fetchedStatuses)
        setFilters(fetchedFilters)`
)
dash = dash.replace(/} catch \(err\) \{[\s\S]*?setTasks\(MOCK_TASKS as any\)[\s\S]*?\} finally \{/, 
  `} catch (err) {
        console.error('Failed to load data:', err)
      } finally {`)
dash = dash.replace(/\{MOCK_SIGNALS\.map\(\(signal\)[\s\S]*?}{\}/g, 
  `{[].map((signal) => ( {} ))`
)
dash = dash.replace(/\{MOCK_GOALS\.map\(\(goal\)[\s\S]*?}{\}/g, 
  `{[].map((goal) => ( {} ))`
)
fs.writeFileSync('app/dashboard/page.tsx', dash)

// Tasks
let tasks = fs.readFileSync('app/tasks/page.tsx', 'utf8')
tasks = tasks.replace(
  /if \(fetchedStatuses\.length > 0\) \{[\s\S]*?setTasks\(MOCK_TASKS as any\)[\s\S]*?\}/,
  `setStatuses(fetchedStatuses)
        setTasks(fetchedTasks)
        setFilters(fetchedFilters)`
)
tasks = tasks.replace(/} catch \(err\) \{[\s\S]*?setTasks\(MOCK_TASKS as any\)[\s\S]*?\} finally \{/, 
  `} catch (err) {
        console.error('Failed to load data:', err)
      } finally {`)
fs.writeFileSync('app/tasks/page.tsx', tasks)

// Board
let board = fs.readFileSync('app/board/page.tsx', 'utf8')
board = board.replace(
  /if \(fetchedStatuses\.length > 0\) \{[\s\S]*?setTasks\(MOCK_TASKS\)[\s\S]*?setStatuses\(FALLBACK_STATUSES as any\)\s*\}/,
  `setStatuses(fetchedStatuses)
        setTasks(fetchedTasks)
        setFilters(fetchedFilters)`
)
board = board.replace(/} catch \(err\) \{[\s\S]*?setTasks\(MOCK_TASKS\)[\s\S]*?\} finally \{/, 
  `} catch (err) {
        console.error('Failed to load data:', err)
      } finally {`)
fs.writeFileSync('app/board/page.tsx', board)

console.log('✅ All mock data removed')
