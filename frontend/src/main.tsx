import '@mantine/core/styles.css'
import { createTheme, MantineProvider } from '@mantine/core'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { LangProvider } from './LangProvider'
import './index.css'

const theme = createTheme({
  primaryColor: 'indigo',
  defaultRadius: 'md',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Helvetica, Arial, sans-serif',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
  headings: { fontWeight: '700' },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <LangProvider>
        <App />
      </LangProvider>
    </MantineProvider>
  </StrictMode>,
)
