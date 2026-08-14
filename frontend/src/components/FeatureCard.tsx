import {
  Badge,
  Box,
  Card,
  Group,
  Progress,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconChecklist,
  IconFileText,
  IconFlame,
  IconGitBranch,
  IconListCheck,
  IconMap2,
  IconTargetArrow,
} from "@tabler/icons-react";
import type { Feature } from "../types";
import { PRIORITY_WEIGHT, SEVERITY_VAR, STAGE_VAR } from "../types";
import { PROGRESS_COLOR } from "../utils";
import { useT } from "../i18n";
import classes from "./FeatureCard.module.css";

const ARTIFACT_ICONS: {
  key: string;
  label: string;
  Icon: typeof IconFileText;
}[] = [
  { key: "spec", label: "spec.md", Icon: IconFileText },
  { key: "plan", label: "plan.md", Icon: IconMap2 },
  { key: "tasks", label: "tasks.md", Icon: IconListCheck },
  { key: "research", label: "research.md", Icon: IconTargetArrow },
];

interface Props {
  feature: Feature;
  showProject: boolean;
  flashing: boolean;
  onOpen: (feature: Feature) => void;
}

export function FeatureCard({ feature, showProject, flashing, onOpen }: Props) {
  const pct = feature.progress.pct;
  const has = (key: string) => feature.artifacts.some((a) => a.key === key);
  const { t, n, ago } = useT();
  const contracts = feature.artifacts.filter((a) =>
    a.key.startsWith("contracts/"),
  ).length;
  const stories = feature.user_stories.slice(0, 4);

  return (
    <Card
      withBorder
      radius="lg"
      padding="md"
      className={`${classes.card} ${flashing ? classes.flash : ""}`}
      onClick={() => onOpen(feature)}
      // A card was openable by click and by nothing else, while the story card
      // beside it had all four of these. The primary action of the whole board
      // must not require a mouse.
      role="button"
      tabIndex={0}
      aria-label={t("card.open", { title: feature.title })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(feature);
        }
      }}
      data-current={feature.is_current || undefined}
      data-testid="feature-card"
      data-feature={`${feature.project_id}/${feature.id}`}
    >
      {/* The accent bar is the stage, not the project: a project is told
          apart by its name, and hue now says where a feature stands. */}
      <Box
        className={classes.accent}
        style={{ background: STAGE_VAR[feature.stage] }}
      />

      <Group justify="space-between" wrap="nowrap" gap="xs" mb={6}>
        <Group gap={6} wrap="nowrap">
          <Text className={classes.number}>{feature.number ?? "—"}</Text>
          {showProject && (
            <Badge
              size="xs"
              variant="default"
              radius="sm"
              className={classes.project}
            >
              {feature.project_id}
            </Badge>
          )}
        </Group>
        {feature.is_current && (
          <Tooltip label={t("card.current")} withArrow>
            {/* Being the active feature is not a warning. The old
                orange-to-red gradient put alarm colour on the healthiest card
                on the board. */}
            <Badge
              size="xs"
              variant="outline"
              color={PROGRESS_COLOR}
              leftSection={<IconFlame size={11} />}
            >
              current
            </Badge>
          </Tooltip>
        )}
      </Group>

      {/* The ring that used to sit here said exactly what the bar below says.
          On a 250px card that was half the visual weight spent on a duplicate,
          and it pushed the title — the thing being looked for — into a column
          two thirds as wide. */}
      <Text fw={700} lh={1.25} className={classes.title} lineClamp={3}>
        {feature.title}
      </Text>

      {feature.summary && (
        <Text
          size="xs"
          c="dimmed"
          mt={6}
          lineClamp={2}
          className={classes.summary}
        >
          {feature.summary}
        </Text>
      )}

      <Stack gap={7} mt="sm">
        {feature.progress.total > 0 && (
          <Box>
            <Group justify="space-between" gap={4} mb={3}>
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                {t("card.tasks")}
              </Text>
              <Text size="xs" fw={700} className={classes.tabular}>
                {feature.progress.done}/{feature.progress.total} · {pct}%
              </Text>
            </Group>
            <Progress
              value={pct}
              color={PROGRESS_COLOR}
              size={6}
              radius="xl"
              animated={pct > 0 && pct < 100}
            />
          </Box>
        )}

        {/* Subsumes the old NEEDS CLARIFICATION badge: an open marker is one
            finding among several, and two badges for the same fact read as two
            problems. It sits on its own line rather than in the footer row —
            a finding is about the state of the feature, not about which of its
            documents exist, and carrying the severity as a word made that
            nowrap row wide enough to push cards out of their column. */}
        {feature.findings.length > 0 && (
          <Group gap={4}>
            <Tooltip
              withArrow
              multiline
              w={320}
              label={feature.findings
                .slice(0, 4)
                .map((f) => `• ${f.message}`)
                .concat(
                  feature.findings.length > 4
                    ? [
                        t("checks.andMore", {
                          count: feature.findings.length - 4,
                        }),
                      ]
                    : [],
                )
                .join("\n")}
            >
              {/* Icon and word, not colour alone: brand green and status red
                are ΔE 7.1 apart for deuteranopia, and "done" versus "blocked"
                is the pair on this board that must never be confused. */}
              <Badge
                size="xs"
                radius="sm"
                px={5}
                color={SEVERITY_VAR[feature.findings[0].severity]}
                variant="light"
                leftSection={<IconAlertTriangle size={10} />}
                className={classes.pill}
                data-testid="finding-badge"
                data-severity={feature.findings[0].severity}
              >
                {feature.findings.length}{" "}
                {t(`checks.severity.${feature.findings[0].severity}`)}
              </Badge>
            </Tooltip>
          </Group>
        )}

        {stories.length > 0 && (
          <Group gap={4}>
            {stories.map((story) => {
              const storyPct = story.total
                ? Math.round((100 * story.done) / story.total)
                : 0;
              return (
                <Tooltip
                  key={story.id}
                  withArrow
                  multiline
                  w={260}
                  label={`${story.title}${story.total ? ` — ${n(story.total, "task")}, ${story.done} ${t("trend.closed")}` : ""}`}
                >
                  {/* Priority is weight, not hue. A finished P1 story is not an
                      emergency, and red belongs to findings. */}
                  <Badge
                    size="xs"
                    radius="sm"
                    variant="default"
                    className={classes.storyBadge}
                    data-complete={
                      story.total && story.done === story.total ? "" : undefined
                    }
                    fw={PRIORITY_WEIGHT[story.priority ?? ""] ?? 500}
                  >
                    {story.id}
                    {story.priority ? `·${story.priority}` : ""}
                    {story.total ? ` ${storyPct}%` : ""}
                  </Badge>
                </Tooltip>
              );
            })}
            {feature.user_stories.length > stories.length && (
              <Text size="xs" c="dimmed">
                +{feature.user_stories.length - stories.length}
              </Text>
            )}
          </Group>
        )}
      </Stack>

      <Group justify="space-between" mt="sm" gap={6} wrap="nowrap">
        <Group gap={5} wrap="nowrap">
          {ARTIFACT_ICONS.map(({ key, label, Icon }) => (
            <Tooltip
              key={key}
              label={has(key) ? label : t("card.missing", { label })}
              withArrow
            >
              <Icon
                size={14}
                className={has(key) ? classes.artifactOn : classes.artifactOff}
                stroke={1.8}
              />
            </Tooltip>
          ))}
          {contracts > 0 && (
            <Tooltip label={n(contracts, "contract")} withArrow>
              <Badge
                size="xs"
                variant="default"
                radius="sm"
                px={5}
                className={classes.pill}
              >
                {contracts}c
              </Badge>
            </Tooltip>
          )}
          {feature.checklist_progress.total > 0 && (
            <Tooltip
              label={`${t("card.checklists")}: ${feature.checklist_progress.done}/${feature.checklist_progress.total}`}
              withArrow
            >
              <Badge
                size="xs"
                radius="sm"
                px={5}
                variant="default"
                leftSection={<IconChecklist size={10} />}
                className={classes.pill}
              >
                {feature.checklist_progress.pct}%
              </Badge>
            </Tooltip>
          )}
        </Group>
        <Tooltip label={feature.branch ?? feature.id} withArrow>
          <Group gap={3} wrap="nowrap" className={classes.footerMeta}>
            <IconGitBranch size={11} stroke={1.6} />
            <Text size="xs" c="dimmed">
              {ago(feature.modified)}
            </Text>
          </Group>
        </Tooltip>
      </Group>
    </Card>
  );
}
