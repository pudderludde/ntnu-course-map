import { useState } from 'react'
import CourseGraph from './components/CourseGraph'
import CourseSidebar from './components/CourseSidebar'
import CourseSearch from './components/CourseSearch'
import type { Course } from './types'
import coursesData from './data/courses.json'

const allCourses = coursesData as Course[]
const canonicalCourses = allCourses.filter((c) => c.canonicalCode === c.code)

export default function App() {
  const [selectedCode, setSelectedCode] = useState<string | null>(null)

  function handleSelect(code: string | null) {
    if (!code) { setSelectedCode(null); return }
    // Redirect to canonical if a non-canonical code is selected
    const course = allCourses.find((c) => c.code === code)
    setSelectedCode(course?.canonicalCode ?? code)
  }

  const selectedCourse = selectedCode ? canonicalCourses.find((c) => c.code === selectedCode) ?? null : null

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ flex: 1, position: 'relative' }}>
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
      <CourseSidebar course={selectedCourse} onClose={() => setSelectedCode(null)} allCourses={allCourses} />
    </div>
  )
}
