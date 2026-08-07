import {
  Badge,
  Box,
  Group,
  Kbd,
  Loader,
  Modal,
  ScrollArea,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { IconCornerDownLeft, IconSearch } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n'
import type { SearchHit, SearchResult } from '../types'
import classes from './SearchPalette.module.css'

const KIND_COLOR: Record<SearchHit['kind'], string> = {
  feature: 'indigo',
  story: 'grape',
  task: 'teal',
  requirement: 'blue',
  checklist: 'yellow',
  document: 'orange',
}

interface Props {
  opened: boolean
  onClose: () => void
  onOpen: (hit: SearchHit) => void
  /** bumped by the live socket, so open results refresh when the files change */
  generation: number
}

/**
 * Answers "where is this written", which the header filter cannot: the filter
 * narrows the board from the snapshot in the browser, and the snapshot has never
 * carried document text. This asks the server, which holds the index.
 */
export function SearchPalette({ opened, onClose, onOpen, generation }: Props) {
  const { t, lang } = useT()
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const viewport = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!opened) return
    const text = query.trim()
    if (!text) {
      setResult(null)
      return
    }
    let cancelled = false
    setLoading(true)
    const timer = window.setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(text)}&limit=40`)
        .then((r) => r.json())
        .then((data: SearchResult) => {
          if (cancelled) return
          setResult(data)
          setActive(0)
        })
        .catch(() => !cancelled && setResult(null))
        .finally(() => !cancelled && setLoading(false))
    }, 120)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query, opened, generation])

  const hits = result?.hits ?? []

  const choose = (hit: SearchHit | undefined) => {
    if (!hit) return
    onOpen(hit)
    onClose()
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      withCloseButton={false}
      size="min(760px, 94vw)"
      padding={0}
      radius="lg"
      overlayProps={{ backgroundOpacity: 0.5, blur: 3 }}
      transitionProps={{ duration: 120 }}
    >
      <TextInput
        autoFocus
        variant="unstyled"
        size="lg"
        px="md"
        placeholder={t('search.placeholder')}
        leftSection={loading ? <Loader size={16} /> : <IconSearch size={18} />}
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((i) => Math.min(i + 1, hits.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((i) => Math.max(i - 1, 0))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            choose(hits[active])
          }
        }}
        className={classes.input}
      />

      {(hits.length > 0 || result) && (
        <ScrollArea.Autosize mah={460} viewportRef={viewport} className={classes.results}>
          {hits.length === 0 ? (
            <Box p="lg">
              <Text size="sm" c="dimmed">
                {t('search.nothing', { query: result?.query ?? '' })}
              </Text>
              {result?.suggestions?.length ? (
                <Text
                  size="sm"
                  mt={6}
                  className={classes.suggestion}
                  onClick={() => setQuery(result.suggestions[0])}
                >
                  {t('search.didYouMean')} <b>{result.suggestions[0]}</b>
                </Text>
              ) : null}
            </Box>
          ) : (
            <Stack gap={0} p={6}>
              {hits.map((hit, i) => (
                <Box
                  key={`${hit.kind}/${hit.project_id}/${hit.feature_id}/${hit.ref}/${i}`}
                  className={classes.hit}
                  data-active={i === active || undefined}
                  data-testid="search-hit"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(hit)}
                  role="button"
                  tabIndex={-1}
                >
                  <Group gap={8} wrap="nowrap" align="flex-start">
                    <Badge
                      size="xs"
                      radius="sm"
                      variant="light"
                      color={KIND_COLOR[hit.kind]}
                      className={classes.kind}
                    >
                      {t(`search.kind.${hit.kind}` as 'search.kind.task')}
                    </Badge>
                    <Box style={{ minWidth: 0, flex: 1 }}>
                      <Text size="sm" fw={600} lineClamp={1}>
                        {hit.title}
                      </Text>
                      <Text size="10px" c="dimmed" lineClamp={1}>
                        {hit.subtitle}
                      </Text>
                      {hit.snippet && <Snippet text={hit.snippet} />}
                    </Box>
                    {i === active && <IconCornerDownLeft size={13} opacity={0.5} />}
                  </Group>
                </Box>
              ))}
            </Stack>
          )}
        </ScrollArea.Autosize>
      )}

      <Group justify="space-between" px="md" py={8} className={classes.footer}>
        <Group gap={10}>
          <Text size="10px" c="dimmed">
            <Kbd size="xs">↑</Kbd> <Kbd size="xs">↓</Kbd> {t('search.navigate')}
          </Text>
          <Text size="10px" c="dimmed">
            <Kbd size="xs">↵</Kbd> {t('search.open')}
          </Text>
          <Text size="10px" c="dimmed">
            <Kbd size="xs">esc</Kbd> {t('search.close')}
          </Text>
        </Group>
        {result && result.total > 0 && (
          <Text size="10px" c="dimmed">
            {t('search.foundBy', {
              total: result.total,
              how: t(
                result.matched_by === 'substring' ? 'search.bySubstring' : 'search.byTokens',
              ),
              ms: result.took_ms.toLocaleString(lang),
            })}
          </Text>
        )}
      </Group>
    </Modal>
  )
}

/**
 * The server marks matches with \x02 and \x03 rather than with HTML, so the
 * payload is never markup and this never has to trust it.
 */
function Snippet({ text }: { text: string }) {
  // Deliberate: the server marks matches with control characters exactly so the
  // payload can never be markup, which is what makes rendering it safe without
  // sanitising. The directive has to sit on the line above the code, not above a
  // comment, or it silently covers nothing.
  // eslint-disable-next-line no-control-regex
  const pieces = text.split(/\x02|\x03/)
  return (
    <Text size="xs" c="dimmed" lineClamp={2} mt={2} className={classes.snippet}>
      {pieces.map((piece, i) =>
        i % 2 === 1 ? (
          <mark key={i} className={classes.mark}>
            {piece}
          </mark>
        ) : (
          <span key={i}>{piece}</span>
        ),
      )}
    </Text>
  )
}
