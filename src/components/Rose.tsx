import { motion } from 'motion/react'
import { useState } from 'react'
import { CATEGORIES } from '../lib/categories'
import { fmtMinutes, pct } from '../lib/format'
import type { CategoryId } from '../lib/types'

interface Props {
  minutes: Record<string, number>
  onPick?: (id: CategoryId) => void
}

// Drawing space leaves room for the labels, so nothing is ever clipped.
const W = 380
const H = 290
const CX = W / 2
const CY = H / 2
const R = 98
const N = CATEGORIES.length

function pointAt(i: number, r: number): [number, number] {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / N
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)]
}

const toPoints = (pts: [number, number][]) => pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ')

export function Rose({ minutes, onPick }: Props) {
  const [hover, setHover] = useState<CategoryId | null>(null)

  const values = CATEGORIES.map((c) => minutes[c.id] ?? 0)
  const total = values.reduce((a, b) => a + b, 0)
  const max = Math.max(...values, 1)
  const lowest = total > 0 ? values.indexOf(Math.min(...values)) : -1

  const shape = values.map((v, i) => pointAt(i, (v / max) * R))
  const rings = [0.25, 0.5, 0.75, 1]

  return (
    <div className="rose-wrap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Minutes per category"
        className="rose-svg"
      >
        {rings.map((f) => (
          <polygon
            key={f}
            points={toPoints(CATEGORIES.map((_, i) => pointAt(i, R * f)))}
            fill="none"
            stroke="var(--line)"
            strokeWidth={1}
          />
        ))}
        {CATEGORIES.map((_, i) => {
          const [x, y] = pointAt(i, R)
          return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="var(--line)" strokeWidth={1} />
        })}

        <motion.g
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 16, delay: 0.1 }}
          style={{ transformOrigin: `${CX}px ${CY}px` }}
        >
          {total === 0 && (
            <motion.circle
              cx={CX}
              cy={CY}
              r={4}
              fill="var(--teal)"
              animate={{ r: [4, 9, 4], opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            />
          )}
          {total > 0 && (
            <polygon
              points={toPoints(shape)}
              fill="var(--green)"
              fillOpacity={0.12}
              stroke="var(--green)"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
          )}
          {total > 0 && shape.map(([x, y], i) => {
            const id = CATEGORIES[i].id
            const isLow = i === lowest
            const on = hover === id
            return (
              <g key={id}>
                {isLow && (
                  <motion.circle
                    cx={x}
                    cy={y}
                    r={10}
                    fill="none"
                    stroke={CATEGORIES[i].color}
                    strokeWidth={1.2}
                    animate={{ r: [9, 13, 9], opacity: [0.9, 0.2, 0.9] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                  />
                )}
                <motion.circle
                  cx={x}
                  cy={y}
                  r={on ? 6 : 4.5}
                  fill={CATEGORIES[i].color}
                  stroke="var(--paper)"
                  strokeWidth={2}
                  initial={false}
                  animate={{ r: on ? 7.5 : 4.5 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 14 }}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHover(id)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => onPick?.(id)}
                />
                {on && (
                  <motion.g
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    style={{ transformOrigin: `${x}px ${y}px` }}
                  >
                    <rect
                      x={x - 26}
                      y={y - 30}
                      width={52}
                      height={18}
                      rx={9}
                      fill={CATEGORIES[i].deep}
                    />
                    <text
                      className="rose-tip"
                      x={x}
                      y={y - 21}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#fff"
                    >
                      {fmtMinutes(values[i])}
                    </text>
                  </motion.g>
                )}
              </g>
            )
          })}
        </motion.g>

        {CATEGORIES.map((c, i) => {
          const [x, y] = pointAt(i, R + 18)
          const anchor = Math.abs(x - CX) < 1 ? 'middle' : x > CX ? 'start' : 'end'
          return (
            <motion.text
              key={c.id}
              x={x}
              y={y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={11}
              fontFamily="var(--mono)"
              fill={hover === c.id ? c.deep : 'var(--ink-2)'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 + i * 0.05 }}
              style={{ cursor: onPick ? 'pointer' : 'default' }}
              onMouseEnter={() => setHover(c.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onPick?.(c.id)}
            >
              {c.short}
            </motion.text>
          )
        })}
      </svg>

      <div className="rose-legend">
        {CATEGORIES.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onMouseEnter={() => setHover(c.id)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onPick?.(c.id)}
          >
            <span className="sw" style={{ background: c.color }} />
            <span>
              {c.name}
              {i === lowest && <span className="low-tag">least</span>}
            </span>
            <span className="m">{fmtMinutes(values[i])}</span>
            <span className="p">{pct(values[i], total)}%</span>
          </button>
        ))}
        {lowest >= 0 && (
          <p className="small faint" style={{ margin: '12px 0 0' }}>
            The pulsing ring marks the category with the least time so far.
          </p>
        )}
      </div>
    </div>
  )
}
