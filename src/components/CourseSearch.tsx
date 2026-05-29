import { useState, useRef, useEffect, useCallback } from 'react'
import type { Course } from '../types'

interface Props {
  courses: Course[]
  selectedCode: string | null
  onSelect: (code: string | null) => void
}

function subsequenceMatch(query: string, target: string): boolean {
  const q = query.toLowerCase().replace(/\s+/g, '')
  const t = target.toLowerCase()
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++
  }
  return qi === q.length
}

function scoreMatch(query: string, course: Course): number {
  const q = query.toLowerCase()
  const code = course.code.toLowerCase()
  const name = course.name.toLowerCase()
  // Exact prefix on code ranks highest, then substring, then subsequence
  if (code.startsWith(q)) return 3
  if (code.includes(q) || name.includes(q)) return 2
  return 1
}

export default function CourseSearch({ courses, selectedCode, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const matches = query.trim()
    ? courses
        .filter(
          (c) =>
            subsequenceMatch(query, c.code) ||
            subsequenceMatch(query, c.name)
        )
        .map((c) => ({ course: c, score: scoreMatch(query, c) }))
        .sort((a, b) => b.score - a.score)
        .map((x) => x.course)
    : []

  useEffect(() => {
    setFocusedIndex(-1)
  }, [query])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (!selectedCode) setQuery('')
  }, [selectedCode])

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[focusedIndex] as HTMLElement | undefined
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [focusedIndex])

  function select(code: string) {
    const course = courses.find((c) => c.code === code)
    setQuery(course ? `${course.code} – ${course.name}` : code)
    setOpen(false)
    setFocusedIndex(-1)
    onSelect(code)
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open || matches.length === 0) return

      if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault()
        setFocusedIndex((i) => (i + 1) % matches.length)
      } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault()
        setFocusedIndex((i) => (i - 1 + matches.length) % matches.length)
      } else if (e.key === 'Enter' && focusedIndex >= 0) {
        e.preventDefault()
        select(matches[focusedIndex].code)
      } else if (e.key === 'Escape') {
        setOpen(false)
        setFocusedIndex(-1)
      }
    },
    [open, matches, focusedIndex]
  )

  return (
    <div ref={containerRef} style={{ position: 'relative', marginTop: 10 }}>
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          if (!e.target.value.trim()) onSelect(null)
        }}
        onFocus={() => query.trim() && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search courses…"
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '6px 10px',
          borderRadius: 6,
          border: '1px solid #e2e8f0',
          fontSize: 13,
          outline: 'none',
          background: '#f8fafc',
          color: '#1e293b',
        }}
      />
      {open && matches.length > 0 && (
        <ul
          ref={listRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            listStyle: 'none',
            padding: 4,
            zIndex: 100,
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {matches.map((c, i) => (
            <li
              key={c.code}
              onMouseDown={() => select(c.code)}
              onMouseEnter={() => setFocusedIndex(i)}
              style={{
                padding: '6px 10px',
                borderRadius: 4,
                cursor: 'pointer',
                background:
                  i === focusedIndex
                    ? '#eff6ff'
                    : c.code === selectedCode
                    ? '#f0fdf4'
                    : 'transparent',
                display: 'flex',
                gap: 8,
                alignItems: 'baseline',
              }}
            >
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: '#3b82f6', flexShrink: 0 }}>
                {c.code}
              </span>
              <span style={{ fontSize: 12, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
