import type { Edge } from '@xyflow/react'

export function transitiveReduction(edges: Edge[]): Edge[] {
  // Build adjacency list
  const adj = new Map<string, Set<string>>()
  for (const e of edges) {
    const src = e.source as string
    const tgt = e.target as string
    if (!adj.has(src)) adj.set(src, new Set())
    adj.get(src)!.add(tgt)
  }

  // DFS reachability: from `start`, can we reach `target` without using the direct edge?
  function hasAlternatePath(start: string, target: string): boolean {
    const visited = new Set<string>()
    const stack = [...(adj.get(start) ?? [])]
      .filter((n) => n !== target) // skip the direct edge

    while (stack.length) {
      const node = stack.pop()!
      if (node === target) return true
      if (visited.has(node)) continue
      visited.add(node)
      for (const next of adj.get(node) ?? []) {
        if (!visited.has(next)) stack.push(next)
      }
    }
    return false
  }

  return edges.filter((e) => !hasAlternatePath(e.source as string, e.target as string))
}
