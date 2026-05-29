import { useState } from 'react'
import CourseGraph from './components/CourseGraph'
import CourseSidebar from './components/CourseSidebar'
import CourseSearch from './components/CourseSearch'
import { useIsMobile } from './hooks/useIsMobile'
import type { Course } from './types'
import coursesData from './data/courses.json'

const allCourses = coursesData as Course[]
const canonicalCourses = allCourses.filter((c) => c.canonicalCode === c.code)

export default function App() {
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const isMobile = useIsMobile()

  function handleSelect(code: string | null) {
    if (!code) { setSelectedCode(null); return }
    const course = allCourses.find((c) => c.code === code)
    setSelectedCode(course?.canonicalCode ?? code)
    if (isMobile) setSidebarOpen(true)
  }

  const selectedCourse = selectedCode
    ? canonicalCourses.find((c) => c.code === selectedCode) ?? null
    : null

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100vh', width: '100vw', fontFamily: 'system-ui, sans-serif' }}>
      {/* Graph */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 10,
            background: '#fff',
            borderRadius: 8,
            padding: '10px 16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
            width: 240,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>NTNU Course Map</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, marginBottom: 2 }}>
            {canonicalCourses.length} courses · Click a node to highlight prerequisites
          </div>
          <CourseSearch courses={allCourses} selectedCode={selectedCode} onSelect={handleSelect} />
        </div>

        <CourseGraph
          courses={canonicalCourses}
          selectedCode={selectedCode}
          onSelect={handleSelect}
        />
      </div>

      {/* Sidebar — bottom sheet on mobile, side panel on desktop */}
      {isMobile ? (
        <MobileBottomSheet
          open={sidebarOpen && selectedCourse !== null}
          onToggle={() => setSidebarOpen((v) => !v)}
          course={selectedCourse}
          allCourses={allCourses}
          onClose={() => setSelectedCode(null)}
        />
      ) : (
        <CourseSidebar
          course={selectedCourse}
          onClose={() => setSelectedCode(null)}
          allCourses={allCourses}
        />
      )}
    </div>
  )
}

interface SheetProps {
  open: boolean
  onToggle: () => void
  course: Course | null
  allCourses: Course[]
  onClose: () => void
}

function MobileBottomSheet({ open, onToggle, course, allCourses, onClose }: SheetProps) {
  if (!course) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        background: '#fff',
        borderRadius: '16px 16px 0 0',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
        transition: 'height 0.25s ease',
        height: open ? '60vh' : '64px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Drag handle pill */}
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, flexShrink: 0 }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#cbd5e1' }} />
      </div>

      {/* Toggle row */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px 8px 16px',
          cursor: 'pointer',
          flexShrink: 0,
          minHeight: 44,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: '#3b82f6', flexShrink: 0 }}>
            {course.code}
          </span>
          <span style={{ fontSize: 13, color: '#1e293b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.name}</span>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0, marginLeft: 8 }}>
          {/* Toggle button */}
          <div
            style={{
              width: 36, height: 36, borderRadius: 18,
              background: '#f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, color: '#475569',
            }}
          >
            {open ? '▾' : '▴'}
          </div>
          {/* Close button */}
          <button
            onClick={(e) => { e.stopPropagation(); onClose() }}
            style={{
              width: 36, height: 36, borderRadius: 18,
              background: '#f1f5f9', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: '#475569', padding: 0,
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      {open && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <CourseSidebar
            course={course}
            onClose={onClose}
            allCourses={allCourses}
            hideHeader
          />
        </div>
      )}
    </div>
  )
}
