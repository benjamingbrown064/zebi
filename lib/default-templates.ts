// Default Repeating Task Templates
// Pre-configured templates for common business tasks

import { TaskTemplateData } from './repeating-tasks';

export interface DefaultTemplate {
  title: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  customInterval?: any;
  taskTemplate: TaskTemplateData;
  requiresCompany?: boolean;
  requiresProject?: boolean;
}

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  // ==================== WEEKLY TEMPLATES ====================
  {
    title: 'Weekly Market Research - {company}',
    description: 'Automated weekly market research scan for {company}',
    frequency: 'weekly',
    requiresCompany: true,
    taskTemplate: {
      title: 'Market Research: {company} - {week} {year}',
      description: `Conduct weekly market research for {company}:

• Monitor competitor activity and product updates
• Track industry news and trends
• Identify new market opportunities
• Assess threats and challenges
• Update competitive intelligence

**Sources to check:**
- Competitor websites and blogs
- Industry publications
- Social media and community discussions
- Product Hunt and launch platforms
- Tech news outlets`,
      priority: 2,
      dueAt: '+7d',
      effortPoints: 3,
    },
  },

  {
    title: 'Weekly Social Media Monitoring - {company}',
    description: 'Track brand mentions, sentiment, and engagement',
    frequency: 'weekly',
    requiresCompany: true,
    taskTemplate: {
      title: 'Social Media Monitor: {company} - {week}',
      description: `Weekly social media analysis for {company}:

• Track brand mentions across platforms
• Monitor sentiment and engagement
• Identify influencer activity
• Spot trending topics related to our market
• Engage with community feedback

**Platforms:**
- Twitter/X
- LinkedIn
- Reddit
- Product Hunt
- Hacker News`,
      priority: 3,
      dueAt: '+7d',
      effortPoints: 2,
    },
  },

  {
    title: 'Weekly Content Planning - {company}',
    description: 'Plan and schedule content for the upcoming week',
    frequency: 'weekly',
    requiresCompany: true,
    taskTemplate: {
      title: 'Content Planning: {company} - {week}',
      description: `Plan content strategy for {company}:

• Review previous week's performance
• Plan blog posts and articles
• Schedule social media content
• Prepare email newsletters
• Identify content opportunities from research

**Deliverables:**
- Content calendar for next week
- Draft outlines for articles
- Social media post queue`,
      priority: 2,
      dueAt: '+5d',
      effortPoints: 3,
    },
  },

  // ==================== MONTHLY TEMPLATES ====================
  {
    title: 'Monthly Revenue Analysis - {company}',
    description: 'Automated monthly revenue and financial review',
    frequency: 'monthly',
    requiresCompany: true,
    taskTemplate: {
      title: 'Revenue Analysis: {company} - {month} {year}',
      description: `Monthly financial review for {company}:

• Analyze revenue vs. targets
• Review customer acquisition metrics (CAC, LTV)
• Assess churn and retention rates
• Identify revenue growth opportunities
• Review pricing and packaging effectiveness

**Metrics to analyze:**
- MRR/ARR growth
- Customer acquisition cost
- Lifetime value
- Churn rate
- Revenue per customer
- Conversion rates

**Deliverables:**
- Revenue dashboard update
- Key insights and trends
- Recommendations for next month`,
      priority: 1,
      dueAt: '+5d',
      effortPoints: 5,
    },
  },

  {
    title: 'Monthly Product Roadmap Review - {company}',
    description: 'Review and update product roadmap based on learnings',
    frequency: 'monthly',
    requiresCompany: true,
    taskTemplate: {
      title: 'Roadmap Review: {company} - {month}',
      description: `Monthly product roadmap review for {company}:

• Review completed features and outcomes
• Assess current priorities and timeline
• Incorporate user feedback and requests
• Evaluate competitive landscape changes
• Adjust roadmap based on strategic goals

**Questions to answer:**
- What shipped? What impact did it have?
- What should be prioritized next?
- What should be deprioritized?
- Are we building the right things?
- Any new opportunities or threats?`,
      priority: 1,
      dueAt: '+7d',
      effortPoints: 4,
    },
  },

  {
    title: 'Monthly Competitive Analysis - {company}',
    description: 'Deep dive into competitor positioning and strategy',
    frequency: 'monthly',
    requiresCompany: true,
    taskTemplate: {
      title: 'Competitive Analysis: {company} - {month}',
      description: `Monthly competitive intelligence for {company}:

• Deep analysis of top 3-5 competitors
• Feature comparison and gap analysis
• Pricing and packaging review
• Marketing and positioning assessment
• New entrants and market shifts

**Deliverables:**
- Updated competitive matrix
- Feature gap analysis
- Positioning recommendations
- Threat assessment
- Opportunity identification`,
      priority: 2,
      dueAt: '+10d',
      effortPoints: 5,
    },
  },

  {
    title: 'Monthly Customer Feedback Review - {company}',
    description: 'Analyze customer feedback and identify patterns',
    frequency: 'monthly',
    requiresCompany: true,
    taskTemplate: {
      title: 'Customer Feedback Review: {company} - {month}',
      description: `Monthly customer insight analysis for {company}:

• Review all customer feedback channels
• Identify common themes and requests
• Analyze support tickets and issues
• Track NPS and satisfaction scores
• Surface urgent customer needs

**Sources:**
- Support tickets
- User interviews
- Feature requests
- Social media feedback
- App store reviews
- Survey responses

**Output:**
- Top feature requests
- Common pain points
- Customer satisfaction trends
- Recommended actions`,
      priority: 2,
      dueAt: '+7d',
      effortPoints: 4,
    },
  },

  // ==================== DAILY TEMPLATES ====================
  {
    title: 'Daily Competitor Monitoring - {company}',
    description: 'Quick daily scan of competitor activity',
    frequency: 'daily',
    requiresCompany: true,
    taskTemplate: {
      title: 'Competitor Scan: {company} - {date}',
      description: `Daily competitor monitoring for {company}:

• Check competitor blogs and changelogs
• Monitor social media for announcements
• Track any pricing or product changes
• Note new features or launches
• Brief scan of relevant news

**Quick checks (15 min):**
- Top 3 competitor websites
- Their Twitter/LinkedIn
- Product Hunt
- Hacker News

**Only log significant changes or news.**`,
      priority: 4,
      dueAt: '+1d',
      effortPoints: 1,
    },
  },

  {
    title: 'Daily Metrics Check - {company}',
    description: 'Quick review of key business metrics',
    frequency: 'daily',
    requiresCompany: true,
    taskTemplate: {
      title: 'Metrics Check: {company} - {date}',
      description: `Daily metrics review for {company}:

• Review yesterday's key metrics
• Check for anomalies or significant changes
• Monitor critical user journeys
• Track conversion funnels
• Note any issues or opportunities

**Key metrics:**
- Sign-ups / trials
- Conversions
- MRR changes
- Churn events
- Support volume
- Website traffic

**Flag anything unusual for deeper analysis.**`,
      priority: 3,
      dueAt: '+1d',
      effortPoints: 1,
    },
  },

  // ==================== PROJECT-SPECIFIC TEMPLATES ====================
  {
    title: 'Weekly Project Status - {project}',
    description: 'Weekly project progress review and planning',
    frequency: 'weekly',
    requiresProject: true,
    taskTemplate: {
      title: 'Project Status: {project} - {week}',
      description: `Weekly status review for {project}:

• Review completed tasks and progress
• Update project timeline and milestones
• Identify blockers and risks
• Plan tasks for upcoming week
• Communicate status to stakeholders

**Questions:**
- Are we on track?
- Any blockers or risks?
- What's next?
- Do we need to adjust timeline or scope?`,
      priority: 2,
      dueAt: '+5d',
      effortPoints: 2,
    },
  },

  {
    title: 'Bi-weekly Sprint Planning - {project}',
    description: 'Sprint planning for development projects',
    frequency: 'custom',
    customInterval: { weeks: 2 },
    requiresProject: true,
    taskTemplate: {
      title: 'Sprint Planning: {project} - {date}',
      description: `Sprint planning for {project}:

• Review previous sprint outcomes
• Prioritize backlog items
• Estimate effort for top items
• Assign tasks to sprint
• Set sprint goals and success criteria

**Sprint activities:**
- Backlog refinement
- Story estimation
- Capacity planning
- Sprint commitment
- Risk identification`,
      priority: 1,
      dueAt: '+3d',
      effortPoints: 3,
    },
  },
];

/**
 * Get templates filtered by requirements
 */
export function getTemplatesForCompany(): DefaultTemplate[] {
  return DEFAULT_TEMPLATES.filter(t => t.requiresCompany);
}

export function getTemplatesForProject(): DefaultTemplate[] {
  return DEFAULT_TEMPLATES.filter(t => t.requiresProject);
}

export function getGeneralTemplates(): DefaultTemplate[] {
  return DEFAULT_TEMPLATES.filter(t => !t.requiresCompany && !t.requiresProject);
}
