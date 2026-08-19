import {
  ActionIcon,
  Alert,
  AppShell,
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
import { LANGS, useT } from './i18n'
import classes from './App.module.css'

// Both pull in weight nobody needs for the first paint of the board: the drawer
// drags in the whole markdown renderer, the trend view is a second screen.
const FeatureDrawer = lazy(() =>
  import('./components/FeatureDrawer').then((m) => ({ default: m.FeatureDrawer })),
)
const Trend = lazy(() => import('./components/Trend').then((m) => ({ default: m.Trend })))
const SearchPalette = lazy(() =>
  import('./components/SearchPalette').then((m) => ({ default: m.SearchPalette })),
)

export default function App() {
  const { t, n, ago, lang, setLang } = useT()
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
    file?: string
    tab?: string
  } | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)

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
      // The palette answers a different question from the header filter, so it
      // gets the shortcut people already reach for.
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [refresh])

  const broken = visibleProjects.filter((p) => p.error)

  // Summed over the cards on screen, so the total and the badge beside it always
  // describe the same set. Without a search the two grains agree by construction —
  // a feature's stories plus its leftover bucket are its task total — so this only
  // moves under a filter, which is the case it exists for. The trend keeps the
  // feature sum: it is drawn per project, not per story.
  const totals = useMemo(() => {
    const start = { done: 0, total: 0 }
    if (view === 'stories') {
      return storyRows.reduce(
        (acc, row) => ({ done: acc.done + row.story.done, total: acc.total + row.story.total }),
        start,
      )
    }
    return features.reduce(
      (acc, f) => ({ done: acc.done + f.progress.done, total: acc.total + f.progress.total }),
      start,
    )
  }, [view, features, storyRows])
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
              <Text size="xs" c="dimmed">
                {t('app.tagline')}
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
                {connection === 'live'
                  ? t('app.live')
                  : connection === 'connecting'
                    ? t('app.connecting')
                    : t('app.offline')}
              </Text>
            </Indicator>
          </Group>

          <Group gap="xs" wrap="nowrap">
            <SegmentedControl
              size="xs"
              value={view}
              onChange={(v) => setView(v as 'features' | 'stories' | 'trend')}
              data={[
                { value: 'features', label: t('view.features') },
                { value: 'stories', label: t('view.stories') },
                { value: 'trend', label: t('view.trend') },
              ]}
            />
            <TextInput
              id="specdash-search"
              size="xs"
              w={260}
              placeholder={`${t('app.search')}   /`}
              leftSection={<IconSearch size={14} />}
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
            />
            <Tooltip label={`${t('search.open.hint')} (⌘K)`} withArrow>
              <ActionIcon
                variant="default"
                size="lg"
                aria-label={t('search.open.hint')}
                data-testid="open-search"
                onClick={() => setPaletteOpen(true)}
              >
                <IconSearch size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={`${t('app.rescan')} (R)`} withArrow>
              <ActionIcon
                variant="default"
                size="lg"
                aria-label={t('app.rescan')}
                onClick={refresh}
              >
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={t('app.theme')} withArrow>
              <ActionIcon
                variant="default"
                size="lg"
                aria-label={t('app.theme')}
                onClick={toggleColorScheme}
              >
                {colorScheme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
              </ActionIcon>
            </Tooltip>
            <Tooltip label={t('app.language')} withArrow>
              <SegmentedControl
                size="xs"
                aria-label={t('app.language')}
                value={lang}
                onChange={(v) => setLang(v as (typeof LANGS)[number])}
                data={LANGS.map((code) => ({ value: code, label: code.toUpperCase() }))}
              />
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
                  w={340}
                  // Toolchain and declared process are properties of the
                  // project, so they belong here rather than behind a feature:
                  // "which of these is on an old spec-kit" is a portfolio
                  // question, and the portfolio question comes first.
                  label={[
                    project.path,
                    project.branch,
                    project.constitution_version &&
                      t('project.constitution', { version: project.constitution_version }),
                    project.toolchain?.speckit_version &&
                      t('project.toolchain', { version: project.toolchain.speckit_version }) +
                        (project.toolchain.integration ? ` · ${project.toolchain.integration}` : ''),
                    project.toolchain?.drift
                      ? `⚠ ${t('project.drift', { count: project.toolchain.drift })}`
                      : null,
                    project.workflows.length
                      ? t('project.workflows', {
                          count: project.workflows.length,
                          list: project.workflows.map((w) => w.name ?? w.id).join(', '),
                        })
                      : null,
                    project.error && `⚠ ${project.error}`,
                  ]
                    .filter(Boolean)
                    .join('\n')}
                >
                  <Chip
                    size="xs"
                    radius="sm"
                    checked={active}
                    // Identity is the name. A hue assigned by hashing the id
                    // meant "project #4", cycled past ten, and spent three of
                    // the colours a finding needs.
                    color={project.error ? 'var(--status-blocker)' : 'gray'}
                    onChange={() =>
                      setHidden((current) =>
                        active ? [...current, project.id] : current.filter((id) => id !== project.id),
                      )
                    }
                  >
                    {project.name}
                    <Text component="span" size="xs" c="dimmed" ml={5}>
                      {project.features.length}
                    </Text>
                  </Chip>
                </Tooltip>
              )
            })}
            {!snapshot && <Loader size="xs" />}
          </Group>

          <Group gap="md" wrap="nowrap">
            {/* The state of the whole portfolio is what this board exists to
                report, and it was set at 11px in a corner — smaller than every
                card title on the page. */}
            {/* The count is outside the tooltip block on purpose: a search
                that matches nothing still has to say "0 features" rather than
                showing nothing at all. */}
            <Group gap={10} wrap="nowrap" align="center">
              {totals.total > 0 && (
                <Tooltip
                  withArrow
                  label={
                    view === 'stories'
                      ? t('board.tasksOfShownStories')
                      : t('board.tasksOfShownFeatures')
                  }
                >
                  <Group gap={10} wrap="nowrap" align="center">
                    <Text className={classes.headline} data-testid="headline-pct">
                      {pct}%
                    </Text>
                    <Stack gap={2} w={130}>
                      <Text size="xs" c="dimmed" className={classes.tabular}>
                        {t('board.tasksTotal', { done: totals.done, total: totals.total })}
                      </Text>
                      <Progress value={pct} size="sm" radius="xl" color="var(--progress)" />
                    </Stack>
                  </Group>
                </Tooltip>
              )}
              <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                {view === 'stories'
                  ? n(storyRows.length, 'story')
                  : n(features.length, 'feature')}
              </Text>
            </Group>
            {snapshot && (
              <Tooltip label={reason || t('app.lastScan')} withArrow>
                <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                  {ago(snapshot.generated_at)} ·{' '}
                  {t('app.ms', { ms: snapshot.scan_ms.toLocaleString(lang) })}
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
              {t('app.scanning')}
            </Text>
          </Stack>
        ) : projects.length === 0 ? (
          <Stack align="center" justify="center" h="60vh" gap={4}>
            <Text fw={600}>{t('app.noProjects')}</Text>
            <Text c="dimmed" size="sm" ta="center" maw={520}>
              {t('app.noProjectsHint')}
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
                  title={t('app.brokenTitle', { count: broken.length })}
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
          focusFile={selected?.file ?? null}
          initialTab={selected?.tab ?? null}
          onClose={() => setSelected(null)}
        />
      </Suspense>

      <Suspense fallback={null}>
        <SearchPalette
          opened={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          generation={snapshot?.generated_at ?? 0}
          onOpen={(hit) =>
            setSelected({
              project: hit.project_id,
              feature: hit.feature_id,
              story: hit.kind === 'story' ? hit.ref : undefined,
              file: hit.kind === 'document' ? hit.ref : undefined,
              tab:
                hit.kind === 'document'
                  ? 'docs'
                  : hit.kind === 'task'
                    ? 'tasks'
                    : hit.kind === 'checklist'
                      ? 'checklists'
                      : 'overview',
            })
          }
        />
      </Suspense>
    </AppShell>
  )
}
