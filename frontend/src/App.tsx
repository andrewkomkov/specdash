import {
  ActionIcon,
  Alert,
  AppShell,
  Badge,
  Box,
  Chip,
  Group,
  Indicator,
  Loader,
  Progress,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
  useMantineColorScheme,
} from '@mantine/core'
import { useDebouncedValue, useLocalStorage } from '@mantine/hooks'
import {
  IconAlertTriangle,
  IconLayoutKanban,
  IconMoon,
  IconRefresh,
  IconSearch,
  IconSun,
} from '@tabler/icons-react'
import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { Board, StoryBoard } from './components/Board'
import type { StoryRow } from './components/StoryCard'
import type { Feature } from './types'
import { useSnapshot } from './useSnapshot'
import { projectColor, relativeTime } from './utils'
import classes from './App.module.css'

// Both pull in weight nobody needs for the first paint of the board: the drawer
// drags in the whole markdown renderer, the trend view is a second screen.
const FeatureDrawer = lazy(() =>
  import('./components/FeatureDrawer').then((m) => ({ default: m.FeatureDrawer })),
)
const Trend = lazy(() => import('./components/Trend').then((m) => ({ default: m.Trend })))

export default function App() {
  const { snapshot, connection, reason, recent, refresh } = useSnapshot()
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()
  const [query, setQuery] = useState('')
  const [debounced] = useDebouncedValue(query, 150)
  // Persisted: which grain the board is read at is a working preference, not a
  // per-visit choice — whole features when many projects are open, stories when
  // the board would otherwise hold a handful of cards.
  const [view, setView] = useLocalStorage<'features' | 'stories' | 'trend'>({
    key: 'specdash-view',
    defaultValue: 'features',
  })
  const [hidden, setHidden] = useLocalStorage<string[]>({
    key: 'specdash-hidden-projects',
    defaultValue: [],
  })
  const [selected, setSelected] = useState<{
    project: string
    feature: string
    story?: string
  } | null>(null)

  const projects = snapshot?.projects ?? []
  const visibleProjects = projects.filter((p) => !hidden.includes(p.id))

  const features = useMemo(() => {
    const needle = debounced.trim().toLowerCase()
    return visibleProjects
      .flatMap((p) => p.features)
      .filter((f) => {
        if (!needle) return true
        return (
          f.title.toLowerCase().includes(needle) ||
          f.id.toLowerCase().includes(needle) ||
          (f.summary ?? '').toLowerCase().includes(needle) ||
          f.tasks.some((t) => t.description.toLowerCase().includes(needle))
        )
      })
  }, [visibleProjects, debounced])

  // One row per user story, plus the setup/foundational/polish tasks that belong
  // to no story — dropping those would make the column totals stop adding up.
  const storyRows: StoryRow[] = useMemo(() => {
    const needle = debounced.trim().toLowerCase()
    const rows: StoryRow[] = []
    for (const project of visibleProjects) {
      for (const feature of project.features) {
        const featureMatches =
          !needle ||
          feature.title.toLowerCase().includes(needle) ||
          feature.id.toLowerCase().includes(needle)
        for (const story of [...feature.user_stories, ...(feature.unassigned ? [feature.unassigned] : [])]) {
          if (!featureMatches && !story.title.toLowerCase().includes(needle)) continue
          rows.push({ key: `${project.id}/${feature.id}/${story.id}`, story, feature })
        }
      }
    }
    return rows
  }, [visibleProjects, debounced])

  // Keep the open drawer bound to the live snapshot, not to a stale copy.
  const openFeature: Feature | null = useMemo(() => {
    if (!selected) return null
    const project = projects.find((p) => p.id === selected.project)
    return project?.features.find((f) => f.id === selected.feature) ?? null
  }, [selected, projects])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null)
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        document.getElementById('specdash-search')?.focus()
      }
      if (e.key === 'r' && (e.metaKey || e.ctrlKey) === false && document.activeElement?.tagName !== 'INPUT') {
        refresh()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [refresh])

  const broken = visibleProjects.filter((p) => p.error)

  const totals = features.reduce(
    (acc, f) => ({ done: acc.done + f.progress.done, total: acc.total + f.progress.total }),
    { done: 0, total: 0 },
  )
  const pct = totals.total ? Math.round((100 * totals.done) / totals.total) : 0

  return (
    <AppShell header={{ height: 118 }} padding={0}>
      <AppShell.Header className={classes.header}>
        <Group justify="space-between" px="lg" py={8} wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Box className={classes.logo}>
              <IconLayoutKanban size={20} stroke={2} />
            </Box>
            <Box>
              <Title order={4} lh={1}>
                SpecDash
              </Title>
              <Text size="10px" c="dimmed">
                spec-kit · только чтение
              </Text>
            </Box>
            <Indicator
              processing={connection === 'live'}
              color={connection === 'live' ? 'green' : connection === 'connecting' ? 'yellow' : 'red'}
              size={8}
              offset={2}
              position="middle-start"
              ml={8}
            >
              <Text size="xs" c="dimmed" pl={14}>
                {connection === 'live' ? 'live' : connection === 'connecting' ? 'connecting…' : 'offline'}
              </Text>
            </Indicator>
          </Group>

          <Group gap="xs" wrap="nowrap">
            <SegmentedControl
              size="xs"
              value={view}
              onChange={(v) => setView(v as 'features' | 'stories' | 'trend')}
              data={[
                { value: 'features', label: 'Фичи' },
                { value: 'stories', label: 'Истории' },
                { value: 'trend', label: 'Динамика' },
              ]}
            />
            <TextInput
              id="specdash-search"
              size="xs"
              w={260}
              placeholder="Поиск по фичам, историям и задачам   /"
              leftSection={<IconSearch size={14} />}
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
            />
            <Tooltip label="Пересканировать (r)" withArrow>
              <ActionIcon variant="default" size="lg" onClick={refresh}>
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Тема" withArrow>
              <ActionIcon variant="default" size="lg" onClick={toggleColorScheme}>
                {colorScheme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        <Group px="lg" pb={10} justify="space-between" wrap="nowrap" gap="md">
          <Group gap={6} wrap="wrap">
            {projects.map((project) => {
              const active = !hidden.includes(project.id)
              return (
                <Tooltip
                  key={project.id}
                  withArrow
                  multiline
                  w={project.error ? 340 : undefined}
                  label={`${project.path}${project.branch ? ` · ${project.branch}` : ''}${
                    project.constitution_version ? ` · constitution ${project.constitution_version}` : ''
                  }${project.error ? `\n⚠ ${project.error}` : ''}`}
                >
                  <Chip
                    size="xs"
                    radius="sm"
                    checked={active}
                    color={project.error ? 'red' : projectColor(project.id)}
                    onChange={() =>
                      setHidden((current) =>
                        active ? [...current, project.id] : current.filter((id) => id !== project.id),
                      )
                    }
                  >
                    {project.name}
                    <Text component="span" size="10px" c="dimmed" ml={5}>
                      {project.features.length}
                    </Text>
                  </Chip>
                </Tooltip>
              )
            })}
            {!snapshot && <Loader size="xs" />}
          </Group>

          <Group gap="md" wrap="nowrap">
            {totals.total > 0 && (
              <Group gap={8} wrap="nowrap" w={230}>
                <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                  {totals.done}/{totals.total} задач
                </Text>
                <Progress value={pct} size="sm" radius="xl" color="teal" style={{ flex: 1 }} />
                <Text size="xs" fw={700} w={32} ta="right">
                  {pct}%
                </Text>
              </Group>
            )}
            <Badge variant="default" radius="sm" size="sm">
              {view === 'stories' ? `${storyRows.length} историй` : `${features.length} фич`}
            </Badge>
            {snapshot && (
              <Tooltip label={reason || 'последний скан'} withArrow>
                <Text size="10px" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                  {relativeTime(snapshot.generated_at)} · {snapshot.scan_ms} мс
                </Text>
              </Tooltip>
            )}
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        {!snapshot ? (
          <Stack align="center" justify="center" h="60vh" gap="xs">
            <Loader />
            <Text c="dimmed" size="sm">
              Сканирую проекты…
            </Text>
          </Stack>
        ) : projects.length === 0 ? (
          <Stack align="center" justify="center" h="60vh" gap={4}>
            <Text fw={600}>Проекты spec-kit не найдены</Text>
            <Text c="dimmed" size="sm" ta="center" maw={520}>
              Смонтируйте папку с проектами в /projects (PROJECTS_ROOT в .env). Проектом считается
              каталог, где есть .specify/ или specs/.
            </Text>
          </Stack>
        ) : (
          <>
            {broken.length > 0 && (
              <Box px="lg" pt="md">
                <Alert
                  color="red"
                  variant="light"
                  radius="md"
                  icon={<IconAlertTriangle size={16} />}
                  title={`${broken.length} проект(а) прочитаны не полностью`}
                >
                  <Stack gap={2}>
                    {broken.map((project) => (
                      <Text size="xs" key={project.id}>
                        <b>{project.name}</b> — {project.error}
                      </Text>
                    ))}
                  </Stack>
                </Alert>
              </Box>
            )}
            {view === 'features' ? (
              <Board
                features={features}
                showProject={visibleProjects.length > 1}
                recent={recent}
                onOpen={(f) => setSelected({ project: f.project_id, feature: f.id })}
              />
            ) : view === 'stories' ? (
              <StoryBoard
                rows={storyRows}
                showProject={visibleProjects.length > 1}
                recent={recent}
                onOpen={(row) =>
                  setSelected({
                    project: row.feature.project_id,
                    feature: row.feature.id,
                    story: row.story.id,
                  })
                }
              />
            ) : (
              <Suspense fallback={<Loader size="sm" m="lg" />}>
                <Trend projects={visibleProjects} />
              </Suspense>
            )}
          </>
        )}
      </AppShell.Main>

      <Suspense fallback={null}>
        <FeatureDrawer
          feature={openFeature}
          focusStory={selected?.story ?? null}
          onClose={() => setSelected(null)}
        />
      </Suspense>
    </AppShell>
  )
}
