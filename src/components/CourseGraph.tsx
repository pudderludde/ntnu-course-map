import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { Course } from '../types'
import { applyDagreLayout } from '../utils/layout'
import { transitiveReduction } from '../utils/transitiveReduction'
import { useHighlight } from '../hooks/useHighlight'
import CourseNode, { type NodeState } from './CourseNode'

type CourseNodeData = {
  code: string
  name: string
  credits: number
  nodeState: NodeState
  equivalentCount: number
}

type CourseNode = Node<CourseNodeData, 'course'>

const nodeTypes = { course: CourseNode }

interface Props {
  courses: Course[]
  selectedCode: string | null
  onSelect: (code: string | null) => void
}

export default function CourseGraph({ courses, selectedCode, onSelect }: Props) {
  const { ancestors, descendants } = useHighlight(courses, selectedCode)

  const getNodeState = useCallback(
    (code: string): NodeState => {
      if (!selectedCode) return 'default'
      if (code === selectedCode) return 'selected'
      if (ancestors.has(code)) return 'ancestor'
      if (descendants.has(code)) return 'descendant'
      return 'dimmed'
    },
    [selectedCode, ancestors, descendants]
  )

  const baseNodes: CourseNode[] = useMemo(
    () =>
      courses.map((c) => ({
        id: c.code,
        type: 'course' as const,
        position: { x: 0, y: 0 },
        data: { code: c.code, name: c.name, credits: c.credits, nodeState: 'default' as NodeState, equivalentCount: c.equivalentCodes.length },
      })),
    [courses]
  )

  const baseEdges: Edge[] = useMemo(() => {
    const allEdges = courses.flatMap((c) =>
      c.prerequisiteCodes
        .filter((dep) => courses.some((x) => x.code === dep))
        .map((dep) => ({
          id: `${dep}->${c.code}`,
          source: dep,
          target: c.code,
          style: { stroke: '#cbd5e1', strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#cbd5e1' },
          interactionWidth: 0,
        }))
    )
    return transitiveReduction(allEdges)
  },
    [courses]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState<CourseNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState(baseEdges)
  const [layoutDone, setLayoutDone] = useState(false)

  useEffect(() => {
    const laid = applyDagreLayout(baseNodes, baseEdges) as CourseNode[]
    setNodes(laid)
    setLayoutDone(true)
  }, [baseNodes, baseEdges, setNodes])

  useEffect(() => {
    if (!layoutDone) return

    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, nodeState: getNodeState(n.id) },
      }))
    )

    const ancestorSet = selectedCode ? new Set([...ancestors, selectedCode]) : null
    const descendantSet = selectedCode ? new Set([...descendants, selectedCode]) : null

    setEdges((eds) =>
      eds.map((e) => {
        const src = e.source as string
        const tgt = e.target as string
        if (!ancestorSet || !descendantSet) {
          return { ...e, style: { stroke: '#cbd5e1', strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#cbd5e1' }, animated: false }
        }
        if (ancestorSet.has(src) && ancestorSet.has(tgt)) {
          return { ...e, style: { stroke: '#059669', strokeWidth: 2.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#059669' }, animated: true }
        }
        if (descendantSet.has(src) && descendantSet.has(tgt)) {
          return { ...e, style: { stroke: '#3b82f6', strokeWidth: 2.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' }, animated: true }
        }
        return { ...e, style: { stroke: '#e2e8f0', strokeWidth: 1 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#e2e8f0' }, animated: false }
      })
    )
  }, [selectedCode, ancestors, descendants, getNodeState, layoutDone, setNodes, setEdges])

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      onSelect(node.id === selectedCode ? null : node.id)
    },
    [selectedCode, onSelect]
  )

  const onPaneClick = useCallback(() => onSelect(null), [onSelect])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.05}
      edgesFocusable={false}
      edgesReconnectable={false}
    >
      <Background color="#f1f5f9" gap={20} />
      <Controls />
      <MiniMap
        nodeColor={(n) => {
          const state = (n.data as CourseNodeData).nodeState
          if (state === 'selected') return '#3b82f6'
          if (state === 'ancestor') return '#059669'
          if (state === 'descendant') return '#93c5fd'
          if (state === 'dimmed') return '#e2e8f0'
          return '#94a3b8'
        }}
      />
    </ReactFlow>
  )
}
