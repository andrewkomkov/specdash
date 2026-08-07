import { Badge, Box, Group, ScrollArea, Stack, Text, ThemeIcon, Tooltip } from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import type { Feature, Stage } from '../types'
import { STAGE_COLOR, STAGE_HINT, STAGE_LABEL, STAGES } from '../types'
import { FeatureCard } from './FeatureCard'
import { StoryCard } from './StoryCard'
import type { StoryRow } from './StoryCard'
import classes from './Board.module.css'

interface Props {
  features: Feature[]
  showProject: boolean
  recent: Set<string>
  onOpen: (feature: Feature) => void
}

export function Board({ features, showProject, recent, onOpen }: Props) {
  return (
    <Box className={classes.board}>
      {STAGES.map((stage) => {
        const items = features.filter((f) => f.stage === stage)
        return (
          <Column
            key={stage}
            stage={stage}
            count={items.length}
            done={items.reduce((sum, f) => sum + f.progress.done, 0)}
            total={items.reduce((sum, f) => sum + f.progress.total, 0)}
          >
            {items.map((feature) => (
              <FeatureCard
                key={`${feature.project_id}/${feature.id}`}
                feature={feature}
                showProject={showProject}
                flashing={recent.has(`${feature.project_id}/${feature.id}`)}
                onOpen={onOpen}
              />
            ))}
          </Column>
        )
      })}
    </Box>
  )
}

/** The same six columns, one card per user story rather than per feature. */
export function StoryBoard({
  rows,
  showProject,
  recent,
  onOpen,
}: {
  rows: StoryRow[]
  showProject: boolean
  recent: Set<string>
  onOpen: (row: StoryRow) => void
}) {
  return (
    <Box className={classes.board}>
      {STAGES.map((stage) => {
        const items = rows.filter((r) => r.story.stage === stage)
        return (
          <Column
            key={stage}
            stage={stage}
            count={items.length}
            done={items.reduce((sum, r) => sum + r.story.done, 0)}
            total={items.reduce((sum, r) => sum + r.story.total, 0)}
          >
            {items.map((row) => (
              <StoryCard
                key={row.key}
                row={row}
                showProject={showProject}
                flashing={recent.has(`${row.feature.project_id}/${row.feature.id}`)}
                onOpen={onOpen}
              />
            ))}
          </Column>
        )
      })}
    </Box>
  )
}

function Column({
  stage,
  count,
  done,
  total,
  children,
}: {
  stage: Stage
  count: number
  done: number
  total: number
  children: ReactNode
}) {
  const color = STAGE_COLOR[stage]

  return (
    <Box className={classes.column} data-stage={stage}>
      <Box className={classes.header}>
        <Group justify="space-between" wrap="nowrap" gap={6}>
          <Group gap={7} wrap="nowrap">
            <Box className={classes.dot} style={{ background: `var(--mantine-color-${color}-6)` }} />
            <Text fw={700} size="xs" tt="uppercase" style={{ letterSpacing: '0.06em' }}>
              {STAGE_LABEL[stage]}
            </Text>
            <Badge size="xs" variant="light" color={color} radius="sm">
              {count}
            </Badge>
          </Group>
          <Tooltip label={STAGE_HINT[stage]} withArrow multiline w={220}>
            <ThemeIcon size={16} variant="transparent" color="gray">
              <IconInfoCircle size={13} />
            </ThemeIcon>
          </Tooltip>
        </Group>
        {total > 0 && (
          <Text size="10px" c="dimmed" mt={2}>
            {done}/{total} задач в колонке
          </Text>
        )}
      </Box>

      <ScrollArea.Autosize mah="calc(100vh - 210px)" type="hover" scrollbarSize={6}>
        <Stack gap="sm" p={3} pb="md">
          {children}
          {count === 0 && (
            <Box className={classes.empty}>
              <Text size="xs" c="dimmed">
                пусто
              </Text>
            </Box>
          )}
        </Stack>
      </ScrollArea.Autosize>
    </Box>
  )
}
