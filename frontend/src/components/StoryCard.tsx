import { Badge, Box, Card, Group, Progress, Text, Tooltip } from '@mantine/core'
import type { Feature, UserStory } from '../types'
import { PRIORITY_WEIGHT, STAGE_VAR } from '../types'
import { useT } from '../i18n'
import { PROGRESS_COLOR } from '../utils'
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
  const { t } = useT()
  const { story, feature } = row
  const pct = story.total ? Math.round((100 * story.done) / story.total) : 0
  const loose = story.id === '—'

  return (
    <Card
      withBorder
      radius="md"
      padding="sm"
      className={`${classes.card} ${flashing ? classes.flash : ''}`}
      data-current={feature.is_current || undefined}
      data-testid="story-card"
      data-story={row.key}
      onClick={() => onOpen(row)}
      role="button"
      tabIndex={0}
      aria-label={t('card.open', { title: story.title })}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(row)
        }
      }}
    >
      <Box className={classes.accent} style={{ background: STAGE_VAR[story.stage] }} />

      <Group gap={5} wrap="nowrap" mb={5} justify="space-between">
        <Group gap={5} wrap="nowrap" style={{ minWidth: 0 }}>
          <Badge
            size="xs"
            radius="sm"
            variant="default"
            fw={loose ? 500 : (PRIORITY_WEIGHT[story.priority ?? ''] ?? 500)}
            className={`${classes.pill} ${classes.storyBadge}`}
          >
            {story.id}
            {story.priority ? ` · ${story.priority}` : ''}
          </Badge>
          {showProject && (
            <Badge size="xs" radius="sm" variant="default" className={classes.pill}>
              {feature.project_id}
            </Badge>
          )}
        </Group>
        {feature.is_current && (
          <Badge
            size="xs"
            radius="sm"
            variant="outline"
            color={PROGRESS_COLOR}
            className={classes.pill}
          >
            current
          </Badge>
        )}
      </Group>

      <Text fw={600} lh={1.3} className={classes.title} lineClamp={3}>
        {story.id === '—' ? t('card.noStory') : story.title}
      </Text>

      {/* Which feature this story belongs to — a story title alone is not enough
          to place it when several projects are on the board at once. */}
      <Tooltip label={feature.title} withArrow multiline w={280} openDelay={400}>
        <Text size="xs" c="dimmed" mt={3} lineClamp={1}>
          {feature.number ? `${feature.number} · ` : ''}
          {feature.title}
        </Text>
      </Tooltip>

      {story.total > 0 ? (
        <Box mt={8}>
          <Group justify="space-between" gap={6} mb={3} wrap="nowrap">
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
              {t('card.tasks')}
            </Text>
            <Text size="xs" fw={700} className={classes.footerMeta}>
              {story.done}/{story.total}
            </Text>
          </Group>
          <Progress value={pct} color={PROGRESS_COLOR} size="sm" radius="xl" />
        </Box>
      ) : (
        <Text size="xs" c="dimmed" mt={8}>
          {story.stage_reason}
        </Text>
      )}

      {story.acceptance.length > 0 && (
        <Text size="xs" c="dimmed" mt={6}>
          {t('card.acceptance', { count: story.acceptance.length })}
        </Text>
      )}
    </Card>
  )
}
