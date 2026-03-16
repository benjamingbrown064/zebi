// Create documents via API to avoid string escaping issues
const axios = require('axios');

const COMPANY_ID = '124804c1-0703-48ec-811b-754d80769e64';
const WORKSPACE_ID = 'dfd6d384-9e2f-4145-b4f3-254aa82c0237';
const BASE_URL = 'http://localhost:3000'; // Adjust if needed

// Simple helper functions
const h1 = (text) => ({ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text }] });
const h2 = (text) => ({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text }] });
const h3 = (text) => ({ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text }] });
const p = (text) => text ? { type: 'paragraph', content: [{ type: 'text', text }] } : { type: 'paragraph' };
const ul = (items) => ({
  type: 'bulletList',
  content: items.map(item => ({ type: 'listItem', content: [p(item)] }))
});
const doc = (content) => ({ type: 'doc', content });

// Document 1: Technical Spec (abbreviated for testing)
const technicalSpec = doc([
  h1('AI-QEF Technical Specification'),
  p(''),
  h2('System Architecture Overview'),
  p('AI-QEF is built as a modern, cloud-native platform designed for scalability, security, and real-time data processing.'),
  p(''),
  h3('Core Technology Stack'),
  ul([
    'Next.js 15 - Frontend framework',
    'Supabase - Backend infrastructure',
    'PostgreSQL - Primary database',
    'Vercel - Deployment platform',
    'Claude Sonnet 4 - AI engine',
    'OpenAI API - Secondary AI provider'
  ]),
  p(''),
  h2('Six Governance Modules'),
  h3('1. Strategic AI Positioning Module'),
  p('Measures alignment between AI initiatives and business strategy.'),
  ul([
    'Strategic alignment scoring',
    'AI readiness assessment',
    'Value potential calculator',
    'ROI projection models'
  ])
]);

console.log('Technical Spec structure:', JSON.stringify(technicalSpec, null, 2));
console.log('Ready to create documents via Prisma instead');
