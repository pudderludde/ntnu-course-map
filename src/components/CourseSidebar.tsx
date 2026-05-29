import type { Course } from '../types'

interface Props {
  course: Course | null
  onClose: () => void
  allCourses: Course[]
}

export default function CourseSidebar({ course, onClose, allCourses }: Props) {
  const equivDetails = course?.equivalentCodes
    .map((code) => allCourses.find((c) => c.code === code))
    .filter(Boolean) as Course[] | undefined

  const prereqDetails = course?.prerequisiteCodes.map((code) => ({
    code,
    name: allCourses.find((c) => c.code === code)?.name ?? '',
  }))
  if (!course) return null

  return (
    <div
      style={{
        width: 300,
        flexShrink: 0,
        background: '#fff',
        borderLeft: '1px solid #e2e8f0',
        padding: 24,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 18, color: '#3b82f6' }}>
            {course.code}
          </div>
          <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b', marginTop: 2 }}>
            {course.name}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 18,
            color: '#94a3b8',
            padding: 0,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <div>
        <span
          style={{
            display: 'inline-block',
            background: '#f1f5f9',
            color: '#475569',
            borderRadius: 9999,
            padding: '2px 10px',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {course.credits} studiepoeng
        </span>
      </div>

      {course.description && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Description
          </div>
          <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.6, margin: 0 }}>{course.description}</p>
        </div>
      )}

      {course.prerequisites && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Prerequisites
          </div>
          <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.6, margin: 0 }}>{course.prerequisites}</p>
        </div>
      )}

      {prereqDetails && prereqDetails.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Requires
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {prereqDetails.map(({ code, name }) => (
              <div key={code} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#059669', flexShrink: 0 }}>
                  {code}
                </span>
                <span style={{ fontSize: 12, color: '#64748b' }}>{name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {equivDetails && equivDetails.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Equivalent courses
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {equivDetails.map((eq) => (
              <div key={eq.code} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#7c3aed', flexShrink: 0 }}>
                  {eq.code}
                </span>
                <span style={{ fontSize: 12, color: '#64748b' }}>{eq.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
