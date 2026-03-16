// Simplified version - create documents via API
const https = require('https');
const http = require('http');

const COMPANY_ID = '124804c1-0703-48ec-811b-754d80769e64';
const WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237';

// Helper to create ProseMirror document
function createDoc(content) {
  return {
    type: 'doc',
    content: content
  };
}

function h1(text) {
  return {
    type: 'heading',
    attrs: { level: 1 },
    content: [{ type: 'text', text }]
  };
}

function h2(text) {
  return {
    type: 'heading',
    attrs: { level: 2 },
    content: [{ type: 'text', text }]
  };
}

function h3(text) {
  return {
    type: 'heading',
    attrs: { level: 3 },
    content: [{ type: 'text', text }]
  };
}

function p(text) {
  if (!text) return { type: 'paragraph' };
  return {
    type: 'paragraph',
    content: [{ type: 'text', text }]
  };
}

function ul(items) {
  return {
    type: 'bulletList',
    content: items.map(item => ({
      type: 'listItem',
      content: [p(item)]
    }))
  };
}

// Import the documents content from a JSON file to avoid JavaScript string escaping issues
const fs = require('fs');

// Since we're having string issues, let's load from the database script we already created
console.log('Running database creation script...');

// Use child_process to run the original script after fixing it properly
const { execSync } = require('child_process');

// Read, fix all quotes properly, and write fixed version
let content = fs.readFileSync('/Users/botbot/.openclaw/workspace/zebi/create-security-app-docs.js', 'utf8');

// Replace escaped quotes and fix the syntax
content = content.replace(/\\'s /g, "'s ");
content = content.replace(/\\'t /g, "'t ");
content = content.replace(/\\'re /g, "'re ");

// Save
fs.writeFileSync('/Users/botbot/.openclaw/workspace/zebi/create-security-app-docs-final.js', content);

console.log('Fixed and saved. Running...');
try {
  execSync('node /Users/botbot/.openclaw/workspace/zebi/create-security-app-docs-final.js', {
    stdio: 'inherit'
  });
} catch (error) {
  console.error('Failed:', error.message);
  process.exit(1);
}
