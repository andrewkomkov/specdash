import { Alert, Code, Loader, ScrollArea, Table, Text, Title } from '@mantine/core'
import { useEffect, useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import classes from './MarkdownView.module.css'
import { useT } from '../i18n'

interface Props {
  projectId: string
  featureId: string
  file: string
}

export function MarkdownView({ projectId, featureId, file }: Props) {
  const { t } = useT()
  const [text, setText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setText(null)
    setError(null)
    const url = `/api/projects/${encodeURIComponent(projectId)}/features/${encodeURIComponent(
      featureId,
    )}/doc?file=${encodeURIComponent(file)}`
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(`${r.status} ${await r.text()}`)
        return r.text()
      })
      .then((body) => !cancelled && setText(body))
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [projectId, featureId, file])

  if (error) return <Alert color="var(--status-blocker)" title={t('drawer.loadFailed', { file })}>{error}</Alert>
  if (text === null) return <Loader size="sm" />

  const isMarkdown = file.endsWith('.md')
  if (!isMarkdown) {
    return (
      <ScrollArea.Autosize mah="calc(100vh - 260px)">
        <Code block className={classes.raw}>
          {text}
        </Code>
      </ScrollArea.Autosize>
    )
  }

  return (
    <ScrollArea.Autosize mah="calc(100vh - 260px)" type="hover">
      <div className={classes.markdown}>
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <Title order={2} mt="md" mb="xs">
                {children}
              </Title>
            ),
            h2: ({ children }) => (
              <Title order={3} mt="lg" mb="xs">
                {children}
              </Title>
            ),
            h3: ({ children }) => (
              <Title order={4} mt="md" mb={4}>
                {children}
              </Title>
            ),
            p: ({ children }) => (
              <Text size="sm" mb="xs" className={classes.paragraph}>
                {children}
              </Text>
            ),
            code: ({ children, className }) =>
              className?.includes('language-') ? (
                <Code block>{String(children)}</Code>
              ) : (
                <Code>{children}</Code>
              ),
            table: ({ children }) => (
              <Table striped withTableBorder withColumnBorders my="sm" fz="xs">
                {children}
              </Table>
            ),
            a: ({ children, href }) => (
              <Text component="a" href={href} c="blue" size="sm" target="_blank" rel="noreferrer">
                {children}
              </Text>
            ),
          }}
        >
          {text}
        </Markdown>
      </div>
    </ScrollArea.Autosize>
  )
}
