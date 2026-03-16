/**
 * Phase 2: Entity Matching
 * Matches extracted entities to existing workspace items
 */

import { prisma } from '@/lib/prisma';
import { ExtractedEntity } from './intent-extractor';

export interface EntityMatch {
  entityId: string | null; // UUID of matched item, null if no match
  entityType: string;
  entityName: string;
  confidence: number;
  isNewEntity: boolean; // True if this should be created
  candidates?: Array<{
    id: string;
    name: string;
    score: number;
  }>;
}

export interface MatchedEntity extends ExtractedEntity {
  match: EntityMatch;
}

/**
 * Simple string similarity (Levenshtein-based)
 */
function similarity(a: string, b: string): number {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Match entity to existing workspace items
 */
export async function matchEntity(
  workspaceId: string,
  entity: ExtractedEntity
): Promise<MatchedEntity> {
  const { type, value } = entity;
  
  try {
    switch (type) {
      case 'task':
        return await matchTask(workspaceId, entity);
      
      case 'project':
        return await matchProject(workspaceId, entity);
      
      case 'objective':
        return await matchObjective(workspaceId, entity);
      
      case 'company':
        return await matchCompany(workspaceId, entity);
      
      case 'person':
        // For MVP, people are handled as text notes (no User matching yet)
        return {
          ...entity,
          match: {
            entityId: null,
            entityType: 'person',
            entityName: value,
            confidence: 0.8,
            isNewEntity: false
          }
        };
      
      case 'date':
      case 'priority':
      case 'status':
        // These are attributes, not entities - return as-is
        return {
          ...entity,
          match: {
            entityId: null,
            entityType: type,
            entityName: value,
            confidence: 1.0,
            isNewEntity: false
          }
        };
      
      default:
        return {
          ...entity,
          match: {
            entityId: null,
            entityType: type,
            entityName: value,
            confidence: 0.5,
            isNewEntity: true
          }
        };
    }
  } catch (error) {
    console.error(`Entity matching error for ${type}:`, error);
    return {
      ...entity,
      match: {
        entityId: null,
        entityType: type,
        entityName: value,
        confidence: 0.3,
        isNewEntity: true
      }
    };
  }
}

async function matchTask(workspaceId: string, entity: ExtractedEntity): Promise<MatchedEntity> {
  const tasks = await prisma.task.findMany({
    where: {
      workspaceId,
      archivedAt: null,
      completedAt: null
    },
    select: {
      id: true,
      title: true
    },
    take: 100 // Limit for performance
  });
  
  const candidates = tasks
    .map(task => ({
      id: task.id,
      name: task.title,
      score: similarity(entity.value, task.title)
    }))
    .filter(c => c.score > 0.4) // Minimum threshold
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Top 5 candidates
  
  const bestMatch = candidates[0];
  
  // High confidence match if similarity > 0.75
  if (bestMatch && bestMatch.score > 0.75) {
    return {
      ...entity,
      match: {
        entityId: bestMatch.id,
        entityType: 'task',
        entityName: bestMatch.name,
        confidence: bestMatch.score,
        isNewEntity: false,
        candidates
      }
    };
  }
  
  // Medium confidence if similarity > 0.5
  if (bestMatch && bestMatch.score > 0.5) {
    return {
      ...entity,
      match: {
        entityId: bestMatch.id,
        entityType: 'task',
        entityName: bestMatch.name,
        confidence: bestMatch.score * 0.8, // Reduce confidence for lower match
        isNewEntity: false,
        candidates
      }
    };
  }
  
  // No good match - suggest creating new
  return {
    ...entity,
    match: {
      entityId: null,
      entityType: 'task',
      entityName: entity.value,
      confidence: 0.7,
      isNewEntity: true,
      candidates: candidates.length > 0 ? candidates : undefined
    }
  };
}

async function matchProject(workspaceId: string, entity: ExtractedEntity): Promise<MatchedEntity> {
  const projects = await prisma.project.findMany({
    where: {
      workspaceId,
      archivedAt: null
    },
    select: {
      id: true,
      name: true
    },
    take: 50
  });
  
  const candidates = projects
    .map(project => ({
      id: project.id,
      name: project.name,
      score: similarity(entity.value, project.name)
    }))
    .filter(c => c.score > 0.4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  
  const bestMatch = candidates[0];
  
  if (bestMatch && bestMatch.score > 0.7) {
    return {
      ...entity,
      match: {
        entityId: bestMatch.id,
        entityType: 'project',
        entityName: bestMatch.name,
        confidence: bestMatch.score,
        isNewEntity: false,
        candidates
      }
    };
  }
  
  return {
    ...entity,
    match: {
      entityId: null,
      entityType: 'project',
      entityName: entity.value,
      confidence: 0.7,
      isNewEntity: true,
      candidates: candidates.length > 0 ? candidates : undefined
    }
  };
}

async function matchObjective(workspaceId: string, entity: ExtractedEntity): Promise<MatchedEntity> {
  const objectives = await prisma.objective.findMany({
    where: {
      workspaceId,
      status: { in: ['active', 'on_track', 'at_risk', 'blocked'] }
    },
    select: {
      id: true,
      title: true
    },
    take: 50
  });
  
  const candidates = objectives
    .map(objective => ({
      id: objective.id,
      name: objective.title,
      score: similarity(entity.value, objective.title)
    }))
    .filter(c => c.score > 0.4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  
  const bestMatch = candidates[0];
  
  if (bestMatch && bestMatch.score > 0.7) {
    return {
      ...entity,
      match: {
        entityId: bestMatch.id,
        entityType: 'objective',
        entityName: bestMatch.name,
        confidence: bestMatch.score,
        isNewEntity: false,
        candidates
      }
    };
  }
  
  return {
    ...entity,
    match: {
      entityId: null,
      entityType: 'objective',
      entityName: entity.value,
      confidence: 0.7,
      isNewEntity: true,
      candidates: candidates.length > 0 ? candidates : undefined
    }
  };
}

async function matchCompany(workspaceId: string, entity: ExtractedEntity): Promise<MatchedEntity> {
  const companies = await prisma.company.findMany({
    where: {
      workspaceId,
      archivedAt: null
    },
    select: {
      id: true,
      name: true
    },
    take: 50
  });
  
  const candidates = companies
    .map(company => ({
      id: company.id,
      name: company.name,
      score: similarity(entity.value, company.name)
    }))
    .filter(c => c.score > 0.4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  
  const bestMatch = candidates[0];
  
  if (bestMatch && bestMatch.score > 0.7) {
    return {
      ...entity,
      match: {
        entityId: bestMatch.id,
        entityType: 'company',
        entityName: bestMatch.name,
        confidence: bestMatch.score,
        isNewEntity: false,
        candidates
      }
    };
  }
  
  return {
    ...entity,
    match: {
      entityId: null,
      entityType: 'company',
      entityName: entity.value,
      confidence: 0.7,
      isNewEntity: true,
      candidates: candidates.length > 0 ? candidates : undefined
    }
  };
}

/**
 * Batch match all entities from an intent
 */
export async function matchAllEntities(
  workspaceId: string,
  entities: ExtractedEntity[]
): Promise<MatchedEntity[]> {
  return Promise.all(
    entities.map(entity => matchEntity(workspaceId, entity))
  );
}
