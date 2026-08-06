import {
  Alert,
  Badge,
  Box,
  Card,
  Code,
  Group,
  Loader,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core'
import { IconClockPause, IconGitBranch, IconInfoCircle } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import type { HistoryPoint, Project, ProjectHistory } from '../types'
import { projectColor, relativeTime } from '../utils'
import classes from './Trend.module.css'

interface Props {
  projects: Project[]
}

/** Movement rather than position: task completion per commit, per project. */
export function Trend({ projects }: Props) {
  if (!projects.length) {
    return (
      <Box p="lg">
        <Text c="dimmed" size="sm">
          Ни одного проекта не выбрано.
        </Text>
      </Box>
    )
  }
  return (
    <Box className={classes.grid}>
      {projects.map((project) => (
        <ProjectTrend key={project.id} project={project} />
      ))}
    </Box>
  )
}

function ProjectTrend({ project }: { project: Project }) {
  const [history, setHistory] = useState<ProjectHistory | null>(null)
  const [error, setError] = useState<string | null>(null)

  // The server caches the series against HEAD, so re-asking whenever the project
  // changes on disk is cheap and picks up a new commit without a reload.
  useEffect(() => {
    let cancelled = false
    setHistory(null)
    setError(null)
    fetch(`/api/projects/${encodeURIComponent(project.id)}/history`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: ProjectHistory) => !cancelled && setHistory(data))
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [project.id, project.modified])

  const accent = projectColor(project.id)
  const last = history?.points.at(-1)
  const first = history?.points[0]
  const delta = last && first ? last.done - first.done : 0

  return (
    <Card withBorder radius="md" padding="md">
      <Group justify="space-between" wrap="nowrap" mb="xs" align="flex-start">
        <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
          <Badge variant="light" color={accent} radius="sm">
            {project.name}
          </Badge>
          {project.branch && (
            <Group gap={3} wrap="nowrap">
              <IconGitBranch size={12} opacity={0.6} />
              <Code fz={10}>{project.branch}</Code>
            </Group>
          )}
        </Group>
        {last && (
          <Group gap={8} wrap="nowrap">
            {/* Not the same number as the board when something is uncommitted —
                the series is what git holds, and says so rather than guessing. */}
            <Tooltip label="по последнему коммиту, а не по рабочей копии" withArrow>
              <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                {last.done}/{last.total} · {last.pct}%
              </Text>
            </Tooltip>
            {delta > 0 && (
              <Badge size="xs" variant="light" color="teal" radius="sm">
                +{delta} за {history?.commits_scanned} коммитов
              </Badge>
            )}
          </Group>
        )}
      </Group>

      {error ? (
        <Alert color="red" variant="light" py={6}>
          {error}
        </Alert>
      ) : history === null ? (
        <Group gap="xs" py="lg" justify="center">
          <Loader size="xs" />
          <Text size="xs" c="dimmed">
            читаю историю git…
          </Text>
        </Group>
      ) : !history.available ? (
        // An empty chart would read as "no progress". Say what is actually true.
        <Alert
          variant="light"
          color="gray"
          icon={<IconInfoCircle size={16} />}
          title="История недоступна"
          py={8}
        >
          <Text size="xs">{history.reason ?? 'нет данных'}</Text>
        </Alert>
      ) : (
        <>
          <Chart points={history.points} id={project.id} />
          <StaleList history={history} />
        </>
      )}
    </Card>
  )
}

const W = 620
const H = 150
const PAD = { l: 34, r: 12, t: 12, b: 22 }

function Chart({ points, id }: { points: HistoryPoint[]; id: string }) {
  const times = points.map((p) => Date.parse(p.date))
  const minX = Math.min(...times)
  const maxX = Math.max(...times)
  const spanX = maxX - minX || 1
  const maxY = Math.max(...points.map((p) => p.total), 1)

  const x = (t: number) =>
    points.length === 1 ? (W - PAD.r + PAD.l) / 2 : PAD.l + ((t - minX) / spanX) * (W - PAD.l - PAD.r)
  const y = (v: number) => PAD.t + (1 - v / maxY) * (H - PAD.t - PAD.b)

  const line = (pick: (p: HistoryPoint) => number) =>
    points.map((p, i) => `${i ? 'L' : 'M'}${x(times[i]).toFixed(1)},${y(pick(p)).toFixed(1)}`).join(' ')

  const area =
    points.length > 1
      ? `${line((p) => p.done)} L${x(maxX).toFixed(1)},${y(0).toFixed(1)} L${x(minX).toFixed(1)},${y(
          0,
        ).toFixed(1)} Z`
      : ''

  const gradient = `trend-${id.replace(/[^A-Za-z0-9_-]/g, '')}`
  const dateLabel = (t: number) => new Date(t).toLocaleDateString()

  return (
    <Box>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={classes.chart}
        role="img"
        aria-label={`Закрытые задачи по коммитам: ${points.at(-1)?.done ?? 0} из ${
          points.at(-1)?.total ?? 0
        }`}
      >
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--mantine-color-teal-6)" stopOpacity="0.38" />
            <stop offset="100%" stopColor="var(--mantine-color-teal-6)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0, maxY / 2, maxY].map((value) => (
          <g key={value}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(value)}
              y2={y(value)}
              stroke="var(--mantine-color-dimmed)"
              strokeOpacity="0.18"
              strokeDasharray={value === 0 ? undefined : '3 4'}
            />
            <text x={PAD.l - 6} y={y(value) + 3} textAnchor="end" fontSize="9" fill="var(--mantine-color-dimmed)">
              {Math.round(value)}
            </text>
          </g>
        ))}

        {area && <path d={area} fill={`url(#${gradient})`} />}
        <path
          d={line((p) => p.total)}
          fill="none"
          stroke="var(--mantine-color-dimmed)"
          strokeOpacity="0.55"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={line((p) => p.done)}
          fill="none"
          stroke="var(--mantine-color-teal-6)"
          strokeWidth="2"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {points.map((p, i) => (
          <circle
            key={p.sha}
            className={classes.dot}
            cx={x(times[i])}
            cy={y(p.done)}
            r={points.length > 40 ? 1.6 : 3}
            fill="var(--mantine-color-teal-6)"
          >
            <title>
              {`${new Date(times[i]).toLocaleString()}\n${p.done}/${p.total} задач (${p.pct}%), ${
                p.features
              } tasks.md\n${p.sha.slice(0, 8)} ${p.subject}`}
            </title>
          </circle>
        ))}

        <text x={PAD.l} y={H - 6} fontSize="9" fill="var(--mantine-color-dimmed)">
          {dateLabel(minX)}
        </text>
        <text x={W - PAD.r} y={H - 6} fontSize="9" textAnchor="end" fill="var(--mantine-color-dimmed)">
          {dateLabel(maxX)}
        </text>
      </svg>

      <Group gap="md" mt={2}>
        <Legend color="var(--mantine-color-teal-6)" label="закрыто" />
        <Legend color="var(--mantine-color-dimmed)" label="всего задач" dashed />
        <Text size="10px" c="dimmed">
          точка = коммит, тронувший specs/
        </Text>
      </Group>
    </Box>
  )
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <Group gap={5} wrap="nowrap">
      <Box
        w={14}
        h={0}
        style={{
          borderTop: `2px ${dashed ? 'dashed' : 'solid'} ${color}`,
          opacity: dashed ? 0.6 : 1,
        }}
      />
      <Text size="10px" c="dimmed">
        {label}
      </Text>
    </Group>
  )
}

/** Which feature folders the history has stopped touching. */
function StaleList({ history }: { history: ProjectHistory }) {
  if (!history.stale.length) return null
  return (
    <Box mt="sm">
      <Group gap={6} mb={4}>
        <IconClockPause size={13} opacity={0.7} />
        <Text size="10px" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.06em' }}>
          Дольше всего без коммитов
        </Text>
      </Group>
      <Stack gap={3}>
        {history.stale.map((item) => (
          <Group key={item.feature_id} gap={8} wrap="nowrap" justify="space-between">
            <Tooltip label={item.subject ?? item.feature_id} withArrow multiline w={280}>
              <Text size="xs" lineClamp={1} style={{ minWidth: 0 }}>
                {item.title ?? item.feature_id}
              </Text>
            </Tooltip>
            <Text size="10px" c={item.days >= 14 ? 'orange' : 'dimmed'} style={{ whiteSpace: 'nowrap' }}>
              {relativeTime(Date.parse(item.date) / 1000)}
            </Text>
          </Group>
        ))}
      </Stack>
    </Box>
  )
}
