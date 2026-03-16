/**
 * Mention parsing utilities
 * Handles @username patterns in comments
 */

export interface User {
  id: string
  email?: string
  name?: string
}

export interface ParsedMention {
  body: string
  mentionedUserIds: string[]
}

/**
 * Parse @mentions from text, resolving usernames to user IDs
 * 
 * @param text - Raw text with @username mentions
 * @param users - Available users to match against
 * @returns Object with body text and list of mentioned user IDs
 */
export function parseMentions(text: string, users: User[]): ParsedMention {
  const mentionedUserIds: string[] = []
  
  // Match @username patterns (alphanumeric, dots, underscores, hyphens)
  const mentionRegex = /@([\w.-]+)/g
  let match
  
  while ((match = mentionRegex.exec(text)) !== null) {
    const username = match[1].toLowerCase()
    
    // Try to find user by name or email prefix
    const user = users.find(u => {
      const nameMatch = u.name?.toLowerCase() === username
      const emailPrefix = u.email?.split('@')[0]?.toLowerCase()
      const emailMatch = emailPrefix === username
      return nameMatch || emailMatch
    })
    
    if (user && !mentionedUserIds.includes(user.id)) {
      mentionedUserIds.push(user.id)
    }
  }
  
  return {
    body: text,
    mentionedUserIds,
  }
}

/**
 * Extract mention candidates for autocomplete
 * Returns the partial @mention being typed and its position
 * 
 * @param text - Current input text
 * @param cursorPosition - Current cursor position
 * @returns The partial mention text or null if not in a mention
 */
export function getMentionCandidate(
  text: string,
  cursorPosition: number
): { query: string; startIndex: number } | null {
  // Look backward from cursor to find @
  const textBefore = text.slice(0, cursorPosition)
  const atIndex = textBefore.lastIndexOf('@')
  
  if (atIndex === -1) return null
  
  // Check if @ is at start or preceded by whitespace
  const charBefore = atIndex > 0 ? textBefore[atIndex - 1] : ' '
  if (!/\s/.test(charBefore) && atIndex !== 0) return null
  
  // Get the query text after @
  const query = textBefore.slice(atIndex + 1)
  
  // Don't match if there's whitespace after @
  if (/\s/.test(query)) return null
  
  return {
    query: query.toLowerCase(),
    startIndex: atIndex,
  }
}

/**
 * Filter users that match a partial query
 * 
 * @param query - Partial name/email to match
 * @param users - Available users
 * @param limit - Maximum results
 * @returns Filtered users
 */
export function filterUsersForMention(
  query: string,
  users: User[],
  limit = 5
): User[] {
  const q = query.toLowerCase()
  
  return users
    .filter(u => {
      const nameMatch = u.name?.toLowerCase().includes(q)
      const emailMatch = u.email?.toLowerCase().includes(q)
      return nameMatch || emailMatch
    })
    .slice(0, limit)
}

/**
 * Get display name for a user
 */
export function getUserDisplayName(user: User): string {
  if (user.name) return user.name
  if (user.email) return user.email.split('@')[0]
  return user.id.slice(0, 8)
}

/**
 * Get mention handle for inserting
 */
export function getMentionHandle(user: User): string {
  if (user.name) return user.name.replace(/\s+/g, '_')
  if (user.email) return user.email.split('@')[0]
  return user.id.slice(0, 8)
}
