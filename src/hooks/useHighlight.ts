import { useMemo } from 'react'
import type { Course } from '../types'

export type HighlightState = {
  ancestors: Set<string>
  descendants: Set<string>
}

export function useHighlight(
  courses: Course[],
  selectedCode: string | null
): HighlightState {
  return useMemo(() => {
    if (!selectedCode) return { ancestors: new Set(), descendants: new Set() }

    // Build adjacency maps
    const prereqOf = new Map<string, string[]>() // code -> its prerequisites
    const requiredBy = new Map<string, string[]>() // code -> courses that need it

    courses.forEach((c) => {
      prereqOf.set(c.code, c.prerequisiteCodes)
      c.prerequisiteCodes.forEach((dep) => {
        if (!requiredBy.has(dep)) requiredBy.set(dep, [])
        requiredBy.get(dep)!.push(c.code)
      })
    })

    const bfs = (start: string, map: Map<string, string[]>): Set<string> => {
      const visited = new Set<string>()
      const queue = [start]
      while (queue.length) {
        const cur = queue.shift()!
        const neighbors = map.get(cur) ?? []
        for (const n of neighbors) {
          if (!visited.has(n)) {
            visited.add(n)
            queue.push(n)
          }
        }
      }
      return visited
    }

    return {
      ancestors: bfs(selectedCode, prereqOf),
      descendants: bfs(selectedCode, requiredBy),
    }
  }, [courses, selectedCode])
}
