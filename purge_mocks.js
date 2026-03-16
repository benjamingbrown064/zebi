const fs = require('fs')
const path = require('path')

const files = [
  'app/tasks/page.tsx',
  'app/board/page.tsx',
  'app/filters/page.tsx'
]

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8')
  
  // Remove all MOCK_ constant definitions
  content = content.replace(/const MOCK_\w+[^;]*;[\s\n]*/g, '')
  
  // Remove FALLBACK_STATUSES
  content = content.replace(/const FALLBACK_STATUSES[^;]*;[\s\n]*/g, '')
  
  // Remove all conditional logic that checks for MOCK_ data
  // Replace: if (...) { setX(...) } else { setX(MOCK_...) }
  content = content.replace(
    /if \([\w\.]+\s*>\s*0[\w\.|\s]*\)\s*\{[\s\n]*set\w+\([^)]+\)[\s\n]*set\w+\([^)]+\)[\s\n]*\}[\s\n]*else\s*\{[\s\S]*?set\w+\(MOCK_[\w]+[\s\S]*?\)\s*\}/g,
    `setTasks(fetchedTasks)
        setStatuses(fetchedStatuses)
        setFilters(fetchedFilters)`
  )
  
  // Replace error fallbacks
  content = content.replace(
    /} catch \(err\)\s*\{[\s\n]*console\.error[\s\S]*?set\w+\(MOCK_[\w]+[\s\S]*?\)\s*\}/g,
    `} catch (err) {
        console.error('Failed to load data:', err)
      }`
  )
  
  // Remove lines that reference MOCK_*
  content = content.split('\n').filter(line => 
    !line.includes('MOCK_') && 
    !line.includes('FALLBACK_')
  ).join('\n')
  
  fs.writeFileSync(file, content)
  console.log(`✓ Cleaned ${file}`)
})

// Verify no MOCK references remain in source
const verify = `grep -r "MOCK_" app --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v node_modules || echo "✅ All mock data removed"`
require('child_process').execSync(verify, { stdio: 'inherit' })
