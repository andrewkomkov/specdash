import {
  Badge,
  Box,
  Card,
  Group,
  Progress,
  RingProgress,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core'
import {
  IconAlertTriangle,
  IconChecklist,
  IconFileText,
  IconFlame,
  IconGitBranch,
  IconListCheck,
  IconMap2,
  IconTargetArrow,
} from '@tabler/icons-react'
import type { Feature } from '../types'
import { PRIORITY_COLOR } from '../types'
import { progressColor, projectColor, relativeTime } from '../utils'
import classes from './FeatureCard.module.css'

const ARTIFACT_ICONS: { key: string; label: string; Icon: typeof IconFileText }[] = [
  { key: 'spec', label: 'spec.md', Icon: IconFileText },
  { key: 'plan', label: 'plan.md', Icon: IconMap2 },
  { key: 'tasks', label: 'tasks.md', Icon: IconListCheck },
  { key: 'research', label: 'research.md', Icon: IconTargetArrow },
]

interface Props {
  feature: Feature
  showProject: boolean
  flashing: boolean
  onOpen: (feature: Feature) => void
}

export function FeatureCard({ feature, showProject, flashing, onOpen }: Props) {
  const accent = projectColor(feature.project_id)
  const pct = feature.progress.pct
  const has = (key: string) => feature.artifacts.some((a) => a.key === key)
  const contracts = feature.artifacts.filter((a) => a.key.startsWith('contracts/')).length
  const stories = feature.user_stories.slice(0, 4)

  return (
    <Card
      withBorder
      radius="lg"
      padding="md"
      className={`${classes.card} ${flashing ? classes.flash : ''}`}
      onClick={() => onOpen(feature)}
      data-current={feature.is_current || undefined}
    >
      <Box className={classes.accent} style={{ background: `var(--mantine-color-${accent}-6)` }} />

      <Group justify="space-between" wrap="nowrap" gap="xs" mb={6}>
        <Group gap={6} wrap="nowrap">
          <Text className={classes.number}>{feature.number ?? '—'}</Text>
          {showProject && (
            <Badge size="xs" variant="light" color={accent} radius="sm">
              {feature.project_id}
            </Badge>
          )}
        </Group>
        {feature.is_current && (
          <Tooltip label="Активная фича (.specify/feature.json)" withArrow>
            <Badge
              size="xs"
              variant="gradient"
              gradient={{ from: 'orange', to: 'red', deg: 45 }}
              leftSection={<IconFlame size={11} />}
            >
              current
            </Badge>
          </Tooltip>
        )}
      </Group>

      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
        <Text fw={650} lh={1.25} className={classes.title} lineClamp={3}>
          {feature.title}
        </Text>
        {feature.progress.total > 0 && (
          <RingProgress
            size={54}
            thickness={5}
            roundCaps
            sections={[{ value: pct, color: progressColor(pct) }]}
            label={
              <Text ta="center" fw={700} size="10px">
                {pct}%
              </Text>
            }
          />
        )}
      </Group>

      {feature.summary && (
        <Text size="xs" c="dimmed" mt={6} lineClamp={2} className={classes.summary}>
          {feature.summary}
        </Text>
      )}

      <Stack gap={7} mt="sm">
        {feature.progress.total > 0 && (
          <Box>
            <Group justify="space-between" gap={4} mb={3}>
              <Text size="10px" c="dimmed" fw={600} tt="uppercase">
                задачи
              </Text>
              <Text size="10px" c="dimmed" fw={600}>
                {feature.progress.done}/{feature.progress.total}
              </Text>
            </Group>
            <Progress
              value={pct}
              color={progressColor(pct)}
              size={6}
              radius="xl"
              animated={pct > 0 && pct < 100}
            />
          </Box>
        )}

        {stories.length > 0 && (
          <Group gap={4}>
            {stories.map((story) => {
              const storyPct = story.total ? Math.round((100 * story.done) / story.total) : 0
              return (
                <Tooltip
                  key={story.id}
                  withArrow
                  multiline
                  w={260}
                  label={`${story.title}${story.total ? ` — ${story.done}/${story.total} задач` : ''}`}
                >
                  <Badge
                    size="xs"
                    radius="sm"
                    variant={story.total && story.done === story.total ? 'filled' : 'outline'}
                    color={PRIORITY_COLOR[story.priority ?? ''] ?? 'gray'}
                    className={classes.storyBadge}
                  >
                    {story.id}
                    {story.priority ? `·${story.priority}` : ''}
                    {story.total ? ` ${storyPct}%` : ''}
                  </Badge>
                </Tooltip>
              )
            })}
            {feature.user_stories.length > stories.length && (
              <Text size="10px" c="dimmed">
                +{feature.user_stories.length - stories.length}
              </Text>
            )}
          </Group>
        )}
      </Stack>

      <Group justify="space-between" mt="sm" gap={6} wrap="nowrap">
        <Group gap={5} wrap="nowrap">
          {ARTIFACT_ICONS.map(({ key, label, Icon }) => (
            <Tooltip key={key} label={has(key) ? label : `нет ${label}`} withArrow>
              <Icon
                size={14}
                className={has(key) ? classes.artifactOn : classes.artifactOff}
                stroke={1.8}
              />
            </Tooltip>
          ))}
          {contracts > 0 && (
            <Tooltip label={`${contracts} контракт(а)`} withArrow>
              <Badge size="xs" variant="default" radius="sm" px={5} className={classes.pill}>
                {contracts}c
              </Badge>
            </Tooltip>
          )}
          {feature.checklist_progress.total > 0 && (
            <Tooltip
              label={`чеклисты: ${feature.checklist_progress.done}/${feature.checklist_progress.total}`}
              withArrow
            >
              <Badge
                size="xs"
                radius="sm"
                px={5}
                variant="light"
                color={
                  feature.checklist_progress.done === feature.checklist_progress.total
                    ? 'green'
                    : 'yellow'
                }
                leftSection={<IconChecklist size={10} />}
                className={classes.pill}
              >
                {feature.checklist_progress.pct}%
              </Badge>
            </Tooltip>
          )}
          {feature.open_questions.length > 0 && (
            <Tooltip label={`${feature.open_questions.length} × NEEDS CLARIFICATION`} withArrow>
              <Badge
                size="xs"
                radius="sm"
                px={5}
                color="red"
                variant="light"
                leftSection={<IconAlertTriangle size={10} />}
                className={classes.pill}
              >
                {feature.open_questions.length}
              </Badge>
            </Tooltip>
          )}
        </Group>
        <Tooltip label={feature.branch ?? feature.id} withArrow>
          <Group gap={3} wrap="nowrap" className={classes.footerMeta}>
            <IconGitBranch size={11} stroke={1.6} />
            <Text size="10px" c="dimmed">
              {relativeTime(feature.modified)}
            </Text>
          </Group>
        </Tooltip>
      </Group>
    </Card>
  )
}
