import { Badge, Box, Group, ScrollArea, Stack, Text, ThemeIcon, Tooltip } from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'
import type { Feature, Stage } from '../types'
import { STAGE_COLOR, STAGE_HINT, STAGE_LABEL, STAGES } from '../types'
import { FeatureCard } from './FeatureCard'
import classes from './Board.module.css'

interface Props {
  features: Feature[]
  showProject: boolean
  recent: Set<string>
  onOpen: (feature: Feature) => void
}

export function Board({ features, showProject, recent, onOpen }: Props) {
  const columns = STAGES.map((stage) => ({
    stage,
    items: features.filter((f) => f.stage === stage),
  }))

  return (
    <Box className={classes.board}>
      {columns.map(({ stage, items }) => (
        <Column
          key={stage}
          stage={stage}
          items={items}
          showProject={showProject}
          recent={recent}
          onOpen={onOpen}
        />
      ))}
    </Box>
  )
}

function Column({
  stage,
  items,
  showProject,
  recent,
  onOpen,
}: {
  stage: Stage
  items: Feature[]
  showProject: boolean
  recent: Set<string>
  onOpen: (feature: Feature) => void
}) {
  const color = STAGE_COLOR[stage]
  const tasks = items.reduce((sum, f) => sum + f.progress.total, 0)
  const done = items.reduce((sum, f) => sum + f.progress.done, 0)

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
              {items.length}
            </Badge>
          </Group>
          <Tooltip label={STAGE_HINT[stage]} withArrow multiline w={220}>
            <ThemeIcon size={16} variant="transparent" color="gray">
              <IconInfoCircle size={13} />
            </ThemeIcon>
          </Tooltip>
        </Group>
        {tasks > 0 && (
          <Text size="10px" c="dimmed" mt={2}>
            {done}/{tasks} задач в колонке
          </Text>
        )}
      </Box>

      <ScrollArea.Autosize mah="calc(100vh - 210px)" type="hover" scrollbarSize={6}>
        <Stack gap="sm" p={3} pb="md">
          {items.map((feature) => (
            <FeatureCard
              key={`${feature.project_id}/${feature.id}`}
              feature={feature}
              showProject={showProject}
              flashing={recent.has(`${feature.project_id}/${feature.id}`)}
              onOpen={onOpen}
            />
          ))}
          {items.length === 0 && (
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
