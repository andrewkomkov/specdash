import { Badge, Box, Card, Group, Progress, Text, Tooltip } from '@mantine/core'
import type { Feature, UserStory } from '../types'
import { PRIORITY_COLOR } from '../types'
import { progressColor, projectColor } from '../utils'
import classes from './FeatureCard.module.css'

export interface StoryRow {
  key: string
  story: UserStory
  feature: Feature
}

interface Props {
  row: StoryRow
  showProject: boolean
  flashing: boolean
  onOpen: (row: StoryRow) => void
}

/** One user story as a card, placed by its own tick counts. */
export function StoryCard({ row, showProject, flashing, onOpen }: Props) {
  const { story, feature } = row
  const accent = projectColor(feature.project_id)
  const pct = story.total ? Math.round((100 * story.done) / story.total) : 0
  const loose = story.id === '—'

  return (
    <Card
      withBorder
      radius="md"
      padding="sm"
      className={`${classes.card} ${flashing ? classes.flash : ''}`}
      data-current={feature.is_current || undefined}
      onClick={() => onOpen(row)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(row)
        }
      }}
    >
      <Box className={classes.accent} style={{ background: `var(--mantine-color-${accent}-6)` }} />

      <Group gap={5} wrap="nowrap" mb={5} justify="space-between">
        <Group gap={5} wrap="nowrap" style={{ minWidth: 0 }}>
          <Badge
            size="xs"
            radius="sm"
            variant="light"
            color={loose ? 'gray' : (PRIORITY_COLOR[story.priority ?? ''] ?? 'gray')}
            className={`${classes.pill} ${classes.storyBadge}`}
          >
            {story.id}
            {story.priority ? ` · ${story.priority}` : ''}
          </Badge>
          {showProject && (
            <Badge size="xs" radius="sm" variant="dot" color={accent} className={classes.pill}>
              {feature.project_id}
            </Badge>
          )}
        </Group>
        {feature.is_current && (
          <Badge size="xs" radius="sm" variant="light" color="orange" className={classes.pill}>
            current
          </Badge>
        )}
      </Group>

      <Text fw={600} lh={1.3} className={classes.title} lineClamp={3}>
        {story.title}
      </Text>

      {/* Which feature this story belongs to — a story title alone is not enough
          to place it when several projects are on the board at once. */}
      <Tooltip label={feature.title} withArrow multiline w={280} openDelay={400}>
        <Text size="10px" c="dimmed" mt={3} lineClamp={1}>
          {feature.number ? `${feature.number} · ` : ''}
          {feature.title}
        </Text>
      </Tooltip>

      {story.total > 0 ? (
        <Box mt={8}>
          <Group justify="space-between" gap={6} mb={3} wrap="nowrap">
            <Text size="10px" c="dimmed" tt="uppercase" fw={700}>
              задачи
            </Text>
            <Text size="10px" fw={700} className={classes.footerMeta}>
              {story.done}/{story.total}
            </Text>
          </Group>
          <Progress value={pct} color={progressColor(pct)} size="sm" radius="xl" />
        </Box>
      ) : (
        <Text size="10px" c="dimmed" mt={8}>
          {story.stage_reason}
        </Text>
      )}

      {story.acceptance.length > 0 && (
        <Text size="10px" c="dimmed" mt={6}>
          {story.acceptance.length} сценари{story.acceptance.length === 1 ? 'й' : 'ев'} приёмки
        </Text>
      )}
    </Card>
  )
}
