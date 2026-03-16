const fs = require('fs');
let content = fs.readFileSync('create-security-app-docs.js', 'utf8');

// Replace all paragraph() calls that use single quotes with escaped versions
content = content.replace(/paragraph\('([^'\\]|\\[^'])*'\)/g, (match) => {
  // Extract the text between quotes
  const text = match.slice(11, -2); // Remove "paragraph('" and "')"
  // Escape single quotes in the text
  const escaped = text.replace(/'/g, "\\'");
  return `paragraph('${escaped}')`;
});

fs.writeFileSync('create-security-app-docs-fixed.js', content);
console.log('Created fixed version');
