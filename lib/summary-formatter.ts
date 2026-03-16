/**
 * Summary Formatter
 * 
 * Formats daily summary data into Telegram markdown
 */

import { DailySummaryData } from './daily-summary';

/**
 * Format summary for Telegram (markdown)
 */
export function formatSummaryForTelegram(summary: DailySummaryData): string {
  const lines: string[] = [];
  
  // Header
  const date = new Date(summary.date);
  const dateStr = date.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
  lines.push(`📊 *Daily Work Summary* \\- ${escapeMarkdown(dateStr)}`);
  lines.push('');

  // Mission progress
  if (summary.mission) {
    const { previous, current, change } = summary.mission.progress;
    const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
    const changeStr = change !== 0 ? ` (${arrow}${Math.abs(change)}%)` : '';
    lines.push(`🎯 *Mission Progress:* ${previous}% → ${current}%${changeStr}`);
    lines.push('');
  }

  // Companies section
  if (summary.companies.length > 0) {
    lines.push('💼 *Companies:*');
    for (const company of summary.companies) {
      const activities: string[] = [];
      
      if (company.tasksCompleted > 0) {
        activities.push(`${company.tasksCompleted} tasks completed`);
      }
      if (company.documentsCreated > 0) {
        activities.push(`${company.documentsCreated} docs created`);
      }
      if (company.documentsUpdated > 0) {
        activities.push(`${company.documentsUpdated} docs updated`);
      }
      if (company.insightsGenerated > 0) {
        activities.push(`${company.insightsGenerated} insights`);
      }
      if (company.memoriesStored > 0) {
        activities.push(`${company.memoriesStored} memories`);
      }
      if (company.projectsProgressed > 0) {
        activities.push(`${company.projectsProgressed} projects progressed`);
      }

      if (activities.length > 0) {
        lines.push(`• ${escapeMarkdown(company.name)}: ${activities.join(', ')}`);
      }
    }
    lines.push('');
  }

  // Overall stats
  const { totals } = summary;
  
  if (totals.documentsCreated > 0 || totals.documentsUpdated > 0) {
    const docStats = [];
    if (totals.documentsCreated > 0) docStats.push(`${totals.documentsCreated} created`);
    if (totals.documentsUpdated > 0) docStats.push(`${totals.documentsUpdated} updated`);
    lines.push(`📝 *Documents:* ${docStats.join(', ')}`);
  }

  if (totals.insightsGenerated > 0) {
    lines.push(`💡 *Insights:* ${totals.insightsGenerated} new opportunities identified`);
  }

  if (totals.memoriesStored > 0) {
    lines.push(`🧠 *Memories:* ${totals.memoriesStored} stored`);
  }

  if (totals.projectsProgressed > 0) {
    lines.push(`📁 *Projects:* ${totals.projectsProgressed} progressed`);
  }

  // Task stats
  if (totals.tasksCompleted.total > 0) {
    lines.push('');
    if (totals.tasksCompleted.ai > 0 && totals.tasksCompleted.human > 0) {
      lines.push(`🤖 *AI Tasks:* ${totals.tasksCompleted.ai} completed`);
      lines.push(`👤 *Human Tasks:* ${totals.tasksCompleted.human} completed`);
    } else {
      lines.push(`✅ *Tasks Completed:* ${totals.tasksCompleted.total}`);
    }
  }

  // Tomorrow's queue
  if (summary.tomorrowQueue.totalTasks > 0) {
    lines.push('');
    lines.push(`🔄 *Tomorrow's Queue:* ${summary.tomorrowQueue.totalTasks} tasks ready`);
    
    const { byPriority } = summary.tomorrowQueue;
    const priorityStats: string[] = [];
    if (byPriority.urgent > 0) priorityStats.push(`${byPriority.urgent} urgent`);
    if (byPriority.high > 0) priorityStats.push(`${byPriority.high} high`);
    if (byPriority.medium > 0) priorityStats.push(`${byPriority.medium} medium`);
    
    if (priorityStats.length > 0) {
      lines.push(`   ${priorityStats.join(' • ')}`);
    }

    // Top companies in queue
    if (summary.tomorrowQueue.byCompany.length > 0) {
      const topCompanies = summary.tomorrowQueue.byCompany
        .slice(0, 3)
        .map(c => `${escapeMarkdown(c.companyName)} (${c.taskCount})`)
        .join(', ');
      lines.push(`   Top: ${topCompanies}`);
    }
  }

  // Highlights
  if (summary.topHighlights.length > 0) {
    lines.push('');
    lines.push('✨ *Highlights:*');
    for (const highlight of summary.topHighlights) {
      lines.push(`• ${escapeMarkdown(highlight)}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format summary for plain text (fallback)
 */
export function formatSummaryPlain(summary: DailySummaryData): string {
  const lines: string[] = [];
  
  // Header
  const date = new Date(summary.date);
  const dateStr = date.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
  lines.push(`📊 Daily Work Summary - ${dateStr}`);
  lines.push('');

  // Mission progress
  if (summary.mission) {
    const { previous, current, change } = summary.mission.progress;
    const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
    const changeStr = change !== 0 ? ` (${arrow}${Math.abs(change)}%)` : '';
    lines.push(`🎯 Mission Progress: ${previous}% → ${current}%${changeStr}`);
    lines.push('');
  }

  // Companies
  if (summary.companies.length > 0) {
    lines.push('💼 Companies:');
    for (const company of summary.companies) {
      const activities: string[] = [];
      
      if (company.tasksCompleted > 0) {
        activities.push(`${company.tasksCompleted} tasks completed`);
      }
      if (company.documentsCreated > 0) {
        activities.push(`${company.documentsCreated} docs created`);
      }
      if (company.insightsGenerated > 0) {
        activities.push(`${company.insightsGenerated} insights`);
      }

      if (activities.length > 0) {
        lines.push(`- ${company.name}: ${activities.join(', ')}`);
      }
    }
    lines.push('');
  }

  // Stats
  const { totals } = summary;
  
  if (totals.documentsCreated > 0 || totals.documentsUpdated > 0) {
    lines.push(`📝 Documents: ${totals.documentsCreated} created, ${totals.documentsUpdated} updated`);
  }
  if (totals.insightsGenerated > 0) {
    lines.push(`💡 Insights: ${totals.insightsGenerated} new opportunities identified`);
  }
  if (totals.tasksCompleted.total > 0) {
    lines.push(`🤖 AI Tasks: ${totals.tasksCompleted.ai} completed`);
    lines.push(`👤 Human Tasks: ${totals.tasksCompleted.human} completed`);
  }
  
  lines.push('');
  lines.push(`🔄 Tomorrow's Queue: ${summary.tomorrowQueue.totalTasks} tasks ready`);

  return lines.join('\n');
}

/**
 * Escape special characters for Telegram MarkdownV2
 */
function escapeMarkdown(text: string): string {
  // Telegram MarkdownV2 requires escaping these characters: _ * [ ] ( ) ~ ` > # + - = | { } . !
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}
