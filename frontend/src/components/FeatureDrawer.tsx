import {
  Accordion,
  Alert,
  Anchor,
  Badge,
  Box,
  Card,
  Checkbox,
  Code,
  Divider,
  Drawer,
  Group,
  Loader,
  NavLink,
  Progress,
  RingProgress,
  ScrollArea,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  Timeline,
  Title,
  Tooltip,
} from '@mantine/core'
import {
  IconAlertTriangle,
  IconChecklist,
  IconFileText,
  IconGitCommit,
  IconLayoutList,
  IconListCheck,
  IconTargetArrow,
} from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'
import type { Commit, Feature } from '../types'
import { PRIORITY_COLOR, STAGE_COLOR, STAGE_LABEL } from '../types'
import { formatBytes, progressColor, projectColor } from '../utils'
import { useT } from '../i18n'
import { MarkdownView } from './MarkdownView'
import classes from './FeatureDrawer.module.css'

interface Props {
  feature: Feature | null
  /** story to expand on open, when the drawer was reached from a story card */
  focusStory?: string | null
  /** document to show, when the drawer was reached from a search hit */
  focusFile?: string | null
  /** tab to land on, when something more specific than the overview was chosen */
  initialTab?: string | null
  onClose: () => void
}

export function FeatureDrawer({ feature, focusStory, focusFile, initialTab, onClose }: Props) {
  const { t, ago } = useT()
  const [tab, setTab] = useState<string | null>('overview')
  const [openFile, setOpenFile] = useState<string | null>(null)

  useEffect(() => {
    // The tasks with no story have no row in the overview to expand, so that
    // card lands on the task list instead of on a panel that ignores the click.
    setTab(initialTab ?? (focusStory === '—' ? 'tasks' : 'overview'))
    setOpenFile(
      focusFile ?? feature?.artifacts.find((a) => a.key === 'spec')?.file ?? null,
    )
  }, [feature?.id, feature?.project_id, focusStory, focusFile, initialTab])

  if (!feature) return null
  const accent = projectColor(feature.project_id)

  return (
    <Drawer
      opened={!!feature}
      onClose={onClose}
      position="right"
      size="min(1080px, 92vw)"
      padding={0}
      withCloseButton={false}
      overlayProps={{ backgroundOpacity: 0.45, blur: 3 }}
      transitionProps={{ duration: 180 }}
    >
      <Box className={classes.head}>
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Box style={{ minWidth: 0 }}>
            <Group gap={6} mb={4}>
              <Badge variant="light" color={accent} radius="sm">
                {feature.project_id}
              </Badge>
              <Badge variant="filled" color={STAGE_COLOR[feature.stage]} radius="sm">
                {STAGE_LABEL[feature.stage]}
              </Badge>
              {feature.is_current && (
                <Badge variant="gradient" gradient={{ from: 'orange', to: 'red' }} radius="sm">
                  current
                </Badge>
              )}
              <Code fz={11}>{feature.branch ?? feature.id}</Code>
            </Group>
            <Title order={3} lh={1.2}>
              {feature.number ? `${feature.number} · ` : ''}
              {feature.title}
            </Title>
            <Text size="xs" c="dimmed" mt={4}>
              {feature.stage_reason} · {t('drawer.modified', { when: ago(feature.modified) })}
              {feature.created ? ` · ${t('drawer.created', { date: feature.created })}` : ''}
            </Text>
          </Box>
          {feature.progress.total > 0 && (
            <RingProgress
              size={92}
              thickness={9}
              roundCaps
              sections={[{ value: feature.progress.pct, color: progressColor(feature.progress.pct) }]}
              label={
                <Stack gap={0} align="center">
                  <Text fw={700} size="md" lh={1}>
                    {feature.progress.pct}%
                  </Text>
                  <Text size="10px" c="dimmed">
                    {feature.progress.done}/{feature.progress.total}
                  </Text>
                </Stack>
              }
            />
          )}
        </Group>
      </Box>

      <Tabs value={tab} onChange={setTab} keepMounted={false} className={classes.tabs}>
        <Tabs.List px="lg">
          <Tabs.Tab value="overview" leftSection={<IconTargetArrow size={14} />}>
            {t('drawer.overview')}
          </Tabs.Tab>
          <Tabs.Tab
            value="tasks"
            leftSection={<IconListCheck size={14} />}
            rightSection={
              feature.progress.total ? (
                <Badge size="xs" variant="light" radius="sm" px={5}>
                  {feature.progress.total}
                </Badge>
              ) : null
            }
          >
            {t('drawer.tasks')}
          </Tabs.Tab>
          <Tabs.Tab value="checklists" leftSection={<IconChecklist size={14} />}>
            {t('drawer.checklists')}
          </Tabs.Tab>
          <Tabs.Tab value="docs" leftSection={<IconFileText size={14} />}>
            {t('drawer.docs')}
          </Tabs.Tab>
          <Tabs.Tab value="git" leftSection={<IconGitCommit size={14} />}>
            {t('drawer.history')}
          </Tabs.Tab>
        </Tabs.List>

        <Box className={classes.body}>
          <Tabs.Panel value="overview">
            <Overview feature={feature} focusStory={focusStory ?? null} />
          </Tabs.Panel>
          <Tabs.Panel value="tasks">
            <TasksPanel feature={feature} />
          </Tabs.Panel>
          <Tabs.Panel value="checklists">
            <ChecklistsPanel feature={feature} />
          </Tabs.Panel>
          <Tabs.Panel value="docs">
            <DocsPanel feature={feature} openFile={openFile} setOpenFile={setOpenFile} />
          </Tabs.Panel>
          <Tabs.Panel value="git">
            <GitPanel feature={feature} />
          </Tabs.Panel>
        </Box>
      </Tabs>
    </Drawer>
  )
}

function Overview({ feature, focusStory }: { feature: Feature; focusStory: string | null }) {
  const { t } = useT()
  return (
    <ScrollArea.Autosize mah="calc(100vh - 210px)" type="hover">
      <Stack gap="lg" pr="sm">
        {feature.open_questions.length > 0 && (
          <Alert
            color="red"
            variant="light"
            icon={<IconAlertTriangle size={16} />}
            title={t('card.openQuestions', { count: feature.open_questions.length })}
          >
            <Stack gap={4}>
              {feature.open_questions.map((q, i) => (
                <Text size="xs" key={i}>
                  • {q}
                </Text>
              ))}
            </Stack>
          </Alert>
        )}

        {feature.summary && (
          <Box>
            <SectionTitle>{t('drawer.summary')}</SectionTitle>
            <Text size="sm" lh={1.6}>
              {feature.summary}
            </Text>
          </Box>
        )}

        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
          <Stat label={t('drawer.status')} value={feature.status ?? '—'} />
          <Stat
            label={t('drawer.taskCount')}
            value={feature.progress.total ? `${feature.progress.done}/${feature.progress.total}` : '—'}
          />
          <Stat
            label={t('drawer.checklistCount')}
            value={
              feature.checklist_progress.total
                ? `${feature.checklist_progress.done}/${feature.checklist_progress.total}`
                : '—'
            }
          />
          <Stat
            label={t('drawer.requirementCount')}
            value={t('drawer.requirementsShort', { count: feature.requirements.length })}
          />
        </SimpleGrid>

        {feature.user_stories.length > 0 && (
          <Box>
            <SectionTitle>{t('drawer.stories')}</SectionTitle>
            <Accordion
              variant="separated"
              radius="md"
              multiple
              defaultValue={focusStory ? [focusStory] : []}
              key={focusStory ?? 'none'}
            >
              {feature.user_stories.map((story) => {
                const pct = story.total ? Math.round((100 * story.done) / story.total) : 0
                return (
                  <Accordion.Item key={story.id} value={story.id}>
                    <Accordion.Control>
                      <Group gap="xs" wrap="nowrap">
                        <Badge
                          size="sm"
                          radius="sm"
                          color={PRIORITY_COLOR[story.priority ?? ''] ?? 'gray'}
                          variant="light"
                        >
                          {story.id}
                          {story.priority ? ` · ${story.priority}` : ''}
                        </Badge>
                        <Text size="sm" fw={600} style={{ flex: 1 }}>
                          {story.title}
                        </Text>
                        {story.total > 0 && (
                          <Tooltip
                            withArrow
                            label={t('drawer.storyTasksTooltip', { story: story.id, done: story.done, total: story.total })}
                          >
                            <Group gap={6} wrap="nowrap" w={190}>
                              <Progress
                                value={pct}
                                color={progressColor(pct)}
                                size="sm"
                                radius="xl"
                                style={{ flex: 1 }}
                              />
                              <Text size="xs" c="dimmed" w={92} ta="right" style={{ whiteSpace: 'nowrap' }}>
                                {t('drawer.storyTasks', { done: story.done, total: story.total })}
                              </Text>
                            </Group>
                          </Tooltip>
                        )}
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap="sm">
                        {story.narrative && (
                          <Text size="sm" c="dimmed" lh={1.6}>
                            {story.narrative}
                          </Text>
                        )}
                        {story.why && <Labelled label={t('drawer.why')}>{story.why}</Labelled>}
                        {story.independent_test && (
                          <Labelled label={t('drawer.independentTest')}>{story.independent_test}</Labelled>
                        )}
                        {story.acceptance.length > 0 && (
                          <Box>
                            <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={6}>
                              {t('drawer.acceptance')}
                            </Text>
                            <Timeline bulletSize={16} lineWidth={2}>
                              {story.acceptance.map((sc) => (
                                <Timeline.Item key={sc.index}>
                                  <Text size="sm" lh={1.55}>
                                    {sc.text}
                                  </Text>
                                </Timeline.Item>
                              ))}
                            </Timeline>
                          </Box>
                        )}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                )
              })}
            </Accordion>
          </Box>
        )}

        {Object.keys(feature.tech).length > 0 && (
          <Box>
            <SectionTitle>{t('drawer.tech')}</SectionTitle>
            <Table fz="xs" verticalSpacing={6} withTableBorder>
              <Table.Tbody>
                {Object.entries(feature.tech).map(([key, value]) => (
                  <Table.Tr key={key}>
                    <Table.Td w={190} fw={600}>
                      {key}
                    </Table.Td>
                    <Table.Td>{value}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Box>
        )}

        {feature.success_criteria.length > 0 && (
          <RequirementList title={t('drawer.successCriteria')} items={feature.success_criteria} color="teal" />
        )}
        {feature.requirements.length > 0 && (
          <RequirementList title={t('drawer.requirements')} items={feature.requirements} color="blue" collapse />
        )}

        {feature.edge_cases.length > 0 && (
          <Box>
            <SectionTitle>{t('drawer.edgeCases')}</SectionTitle>
            <Stack gap={6}>
              {feature.edge_cases.map((edge, i) => (
                <Text size="sm" key={i} lh={1.55}>
                  • {edge}
                </Text>
              ))}
            </Stack>
          </Box>
        )}

        {feature.clarifications.length > 0 && (
          <Box>
            <SectionTitle>{t('drawer.clarifications')}</SectionTitle>
            <Stack gap={6}>
              {feature.clarifications.map((c, i) => (
                <Text size="sm" key={i} lh={1.55}>
                  • {c}
                </Text>
              ))}
            </Stack>
          </Box>
        )}

        {feature.input && (
          <Box>
            <SectionTitle>{t('drawer.input')}</SectionTitle>
            <Text size="xs" c="dimmed" lh={1.6} className={classes.quote}>
              {feature.input}
            </Text>
          </Box>
        )}
      </Stack>
    </ScrollArea.Autosize>
  )
}

function TasksPanel({ feature }: { feature: Feature }) {
  const { t } = useT()
  const [onlyOpen, setOnlyOpen] = useState(false)
  const [group, setGroup] = useState<'phase' | 'story'>('phase')

  const groups = useMemo(() => {
    const tasks = onlyOpen ? feature.tasks.filter((t) => !t.done) : feature.tasks
    const map = new Map<string, typeof tasks>()
    for (const task of tasks) {
      const key = group === 'phase' ? task.phase : (task.story ?? t('card.noStory'))
      const list = map.get(key) ?? []
      list.push(task)
      map.set(key, list)
    }
    return [...map.entries()]
  }, [feature.tasks, onlyOpen, group])

  if (!feature.tasks.length) {
    return (
      <Alert variant="light" color="gray" title={t('drawer.noTasksTitle')}>
        {t('drawer.noTasksBody')}
      </Alert>
    )
  }

  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <SegmentedControl
          size="xs"
          value={group}
          onChange={(v) => setGroup(v as 'phase' | 'story')}
          data={[
            { value: 'phase', label: t('drawer.byPhase') },
            { value: 'story', label: t('drawer.byStory') },
          ]}
        />
        <Switch
          size="xs"
          label={t('drawer.onlyOpen')}
          checked={onlyOpen}
          onChange={(e) => setOnlyOpen(e.currentTarget.checked)}
        />
      </Group>

      <ScrollArea.Autosize mah="calc(100vh - 280px)" type="hover">
        <Stack gap="md" pr="sm">
          {groups.map(([title, tasks]) => {
            const done = tasks.filter((t) => t.done).length
            const pct = Math.round((100 * done) / tasks.length)
            const meta = feature.phases.find((p) => p.title === title)
            return (
              <Card key={title} withBorder radius="md" padding="sm">
                <Group justify="space-between" wrap="nowrap" mb={6}>
                  <Group gap={8} wrap="nowrap">
                    <IconLayoutList size={14} />
                    <Text fw={650} size="sm">
                      {title}
                    </Text>
                    {meta?.priority && (
                      <Badge size="xs" color={PRIORITY_COLOR[meta.priority] ?? 'gray'} variant="light">
                        {meta.priority}
                      </Badge>
                    )}
                  </Group>
                  <Group gap={8} wrap="nowrap" w={150}>
                    <Progress
                      value={pct}
                      color={progressColor(pct)}
                      size="sm"
                      radius="xl"
                      style={{ flex: 1 }}
                    />
                    <Text size="xs" c="dimmed" w={40} ta="right">
                      {done}/{tasks.length}
                    </Text>
                  </Group>
                </Group>
                {meta?.goal && (
                  <Text size="xs" c="dimmed" mb={6}>
                    {meta.goal}
                  </Text>
                )}
                <Divider mb={6} />
                <Stack gap={4}>
                  {tasks.map((task) => (
                    <Group key={task.id} gap={8} wrap="nowrap" align="flex-start">
                      <Checkbox
                        checked={task.done}
                        readOnly
                        size="xs"
                        mt={2}
                        color="teal"
                        aria-label={task.done ? t('drawer.done') : t('drawer.notDone')}
                      />
                      <Box style={{ minWidth: 0, flex: 1 }}>
                        <Group gap={5} wrap="nowrap" align="baseline">
                          <Text size="xs" fw={700} c="dimmed" className={classes.taskId}>
                            {task.id}
                          </Text>
                          {task.parallel && (
                            <Tooltip label={t('card.parallel')} withArrow>
                              <Badge size="xs" variant="dot" color="cyan" px={4}>
                                P
                              </Badge>
                            </Tooltip>
                          )}
                          {group === 'phase' && task.story && (
                            <Badge size="xs" variant="light" color="gray" px={4}>
                              {task.story}
                            </Badge>
                          )}
                        </Group>
                        <Text
                          size="sm"
                          lh={1.45}
                          td={task.done ? 'line-through' : undefined}
                          c={task.done ? 'dimmed' : undefined}
                        >
                          {task.description}
                        </Text>
                        {task.files.length > 0 && (
                          <Group gap={4} mt={2}>
                            {task.files.slice(0, 3).map((file) => (
                              <Code key={file} fz={10} className={classes.filePill}>
                                {file.split('/').slice(-2).join('/')}
                              </Code>
                            ))}
                          </Group>
                        )}
                      </Box>
                    </Group>
                  ))}
                </Stack>
              </Card>
            )
          })}
        </Stack>
      </ScrollArea.Autosize>
    </Stack>
  )
}

function ChecklistsPanel({ feature }: { feature: Feature }) {
  const { t } = useT()
  if (!feature.checklists.length) {
    return (
      <Alert variant="light" color="gray" title={t('drawer.noChecklistsTitle')}>
        {t('drawer.noChecklistsBody')}
      </Alert>
    )
  }
  return (
    <ScrollArea.Autosize mah="calc(100vh - 230px)" type="hover">
      <Stack gap="md" pr="sm">
        {feature.checklists.map((list) => {
          const pct = list.total ? Math.round((100 * list.done) / list.total) : 0
          return (
            <Card key={list.file} withBorder radius="md" padding="sm">
              <Group justify="space-between" mb="xs">
                <Text fw={650} size="sm">
                  {list.title ?? list.name}
                </Text>
                <Badge color={pct === 100 ? 'green' : 'yellow'} variant="light" radius="sm">
                  {list.done}/{list.total}
                </Badge>
              </Group>
              <Progress value={pct} color={pct === 100 ? 'green' : 'yellow'} size="sm" radius="xl" mb="sm" />
              <Stack gap={3}>
                {list.items.map((item, i) => (
                  <Group key={i} gap={8} wrap="nowrap" align="flex-start">
                    <Checkbox checked={item.done} readOnly size="xs" mt={2} color="teal" />
                    <Text size="sm" c={item.done ? 'dimmed' : undefined} lh={1.45}>
                      {item.text}
                    </Text>
                  </Group>
                ))}
              </Stack>
            </Card>
          )
        })}
      </Stack>
    </ScrollArea.Autosize>
  )
}

function DocsPanel({
  feature,
  openFile,
  setOpenFile,
}: {
  feature: Feature
  openFile: string | null
  setOpenFile: (file: string) => void
}) {
  const { t, ago } = useT()
  return (
    <Group align="flex-start" gap="md" wrap="nowrap">
      <Box w={230} style={{ flex: 'none' }}>
        <ScrollArea.Autosize mah="calc(100vh - 240px)">
          <Stack gap={2}>
            {feature.artifacts.map((artifact) => (
              <NavLink
                key={artifact.file}
                active={openFile === artifact.file}
                label={artifact.label}
                description={`${formatBytes(artifact.bytes)} · ${ago(artifact.modified)}`}
                onClick={() => setOpenFile(artifact.file)}
                variant="light"
                className={classes.navlink}
              />
            ))}
          </Stack>
        </ScrollArea.Autosize>
      </Box>
      <Box style={{ flex: 1, minWidth: 0 }}>
        {openFile ? (
          <MarkdownView projectId={feature.project_id} featureId={feature.id} file={openFile} />
        ) : (
          <Text c="dimmed" size="sm">
            {t('drawer.pickDocument')}
          </Text>
        )}
      </Box>
    </Group>
  )
}

function GitPanel({ feature }: { feature: Feature }) {
  const { t } = useT()
  const [commits, setCommits] = useState<Commit[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setCommits(null)
    fetch(
      `/api/projects/${encodeURIComponent(feature.project_id)}/features/${encodeURIComponent(
        feature.id,
      )}/commits`,
    )
      .then((r) => r.json())
      .then((data) => !cancelled && setCommits(data.commits))
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [feature.id, feature.project_id])

  if (error) return <Alert color="red">{error}</Alert>
  if (commits === null) return <Loader size="sm" />
  if (!commits.length) {
    return (
      <Alert variant="light" color="gray" title={t('drawer.noCommitsTitle')}>
        {t('drawer.noCommitsBody', { feature: feature.id })}
      </Alert>
    )
  }

  return (
    <ScrollArea.Autosize mah="calc(100vh - 230px)">
      <Timeline bulletSize={18} lineWidth={2} pr="sm">
        {commits.map((commit) => (
          <Timeline.Item
            key={commit.sha}
            bullet={<IconGitCommit size={11} />}
            title={<Text size="sm">{commit.subject}</Text>}
          >
            <Text size="xs" c="dimmed">
              <Code fz={10}>{commit.sha}</Code> · {commit.author} · {commit.relative}
            </Text>
          </Timeline.Item>
        ))}
      </Timeline>
    </ScrollArea.Autosize>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text fw={700} size="xs" tt="uppercase" c="dimmed" mb="xs" style={{ letterSpacing: '0.06em' }}>
      {children}
    </Text>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card withBorder radius="md" padding="xs">
      <Text size="10px" tt="uppercase" c="dimmed" fw={700}>
        {label}
      </Text>
      <Text size="sm" fw={650} lineClamp={2} lh={1.3}>
        {value}
      </Text>
    </Card>
  )
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={2}>
        {label}
      </Text>
      <Text size="sm" lh={1.55}>
        {children}
      </Text>
    </Box>
  )
}

function RequirementList({
  title,
  items,
  color,
  collapse,
}: {
  title: string
  items: { id: string; text: string }[]
  color: string
  collapse?: boolean
}) {
  const { t } = useT()
  const [expanded, setExpanded] = useState(!collapse)
  const shown = expanded ? items : items.slice(0, 6)
  return (
    <Box>
      <SectionTitle>
        {title} ({items.length})
      </SectionTitle>
      <Stack gap={5}>
        {shown.map((item) => (
          <Group key={item.id} gap={8} wrap="nowrap" align="flex-start">
            <Badge size="xs" variant="light" color={color} radius="sm" style={{ flex: 'none' }}>
              {item.id}
            </Badge>
            <Text size="sm" lh={1.5}>
              {item.text}
            </Text>
          </Group>
        ))}
      </Stack>
      {items.length > shown.length && (
        <Anchor component="button" size="xs" mt={6} onClick={() => setExpanded(true)}>
          {t('drawer.showMore', { count: items.length - shown.length })}
        </Anchor>
      )}
    </Box>
  )
}
