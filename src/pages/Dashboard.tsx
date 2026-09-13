import { motion, useAnimation, useMotionValue, useSpring } from 'motion/react'
import { useCallback, useRef, useState, type MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Rhythm, TopTopics, WeeklyBars } from '../components/Charts'
import { Icon } from '../components/Icon'
import { Pep } from '../components/Pep'
import { Rose } from '../components/Rose'
import { Wave, useTypedWord } from '../components/fun'
import { Burst, Counter } from '../components/ui'
import { CATEGORY_BY_ID } from '../lib/categories'
import { daysAgoISO, fmtDate, fmtMinutes, todayISO } from '../lib/format'
import { STRINGS, pluck as play } from '../lib/pluck'
import { face } from '../lib/rating'
import { countByStatus, minutesByCategory, minutesByTopic, useData } from '../state/DataContext'

const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.05 * i, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
})

export function Dashboard() {
  const { log, songs, topics, loading } = useData()
  const nav = useNavigate()
  const strum = useAnimation()
  const [strums, setStrums] = useState(0)
  const [slapBurst, setSlapBurst] = useState(0)
  const spinning = useRef(false)

  // Tap the bass: a quick wobble and an open string, E A D G in turn.
  async function pluck() {
    play(STRINGS[strums % STRINGS.length])
    setStrums((n) => n + 1)
    if (spinning.current) return
    await strum.start({
      rotate: [0, -5, 4, -2, 1, 0],
      scale: [1, 1.04, 0.98, 1.02, 1],
      transition: { duration: 0.6, ease: 'easeOut' },
    })
  }

  // Type "slap" anywhere on this page.
  const slap = useCallback(async () => {
    if (spinning.current) return
    spinning.current = true
    setSlapBurst(Date.now())
    STRINGS.forEach((f, i) => setTimeout(() => play(f, { slap: true }), i * 90))
    await strum.start({
      rotate: [0, 360],
      scale: [1, 1.15, 1],
      transition: { duration: 0.9, ease: [0.34, 1.3, 0.64, 1] },
    })
    strum.set({ rotate: 0 })
    spinning.current = false
  }, [strum])
  useTypedWord('slap', slap)

  // The bass leans slightly toward the pointer.
  const tiltX = useMotionValue(0)
  const tiltY = useMotionValue(0)
  const rx = useSpring(tiltX, { stiffness: 120, damping: 14 })
  const ry = useSpring(tiltY, { stiffness: 120, damping: 14 })
  function lean(e: MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    tiltY.set(((e.clientX - r.left) / r.width - 0.5) * 14)
    tiltX.set(-((e.clientY - r.top) / r.height - 0.5) * 10)
  }
  function unlean() {
    tiltX.set(0)
    tiltY.set(0)
  }

  const totalMin = log.reduce((a, l) => a + l.minutes, 0)
  const sessions = new Set(log.map((l) => l.date)).size
  const since = daysAgoISO(6)
  const week = log.filter((l) => l.date >= since)
  const weekMin = week.reduce((a, l) => a + l.minutes, 0)
  const weekSessions = new Set(week.map((l) => l.date)).size
  const byCat = minutesByCategory(log)
  const byTopic = minutesByTopic(log)
  const touched = topics.filter((t) => (byTopic[t.id] ?? 0) > 0).length
  const status = countByStatus(songs)
  const topicName = (id: string | null) => topics.find((t) => t.id === id)?.title
  const recent = log.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.created_at.localeCompare(a.created_at))).slice(0, 6)

  const lastDate = recent[0]?.date
  const daysSince = lastDate
    ? Math.round((new Date(todayISO()).getTime() - new Date(lastDate).getTime()) / 86_400_000)
    : null
  const lastLine =
    daysSince === null
      ? null
      : daysSince === 0
        ? 'Already played today. Rest counts too.'
        : daysSince === 1
          ? 'Last time: yesterday.'
          : `Last time: ${daysSince} days ago. No rush.`

  if (loading) return null

  return (
    <>
      <div className="dash-head" onMouseMove={lean} onMouseLeave={unlean}>
        <motion.div {...fadeUp(0)}>
          <h1 className="display">
            {totalMin === 0 ? (
              <>
                <Wave>Nothing logged yet.</Wave>
                <br />
                <span className="muted">
                  <Wave>First session?</Wave>
                </span>
              </>
            ) : (
              <>
                <strong>
                  <Wave>{fmtMinutes(totalMin)}</Wave>
                </strong>{' '}
                <Wave>on the bass</Wave>
                <br />
                <Wave>across</Wave>{' '}
                <span className="mono" style={{ fontWeight: 400 }}>
                  <Counter value={sessions} />
                </span>{' '}
                <Wave>{sessions === 1 ? 'session.' : 'sessions.'}</Wave>
              </>
            )}
          </h1>
          {lastLine && (
            <motion.p className="muted" style={{ margin: '16px 0 0' }} {...fadeUp(1)}>
              {lastLine}
            </motion.p>
          )}
        </motion.div>
        <div className="right has-burst">
          <Burst id={slapBurst} n={18} />
          <motion.div
            initial={{ opacity: 0, rotate: -14, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, rotate: -7, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 160, damping: 14, delay: 0.15 }}
            style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
          >
            <motion.div
              className="sticker-wrap"
              drag
              dragSnapToOrigin
              dragElastic={0.6}
              dragTransition={{ bounceStiffness: 300, bounceDamping: 14 }}
              whileHover={{ scale: 1.03, rotate: 3 }}
              whileDrag={{ scale: 1.06, rotate: 6 }}
              animate={strum}
              onTap={pluck}
            >
              <img
                className="sticker"
                src={`${import.meta.env.BASE_URL}bass.png`}
                alt="Mustang bass in British Racing Green. Drag it around, or tap it."
                draggable={false}
              />
            </motion.div>
          </motion.div>
          {strums >= 3 && strums < 6 && (
            <motion.span className="sticker-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              it also drags
            </motion.span>
          )}
          <motion.div {...fadeUp(2)} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Pep />
            <Link to="/log" className="btn">
              Log time
            </Link>
          </motion.div>
        </div>
      </div>

      <div className="stat-row">
        <motion.div className="stat" {...fadeUp(1)}>
          <div className="label"><Icon name="calendar-week" /> Last 7 days</div>
          <div className="num">
            <Counter value={weekMin} format={fmtMinutes} />
            <span className="suffix">
              {weekSessions} {weekSessions === 1 ? 'session' : 'sessions'}
            </span>
          </div>
        </motion.div>
        <motion.div className="stat" {...fadeUp(2)}>
          <div className="label"><Icon name="compass" /> Topics touched</div>
          <div className="num">
            <Counter value={touched} />
            <span className="suffix">of {topics.length}</span>
          </div>
        </motion.div>
        <motion.div className="stat" {...fadeUp(3)}>
          <div className="label"><Icon name="circle-check" /> Songs learned</div>
          <div className="num">
            <Counter value={status.learned} />
            <span className="suffix">of {songs.length}</span>
          </div>
        </motion.div>
      </div>

      <div className="dash-grid">
        <motion.section className="panel" {...fadeUp(4)}>
          <div className="label" style={{ marginBottom: 20 }}>
            <Icon name="timer" /> Where the time goes
          </div>
          <Rose minutes={byCat} onPick={(id) => nav(`/topics#${id}`)} />
        </motion.section>

        <div style={{ display: 'grid', gap: 24 }}>
          <motion.section className="panel tight" {...fadeUp(5)}>
            <div className="label" style={{ marginBottom: 14 }}>
              <Icon name="headphones" /> Songs
            </div>
            <div className="songs-mini">
              {(['backlog', 'learning', 'learned'] as const).map((s) => (
                <Link key={s} to={`/songs#${s}`}>
                  <div className="n mono">{status[s]}</div>
                  <div className="small muted" style={{ textTransform: 'capitalize' }}>
                    {s}
                  </div>
                </Link>
              ))}
            </div>
          </motion.section>

          <motion.section className="panel tight" {...fadeUp(6)}>
            <div className="label" style={{ marginBottom: 10 }}>
              <Icon name="clock" /> Recent
            </div>
            {recent.length === 0 ? (
              <div className="empty small">Your log will show up here.</div>
            ) : (
              <div className="recent">
                {recent.map((l) => (
                  <div key={l.id} className="recent-row">
                    <span className="t">{fmtDate(l.date)}</span>
                    <span>
                      <span className="cat-dot" style={{ background: CATEGORY_BY_ID[l.category].color }} />
                      {CATEGORY_BY_ID[l.category].short}
                      {l.topic_id && topicName(l.topic_id) && (
                        <span className="muted"> · {topicName(l.topic_id)}</span>
                      )}
                    </span>
                    <span className="mono small">
                      {face(l.rating) && <span className="face-sm">{face(l.rating)}</span>}
                      {fmtMinutes(l.minutes)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <Link to="/log" className="link-btn" style={{ display: 'inline-block', marginTop: 12 }}>
              Full log
            </Link>
          </motion.section>
        </div>
      </div>

      <motion.section className="panel" style={{ marginTop: 24 }} {...fadeUp(7)}>
        <div className="panel-head">
          <div className="label"><Icon name="calendar-days" /> Rhythm</div>
          <span className="small faint">One dot per day, last 26 weeks. Bigger is longer.</span>
        </div>
        <Rhythm log={log} />
      </motion.section>

      <div className="dash-row">
        <motion.section className="panel" {...fadeUp(8)}>
          <div className="panel-head">
            <div className="label"><Icon name="chart-bar" /> Weeks</div>
            <span className="small faint">Minutes per week, last 12</span>
          </div>
          <WeeklyBars log={log} />
        </motion.section>
        <motion.section className="panel" {...fadeUp(9)}>
          <div className="panel-head">
            <div className="label"><Icon name="trending-up" /> Most practised</div>
            <Link to="/topics" className="link-btn">
              All topics
            </Link>
          </div>
          <TopTopics log={log} topics={topics} />
        </motion.section>
      </div>
    </>
  )
}
