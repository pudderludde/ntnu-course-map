import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'

export type NodeState = 'default' | 'selected' | 'ancestor' | 'descendant' | 'dimmed'

interface CourseNodeData {
  code: string
  name: string
  credits: number
  nodeState: NodeState
  equivalentCount: number
}

const stateStyles: Record<NodeState, React.CSSProperties> = {
  default: { background: '#fff', borderColor: '#94a3b8', color: '#1e293b' },
  selected: { background: '#3b82f6', borderColor: '#1d4ed8', color: '#fff' },
  ancestor: { background: '#d1fae5', borderColor: '#059669', color: '#065f46' },
  descendant: { background: '#dbeafe', borderColor: '#3b82f6', color: '#1e40af' },
  dimmed: { background: '#f8fafc', borderColor: '#e2e8f0', color: '#94a3b8' },
}

function CourseNode({ data }: { data: CourseNodeData }) {
  const style = stateStyles[data.nodeState]
  const isSelected = data.nodeState === 'selected'

  return (
    <div
      style={{
        ...style,
        border: '2px solid',
        borderRadius: 8,
        padding: '8px 12px',
        width: 180,
        minHeight: 70,
        boxShadow: isSelected ? '0 0 0 3px #93c5fd' : '0 1px 3px rgba(0,0,0,0.1)',
        transition: 'all 0.15s ease',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#94a3b8' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 12, fontFamily: 'monospace' }}>{data.code}</span>
        <span
          style={{
            fontSize: 10,
            padding: '1px 5px',
            borderRadius: 9999,
            background: isSelected ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
            color: isSelected ? '#fff' : '#64748b',
          }}
        >
          {data.credits} sp
        </span>
      </div>

      <div style={{ fontSize: 11, lineHeight: 1.3 }}>{data.name}</div>

      {data.equivalentCount > 0 && (
        <div style={{ marginTop: 4 }}>
          <span
            style={{
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 9999,
              background: isSelected ? 'rgba(255,255,255,0.15)' : '#ede9fe',
              color: isSelected ? '#e0d9ff' : '#6d28d9',
              fontWeight: 600,
            }}
          >
            ≡ {data.equivalentCount} alias{data.equivalentCount !== 1 ? 'es' : ''}
          </span>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{ background: '#94a3b8' }} />
    </div>
  )
}

export default memo(CourseNode)
