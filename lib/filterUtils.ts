import { FilterDefinition, SavedFilter } from '@/app/actions/filters'

/**
 * Apply filter definition to a list of tasks (client-side)
 */
export function applyFilter(
  tasks: any[],
  filter: SavedFilter
): any[] {
  const def = filter.definition
  let filtered = [...tasks]

  if (def.statuses?.length) {
    filtered = filtered.filter((t) => def.statuses!.includes(t.statusId))
  }

  if (def.priorities?.length) {
    filtered = filtered.filter((t) => def.priorities!.includes(t.priority))
  }

  if (def.tags?.length) {
    filtered = filtered.filter((t) =>
      def.tags!.some((tag) => t.tags?.includes(tag))
    )
  }

  if (def.dueDateWindow?.from || def.dueDateWindow?.to) {
    filtered = filtered.filter((t) => {
      if (!t.dueAt && !t.dueDate) return false
      const dueDate = new Date(t.dueAt || t.dueDate)
      if (def.dueDateWindow!.from) {
        const from = new Date(def.dueDateWindow!.from)
        if (dueDate < from) return false
      }
      if (def.dueDateWindow!.to) {
        const to = new Date(def.dueDateWindow!.to)
        if (dueDate > to) return false
      }
      return true
    })
  }

  if (def.project) {
    filtered = filtered.filter((t) => t.projectId === def.project)
  }

  if (def.goal) {
    filtered = filtered.filter((t) => t.goalId === def.goal)
  }

  return filtered
}
